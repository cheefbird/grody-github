import type { GetEnvironmentsMessage, GetWorkflowsMessage } from "./messages";
import {
  environmentCache,
  fingerprintToken,
  tokenStorage,
  workflowCache,
} from "./storage";
import type {
  Environment,
  EnvironmentResult,
  Workflow,
  WorkflowResult,
} from "./types";

type WorkflowApiResponse = {
  total_count: number;
  workflows: Array<{
    id: number;
    name: string;
    path: string;
    state: string;
  }>;
};

export class GitHubApiError extends Error {
  constructor(
    public readonly status: number,
    statusText: string,
  ) {
    super(`GitHub API error: ${status} ${statusText}`);
    this.name = "GitHubApiError";
  }
}

const MAX_PAGES = 10;

export function parseLinkHeader(header: string | null): string | null {
  if (!header) return null;
  const match = /<([^>]+)>;\s*rel="next"/.exec(header);
  const nextUrl = match?.[1];
  // Only follow links back to the GitHub API
  if (!nextUrl?.startsWith("https://api.github.com/")) return null;
  return nextUrl;
}

export async function fetchAllWorkflows(
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
    const fingerprint = await fingerprintToken(token);

    const cached = await workflowCache.get(owner, repo, fingerprint);
    if (cached) return { ok: true, workflows: cached.items };

    const workflows = await fetchAllWorkflows(owner, repo, token);
    await workflowCache.set(owner, repo, workflows, fingerprint);
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

type EnvironmentApiResponse = {
  total_count: number;
  environments: Array<{
    id: number;
    name: string;
  }>;
};

export async function fetchAllEnvironments(
  owner: string,
  repo: string,
  token: string | null,
): Promise<Environment[]> {
  const environments: Environment[] = [];
  let url: string | null =
    `https://api.github.com/repos/${owner}/${repo}/environments?per_page=100`;
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

    const data: EnvironmentApiResponse = await response.json();

    for (const environment of data.environments) {
      environments.push({ name: environment.name });
    }

    url = parseLinkHeader(response.headers.get("Link"));
  }

  return environments;
}

export async function getEnvironments(
  owner: string,
  repo: string,
): Promise<EnvironmentResult> {
  try {
    const token = (await tokenStorage.getValue()) || null;
    const fingerprint = await fingerprintToken(token);

    const cached = await environmentCache.get(owner, repo, fingerprint);
    if (cached) return { ok: true, environments: cached.items };

    const environments = await fetchAllEnvironments(owner, repo, token);
    await environmentCache.set(owner, repo, environments, fingerprint);
    return { ok: true, environments };
  } catch (err) {
    console.error("[grody-github] Failed to fetch environments:", err);

    if (err instanceof GitHubApiError) {
      if (err.status === 403) return { ok: false, reason: "rate-limited" };
      if (err.status === 401 || err.status === 404) {
        return { ok: false, reason: "auth-required" };
      }
    }

    return { ok: false, reason: "error" };
  }
}

export async function requestEnvironments(
  owner: string,
  repo: string,
): Promise<EnvironmentResult> {
  const message: GetEnvironmentsMessage = {
    type: "GET_ENVIRONMENTS",
    owner,
    repo,
  };
  return browser.runtime.sendMessage(message);
}
