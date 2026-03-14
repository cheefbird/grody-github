export type StatusIndicator = "none" | "minor" | "major" | "critical";

export type IncidentStatus = "investigating" | "identified" | "monitoring";

export type ComponentStatus =
  | "degraded_performance"
  | "partial_outage"
  | "major_outage"
  | "under_maintenance";

export interface StatusComponent {
  name: string;
  status: ComponentStatus;
}

export interface StatusIncident {
  id: string;
  name: string;
  status: IncidentStatus;
  impact: StatusIndicator;
  shortlink: string;
  started_at: string;
  updated_at: string;
  components: StatusComponent[];
}

export interface GitHubStatusData {
  indicator: StatusIndicator;
  incidents: StatusIncident[];
}

export const statusStorage = storage.defineItem<GitHubStatusData | null>(
  "local:github-status",
  { fallback: null },
);

export const pollIntervalStorage = storage.defineItem<number>(
  "local:github-status:poll-interval",
  { fallback: 15 },
);

export const enabledStorage = storage.defineItem<boolean>(
  "local:github-status:enabled",
  { fallback: true },
);

export const collapsedStorage = storage.defineItem<boolean>(
  "local:github-status:collapsed",
  { fallback: false },
);

export function indicatorColor(indicator: StatusIndicator): string {
  if (indicator === "critical") return "#da3633";
  if (indicator === "major") return "#f0883e";
  return "#d29922";
}

const TIME_UNITS = [
  { ceiling: 60, divisor: 1, suffix: "m" },
  { ceiling: 1_440, divisor: 60, suffix: "h" },
  { ceiling: Infinity, divisor: 1_440, suffix: "d" },
] as const;

export function timeSince(timestamp: string): string {
  const ms = Date.now() - new Date(timestamp).getTime();
  if (!Number.isFinite(ms) || ms < 60_000) return "just now";

  const totalMinutes = Math.floor(ms / 60_000);
  for (const { ceiling, divisor, suffix } of TIME_UNITS) {
    if (totalMinutes < ceiling) {
      return `${Math.floor(totalMinutes / divisor)}${suffix} ago`;
    }
  }
  return "just now";
}

export function componentStatusColor(status: ComponentStatus): string {
  if (status === "major_outage") return "#f85149";
  if (status === "partial_outage") return "#e5534b";
  if (status === "degraded_performance") return "#d4843e";
  return "#ae7c14";
}

const VALID_INDICATORS = new Set<StatusIndicator>([
  "none",
  "minor",
  "major",
  "critical",
]);

const VALID_INCIDENT_STATUSES = new Set<IncidentStatus>([
  "investigating",
  "identified",
  "monitoring",
]);

const VALID_COMPONENT_STATUSES = new Set<ComponentStatus>([
  "degraded_performance",
  "partial_outage",
  "major_outage",
  "under_maintenance",
]);

// biome-ignore lint/suspicious/noExplicitAny: raw API response shape validated by transform
export function transformSummary(raw: any): GitHubStatusData {
  const incidents: StatusIncident[] = [];

  for (const incident of raw.incidents ?? []) {
    if (!VALID_INCIDENT_STATUSES.has(incident.status)) continue;

    const components: StatusComponent[] = (incident.components ?? [])
      .filter(
        (c: { status: string }) =>
          c.status !== "operational" &&
          VALID_COMPONENT_STATUSES.has(c.status as ComponentStatus),
      )
      .map((c: { name: string; status: string }) => ({
        name: c.name,
        status: c.status as ComponentStatus,
      }));

    incidents.push({
      id: incident.id,
      name: incident.name,
      status: incident.status as IncidentStatus,
      impact: VALID_INDICATORS.has(incident.impact) ? incident.impact : "none",
      shortlink: incident.shortlink ?? "",
      started_at: incident.started_at ?? "",
      updated_at: incident.updated_at ?? "",
      components,
    });
  }

  const indicator = VALID_INDICATORS.has(raw.status?.indicator)
    ? raw.status.indicator
    : "none";

  return { indicator, incidents };
}

const STATUS_API_URL = "https://www.githubstatus.com/api/v2/summary.json";

export type FetchStatusResult =
  | { ok: true; data: GitHubStatusData }
  | { ok: false; reason: "network-error" | "api-error" | "parse-error" };

export async function fetchGitHubStatus(): Promise<FetchStatusResult> {
  let response: Response;
  try {
    response = await fetch(STATUS_API_URL);
  } catch {
    return { ok: false, reason: "network-error" };
  }

  if (!response.ok) {
    return { ok: false, reason: "api-error" };
  }

  try {
    const raw = await response.json();
    return { ok: true, data: transformSummary(raw) };
  } catch {
    return { ok: false, reason: "parse-error" };
  }
}
