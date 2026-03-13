import { getWorkflows } from "@/lib/github-api";
import {
  dismissedIncidentsStorage,
  enabledStorage,
  fetchGitHubStatus,
  pollIntervalStorage,
  pruneDismissedIncidents,
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

  // Prune dismissed incidents that have resolved
  const dismissed = await dismissedIncidentsStorage.getValue();
  if (dismissed.length > 0) {
    const activeIds = result.data.incidents.map((i) => i.id);
    const pruned = pruneDismissedIncidents(dismissed, activeIds);
    if (pruned.length !== dismissed.length) {
      await dismissedIncidentsStorage.setValue(pruned);
    }
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
  // Existing: workflow message handler
  browser.runtime.onMessage.addListener(
    (message: ExtensionMessage, _sender, sendResponse) => {
      if (message.type === "GET_WORKFLOWS") {
        getWorkflows(message.owner, message.repo).then(sendResponse);
        return true;
      }
    },
  );

  // Status polling: alarm handler
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
      pollGitHubStatus();
    }
  });

  // React to settings changes
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

  // Initial poll on activation
  startPolling();
});
