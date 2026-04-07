import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import type { EnvironmentGroup } from "./deployment-types";
import {
  cacheKey,
  deploymentCacheKey,
  getCachedDeployments,
  getCachedWorkflows,
  getPinnedEnvironments,
  setCachedDeployments,
  setCachedWorkflows,
  setPinnedEnvironments,
} from "./storage";

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

describe("deploymentCacheKey", () => {
  it("generates correct key format", () => {
    expect(deploymentCacheKey("my-org")).toBe("local:deployment-cache:my-org");
  });
});

describe("getCachedDeployments", () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
  });

  it("returns cached data when within TTL", async () => {
    const groups: EnvironmentGroup[] = [
      {
        name: "production",
        deployments: [
          {
            repoName: "api",
            environment: "production",
            state: "success",
            ref: "v1.0.0",
            commitSha: "abc1234",
            creator: "alice",
            createdAt: "2026-04-06T12:00:00Z",
          },
        ],
      },
    ];
    await setCachedDeployments("my-org", groups);

    const result = await getCachedDeployments("my-org");
    expect(result).not.toBeNull();
    expect(result?.groups).toEqual(groups);
  });

  it("returns null when cache is expired (>5 minutes)", async () => {
    await setCachedDeployments("my-org", []);

    const sixMinutesLater = Date.now() + 6 * 60 * 1000;
    vi.spyOn(Date, "now").mockReturnValue(sixMinutesLater);

    expect(await getCachedDeployments("my-org")).toBeNull();
  });

  it("returns null when no cache exists", async () => {
    expect(await getCachedDeployments("my-org")).toBeNull();
  });
});

describe("getPinnedEnvironments", () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
  });

  it("returns null when no pins exist", async () => {
    expect(await getPinnedEnvironments("my-org")).toBeNull();
  });

  it("returns saved pin list", async () => {
    await setPinnedEnvironments("my-org", ["dev", "staging", "prod"]);
    const result = await getPinnedEnvironments("my-org");
    expect(result).toEqual(["dev", "staging", "prod"]);
  });

  it("stores pins independently per org", async () => {
    await setPinnedEnvironments("org-a", ["dev"]);
    await setPinnedEnvironments("org-b", ["prod"]);
    expect(await getPinnedEnvironments("org-a")).toEqual(["dev"]);
    expect(await getPinnedEnvironments("org-b")).toEqual(["prod"]);
  });
});
