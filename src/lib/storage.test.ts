import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { environmentCache, workflowCache } from "./storage";

describe("cache keys", () => {
  it("workflowCache keeps the legacy key prefix", () => {
    expect(workflowCache.key("owner", "repo")).toBe(
      "local:workflow-cache:owner/repo",
    );
  });

  it("environmentCache uses the env-cache prefix", () => {
    expect(environmentCache.key("owner", "repo")).toBe(
      "local:env-cache:owner/repo",
    );
  });
});

describe("createListCache get/set", () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
  });

  it("returns cached items when within TTL", async () => {
    const workflows = [{ name: "CI", path: ".github/workflows/ci.yml" }];
    await workflowCache.set("owner", "repo", workflows);

    const result = await workflowCache.get("owner", "repo");
    expect(result?.items).toEqual(workflows);
  });

  it("returns null when cache is expired", async () => {
    await workflowCache.set("owner", "repo", [
      { name: "CI", path: ".github/workflows/ci.yml" },
    ]);

    const dayPlusOne = Date.now() + 25 * 60 * 60 * 1000;
    vi.spyOn(Date, "now").mockReturnValue(dayPlusOne);

    expect(await workflowCache.get("owner", "repo")).toBeNull();
  });

  it("returns null when no cache exists", async () => {
    expect(await workflowCache.get("owner", "repo")).toBeNull();
  });

  it("treats pre-generic cache shapes as a miss", async () => {
    // Old workflow cache entries stored { workflows, timestamp }
    await storage.setItem(workflowCache.key("owner", "repo"), {
      workflows: [{ name: "CI", path: ".github/workflows/ci.yml" }],
      timestamp: Date.now(),
    });

    expect(await workflowCache.get("owner", "repo")).toBeNull();
  });

  it("stores items with current timestamp", async () => {
    const now = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(now);

    const envs = [{ name: "prod-us" }];
    await environmentCache.set("owner", "repo", envs);

    const result = await environmentCache.get("owner", "repo");
    expect(result).toEqual({ items: envs, timestamp: now });
  });

  it("keeps caches with different prefixes independent", async () => {
    await workflowCache.set("owner", "repo", [
      { name: "CI", path: ".github/workflows/ci.yml" },
    ]);

    expect(await environmentCache.get("owner", "repo")).toBeNull();
  });
});
