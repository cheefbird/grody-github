import type { PageContext } from "@/lib/feature-types";

const REPO_PATTERN = /^\/([^/]+)\/([^/]+)/;

export function buildPageContext(url: URL): PageContext {
  const match = url.pathname.match(REPO_PATTERN);
  return {
    url,
    pathname: url.pathname,
    owner: match?.[1],
    repo: match?.[2],
  };
}

export const isActionsPage = (ctx: PageContext) =>
  /^\/[^/]+\/[^/]+\/actions(\/|$)/.test(ctx.pathname);

export const isRepoPage = (ctx: PageContext) =>
  ctx.owner !== undefined && ctx.repo !== undefined;

export const isPRPage = (ctx: PageContext) =>
  /^\/[^/]+\/[^/]+\/pull\/\d+/.test(ctx.pathname);

export const isIssuePage = (ctx: PageContext) =>
  /^\/[^/]+\/[^/]+\/issues\/\d+/.test(ctx.pathname);
