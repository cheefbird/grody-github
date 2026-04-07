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

export const STATE_COLORS: Record<DeploymentState, string> = {
  success: "var(--fgColor-success, #3fb950)",
  failure: "var(--fgColor-danger, #da3633)",
  error: "var(--fgColor-danger, #da3633)",
  in_progress: "var(--fgColor-attention, #d29922)",
  pending: "var(--fgColor-muted, #7d8590)",
  queued: "var(--fgColor-muted, #7d8590)",
  inactive: "var(--fgColor-muted, #7d8590)",
  waiting: "var(--fgColor-attention, #d29922)",
};
