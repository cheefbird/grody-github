import { describe, expect, it, vi } from "vitest";

// Mock the Svelte component import so the module can be loaded in Node
vi.mock("../WorkflowFilter.svelte", () => ({ default: {} }));

import { ACTIONS_PATTERN, parseRepo } from "./workflow-filter";

describe("ACTIONS_PATTERN", () => {
  it("matches /owner/repo/actions", () => {
    expect(ACTIONS_PATTERN.test("/owner/repo/actions")).toBe(true);
  });

  it("matches /owner/repo/actions/", () => {
    expect(ACTIONS_PATTERN.test("/owner/repo/actions/")).toBe(true);
  });

  it("matches /owner/repo/actions/workflows/ci.yml", () => {
    expect(ACTIONS_PATTERN.test("/owner/repo/actions/workflows/ci.yml")).toBe(
      true,
    );
  });

  it("does not match /owner/repo/pulls", () => {
    expect(ACTIONS_PATTERN.test("/owner/repo/pulls")).toBe(false);
  });

  it("does not match /owner/repo/action (no trailing s)", () => {
    expect(ACTIONS_PATTERN.test("/owner/repo/action")).toBe(false);
  });
});

describe("parseRepo", () => {
  function stubLocation(pathname: string) {
    vi.stubGlobal("location", { pathname });
  }

  it("parses /owner/repo/actions correctly", () => {
    stubLocation("/owner/repo/actions");
    expect(parseRepo()).toEqual({ owner: "owner", repo: "repo" });
  });

  it("handles trailing slashes", () => {
    stubLocation("/owner/repo/");
    expect(parseRepo()).toEqual({ owner: "owner", repo: "repo" });
  });

  it("returns null for paths with fewer than 2 segments", () => {
    stubLocation("/owner");
    expect(parseRepo()).toBeNull();
  });

  it("returns null for root path", () => {
    stubLocation("/");
    expect(parseRepo()).toBeNull();
  });
});
