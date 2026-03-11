import type { GetWorkflowsMessage } from "./messages";
import {
  getCachedWorkflows,
  setCachedWorkflows,
  tokenStorage,
} from "./storage";
import type { Workflow, WorkflowResult } from "./types";

type WorkflowApiResponse = {
  total_count: number;
  workflows: Array<{
    id: number;
    name: string;
    path: string;
    state: string;
  }>;
};

class GitHubApiError extends Error {
  constructor(
    public status: number,
    statusText: string,
  ) {
    super(`GitHub API error: ${status} ${statusText}`);
    this.name = "GitHubApiError";
  }
}

const MAX_PAGES = 10;

function parseLinkHeader(header: string | null): string | null {
  if (!header) return null;
  const match = /<([^>]+)>;\s*rel="next"/.exec(header);
  if (!match) return null;
  const nextUrl = match[1];
  // Only follow links back to the GitHub API
  if (!nextUrl.startsWith("https://api.github.com/")) return null;
  return nextUrl;
}

async function fetchAllWorkflows(
  owner: string,
  repo: string,
  token: string | null,
): Promise<Workflow[]> {
  const workflows: Workflow[] = [];
  let url: string | null =
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows?per_page=100`;
  let page = 0;

  while (url && page < MAX_PAGES) {
    page++;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
    };
    if (token) {
      headers.Authorization = `token ${token}`;
    }
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new GitHubApiError(response.status, response.statusText);
    }

    const data: WorkflowApiResponse = await response.json();

    for (const workflow of data.workflows) {
      if (workflow.state === "active" && workflow.path) {
        workflows.push({ name: workflow.name, path: workflow.path });
      }
    }

    url = parseLinkHeader(response.headers.get("Link"));
  }

  return workflows;
}

export async function getWorkflows(
  owner: string,
  repo: string,
): Promise<WorkflowResult> {
  try {
    const token = (await tokenStorage.getValue()) || null;

    const cached = await getCachedWorkflows(owner, repo);
    if (cached) return { ok: true, workflows: cached.workflows };

    const workflows = await fetchAllWorkflows(owner, repo, token);
    await setCachedWorkflows(owner, repo, workflows);
    return { ok: true, workflows };
  } catch (err) {
    console.error("[grody-github] Failed to fetch workflows:", err);

    if (err instanceof GitHubApiError) {
      if (err.status === 403) return { ok: false, reason: "rate-limited" };
      if (err.status === 401 || err.status === 404) {
        return { ok: false, reason: "auth-required" };
      }
    }

    return { ok: false, reason: "error" };
  }
}

export async function requestWorkflows(
  owner: string,
  repo: string,
): Promise<WorkflowResult> {
  const message: GetWorkflowsMessage = { type: "GET_WORKFLOWS", owner, repo };
  return browser.runtime.sendMessage(message);
}
