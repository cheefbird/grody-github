import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import type { FeatureDefinition } from "@/lib/feature-types";
import { createFeatureManager } from "./feature-manager";

vi.mock("./page-context", () => ({
  buildPageContext: vi.fn((url: URL) => ({
    url,
    pathname: url.pathname,
    owner: url.pathname.split("/")[1] || undefined,
    repo: url.pathname.split("/")[2] || undefined,
  })),
}));

function makeFeature(
  overrides: Partial<FeatureDefinition> = {},
): FeatureDefinition {
  return {
    id: "test-feature",
    reinitOnNavigation: false,
    init: vi.fn(),
    ...overrides,
  };
}

function mockCtx() {
  const callbacks: Array<() => void> = [];
  return {
    onInvalidated: (cb: () => void) => {
      callbacks.push(cb);
    },
    _invalidate: () => {
      for (const cb of callbacks) cb();
    },
  } as unknown as ContentScriptContext & { _invalidate: () => void };
}

const ACTIONS_URL = new URL("https://github.com/owner/repo/actions");
const HOME_URL = new URL("https://github.com/");

describe("createFeatureManager", () => {
  beforeEach(() => {
    vi.stubGlobal("location", HOME_URL);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("run", () => {
    it("initializes features with no include/exclude on any page", async () => {
      const feature = makeFeature();
      const ctx = mockCtx();
      const manager = createFeatureManager([feature], ctx);

      await manager.run();

      expect(feature.init).toHaveBeenCalledOnce();
    });

    it("does not initialize features when include predicate does not match", async () => {
      const isActions = (ctx: { pathname: string }) =>
        ctx.pathname.includes("/actions");
      const feature = makeFeature({
        id: "actions-only",
        include: [isActions],
      });
      const ctx = mockCtx();
      const manager = createFeatureManager([feature], ctx);

      await manager.run();

      expect(feature.init).not.toHaveBeenCalled();
    });

    it("skips features when exclude predicate matches", async () => {
      const always = () => true;
      const feature = makeFeature({
        id: "excluded",
        exclude: [always],
      });
      const ctx = mockCtx();
      const manager = createFeatureManager([feature], ctx);

      await manager.run();

      expect(feature.init).not.toHaveBeenCalled();
    });

    it("exclude takes precedence over include", async () => {
      const always = () => true;
      const feature = makeFeature({
        id: "both",
        include: [always],
        exclude: [always],
      });
      const ctx = mockCtx();
      const manager = createFeatureManager([feature], ctx);

      await manager.run();

      expect(feature.init).not.toHaveBeenCalled();
    });

    it("isolates errors — one feature throwing does not prevent others", async () => {
      const badFeature = makeFeature({
        id: "bad",
        init: vi.fn().mockRejectedValue(new Error("boom")),
      });
      const goodFeature = makeFeature({ id: "good" });
      const ctx = mockCtx();
      const manager = createFeatureManager([badFeature, goodFeature], ctx);

      await manager.run();

      expect(goodFeature.init).toHaveBeenCalledOnce();
    });

    it("initializes features when run() URL matches include predicate", async () => {
      vi.stubGlobal(
        "location",
        new URL("https://github.com/owner/repo/actions"),
      );
      const isActions = (ctx: { pathname: string }) =>
        ctx.pathname.includes("/actions");
      const feature = makeFeature({
        id: "actions-only",
        include: [isActions],
      });
      const ctx = mockCtx();
      const manager = createFeatureManager([feature], ctx);

      await manager.run();

      expect(feature.init).toHaveBeenCalledOnce();
    });

    it("provides an AbortSignal to each feature init", async () => {
      const feature = makeFeature({
        init: vi.fn((_ctx, signal) => {
          expect(signal).toBeInstanceOf(AbortSignal);
          expect(signal.aborted).toBe(false);
        }),
      });
      const ctx = mockCtx();
      const manager = createFeatureManager([feature], ctx);

      await manager.run();

      expect(feature.init).toHaveBeenCalledOnce();
    });
  });

  describe("onNavigate", () => {
    it("re-initializes features with reinitOnNavigation: true", async () => {
      const feature = makeFeature({
        id: "reinit",
        reinitOnNavigation: true,
      });
      const ctx = mockCtx();
      const manager = createFeatureManager([feature], ctx);

      await manager.run();
      expect(feature.init).toHaveBeenCalledOnce();

      await manager.onNavigate(ACTIONS_URL);
      expect(feature.init).toHaveBeenCalledTimes(2);
    });

    it("does NOT re-initialize features with reinitOnNavigation: false", async () => {
      let capturedSignal: AbortSignal | null = null;
      const feature = makeFeature({
        id: "no-reinit",
        reinitOnNavigation: false,
        init: vi.fn((_ctx, signal) => {
          capturedSignal = signal;
        }),
      });
      const ctx = mockCtx();
      const manager = createFeatureManager([feature], ctx);

      await manager.run();
      expect(feature.init).toHaveBeenCalledOnce();
      expect(capturedSignal).not.toBeNull();
      const signal = capturedSignal as unknown as AbortSignal;

      await manager.onNavigate(ACTIONS_URL);
      expect(feature.init).toHaveBeenCalledOnce(); // still 1
      expect(signal.aborted).toBe(false); // signal preserved
    });

    it("aborts the previous signal before re-initializing", async () => {
      let capturedSignal: AbortSignal | null = null;
      const feature = makeFeature({
        id: "signal-test",
        reinitOnNavigation: true,
        init: vi.fn((_ctx, signal) => {
          capturedSignal = signal;
        }),
      });
      const ctx = mockCtx();
      const manager = createFeatureManager([feature], ctx);

      await manager.run();
      expect(capturedSignal).not.toBeNull();
      const firstSignal = capturedSignal as unknown as AbortSignal;
      expect(firstSignal.aborted).toBe(false);

      await manager.onNavigate(ACTIONS_URL);
      expect(firstSignal.aborted).toBe(true);
    });

    it("evaluates include/exclude against the new URL", async () => {
      const isActions = (ctx: { pathname: string }) =>
        ctx.pathname.includes("/actions");
      const feature = makeFeature({
        id: "actions-only",
        include: [isActions],
        reinitOnNavigation: true,
      });
      const ctx = mockCtx();
      const manager = createFeatureManager([feature], ctx);

      await manager.onNavigate(ACTIONS_URL);
      expect(feature.init).toHaveBeenCalledOnce();

      await manager.onNavigate(HOME_URL);
      expect(feature.init).toHaveBeenCalledOnce(); // still 1
    });
  });

  describe("invalidation", () => {
    it("aborts all active signals on context invalidation", async () => {
      let capturedSignal: AbortSignal | null = null;
      const feature = makeFeature({
        init: vi.fn((_ctx, signal) => {
          capturedSignal = signal;
        }),
      });
      const ctx = mockCtx();
      const manager = createFeatureManager([feature], ctx);

      await manager.run();
      expect(capturedSignal).not.toBeNull();
      const signal = capturedSignal as unknown as AbortSignal;
      expect(signal.aborted).toBe(false);

      ctx._invalidate();
      expect(signal.aborted).toBe(true);
    });
  });

  describe("teardown error isolation", () => {
    it("does not break other features when an abort handler throws", async () => {
      const badFeature = makeFeature({
        id: "bad-teardown",
        reinitOnNavigation: true,
        init: vi.fn((_ctx, signal) => {
          signal.addEventListener("abort", () => {
            throw new Error("teardown boom");
          });
        }),
      });
      const goodFeature = makeFeature({
        id: "good",
        reinitOnNavigation: true,
      });
      const ctx = mockCtx();
      const manager = createFeatureManager([badFeature, goodFeature], ctx);

      await manager.run();
      await manager.onNavigate(ACTIONS_URL);

      expect(goodFeature.init).toHaveBeenCalledTimes(2);
    });
  });
});
