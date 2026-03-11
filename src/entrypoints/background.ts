import { getWorkflows } from "@/lib/github-api";
import type { ExtensionMessage } from "@/lib/messages";

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    (message: ExtensionMessage, _sender, sendResponse) => {
      if (message.type === "GET_WORKFLOWS") {
        getWorkflows(message.owner, message.repo).then(sendResponse);
        return true;
      }
    },
  );
});
