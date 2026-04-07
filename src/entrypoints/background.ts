import { getOrgDeployments } from "@/lib/deployment-api";
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
const DEFAULT_POLL_MINUTES = 15;

function sanitizeInterval(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 1) return DEFAULT_POLL_MINUTES;
  return num;
}

async function pollGitHubStatus() {
  const result = await fetchGitHubStatus();
  if (!result.ok) return;

  await statusStorage.setValue(result.data);

  if (result.data.incidents.length === 0) {
    await collapsedStorage.setValue(false);
  }
}

async function startPolling() {
  const enabled = await enabledStorage.getValue();
  if (!enabled) return;

  const interval = sanitizeInterval(await pollIntervalStorage.getValue());
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
      if (message.type === "GET_ORG_DEPLOYMENTS") {
        getOrgDeployments(message.org, message.force).then(sendResponse);
        return true;
      }
    },
  );

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
      pollGitHubStatus().catch(() => {});
    }
  });

  enabledStorage.watch((enabled) => {
    if (enabled) {
      startPolling().catch(() => {});
    } else {
      stopPolling().catch(() => {});
    }
  });

  pollIntervalStorage.watch(async (interval) => {
    try {
      const enabled = await enabledStorage.getValue();
      if (!enabled) return;
      await browser.alarms.clear(ALARM_NAME);
      await browser.alarms.create(ALARM_NAME, {
        periodInMinutes: sanitizeInterval(interval),
      });
      await pollGitHubStatus();
    } catch {}
  });

  startPolling().catch(() => {});
});
