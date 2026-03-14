import { mount, unmount } from "svelte";
import type { ContentScriptContext } from "#imports";
import StatusBanner from "../StatusBanner.svelte";
import {
  dismissedIncidentsStorage,
  enabledStorage,
  statusStorage,
  type GitHubStatusData,
} from "@/lib/github-status";

function findHeader(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>("header.AppHeader") ??
    document.querySelector<HTMLElement>("header[class*='appHeader']") ??
    document.querySelector<HTMLElement>("div.Header")
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
  const dismissed = await dismissedIncidentsStorage.getValue();

  let currentApp: ReturnType<typeof mount> | null = mount(StatusBanner, {
    target: container,
    props: {
      statusData: stored?.data ?? null,
      dismissedIds: dismissed,
    },
  });

  function remount(
    statusData: GitHubStatusData | null,
    dismissedIds: string[],
  ) {
    if (currentApp) {
      unmount(currentApp);
    }
    currentApp = mount(StatusBanner, {
      target: container,
      props: { statusData, dismissedIds },
    });
  }

  const unwatchStatus = statusStorage.watch(async (newValue) => {
    const ids = await dismissedIncidentsStorage.getValue();
    remount(newValue?.data ?? null, ids);
  });

  ctx.onInvalidated(() => {
    unwatchStatus();
    if (currentApp) {
      unmount(currentApp);
      currentApp = null;
    }
    container.remove();
  });
}
