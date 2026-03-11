export type Workflow = {
  name: string;
  path: string;
};

export type WorkflowCache = {
  workflows: Workflow[];
  timestamp: number;
};

export type WorkflowResult =
  | { ok: true; workflows: Workflow[] }
  | { ok: false; reason: "rate-limited" | "auth-required" | "error" };
