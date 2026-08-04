export type Workflow = {
  name: string;
  path: string;
};

export type WorkflowResult =
  | { ok: true; workflows: Workflow[] }
  | { ok: false; reason: "rate-limited" | "auth-required" | "error" };

export type Environment = {
  name: string;
};

export type ListCacheEntry<T> = {
  items: T[];
  timestamp: number;
};

export type EnvironmentResult =
  | { ok: true; environments: Environment[] }
  | { ok: false; reason: "rate-limited" | "auth-required" | "error" };
