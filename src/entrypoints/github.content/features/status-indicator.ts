import { mount, unmount } from "svelte";
import type { ContentScriptContext } from "#imports";
import {
  collapsedStorage,
  enabledStorage,
  type GitHubStatusData,
  statusStorage,
} from "@/lib/github-status";
import StatusBanner from "../StatusBanner.svelte";

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

  const container = document.createElement("div");
  container.id = "grody-github-status";
  header.after(container);

  const stored = await statusStorage.getValue();
  const collapsed = (await collapsedStorage.getValue()) ?? false;

  let currentApp: ReturnType<typeof mount> | null = mount(StatusBanner, {
    target: container,
    props: {
      statusData: stored?.data ?? null,
      collapsed,
    },
  });

  function remount(statusData: GitHubStatusData | null, collapsed: boolean) {
    if (currentApp) {
      unmount(currentApp);
    }
    currentApp = mount(StatusBanner, {
      target: container,
      props: { statusData, collapsed },
    });
  }

  const unwatchStatus = statusStorage.watch(async (newValue) => {
    const collapsed = (await collapsedStorage.getValue()) ?? false;
    remount(newValue?.data ?? null, collapsed);
  });

  const unwatchCollapsed = collapsedStorage.watch(async (newCollapsed) => {
    const stored = await statusStorage.getValue();
    remount(stored?.data ?? null, newCollapsed);
  });

  ctx.onInvalidated(() => {
    unwatchStatus();
    unwatchCollapsed();
    if (currentApp) {
      unmount(currentApp);
      currentApp = null;
    }
    container.remove();
  });
}
