import type {
  DeploymentResult,
  DeploymentState,
  EnvironmentGroup,
  RepoDeployment,
} from "./deployment-types";
import { GitHubApiError } from "./github-api";
import type { GetOrgDeploymentsMessage } from "./messages";
import {
  getCachedDeployments,
  setCachedDeployments,
  tokenStorage,
} from "./storage";

// Raw GraphQL response shapes
export type GqlDeploymentNode = {
  environment: string;
  latestStatus: { state: string } | null;
  creator: { login: string } | null;
  ref: { name: string } | null;
  commit: { abbreviatedOid: string } | null;
  createdAt: string;
};

export type GqlRepoNode = {
  name: string;
  deployments: { nodes: GqlDeploymentNode[] };
};

const STATE_MAP: Record<string, DeploymentState> = {
  SUCCESS: "success",
  FAILURE: "failure",
  ERROR: "error",
  IN_PROGRESS: "in_progress",
  PENDING: "pending",
  QUEUED: "queued",
  INACTIVE: "inactive",
  WAITING: "waiting",
};

function normalizeState(gqlState: string): DeploymentState {
  return STATE_MAP[gqlState] ?? "pending";
}

const STATE_PRIORITY: Record<string, number> = {
  failure: 0,
  error: 0,
  in_progress: 1,
  queued: 2,
  pending: 2,
  waiting: 2,
  success: 3,
  inactive: 4,
};

function deploymentSortKey(d: RepoDeployment): [number, number] {
  const priority = STATE_PRIORITY[d.state] ?? 3;
  const time = -new Date(d.createdAt).getTime();
  return [priority, time];
}

export function transformDeploymentData(
  repos: GqlRepoNode[],
): EnvironmentGroup[] {
  const envMap = new Map<string, Map<string, RepoDeployment>>();

  for (const repo of repos) {
    const seenEnvs = new Set<string>();

    for (const node of repo.deployments.nodes) {
      const env = node.environment;
      if (seenEnvs.has(env)) continue;
      seenEnvs.add(env);

      const deployment: RepoDeployment = {
        repoName: repo.name,
        environment: env,
        state: normalizeState(node.latestStatus?.state ?? "PENDING"),
        ref: node.ref?.name ?? node.commit?.abbreviatedOid ?? "",
        commitSha: node.commit?.abbreviatedOid ?? "",
        creator: node.creator?.login ?? "unknown",
        createdAt: node.createdAt,
      };

      if (!envMap.has(env)) {
        envMap.set(env, new Map());
      }
      envMap.get(env)?.set(repo.name, deployment);
    }
  }

  return [...envMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, repoMap]) => ({
      name,
      deployments: [...repoMap.values()].sort((a, b) => {
        const [aPri, aTime] = deploymentSortKey(a);
        const [bPri, bTime] = deploymentSortKey(b);
        return aPri !== bPri ? aPri - bPri : aTime - bTime;
      }),
    }));
}

const GRAPHQL_ENDPOINT = "https://api.github.com/graphql";

const DEPLOYMENTS_QUERY = `
query OrgDeployments($org: String!, $cursor: String) {
  organization(login: $org) {
    repositories(first: 100, isArchived: false, after: $cursor) {
      nodes {
        name
        deployments(first: 30, orderBy: { field: CREATED_AT, direction: DESC }) {
          nodes {
            environment
            latestStatus { state }
            creator { login }
            ref { name }
            commit { abbreviatedOid }
            createdAt
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}`;

const MAX_REPO_PAGES = 10;

export async function fetchOrgDeployments(
  org: string,
  token: string,
): Promise<EnvironmentGroup[]> {
  const allRepos: GqlRepoNode[] = [];
  let cursor: string | null = null;
  let page = 0;

  type GqlPageInfo = { hasNextPage: boolean; endCursor: string | null };
  type GqlRepositories = { nodes: GqlRepoNode[]; pageInfo: GqlPageInfo };
  type GqlResponse = {
    errors?: Array<{ message: string }>;
    data?: { organization?: { repositories: GqlRepositories } };
  };

  while (page < MAX_REPO_PAGES) {
    page++;
    const response: Response = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `bearer ${token}`,
      },
      body: JSON.stringify({
        query: DEPLOYMENTS_QUERY,
        variables: { org, cursor },
      }),
    });

    if (!response.ok) {
      throw new GitHubApiError(response.status, response.statusText);
    }

    const json: GqlResponse = await response.json();

    if (json.errors || !json.data?.organization?.repositories) {
      const msg = json.errors?.[0]?.message ?? "GraphQL query failed";
      throw new GitHubApiError(200, msg);
    }

    const repos: GqlRepositories = json.data.organization.repositories;
    allRepos.push(...repos.nodes);

    if (!repos.pageInfo.hasNextPage) break;
    cursor = repos.pageInfo.endCursor;
  }

  return transformDeploymentData(allRepos);
}

export async function getOrgDeployments(
  org: string,
  force = false,
): Promise<DeploymentResult> {
  try {
    if (!force) {
      const cached = await getCachedDeployments(org);
      if (cached) {
        return { ok: true, groups: cached.groups, timestamp: cached.timestamp };
      }
    }

    const token = (await tokenStorage.getValue()) || null;
    if (!token) {
      return { ok: false, reason: "auth-required" };
    }

    const groups = await fetchOrgDeployments(org, token);
    await setCachedDeployments(org, groups);
    return { ok: true, groups, timestamp: Date.now() };
  } catch (err) {
    console.error("[grody-github] Failed to fetch deployments:", err);
    if (err instanceof GitHubApiError) {
      if (err.status === 403) return { ok: false, reason: "rate-limited" };
      if (err.status === 401 || err.status === 404) {
        return { ok: false, reason: "auth-required" };
      }
    }
    return { ok: false, reason: "error" };
  }
}

export async function requestOrgDeployments(
  org: string,
  force = false,
): Promise<DeploymentResult> {
  const message: GetOrgDeploymentsMessage = {
    type: "GET_ORG_DEPLOYMENTS",
    org,
    force,
  };
  return browser.runtime.sendMessage(message);
}
