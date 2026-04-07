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

const ROCKET_ICON_PATH =
  "M14.064 0a8.75 8.75 0 0 0-6.187 2.563l-.459.458c-.314.314-.616.641-.904.979H3.31a1.75 1.75 0 0 0-1.49.833L.11 7.607a.75.75 0 0 0 .418 1.11l3.102.954c.037.051.079.1.124.145l2.429 2.428c.046.046.094.088.145.125l.954 3.102a.75.75 0 0 0 1.11.418l2.774-1.707a1.75 1.75 0 0 0 .833-1.49V9.485c.338-.288.665-.59.979-.904l.458-.459A8.75 8.75 0 0 0 16 1.936V1.75A1.75 1.75 0 0 0 14.25 0ZM8.5 1.563a7.25 7.25 0 0 1 5.13-2.126h.064c.566 0 1.048.382 1.193.93a7.25 7.25 0 0 1-2.126 5.13l-.459.458a15 15 0 0 1-1.077.948l-.305.243a1 1 0 0 1-.03.022l-2.877-2.877a1 1 0 0 1 .022-.03l.243-.305c.312-.39.637-.762.948-1.077Zm-3.39 4.975H3.31a.25.25 0 0 0-.213.119l-1.71 2.774 2.646.813Zm5.328 5.328.813 2.646 2.774-1.71a.25.25 0 0 0 .119-.213v-1.8ZM6.53 9.47a.75.75 0 0 1 0 1.06l-2 2a.75.75 0 0 1-1.06-1.06l2-2a.75.75 0 0 1 1.06 0Z";

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
  a.href = `/orgs/${org}/insights/deployments`;
  if (existingLink) {
    a.className = existingLink.className;
  }
  a.setAttribute("data-size", "medium");
  a.style.setProperty("--subitem-depth", "0");

  // Spacer (matches Dependencies structure)
  const spacer = document.createElement("span");
  const existingSpacer = existingLink?.querySelector('[class*="Spacer"]');
  if (existingSpacer) spacer.className = existingSpacer.className;
  a.appendChild(spacer);

  // Leading visual with rocket icon
  const visualWrap = document.createElement("span");
  const existingVisual = existingLink?.querySelector(
    '[class*="LeadingVisual"]',
  );
  if (existingVisual) visualWrap.className = existingVisual.className;
  visualWrap.appendChild(createRocketIcon());
  a.appendChild(visualWrap);

  // SubContent wrapper > Label (matches Dependencies structure)
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

function setActiveNav(pane: Element, isDeployments: boolean) {
  const depsLink = pane.querySelector<HTMLAnchorElement>(
    'a[href*="/insights/dependencies"]',
  );
  const depsLi = depsLink?.closest("li");
  const deploymentsLink = pane.querySelector<HTMLAnchorElement>(
    'a[href*="/insights/deployments"]',
  );
  const deploymentsLi = deploymentsLink?.closest("li");

  if (depsLink) {
    depsLink.setAttribute("aria-current", isDeployments ? "false" : "true");
  }
  if (depsLi) {
    if (isDeployments) {
      depsLi.removeAttribute("data-active");
    } else {
      depsLi.setAttribute("data-active", "true");
    }
  }
  if (deploymentsLink) {
    deploymentsLink.setAttribute(
      "aria-current",
      isDeployments ? "true" : "false",
    );
  }
  if (deploymentsLi) {
    if (isDeployments) {
      deploymentsLi.setAttribute("data-active", "true");
    } else {
      deploymentsLi.removeAttribute("data-active");
    }
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
