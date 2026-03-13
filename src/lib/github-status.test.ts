import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchGitHubStatus,
  pruneDismissedIncidents,
  transformSummary,
} from "./github-status";

function makeSummaryResponse(overrides: {
  indicator?: string;
  incidents?: Array<{
    id: string;
    name: string;
    status: string;
    impact: string;
    shortlink: string;
    started_at: string;
    components: Array<{ name: string; status: string }>;
  }>;
}) {
  return {
    status: {
      indicator: overrides.indicator ?? "none",
      description: "All Systems Operational",
    },
    components: [],
    incidents: overrides.incidents ?? [],
    scheduled_maintenances: [],
    page: { id: "kctbh9vrtdwd", name: "GitHub" },
  };
}

describe("transformSummary", () => {
  it("returns empty incidents when all operational", () => {
    const raw = makeSummaryResponse({ indicator: "none" });
    const result = transformSummary(raw);
    expect(result).toEqual({ indicator: "none", incidents: [] });
  });

  it("includes unresolved incidents with non-operational components", () => {
    const raw = makeSummaryResponse({
      indicator: "major",
      incidents: [
        {
          id: "abc123",
          name: "Degraded Actions",
          status: "investigating",
          impact: "major",
          shortlink: "https://stspg.io/abc",
          started_at: "2026-03-13T10:00:00Z",
          components: [
            { name: "Actions", status: "degraded_performance" },
            { name: "Git Operations", status: "operational" },
          ],
        },
      ],
    });
    const result = transformSummary(raw);
    expect(result.indicator).toBe("major");
    expect(result.incidents).toHaveLength(1);
    expect(result.incidents[0].components).toEqual([
      { name: "Actions", status: "degraded_performance" },
    ]);
  });

  it("filters out resolved and postmortem incidents", () => {
    const raw = makeSummaryResponse({
      indicator: "none",
      incidents: [
        {
          id: "resolved1",
          name: "Fixed issue",
          status: "resolved",
          impact: "minor",
          shortlink: "https://stspg.io/r1",
          started_at: "2026-03-13T08:00:00Z",
          components: [{ name: "Actions", status: "operational" }],
        },
        {
          id: "pm1",
          name: "Post-mortem",
          status: "postmortem",
          impact: "minor",
          shortlink: "https://stspg.io/pm1",
          started_at: "2026-03-13T07:00:00Z",
          components: [],
        },
      ],
    });
    const result = transformSummary(raw);
    expect(result.incidents).toHaveLength(0);
  });

  it("includes components with under_maintenance status", () => {
    const raw = makeSummaryResponse({
      indicator: "minor",
      incidents: [
        {
          id: "maint1",
          name: "Maintenance window",
          status: "monitoring",
          impact: "minor",
          shortlink: "https://stspg.io/m1",
          started_at: "2026-03-13T06:00:00Z",
          components: [{ name: "Pages", status: "under_maintenance" }],
        },
      ],
    });
    const result = transformSummary(raw);
    expect(result.incidents[0].components).toEqual([
      { name: "Pages", status: "under_maintenance" },
    ]);
  });
});

describe("fetchGitHubStatus", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("fetches and transforms the summary endpoint", async () => {
    const raw = makeSummaryResponse({
      indicator: "minor",
      incidents: [
        {
          id: "inc1",
          name: "Slow Actions",
          status: "investigating",
          impact: "minor",
          shortlink: "https://stspg.io/inc1",
          started_at: "2026-03-13T10:00:00Z",
          components: [{ name: "Actions", status: "partial_outage" }],
        },
      ],
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(raw),
      }),
    );

    const result = await fetchGitHubStatus();
    expect(result).toEqual({
      ok: true,
      data: {
        indicator: "minor",
        incidents: [
          {
            id: "inc1",
            name: "Slow Actions",
            status: "investigating",
            impact: "minor",
            shortlink: "https://stspg.io/inc1",
            started_at: "2026-03-13T10:00:00Z",
            components: [{ name: "Actions", status: "partial_outage" }],
          },
        ],
      },
    });
  });

  it("returns error result on network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValueOnce(new Error("Network failure")),
    );

    const result = await fetchGitHubStatus();
    expect(result).toEqual({ ok: false, reason: "network-error" });
  });

  it("returns error result on non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ ok: false, status: 500 }),
    );

    const result = await fetchGitHubStatus();
    expect(result).toEqual({ ok: false, reason: "api-error" });
  });
});

describe("pruneDismissedIncidents", () => {
  it("removes IDs not in the active incident list", () => {
    const dismissed = ["inc1", "inc2", "inc3"];
    const activeIds = ["inc2"];
    expect(pruneDismissedIncidents(dismissed, activeIds)).toEqual(["inc2"]);
  });

  it("returns empty when no active incidents match", () => {
    const dismissed = ["inc1", "inc2"];
    const activeIds: string[] = [];
    expect(pruneDismissedIncidents(dismissed, activeIds)).toEqual([]);
  });

  it("returns all dismissed when all are still active", () => {
    const dismissed = ["inc1", "inc2"];
    const activeIds = ["inc1", "inc2", "inc3"];
    expect(pruneDismissedIncidents(dismissed, activeIds)).toEqual([
      "inc1",
      "inc2",
    ]);
  });
});
