import { getWorkflows } from "@/lib/github-api";
import {
  collapsedStorage,
  enabledStorage,
  fetchGitHubStatus,
  pollIntervalStorage,
  statusStorage,
} from "@/lib/github-status";
import type { ExtensionMessage } from "@/lib/messages";

const ALARM_NAME = "github-status-poll";

async function pollGitHubStatus() {
  const result = await fetchGitHubStatus();
  if (!result.ok) return;

  await statusStorage.setValue({
    data: result.data,
    timestamp: Date.now(),
  });

  if (result.data.incidents.length === 0) {
    await collapsedStorage.setValue(false);
  }
}

async function startPolling() {
  const enabled = await enabledStorage.getValue();
  if (!enabled) return;

  const interval = await pollIntervalStorage.getValue();
  await browser.alarms.create(ALARM_NAME, { periodInMinutes: interval });
  await pollGitHubStatus();
}

async function stopPolling() {
  await browser.alarms.clear(ALARM_NAME);
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    (message: ExtensionMessage, _sender, sendResponse) => {
      if (message.type === "GET_WORKFLOWS") {
        getWorkflows(message.owner, message.repo).then(sendResponse);
        return true;
      }
    },
  );

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
      pollGitHubStatus();
    }
  });

  enabledStorage.watch((enabled) => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }
  });

  pollIntervalStorage.watch(async (interval) => {
    const enabled = await enabledStorage.getValue();
    if (!enabled) return;
    await browser.alarms.clear(ALARM_NAME);
    await browser.alarms.create(ALARM_NAME, { periodInMinutes: interval });
  });

  startPolling();
});
