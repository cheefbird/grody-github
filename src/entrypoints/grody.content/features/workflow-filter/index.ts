import { mount, unmount } from "svelte";
import { waitForElement } from "@/lib/dom";
import type { FeatureDefinition } from "@/lib/feature-types";
import { isActionsPage } from "../../page-context";
import WorkflowFilter from "./WorkflowFilter.svelte";

const SIDEBAR_NAV_SELECTOR = 'nav[aria-label="Actions Workflows"] ul';
const SHOW_MORE_SELECTOR = '[data-action*="nav-list-group#showMore"]';

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
      ":scope > li:has(nav-list-group)",
    );
    if (!workflowsSection) return;

    const container = document.createElement("div");
    workflowsSection.before(container);

    // Registered before mount so a mount() throw still triggers cleanup
    let app: ReturnType<typeof mount> | null = null;

    signal.addEventListener("abort", () => {
      if (app) {
        unmount(app);
        app = null;
      }
      container.remove();
    });

    app = mount(WorkflowFilter, {
      target: container,
      props: {
        owner,
        repo,
        navList,
      },
    });
  },
};

export default definition;
