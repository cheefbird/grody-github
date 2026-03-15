import { describe, expect, it } from "vitest";
import type { PageContext } from "@/lib/feature-types";
import {
  buildPageContext,
  isActionsPage,
  isIssuePage,
  isPRPage,
  isRepoPage,
} from "./page-context";

/** Helper: build a PageContext from a pathname. */
function ctx(pathname: string): PageContext {
  return buildPageContext(new URL(`https://github.com${pathname}`));
}

describe("buildPageContext", () => {
  it("parses owner and repo from a repo URL", () => {
    const result = ctx("/owner/repo/actions");
    expect(result.owner).toBe("owner");
    expect(result.repo).toBe("repo");
    expect(result.pathname).toBe("/owner/repo/actions");
  });

  it("returns undefined owner/repo for root path", () => {
    const result = ctx("/");
    expect(result.owner).toBeUndefined();
    expect(result.repo).toBeUndefined();
  });

  it("returns undefined owner/repo for single-segment path", () => {
    const result = ctx("/settings");
    expect(result.owner).toBeUndefined();
    expect(result.repo).toBeUndefined();
  });

  it("handles trailing slashes on repo path", () => {
    const result = ctx("/owner/repo/");
    expect(result.owner).toBe("owner");
    expect(result.repo).toBe("repo");
  });

  it("parses bare /owner/repo without trailing slash or subpath", () => {
    const result = ctx("/owner/repo");
    expect(result.owner).toBe("owner");
    expect(result.repo).toBe("repo");
  });

  it("preserves the full URL object", () => {
    const url = new URL("https://github.com/owner/repo?tab=actions");
    const result = buildPageContext(url);
    expect(result.url).toBe(url);
  });
});

describe("isActionsPage", () => {
  it("matches /owner/repo/actions", () => {
    expect(isActionsPage(ctx("/owner/repo/actions"))).toBe(true);
  });

  it("matches /owner/repo/actions/", () => {
    expect(isActionsPage(ctx("/owner/repo/actions/"))).toBe(true);
  });

  it("matches /owner/repo/actions/workflows/ci.yml", () => {
    expect(isActionsPage(ctx("/owner/repo/actions/workflows/ci.yml"))).toBe(
      true,
    );
  });

  it("does not match /owner/repo/pulls", () => {
    expect(isActionsPage(ctx("/owner/repo/pulls"))).toBe(false);
  });

  it("does not match /owner/repo/action (no trailing s)", () => {
    expect(isActionsPage(ctx("/owner/repo/action"))).toBe(false);
  });
});

describe("isRepoPage", () => {
  it("matches when owner and repo are present", () => {
    expect(isRepoPage(ctx("/owner/repo"))).toBe(true);
  });

  it("does not match root path", () => {
    expect(isRepoPage(ctx("/"))).toBe(false);
  });

  it("does not match single-segment path", () => {
    expect(isRepoPage(ctx("/owner"))).toBe(false);
  });
});

describe("isPRPage", () => {
  it("matches /owner/repo/pull/123", () => {
    expect(isPRPage(ctx("/owner/repo/pull/123"))).toBe(true);
  });

  it("matches PR subpages like /files", () => {
    expect(isPRPage(ctx("/owner/repo/pull/42/files"))).toBe(true);
  });

  it("does not match pulls list", () => {
    expect(isPRPage(ctx("/owner/repo/pulls"))).toBe(false);
  });
});

describe("isIssuePage", () => {
  it("matches /owner/repo/issues/123", () => {
    expect(isIssuePage(ctx("/owner/repo/issues/123"))).toBe(true);
  });

  it("does not match issues list", () => {
    expect(isIssuePage(ctx("/owner/repo/issues"))).toBe(false);
  });
});
