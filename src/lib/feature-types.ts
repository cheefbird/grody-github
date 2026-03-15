import type { ContentScriptContext } from "wxt/utils/content-script-context";

export interface PageContext {
  url: URL;
  pathname: string;
  owner?: string;
  repo?: string;
}

export interface FeatureDefinition {
  id: string;
  include?: Array<(ctx: PageContext) => boolean>;
  exclude?: Array<(ctx: PageContext) => boolean>;
  reinitOnNavigation: boolean;
  init: (
    ctx: ContentScriptContext,
    signal: AbortSignal,
  ) => void | Promise<void>;
}
