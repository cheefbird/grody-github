import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchGitHubStatus, transformSummary } from "./github-status";

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

  it("handles empty object gracefully", () => {
    const result = transformSummary({});
    expect(result).toEqual({ indicator: "none", incidents: [] });
  });

  it("handles null fields gracefully", () => {
    const result = transformSummary({ incidents: null, status: null });
    expect(result).toEqual({ indicator: "none", incidents: [] });
  });

  it("handles incident missing components", () => {
    const raw = makeSummaryResponse({
      indicator: "minor",
      incidents: [
        {
          id: "no-comp",
          name: "No components listed",
          status: "investigating",
          impact: "minor",
          shortlink: "https://stspg.io/nc",
          started_at: "2026-03-13T10:00:00Z",
          components: [],
        },
      ],
    });
    const result = transformSummary(raw);
    expect(result.incidents).toHaveLength(1);
    expect(result.incidents[0].components).toEqual([]);
  });

  it("includes incidents with identified status", () => {
    const raw = makeSummaryResponse({
      indicator: "minor",
      incidents: [
        {
          id: "ident1",
          name: "Root cause found",
          status: "identified",
          impact: "minor",
          shortlink: "https://stspg.io/id1",
          started_at: "2026-03-13T09:00:00Z",
          components: [{ name: "Actions", status: "partial_outage" }],
        },
      ],
    });
    const result = transformSummary(raw);
    expect(result.incidents).toHaveLength(1);
    expect(result.incidents[0].status).toBe("identified");
  });

  it("preserves multiple concurrent incidents", () => {
    const raw = makeSummaryResponse({
      indicator: "critical",
      incidents: [
        {
          id: "inc-a",
          name: "Critical outage",
          status: "investigating",
          impact: "critical",
          shortlink: "https://stspg.io/a",
          started_at: "2026-03-13T10:00:00Z",
          components: [{ name: "Actions", status: "major_outage" }],
        },
        {
          id: "inc-b",
          name: "Minor degradation",
          status: "monitoring",
          impact: "minor",
          shortlink: "https://stspg.io/b",
          started_at: "2026-03-13T09:00:00Z",
          components: [{ name: "Pages", status: "degraded_performance" }],
        },
      ],
    });
    const result = transformSummary(raw);
    expect(result.incidents).toHaveLength(2);
    expect(result.incidents[0].impact).toBe("critical");
    expect(result.incidents[1].impact).toBe("minor");
  });

  it("includes incident with all-operational components", () => {
    const raw = makeSummaryResponse({
      indicator: "minor",
      incidents: [
        {
          id: "early1",
          name: "Early investigation",
          status: "investigating",
          impact: "minor",
          shortlink: "https://stspg.io/e1",
          started_at: "2026-03-13T10:00:00Z",
          components: [
            { name: "Actions", status: "operational" },
            { name: "Pages", status: "operational" },
          ],
        },
      ],
    });
    const result = transformSummary(raw);
    expect(result.incidents).toHaveLength(1);
    expect(result.incidents[0].components).toEqual([]);
  });

  it("defaults unknown indicator to none", () => {
    const raw = makeSummaryResponse({ indicator: "maintenance" });
    const result = transformSummary(raw);
    expect(result.indicator).toBe("none");
  });

  it("defaults unknown impact to none", () => {
    const raw = makeSummaryResponse({
      indicator: "minor",
      incidents: [
        {
          id: "unk1",
          name: "Unknown impact",
          status: "investigating",
          impact: "maintenance",
          shortlink: "https://stspg.io/u1",
          started_at: "2026-03-13T10:00:00Z",
          components: [],
        },
      ],
    });
    const result = transformSummary(raw);
    expect(result.incidents[0].impact).toBe("none");
  });

  it("filters out components with unknown status", () => {
    const raw = makeSummaryResponse({
      indicator: "minor",
      incidents: [
        {
          id: "unk-comp",
          name: "Unknown component status",
          status: "investigating",
          impact: "minor",
          shortlink: "https://stspg.io/uc",
          started_at: "2026-03-13T10:00:00Z",
          components: [
            { name: "Actions", status: "degraded_performance" },
            { name: "Pages", status: "some_new_status" },
          ],
        },
      ],
    });
    const result = transformSummary(raw);
    expect(result.incidents[0].components).toEqual([
      { name: "Actions", status: "degraded_performance" },
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

  it("returns parse-error when json() rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new SyntaxError("Unexpected token <")),
      }),
    );

    const result = await fetchGitHubStatus();
    expect(result).toEqual({ ok: false, reason: "parse-error" });
  });

  it("fetches from the correct URL", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeSummaryResponse({})),
    });
    vi.stubGlobal("fetch", mockFetch);

    await fetchGitHubStatus();
    expect(mockFetch).toHaveBeenCalledWith(
      "https://www.githubstatus.com/api/v2/summary.json",
    );
  });
});
