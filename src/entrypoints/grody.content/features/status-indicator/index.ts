import { mount, unmount } from "svelte";
import type { FeatureDefinition } from "@/lib/feature-types";
import { enabledStorage } from "@/lib/github-status";
import StatusBannerHost from "./StatusBannerHost.svelte";

const definition: FeatureDefinition = {
  id: "status-indicator",
  reinitOnNavigation: false,
  async init(_ctx, signal) {
    const enabled = await enabledStorage.getValue();
    if (!enabled || signal.aborted) return;

    const header = document.querySelector<HTMLElement>(
      "header.AppHeader, header[class*='appHeader'], header.HeaderMktg, div.Header",
    );
    if (!header) return;

    const existing = document.getElementById("grody-github-status");
    if (existing) existing.remove();

    const container = document.createElement("div");
    container.id = "grody-github-status";
    container.style.position = "relative";
    container.style.zIndex = "33";
    header.after(container);

    let app: ReturnType<typeof mount> | null = mount(StatusBannerHost, {
      target: container,
    });

    signal.addEventListener("abort", () => {
      if (app) {
        unmount(app);
        app = null;
      }
      container.remove();
    });
  },
};

export default definition;
