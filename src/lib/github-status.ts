// src/lib/github-status.ts

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

export const dismissedIncidentsStorage = storage.defineItem<string[]>(
  "local:github-status:dismissed-incidents",
  { fallback: [] },
);
