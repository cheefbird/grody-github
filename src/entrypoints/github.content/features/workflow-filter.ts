import type { ContentScriptContext } from "#imports";
import WorkflowFilter from "../WorkflowFilter.svelte";
import { mount, unmount } from "svelte";

const SIDEBAR_NAV_SELECTOR = 'nav[aria-label="Actions Workflows"] ul';
const SHOW_MORE_SELECTOR = '[data-action*="nav-list-group#showMore"]';
const ACTIONS_PATTERN = /^\/[^/]+\/[^/]+\/actions(\/|$)/;

function parseRepo(): { owner: string; repo: string } | null {
  const parts = location.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return { owner: parts[0], repo: parts[1] };
}

function shouldActivate(): HTMLElement | null {
  if (!ACTIONS_PATTERN.test(location.pathname)) return null;

  const navList = document.querySelector<HTMLElement>(SIDEBAR_NAV_SELECTOR);
  if (!navList) return null;
  const showMore = navList
    .closest("nav")
    ?.querySelector<HTMLElement>(SHOW_MORE_SELECTOR);
  if (!showMore) return null;
  return navList;
}

let currentApp: Record<string, any> | null = null;
let currentContainer: HTMLElement | null = null;

function teardown() {
  if (currentApp) {
    unmount(currentApp);
    currentApp = null;
  }
  if (currentContainer) {
    currentContainer.remove();
    currentContainer = null;
  }
}

export function initWorkflowFilter(ctx: ContentScriptContext) {
  teardown();

  const navList = shouldActivate();
  if (!navList) return;

  const repoInfo = parseRepo();
  if (!repoInfo) return;

  const ui = createIntegratedUi(ctx, {
    position: "inline",
    anchor: SIDEBAR_NAV_SELECTOR,
    onMount: (container: HTMLElement) => {
      currentContainer = container;
      currentApp = mount(WorkflowFilter, {
        target: container,
        props: {
          owner: repoInfo.owner,
          repo: repoInfo.repo,
          navList,
        },
      });
      return currentApp;
    },
    onRemove: (app?: Record<string, any>) => {
      if (app) unmount(app);
      currentApp = null;
      currentContainer = null;
    },
  });

  ui.mount();
}
