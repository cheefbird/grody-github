import type { DeploymentCache, EnvironmentGroup } from "./deployment-types";
import type { WorkflowCache } from "./types";

export const tokenStorage = storage.defineItem<string>("local:github-pat", {
  fallback: "",
});

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function cacheKey(owner: string, repo: string) {
  return `local:workflow-cache:${owner}/${repo}` as `local:${string}`;
}

export async function getCachedWorkflows(
  owner: string,
  repo: string,
): Promise<WorkflowCache | null> {
  const cached = await storage.getItem<WorkflowCache>(cacheKey(owner, repo));
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) return null;
  return cached;
}

export async function setCachedWorkflows(
  owner: string,
  repo: string,
  workflows: WorkflowCache["workflows"],
): Promise<void> {
  await storage.setItem<WorkflowCache>(cacheKey(owner, repo), {
    workflows,
    timestamp: Date.now(),
  });
}

const DEPLOYMENT_CACHE_TTL_MS = 5 * 60 * 1000;

export function deploymentCacheKey(org: string) {
  return `local:deployment-cache:${org}` as `local:${string}`;
}

export async function getCachedDeployments(
  org: string,
): Promise<DeploymentCache | null> {
  const cached = await storage.getItem<DeploymentCache>(
    deploymentCacheKey(org),
  );
  if (!cached) return null;
  if (Date.now() - cached.timestamp > DEPLOYMENT_CACHE_TTL_MS) return null;
  return cached;
}

export async function setCachedDeployments(
  org: string,
  groups: EnvironmentGroup[],
): Promise<void> {
  await storage.setItem<DeploymentCache>(deploymentCacheKey(org), {
    groups,
    timestamp: Date.now(),
  });
}
