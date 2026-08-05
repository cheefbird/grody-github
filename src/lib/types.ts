export type Workflow = {
  name: string;
  path: string;
};

export type Environment = {
  name: string;
};

export type ListCacheEntry<T> = {
  items: T[];
  timestamp: number;
  tokenHash: string;
};

export type ListResult<T> =
  | { ok: true; items: T[] }
  | { ok: false; reason: "rate-limited" | "auth-required" | "error" };

export type SidebarFilterProps<T> = {
  fetch: () => Promise<ListResult<T>>;
  container: HTMLElement;
  placeholder: string;
  emptyText: string;
  getSearchText: (item: T) => string;
  getHref: (item: T) => string;
  getLabel: (item: T) => string;
  linkAttrs?: Record<string, string>;
};
