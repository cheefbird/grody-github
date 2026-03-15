import type { ContentScriptContext } from "wxt/utils/content-script-context";
import type { FeatureDefinition, PageContext } from "@/lib/feature-types";
import { buildPageContext } from "./page-context";

export function createFeatureManager(
  features: FeatureDefinition[],
  ctx: ContentScriptContext,
) {
  if (import.meta.env.DEV) {
    const ids = features.map((f) => f.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dupes.length > 0) {
      console.error(`[grody] duplicate feature IDs: ${dupes.join(", ")}`);
    }
  }

  const activeControllers = new Map<string, AbortController>();

  function shouldRun(
    feature: FeatureDefinition,
    pageCtx: PageContext,
  ): boolean {
    if (feature.exclude?.some((fn) => fn(pageCtx))) return false;
    if (feature.include && !feature.include.some((fn) => fn(pageCtx)))
      return false;
    return true;
  }

  function teardown(featureId: string) {
    try {
      activeControllers.get(featureId)?.abort();
    } catch (err) {
      console.error(`[grody] feature "${featureId}" teardown error:`, err);
    }
    activeControllers.delete(featureId);
  }

  async function initFeature(feature: FeatureDefinition, pageCtx: PageContext) {
    teardown(feature.id);

    if (!shouldRun(feature, pageCtx)) return;

    const controller = new AbortController();
    activeControllers.set(feature.id, controller);

    try {
      await feature.init(ctx, controller.signal);
    } catch (err) {
      console.error(`[grody] feature "${feature.id}" failed to init:`, err);
      teardown(feature.id);
    }
  }

  async function run() {
    const pageCtx = buildPageContext(new URL(location.href));
    await Promise.allSettled(features.map((f) => initFeature(f, pageCtx)));
  }

  async function onNavigate(url: URL) {
    const pageCtx = buildPageContext(url);
    await Promise.allSettled(
      features
        .filter((f) => f.reinitOnNavigation)
        .map((f) => initFeature(f, pageCtx)),
    );
  }

  ctx.onInvalidated(() => {
    for (const id of [...activeControllers.keys()]) {
      teardown(id);
    }
  });

  return { run, onNavigate };
}
