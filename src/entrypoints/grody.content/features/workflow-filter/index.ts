import { mount, unmount } from "svelte";
import { waitForElement } from "@/lib/dom";
import type { FeatureDefinition } from "@/lib/feature-types";
import { isActionsPage } from "../../page-context";
import WorkflowFilter from "./WorkflowFilter.svelte";

const SIDEBAR_NAV_SELECTOR = 'nav[aria-label="Actions Workflows"] ul';
const SHOW_MORE_SELECTOR = '[data-action*="nav-list-group#showMore"]';

function parseRepo(): { owner: string; repo: string } | null {
  const parts = location.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return { owner: parts[0], repo: parts[1] };
}

const definition: FeatureDefinition = {
  id: "workflow-filter",
  include: [isActionsPage],
  reinitOnNavigation: true,
  async init(_ctx, signal) {
    const navList = await waitForElement<HTMLElement>(
      SIDEBAR_NAV_SELECTOR,
      signal,
    );
    if (!navList) return;

    const showMore = navList
      .closest("nav")
      ?.querySelector<HTMLElement>(SHOW_MORE_SELECTOR);
    if (!showMore) return;
    const totalPages = Number(showMore.dataset.totalPages ?? "1");
    if (totalPages <= 1) return;

    const repoInfo = parseRepo();
    if (!repoInfo) return;

    const workflowsSection = navList.querySelector<HTMLElement>(
      ":scope > li:has(nav-list-group)",
    );
    if (!workflowsSection) return;

    const container = document.createElement("div");
    workflowsSection.before(container);

    let app: ReturnType<typeof mount> | null = mount(WorkflowFilter, {
      target: container,
      props: {
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        navList,
      },
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
