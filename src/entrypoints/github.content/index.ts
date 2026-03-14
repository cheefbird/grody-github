import { initStatusIndicator } from "./features/status-indicator";
import { initWorkflowFilter } from "./features/workflow-filter";

export default defineContentScript({
  matches: ["*://github.com/*"],

  main(ctx) {
    initStatusIndicator(ctx);

    initWorkflowFilter(ctx);
    ctx.addEventListener(window, "wxt:locationchange", () => {
      initWorkflowFilter(ctx);
    });
  },
});
