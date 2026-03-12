import { mount, unmount } from "svelte";
import type { ContentScriptContext } from "#imports";
import WorkflowFilter from "../WorkflowFilter.svelte";

const SIDEBAR_NAV_SELECTOR = 'nav[aria-label="Actions Workflows"] ul';
const SHOW_MORE_SELECTOR = '[data-action*="nav-list-group#showMore"]';
export const ACTIONS_PATTERN = /^\/[^/]+\/[^/]+\/actions(\/|$)/;

export function parseRepo(
  pathname: string = location.pathname,
): { owner: string; repo: string } | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return { owner: parts[0], repo: parts[1] };
}

function findNavList(): HTMLElement | null {
  if (!ACTIONS_PATTERN.test(location.pathname)) return null;

  const navList = document.querySelector<HTMLElement>(SIDEBAR_NAV_SELECTOR);
  if (!navList) return null;
  const showMore = navList
    .closest("nav")
    ?.querySelector<HTMLElement>(SHOW_MORE_SELECTOR);
  if (!showMore) return null;
  const totalPages = Number(showMore.dataset.totalPages ?? "1");
  if (totalPages <= 1) return null;
  return navList;
}

let currentApp: ReturnType<typeof mount> | null = null;
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

export function initWorkflowFilter(_ctx: ContentScriptContext) {
  teardown();

  const navList = findNavList();
  if (!navList) return;

  const repoInfo = parseRepo();
  if (!repoInfo) return;

  // Find the workflows section to insert before it
  const workflowsSection = navList.querySelector<HTMLElement>(
    ":scope > li:has(nav-list-group)",
  );
  if (!workflowsSection) return;

  // Mount directly into the DOM at the right position
  const container = document.createElement("div");
  workflowsSection.before(container);
  currentContainer = container;

  currentApp = mount(WorkflowFilter, {
    target: container,
    props: {
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      navList,
    },
  });
}
