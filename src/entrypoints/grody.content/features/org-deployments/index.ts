import { mount, unmount } from "svelte";
import { waitForElement } from "@/lib/dom";
import type { FeatureDefinition } from "@/lib/feature-types";
import { isOrgInsightsPage } from "../../page-context";
import OrgDeployments from "./OrgDeployments.svelte";

const SIDEBAR_SELECTOR = ".PageLayout-pane";
const CONTENT_SELECTOR = ".PageLayout-content";
const NAV_ITEM_SELECTOR = '.PageLayout-pane [class*="ActionListContent"]';

function parseOrg(): string | null {
  const match = location.pathname.match(/^\/orgs\/([^/]+)/);
  return match?.[1] ?? null;
}

function isDeploymentsUrl(): boolean {
  return location.pathname.includes("/insights/deployments");
}

function createNavItem(org: string): HTMLElement {
  const li = document.createElement("li");
  li.setAttribute("data-grody-deployments-nav", "true");

  const a = document.createElement("a");
  a.href = `/orgs/${org}/insights/deployments`;

  const existingLink = document.querySelector(NAV_ITEM_SELECTOR);
  if (existingLink) {
    a.className = existingLink.className;
  }

  const label = document.createElement("span");
  label.textContent = "Deployments";
  a.appendChild(label);
  li.appendChild(a);

  return li;
}

function setActiveNav(pane: Element, isDeployments: boolean) {
  const depsLink = pane.querySelector<HTMLAnchorElement>(
    'a[href*="/insights/dependencies"]',
  );
  const deploymentsLink = pane.querySelector<HTMLAnchorElement>(
    'a[href*="/insights/deployments"]',
  );

  if (depsLink) {
    depsLink.setAttribute("aria-current", isDeployments ? "false" : "true");
  }
  if (deploymentsLink) {
    deploymentsLink.setAttribute(
      "aria-current",
      isDeployments ? "true" : "false",
    );
  }
}

const definition: FeatureDefinition = {
  id: "org-deployments",
  include: [isOrgInsightsPage],
  reinitOnNavigation: true,
  async init(_ctx, signal) {
    const org = parseOrg();
    if (!org) return;

    const pane = await waitForElement<HTMLElement>(SIDEBAR_SELECTOR, signal);
    if (!pane) return;

    const content = document.querySelector<HTMLElement>(CONTENT_SELECTOR);
    if (!content) return;

    if (!pane.querySelector("[data-grody-deployments-nav]")) {
      const existingNavItem = pane.querySelector(NAV_ITEM_SELECTOR);
      const navItem = createNavItem(org);

      if (existingNavItem?.closest("li")) {
        existingNavItem.closest("li")?.after(navItem);
      }

      navItem.addEventListener("click", (e) => {
        e.preventDefault();
        history.pushState(null, "", `/orgs/${org}/insights/deployments`);
        window.dispatchEvent(new PopStateEvent("popstate"));
      });
    }

    if (!isDeploymentsUrl()) {
      setActiveNav(pane, false);
      return;
    }

    setActiveNav(pane, true);

    const originalChildren = [...content.childNodes].map((n) =>
      n.cloneNode(true),
    );

    const container = document.createElement("div");
    container.setAttribute("data-grody-deployments", "true");
    content.replaceChildren(container);

    let app: ReturnType<typeof mount> | null = mount(OrgDeployments, {
      target: container,
      props: { org },
    });

    signal.addEventListener("abort", () => {
      if (app) {
        unmount(app);
        app = null;
      }
      content.replaceChildren(...originalChildren);
      pane.querySelector("[data-grody-deployments-nav]")?.remove();
    });
  },
};

export default definition;
