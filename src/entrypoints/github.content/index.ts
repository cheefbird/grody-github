import { initStatusIndicator } from "./features/status-indicator";
import { initWorkflowFilter } from "./features/workflow-filter";

export default defineContentScript({
  matches: ["*://github.com/*"],

  main(ctx) {
    // Status indicator: init once, persists across SPA navigation
    initStatusIndicator(ctx);

    // Workflow filter: page-specific, re-runs on SPA navigation
    initWorkflowFilter(ctx);
    ctx.addEventListener(window, "wxt:locationchange", () => {
      initWorkflowFilter(ctx);
    });
  },
});
