import type { GetEnvironmentsMessage, GetWorkflowsMessage } from "./messages";
import {
  type createListCache,
  environmentCache,
  fingerprintToken,
  tokenStorage,
  workflowCache,
} from "./storage";
import type { Environment, ListResult, Workflow } from "./types";

type WorkflowApiResponse = {
  total_count: number;
  workflows: Array<{
    id: number;
    name: string;
    path: string;
    state: string;
  }>;
};

type EnvironmentApiResponse = {
  total_count: number;
  environments: Array<{
    id: number;
    name: string;
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

export function createCachedListFetcher<T>(opts: {
  cache: ReturnType<typeof createListCache<T>>;
  buildUrl: (owner: string, repo: string) => string;
  parsePage: (json: unknown) => T[];
  label: string;
}): (owner: string, repo: string) => Promise<ListResult<T>> {
  const { cache, buildUrl, parsePage, label } = opts;

  async function fetchAllPages(
    owner: string,
    repo: string,
    token: string | null,
  ): Promise<T[]> {
    const items: T[] = [];
    let url: string | null = buildUrl(owner, repo);
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

      items.push(...parsePage(await response.json()));
      url = parseLinkHeader(response.headers.get("Link"));
    }

    return items;
  }

  return async (owner, repo) => {
    try {
      const token = (await tokenStorage.getValue()) || null;
      const fingerprint = await fingerprintToken(token);

      const cached = await cache.get(owner, repo, fingerprint);
      if (cached) return { ok: true, items: cached.items };

      const items = await fetchAllPages(owner, repo, token);
      // A storage failure must not discard a successful response
      try {
        await cache.set(owner, repo, items, fingerprint);
      } catch (cacheErr) {
        console.error(`[grody-github] Failed to cache ${label}:`, cacheErr);
      }
      return { ok: true, items };
    } catch (err) {
      console.error(`[grody-github] Failed to fetch ${label}:`, err);

      if (err instanceof GitHubApiError) {
        if (err.status === 403) return { ok: false, reason: "rate-limited" };
        if (err.status === 401 || err.status === 404) {
          return { ok: false, reason: "auth-required" };
        }
      }

      return { ok: false, reason: "error" };
    }
  };
}

export const getWorkflows = createCachedListFetcher<Workflow>({
  cache: workflowCache,
  buildUrl: (owner, repo) =>
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows?per_page=100`,
  parsePage: (json) => {
    const data = json as WorkflowApiResponse;
    return data.workflows
      .filter((w) => w.state === "active" && w.path)
      .map((w) => ({ name: w.name, path: w.path }));
  },
  label: "workflows",
});

export const getEnvironments = createCachedListFetcher<Environment>({
  cache: environmentCache,
  buildUrl: (owner, repo) =>
    `https://api.github.com/repos/${owner}/${repo}/environments?per_page=100`,
  parsePage: (json) => {
    const data = json as EnvironmentApiResponse;
    return data.environments.map((e) => ({ name: e.name }));
  },
  label: "environments",
});

export async function requestWorkflows(
  owner: string,
  repo: string,
): Promise<ListResult<Workflow>> {
  const message: GetWorkflowsMessage = { type: "GET_WORKFLOWS", owner, repo };
  return browser.runtime.sendMessage(message);
}

export async function requestEnvironments(
  owner: string,
  repo: string,
): Promise<ListResult<Environment>> {
  const message: GetEnvironmentsMessage = {
    type: "GET_ENVIRONMENTS",
    owner,
    repo,
  };
  return browser.runtime.sendMessage(message);
}
