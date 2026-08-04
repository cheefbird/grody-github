import { mount, unmount } from "svelte";
import { waitForElement } from "@/lib/dom";
import type { FeatureDefinition } from "@/lib/feature-types";
import { isDeploymentsPage } from "../../page-context";
import EnvFilter from "./EnvFilter.svelte";

const ENV_NAV_SELECTOR = 'nav[class*="environmentlist"]';
const CONTAINER_CLASS = "grody-env-filter";

// Hides React's env list while our filter is active without touching its DOM
const HIDE_RULE = `.${CONTAINER_CLASS}[data-filtering] ~ ${ENV_NAV_SELECTOR} { display: none; }`;

function parseRepo(): { owner: string; repo: string } | null {
  const [owner, repo] = location.pathname.split("/").filter(Boolean);
  if (!owner || !repo) return null;
  return { owner, repo };
}

function hasShowMoreControl(nav: HTMLElement): boolean {
  return [...nav.querySelectorAll("a, button")].some((el) =>
    /show more environments/i.test(el.textContent ?? ""),
  );
}

const definition: FeatureDefinition = {
  id: "env-filter",
  include: [isDeploymentsPage],
  reinitOnNavigation: true,
  async init(_ctx, signal) {
    const nav = await waitForElement<HTMLElement>(ENV_NAV_SELECTOR, signal);
    if (!nav) {
      if (import.meta.env.DEV && !signal.aborted) {
        console.warn("[grody:env-filter] environments nav not found");
      }
      return;
    }

    if (signal.aborted) return;

    if (!hasShowMoreControl(nav)) return;

    const repoInfo = parseRepo();
    if (!repoInfo) return;

    const style = document.createElement("style");
    style.textContent = HIDE_RULE;
    document.head.append(style);

    const container = document.createElement("div");
    container.className = CONTAINER_CLASS;
    nav.before(container);

    let app: ReturnType<typeof mount> | null = mount(EnvFilter, {
      target: container,
      props: {
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        container,
      },
    });

    signal.addEventListener("abort", () => {
      if (app) {
        unmount(app);
        app = null;
      }
      container.remove();
      style.remove();
    });
  },
};

export default definition;
