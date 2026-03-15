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
      manager.onNavigate(newUrl).catch(console.error);
    });
  },
});
