import type { WorkflowCache } from './types';

export const tokenStorage = storage.defineItem<string>('local:github-pat', {
  fallback: '',
});

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function getCachedWorkflows(
  owner: string,
  repo: string,
): Promise<WorkflowCache | null> {
  const key = `local:workflow-cache:${owner}/${repo}` as `local:${string}`;
  const cached = await storage.getItem<WorkflowCache>(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) return null;
  return cached;
}

export async function setCachedWorkflows(
  owner: string,
  repo: string,
  workflows: WorkflowCache['workflows'],
): Promise<void> {
  const key = `local:workflow-cache:${owner}/${repo}` as `local:${string}`;
  await storage.setItem<WorkflowCache>(key, {
    workflows,
    timestamp: Date.now(),
  });
}
