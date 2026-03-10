import { initWorkflowFilter } from "./features/workflow-filter";

export default defineContentScript({
  matches: ["*://github.com/*"],

  main(ctx) {
    // Run features that match the current page
    initWorkflowFilter(ctx);

    // Re-run on SPA navigation
    ctx.addEventListener(window, "wxt:locationchange", () => {
      initWorkflowFilter(ctx);
    });
  },
});
