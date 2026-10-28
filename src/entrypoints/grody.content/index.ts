import type { FeatureDefinition } from "@/lib/feature-types";
import { createFeatureManager } from "./feature-manager";

const modules = import.meta.glob<{ default: FeatureDefinition }>(
  "./features/*/index.ts",
  { eager: true },
);

const features = Object.values(modules).map((m) => m.default);

export default defineContentScript({
  matches: ["*://github.com/*"],

  async main(ctx) {
    const manager = createFeatureManager(features, ctx);

    await manager.run();

    ctx.addEventListener(window, "wxt:locationchange", ({ newUrl }) => {
      manager.onNavigate(newUrl).catch((err) => {
        console.error("[grody] navigation handler failed:", err);
      });
    });

    // Features were torn down before entering bfcache; restore needs a re-init
    ctx.addEventListener(window, "pageshow", (event) => {
      if (!event.persisted) return;
      manager.onNavigate(new URL(location.href)).catch((err) => {
        console.error("[grody] bfcache restore handler failed:", err);
      });
    });
  },
});
