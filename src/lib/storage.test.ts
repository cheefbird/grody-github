import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { cacheKey, getCachedWorkflows, setCachedWorkflows } from "./storage";

describe("cacheKey", () => {
  it("generates correct key format", () => {
    expect(cacheKey("owner", "repo")).toBe("local:workflow-cache:owner/repo");
  });
});

describe("getCachedWorkflows", () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
  });

  it("returns cached data when within TTL", async () => {
    const workflows = [{ name: "CI", path: ".github/workflows/ci.yml" }];
    await setCachedWorkflows("owner", "repo", workflows);

    const result = await getCachedWorkflows("owner", "repo");
    expect(result).not.toBeNull();
    expect(result?.workflows).toEqual(workflows);
  });

  it("returns null when cache is expired", async () => {
    const workflows = [{ name: "CI", path: ".github/workflows/ci.yml" }];
    await setCachedWorkflows("owner", "repo", workflows);

    const dayPlusOne = Date.now() + 25 * 60 * 60 * 1000;
    vi.spyOn(Date, "now").mockReturnValue(dayPlusOne);

    const result = await getCachedWorkflows("owner", "repo");
    expect(result).toBeNull();
  });

  it("returns null when no cache exists", async () => {
    const result = await getCachedWorkflows("owner", "repo");
    expect(result).toBeNull();
  });
});

describe("setCachedWorkflows", () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it("stores workflows with current timestamp", async () => {
    const now = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(now);

    const workflows = [{ name: "CI", path: ".github/workflows/ci.yml" }];
    await setCachedWorkflows("owner", "repo", workflows);

    const result = await getCachedWorkflows("owner", "repo");
    expect(result).toEqual({ workflows, timestamp: now });
  });
});
