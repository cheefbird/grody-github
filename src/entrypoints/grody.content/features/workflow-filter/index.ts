import { mount, unmount } from "svelte";
import type { FeatureDefinition } from "@/lib/feature-types";
import { isActionsPage } from "../../page-context";
import WorkflowFilter from "./WorkflowFilter.svelte";

const SIDEBAR_NAV_SELECTOR = 'nav[aria-label="Actions Workflows"] ul';
const SHOW_MORE_SELECTOR = '[data-action*="nav-list-group#showMore"]';

function findNavList(): HTMLElement | null {
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

function parseRepo(): { owner: string; repo: string } | null {
  const parts = location.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return { owner: parts[0], repo: parts[1] };
}

const definition: FeatureDefinition = {
  id: "workflow-filter",
  include: [isActionsPage],
  reinitOnNavigation: true,
  init(_ctx, signal) {
    const navList = findNavList();
    if (!navList) return;

    const repoInfo = parseRepo();
    if (!repoInfo) return;

    const workflowsSection = navList.querySelector<HTMLElement>(
      ":scope > li:has(nav-list-group)",
    );
    if (!workflowsSection) return;

    const container = document.createElement("div");
    workflowsSection.before(container);

    const app = mount(WorkflowFilter, {
      target: container,
      props: {
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        navList,
      },
    });

    signal.addEventListener("abort", () => {
      try {
        unmount(app);
      } catch (err) {
        console.error("[grody] workflow-filter unmount error:", err);
      }
      container.remove();
    });
  },
};

export default definition;
