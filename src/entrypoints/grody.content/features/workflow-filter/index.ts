import { unmount } from "svelte";
import {
  type MountedSidebarFilter,
  mountSidebarFilter,
} from "@/lib/components/sidebar-filter";
import { keepAttached, waitForElement } from "@/lib/dom";
import type { FeatureDefinition } from "@/lib/feature-types";
import { requestWorkflows } from "@/lib/github-api";
import type { Workflow } from "@/lib/types";
import { isActionsPage } from "../../page-context";

const SIDEBAR_NAV_SELECTOR = 'nav[aria-label="Actions workflows"]';
const GROUP_SELECTOR = ':scope > ul > li[data-component="ActionList.Group"]';
const GROUP_HEADING_SELECTOR = '[data-component="ActionList.GroupHeading"]';
const CONTAINER_CLASS = "grody-workflow-filter";

// Hides only the workflows section while our filter is active
const HIDE_RULE = `li.${CONTAINER_CLASS}[data-filtering] ~ li[data-component="ActionList.Group"] { display: none; }`;

function workflowFilename(workflow: Workflow): string {
  return workflow.path.split("/").pop() ?? "";
}

function findWorkflowsSection(nav: Element | null): HTMLElement | undefined {
  if (!nav) return undefined;
  return [...nav.querySelectorAll<HTMLElement>(GROUP_SELECTOR)].find(
    (group) =>
      group.querySelector(GROUP_HEADING_SELECTOR)?.textContent?.trim() ===
      "Workflows",
  );
}

function hasShowMoreControl(section: HTMLElement): boolean {
  return [...section.querySelectorAll("button")].some((el) =>
    /show more/i.test(el.textContent ?? ""),
  );
}

const definition: FeatureDefinition = {
  id: "workflow-filter",
  include: [isActionsPage],
  reinitOnNavigation: true,
  async init(_ctx, page, signal) {
    const { owner, repo } = page;
    if (!owner || !repo) return;

    const nav = await waitForElement<HTMLElement>(SIDEBAR_NAV_SELECTOR, signal);
    if (!nav) {
      if (import.meta.env.DEV && !signal.aborted) {
        console.warn(
          "[grody:workflow-filter] sidebar nav not found after waiting",
        );
      }
      return;
    }

    if (signal.aborted) return;

    const workflowsSection = findWorkflowsSection(nav);
    if (!workflowsSection || !hasShowMoreControl(workflowsSection)) return;

    const style = document.createElement("style");
    style.textContent = HIDE_RULE;
    document.head.append(style);

    const container = document.createElement("li");
    container.className = CONTAINER_CLASS;
    workflowsSection.before(container);
    keepAttached(
      container,
      () =>
        findWorkflowsSection(
          document.querySelector(SIDEBAR_NAV_SELECTOR),
        )?.before(container),
      signal,
    );

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
