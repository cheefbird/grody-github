export type DeploymentState =
  | "success"
  | "failure"
  | "error"
  | "in_progress"
  | "pending"
  | "queued"
  | "inactive"
  | "waiting";

export type RepoDeployment = {
  repoName: string;
  environment: string;
  state: DeploymentState;
  ref: string;
  commitSha: string;
  creator: string;
  createdAt: string;
};

export type EnvironmentGroup = {
  name: string;
  deployments: RepoDeployment[];
};

export type DeploymentCache = {
  groups: EnvironmentGroup[];
  timestamp: number;
  tokenPrefix?: string;
};

export type DeploymentResult =
  | {
      ok: true;
      groups: EnvironmentGroup[];
      timestamp: number;
      truncated: boolean;
    }
  | { ok: false; reason: "rate-limited" | "auth-required" | "error" };
