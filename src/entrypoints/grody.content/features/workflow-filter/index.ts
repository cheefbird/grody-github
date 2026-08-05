import { unmount } from "svelte";
import {
  type MountedSidebarFilter,
  mountSidebarFilter,
} from "@/lib/components/sidebar-filter";
import { waitForElement } from "@/lib/dom";
import type { FeatureDefinition } from "@/lib/feature-types";
import { requestWorkflows } from "@/lib/github-api";
import type { Workflow } from "@/lib/types";
import { isActionsPage } from "../../page-context";

const SIDEBAR_NAV_SELECTOR = 'nav[aria-label="Actions Workflows"] ul';
const SHOW_MORE_SELECTOR = '[data-action*="nav-list-group#showMore"]';
const WORKFLOWS_SECTION_SELECTOR = ":scope > li:has(nav-list-group)";
const CONTAINER_CLASS = "grody-workflow-filter";

// Hides only the workflows section while our filter is active
const HIDE_RULE = `li.${CONTAINER_CLASS}[data-filtering] ~ li:has(nav-list-group) { display: none; }`;

function workflowFilename(workflow: Workflow): string {
  return workflow.path.split("/").pop() ?? "";
}

const definition: FeatureDefinition = {
  id: "workflow-filter",
  include: [isActionsPage],
  reinitOnNavigation: true,
  async init(_ctx, page, signal) {
    const { owner, repo } = page;
    if (!owner || !repo) return;

    const navList = await waitForElement<HTMLElement>(
      SIDEBAR_NAV_SELECTOR,
      signal,
    );
    if (!navList) {
      if (import.meta.env.DEV && !signal.aborted) {
        console.warn(
          "[grody:workflow-filter] sidebar nav not found after waiting",
        );
      }
      return;
    }

    if (signal.aborted) return;

    const showMore = navList
      .closest("nav")
      ?.querySelector<HTMLElement>(SHOW_MORE_SELECTOR);
    if (!showMore) return;
    const totalPages = Number(showMore.dataset.totalPages ?? "1");
    if (totalPages <= 1) return;

    const workflowsSection = navList.querySelector<HTMLElement>(
      WORKFLOWS_SECTION_SELECTOR,
    );
    if (!workflowsSection) return;

    const style = document.createElement("style");
    style.textContent = HIDE_RULE;
    document.head.append(style);

    const container = document.createElement("li");
    container.className = CONTAINER_CLASS;
    workflowsSection.before(container);

    // Registered before mount so a mount() throw still triggers cleanup
    let app: MountedSidebarFilter | null = null;

    signal.addEventListener("abort", () => {
      if (app) {
        unmount(app);
        app = null;
      }
      container.remove();
      style.remove();
    });

    app = mountSidebarFilter<Workflow>(container, {
      fetch: () => requestWorkflows(owner, repo),
      placeholder: "Filter workflows...",
      emptyText: "No workflows match your filter.",
      getSearchText: (workflow) =>
        `${workflow.name} ${workflowFilename(workflow)}`,
      getHref: (workflow) =>
        `/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflowFilename(workflow))}`,
      getLabel: (workflow) => workflow.name,
      linkAttrs: { "data-turbo-frame": "repo-content-turbo-frame" },
    });
  },
};

export default definition;
