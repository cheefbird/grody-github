import type { Workflow } from './types';
import {
  tokenStorage,
  getCachedWorkflows,
  setCachedWorkflows,
} from './storage';

type WorkflowApiResponse = {
  total_count: number;
  workflows: Array<{
    id: number;
    name: string;
    path: string;
    state: string;
  }>;
};

function parseLinkHeader(header: string | null): string | null {
  if (!header) return null;
  const match = /<([^>]+)>;\s*rel="next"/.exec(header);
  return match ? match[1] : null;
}

async function fetchAllWorkflows(
  owner: string,
  repo: string,
  token: string,
): Promise<Workflow[]> {
  const workflows: Workflow[] = [];
  let url: string | null =
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows?per_page=100`;

  while (url) {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText}`,
      );
    }

    const data: WorkflowApiResponse = await response.json();

    for (const workflow of data.workflows) {
      if (workflow.state === 'active' && workflow.path) {
        workflows.push({ name: workflow.name, path: workflow.path });
      }
    }

    url = parseLinkHeader(response.headers.get('Link'));
  }

  return workflows;
}

export async function getWorkflows(
  owner: string,
  repo: string,
): Promise<Workflow[] | null> {
  const token = await tokenStorage.getValue();
  if (!token) return null;

  const cached = await getCachedWorkflows(owner, repo);
  if (cached) return cached.workflows;

  const workflows = await fetchAllWorkflows(owner, repo, token);
  await setCachedWorkflows(owner, repo, workflows);
  return workflows;
}
