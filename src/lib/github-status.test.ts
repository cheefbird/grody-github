import { afterEach, describe, expect, it, vi } from "vitest";
import {
  componentStatusColor,
  fetchGitHubStatus,
  indicatorColor,
  timeSince,
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
    updated_at?: string;
    resolved_at?: string | null;
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

  it("filters out postmortem incidents but includes resolved", () => {
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
          resolved_at: "2026-03-13T09:00:00Z",
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
    expect(result.incidents).toHaveLength(1);
    expect(result.incidents[0].status).toBe("resolved");
    expect(result.incidents[0].resolved_at).toBe("2026-03-13T09:00:00Z");
    expect(result.incidents[0].components).toEqual([]);
  });

  it("handles empty object gracefully", () => {
    const result = transformSummary({});
    expect(result).toEqual({ indicator: "none", incidents: [] });
  });

  it("defaults unknown indicator to none", () => {
    const raw = makeSummaryResponse({ indicator: "maintenance" });
    const result = transformSummary(raw);
    expect(result.indicator).toBe("none");
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
            updated_at: "",
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
});

describe("indicatorColor", () => {
  it.each([
    ["critical", "#da3633"],
    ["major", "#f0883e"],
    ["minor", "#d29922"],
    ["none", "#d29922"],
  ] as const)("returns %s → %s", (indicator, expected) => {
    expect(indicatorColor(indicator)).toBe(expected);
  });
});

describe("componentStatusColor", () => {
  it.each([
    ["major_outage", "#f85149"],
    ["partial_outage", "#e5534b"],
    ["degraded_performance", "#d4843e"],
    ["under_maintenance", "#ae7c14"],
  ] as const)("returns %s → %s", (status, expected) => {
    expect(componentStatusColor(status)).toBe(expected);
  });
});

describe("timeSince", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    [30_000, "just now"],
    [5 * 60_000, "5m ago"],
    [45 * 60_000, "45m ago"],
    [2 * 3_600_000, "2h ago"],
    [23 * 3_600_000, "23h ago"],
    [2 * 86_400_000, "2d ago"],
  ])("formats %ims as %s", (msAgo, expected) => {
    const now = new Date("2026-03-14T12:00:00Z").getTime();
    vi.useFakeTimers({ now });
    const timestamp = new Date(now - msAgo).toISOString();
    expect(timeSince(timestamp)).toBe(expected);
  });

  it("returns 'just now' for invalid timestamps", () => {
    expect(timeSince("not-a-date")).toBe("just now");
  });
});
