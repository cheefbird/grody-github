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
  components: StatusComponent[];
}

export interface GitHubStatusData {
  indicator: StatusIndicator;
  incidents: StatusIncident[];
}

export interface StoredStatus {
  data: GitHubStatusData;
  timestamp: number;
}

export const statusStorage = storage.defineItem<StoredStatus | null>(
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
