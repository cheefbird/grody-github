import { mount, unmount } from "svelte";
import type { ContentScriptContext } from "#imports";
import { enabledStorage } from "@/lib/github-status";
import StatusBannerHost from "../StatusBannerHost.svelte";

function findHeader(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    "header.AppHeader, header[class*='appHeader'], header.HeaderMktg, div.Header",
  );
}

export async function initStatusIndicator(ctx: ContentScriptContext) {
  const enabled = await enabledStorage.getValue();
  if (!enabled) return;

  const header = findHeader();
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

  ctx.onInvalidated(() => {
    if (app) {
      unmount(app);
      app = null;
    }
    container.remove();
  });
}
