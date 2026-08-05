import type { Environment, ListCacheEntry, Workflow } from "./types";

export const tokenStorage = storage.defineItem<string>("local:github-pat", {
  fallback: "",
});

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function fingerprintToken(token: string | null): Promise<string> {
  if (!token) return "";
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

export function createListCache<T>(prefix: string) {
  const key = (owner: string, repo: string) =>
    `local:${prefix}:${owner}/${repo}` as `local:${string}`;

  return {
    key,
    async get(
      owner: string,
      repo: string,
      fingerprint: string,
    ): Promise<ListCacheEntry<T> | null> {
      const cached = await storage.getItem<ListCacheEntry<T>>(key(owner, repo));
      // Array guard also invalidates entries written in the pre-generic shape
      if (!cached || !Array.isArray(cached.items)) return null;
      // Fingerprint mismatch covers token switches AND pre-fingerprint entries
      if (cached.tokenHash !== fingerprint) return null;
      if (Date.now() - cached.timestamp > CACHE_TTL_MS) return null;
      return cached;
    },
    async set(
      owner: string,
      repo: string,
      items: T[],
      fingerprint: string,
    ): Promise<void> {
      await storage.setItem<ListCacheEntry<T>>(key(owner, repo), {
        items,
        timestamp: Date.now(),
        tokenHash: fingerprint,
      });
    },
  };
}

export const workflowCache = createListCache<Workflow>("workflow-cache");
export const environmentCache = createListCache<Environment>("env-cache");
