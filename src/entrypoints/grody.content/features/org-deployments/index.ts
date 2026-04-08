import { mount, unmount } from "svelte";
import { waitForElement } from "@/lib/dom";
import type { FeatureDefinition } from "@/lib/feature-types";
import { deploymentsEnabledStorage } from "@/lib/org-deployments-storage";
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
  return new URLSearchParams(location.search).get("view") === "deployments";
}

const ROCKET_ICON_PATH =
  "M14.064 0h.186C15.216 0 16 .784 16 1.75v.186a8.752 8.752 0 0 1-2.564 6.186l-.458.459c-.314.314-.641.616-.979.904v3.207c0 .608-.315 1.172-.833 1.49l-2.774 1.707a.749.749 0 0 1-1.11-.418l-.954-3.102a1.214 1.214 0 0 1-.145-.125L3.754 9.816a1.218 1.218 0 0 1-.124-.145L.528 8.717a.749.749 0 0 1-.418-1.11l1.71-2.774A1.748 1.748 0 0 1 3.31 4h3.204c.288-.338.59-.665.904-.979l.459-.458A8.749 8.749 0 0 1 14.064 0ZM8.938 3.623h-.002l-.458.458c-.76.76-1.437 1.598-2.02 2.5l-1.5 2.317 2.143 2.143 2.317-1.5c.902-.583 1.74-1.26 2.499-2.02l.459-.458a7.25 7.25 0 0 0 2.123-5.127V1.75a.25.25 0 0 0-.25-.25h-.186a7.249 7.249 0 0 0-5.125 2.123ZM3.56 14.56c-.732.732-2.334 1.045-3.005 1.148a.234.234 0 0 1-.201-.064.234.234 0 0 1-.064-.201c.103-.671.416-2.273 1.15-3.003a1.502 1.502 0 1 1 2.12 2.12Zm6.94-3.935c-.088.06-.177.118-.266.175l-2.35 1.521.548 1.783 1.949-1.2a.25.25 0 0 0 .119-.213ZM3.678 8.116 5.2 5.766c.058-.09.117-.178.176-.266H3.309a.25.25 0 0 0-.213.119l-1.2 1.95ZM12 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z";

function createRocketIcon(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("class", "octicon octicon-rocket");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("fill", "currentColor");
  svg.setAttribute("display", "inline-block");
  svg.setAttribute("overflow", "visible");
  svg.style.verticalAlign = "text-bottom";

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", ROCKET_ICON_PATH);
  svg.appendChild(path);
  return svg;
}

function createNavItem(org: string): HTMLElement {
  const li = document.createElement("li");
  li.setAttribute("data-grody-deployments-nav", "true");
  li.setAttribute("data-has-description", "false");

  // Clone structure from the existing Dependencies nav item
  const existingLink = document.querySelector(NAV_ITEM_SELECTOR);
  if (existingLink) {
    const existingLi = existingLink.closest("li");
    if (existingLi) {
      li.className = existingLi.className;
    }
  }

  const a = document.createElement("a");
  a.href = `/orgs/${org}/insights/dependencies?view=deployments`;
  if (existingLink) {
    a.className = existingLink.className;
  }
  a.setAttribute("data-size", "medium");
  a.style.setProperty("--subitem-depth", "0");

  const spacer = document.createElement("span");
  const existingSpacer = existingLink?.querySelector('[class*="Spacer"]');
  if (existingSpacer) spacer.className = existingSpacer.className;
  a.appendChild(spacer);

  const visualWrap = document.createElement("span");
  const existingVisual = existingLink?.querySelector(
    '[class*="LeadingVisual"]',
  );
  if (existingVisual) visualWrap.className = existingVisual.className;
  visualWrap.appendChild(createRocketIcon());
  a.appendChild(visualWrap);

  const subContent = document.createElement("span");
  const existingSubContent = existingLink?.querySelector(
    '[class*="SubContent"]',
  );
  if (existingSubContent) subContent.className = existingSubContent.className;

  const label = document.createElement("span");
  const existingLabel = existingLink?.querySelector('[class*="ItemLabel"]');
  if (existingLabel) label.className = existingLabel.className;
  label.textContent = "Deployments";
  subContent.appendChild(label);
  a.appendChild(subContent);

  li.appendChild(a);
  return li;
}

function setNavItemActive(link: Element | null, active: boolean) {
  link?.setAttribute("aria-current", active ? "true" : "false");
  const li = link?.closest("li");
  if (active) {
    li?.setAttribute("data-active", "true");
  } else {
    li?.removeAttribute("data-active");
  }
}

function setActiveNav(pane: Element, isDeployments: boolean) {
  setNavItemActive(
    pane.querySelector('a[href*="/insights/dependencies"]'),
    !isDeployments,
  );
  setNavItemActive(
    pane.querySelector('a[href*="view=deployments"]'),
    isDeployments,
  );
}

const definition: FeatureDefinition = {
  id: "org-deployments",
  include: [isOrgInsightsPage],
  reinitOnNavigation: true,
  async init(_ctx, signal) {
    const enabled = await deploymentsEnabledStorage.getValue();
    if (!enabled || signal.aborted) return;

    const org = parseOrg();
    if (!org) return;

    const existingNav = await waitForElement<HTMLElement>(
      NAV_ITEM_SELECTOR,
      signal,
    );
    if (!existingNav) return;

    // Re-bind after null guards — TS doesn't narrow across function boundaries
    const pane = existingNav.closest<HTMLElement>(SIDEBAR_SELECTOR);
    if (!pane) return;
    const sidebarPane: HTMLElement = pane;
    const contentEl = document.querySelector<HTMLElement>(CONTENT_SELECTOR);
    if (!contentEl) return;
    const content: HTMLElement = contentEl;
    const orgName: string = org;

    function injectNavIfMissing() {
      if (sidebarPane.querySelector("[data-grody-deployments-nav]")) return;
      const anchor = sidebarPane.querySelector(NAV_ITEM_SELECTOR);
      if (!anchor) return;

      const navItem = createNavItem(orgName);
      anchor.closest("li")?.after(navItem);

      navItem.addEventListener("click", (e) => {
        e.preventDefault();
        const url = new URL(location.href);
        url.pathname = `/orgs/${orgName}/insights/dependencies`;
        url.searchParams.set("view", "deployments");
        history.pushState(null, "", url.toString());
        window.dispatchEvent(new PopStateEvent("popstate"));
      });

      setActiveNav(sidebarPane, isDeploymentsUrl());
    }

    injectNavIfMissing();

    // Re-inject after React hydration wipes the sidebar
    const sidebarObserver = new MutationObserver(() => injectNavIfMissing());
    sidebarObserver.observe(sidebarPane, { childList: true, subtree: true });
    signal.addEventListener("abort", () => sidebarObserver.disconnect());

    if (!isDeploymentsUrl()) {
      setActiveNav(sidebarPane, false);
      return;
    }

    setActiveNav(sidebarPane, true);

    const originalChildren = [...content.childNodes].map((n) =>
      n.cloneNode(true),
    );

    const container = document.createElement("div");
    container.setAttribute("data-grody-deployments", "true");
    content.replaceChildren(container);

    let app: ReturnType<typeof mount> | null = mount(OrgDeployments, {
      target: container,
      props: { org: orgName },
    });

    signal.addEventListener("abort", () => {
      if (app) {
        unmount(app);
        app = null;
      }
      content.replaceChildren(...originalChildren);
    });
  },
};

export default definition;
