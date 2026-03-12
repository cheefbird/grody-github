import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import {
  fetchAllWorkflows,
  GitHubApiError,
  getWorkflows,
  parseLinkHeader,
} from "./github-api";
import { setCachedWorkflows } from "./storage";

describe("parseLinkHeader", () => {
  it("returns next URL from a valid Link header", () => {
    const header =
      '<https://api.github.com/repos/o/r/actions/workflows?page=2>; rel="next"';
    expect(parseLinkHeader(header)).toBe(
      "https://api.github.com/repos/o/r/actions/workflows?page=2",
    );
  });

  it("returns null for null input", () => {
    expect(parseLinkHeader(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseLinkHeader("")).toBeNull();
  });

  it("returns null when no rel=next present", () => {
    const header =
      '<https://api.github.com/repos/o/r/actions/workflows?page=1>; rel="last"';
    expect(parseLinkHeader(header)).toBeNull();
  });

  it("rejects non-GitHub API URLs", () => {
    const header = '<https://evil.com/steal?page=2>; rel="next"';
    expect(parseLinkHeader(header)).toBeNull();
  });

  it("extracts next from multiple link relations", () => {
    const header =
      '<https://api.github.com/repos/o/r/actions/workflows?page=2>; rel="next", <https://api.github.com/repos/o/r/actions/workflows?page=5>; rel="last"';
    expect(parseLinkHeader(header)).toBe(
      "https://api.github.com/repos/o/r/actions/workflows?page=2",
    );
  });
});

describe("GitHubApiError", () => {
  it("sets status and message correctly", () => {
    const err = new GitHubApiError(403, "Forbidden");
    expect(err.status).toBe(403);
    expect(err.message).toBe("GitHub API error: 403 Forbidden");
    expect(err.name).toBe("GitHubApiError");
  });
});

function mockFetchResponse(
  data: unknown,
  options: {
    ok?: boolean;
    status?: number;
    statusText?: string;
    linkHeader?: string | null;
  } = {},
) {
  const {
    ok = true,
    status = 200,
    statusText = "OK",
    linkHeader = null,
  } = options;
  return {
    ok,
    status,
    statusText,
    json: () => Promise.resolve(data),
    headers: new Headers(linkHeader ? { Link: linkHeader } : {}),
  } as Response;
}

describe("fetchAllWorkflows", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns active workflows with paths", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        mockFetchResponse({
          total_count: 2,
          workflows: [
            {
              id: 1,
              name: "CI",
              path: ".github/workflows/ci.yml",
              state: "active",
            },
            {
              id: 2,
              name: "Deploy",
              path: ".github/workflows/deploy.yml",
              state: "active",
            },
          ],
        }),
      ),
    );

    const result = await fetchAllWorkflows("owner", "repo", null);
    expect(result).toEqual([
      { name: "CI", path: ".github/workflows/ci.yml" },
      { name: "Deploy", path: ".github/workflows/deploy.yml" },
    ]);
  });

  it("filters out inactive workflows and workflows without paths", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        mockFetchResponse({
          total_count: 3,
          workflows: [
            {
              id: 1,
              name: "CI",
              path: ".github/workflows/ci.yml",
              state: "active",
            },
            {
              id: 2,
              name: "Old",
              path: ".github/workflows/old.yml",
              state: "disabled_manually",
            },
            { id: 3, name: "Empty", path: "", state: "active" },
          ],
        }),
      ),
    );

    const result = await fetchAllWorkflows("owner", "repo", null);
    expect(result).toEqual([{ name: "CI", path: ".github/workflows/ci.yml" }]);
  });

  it("follows pagination via Link headers", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        mockFetchResponse(
          {
            total_count: 2,
            workflows: [
              {
                id: 1,
                name: "CI",
                path: ".github/workflows/ci.yml",
                state: "active",
              },
            ],
          },
          {
            linkHeader:
              '<https://api.github.com/repos/owner/repo/actions/workflows?page=2&per_page=100>; rel="next"',
          },
        ),
      )
      .mockResolvedValueOnce(
        mockFetchResponse({
          total_count: 2,
          workflows: [
            {
              id: 2,
              name: "Deploy",
              path: ".github/workflows/deploy.yml",
              state: "active",
            },
          ],
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAllWorkflows("owner", "repo", null);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });

  it("stops after MAX_PAGES to prevent infinite pagination", async () => {
    const alwaysPaginates = vi.fn().mockImplementation(() =>
      Promise.resolve(
        mockFetchResponse(
          {
            total_count: 100,
            workflows: [
              {
                id: 1,
                name: "W",
                path: ".github/workflows/w.yml",
                state: "active",
              },
            ],
          },
          {
            linkHeader:
              '<https://api.github.com/repos/owner/repo/actions/workflows?page=99>; rel="next"',
          },
        ),
      ),
    );

    vi.stubGlobal("fetch", alwaysPaginates);

    const result = await fetchAllWorkflows("owner", "repo", null);
    expect(alwaysPaginates).toHaveBeenCalledTimes(10);
    expect(result).toHaveLength(10);
  });

  it("throws GitHubApiError on non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        mockFetchResponse(null, {
          ok: false,
          status: 403,
          statusText: "Forbidden",
        }),
      ),
    );

    await expect(fetchAllWorkflows("owner", "repo", null)).rejects.toThrow(
      GitHubApiError,
    );
  });

  it("sends auth header when token provided", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        mockFetchResponse({ total_count: 0, workflows: [] }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await fetchAllWorkflows("owner", "repo", "ghp_test123");
    const callHeaders = fetchMock.mock.calls[0][1].headers;
    expect(callHeaders.Authorization).toBe("token ghp_test123");
  });

  it("omits auth header when token is null", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        mockFetchResponse({ total_count: 0, workflows: [] }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await fetchAllWorkflows("owner", "repo", null);
    const callHeaders = fetchMock.mock.calls[0][1].headers;
    expect(callHeaders.Authorization).toBeUndefined();
  });
});

describe("getWorkflows", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    fakeBrowser.reset();
  });

  it("returns cached workflows when cache is fresh", async () => {
    const workflows = [{ name: "CI", path: ".github/workflows/ci.yml" }];
    await setCachedWorkflows("owner", "repo", workflows);

    const result = await getWorkflows("owner", "repo");
    expect(result).toEqual({ ok: true, workflows });
  });

  it("fetches from API when no cache, then caches result", async () => {
    const workflows = [
      { id: 1, name: "CI", path: ".github/workflows/ci.yml", state: "active" },
    ];
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          mockFetchResponse({ total_count: 1, workflows }),
        ),
    );

    const result = await getWorkflows("owner", "repo");
    expect(result).toEqual({
      ok: true,
      workflows: [{ name: "CI", path: ".github/workflows/ci.yml" }],
    });
  });

  it("returns rate-limited on 403", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        mockFetchResponse(null, {
          ok: false,
          status: 403,
          statusText: "Forbidden",
        }),
      ),
    );

    const result = await getWorkflows("owner", "repo");
    expect(result).toEqual({ ok: false, reason: "rate-limited" });
  });

  it("returns auth-required on 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        mockFetchResponse(null, {
          ok: false,
          status: 401,
          statusText: "Unauthorized",
        }),
      ),
    );

    const result = await getWorkflows("owner", "repo");
    expect(result).toEqual({ ok: false, reason: "auth-required" });
  });

  it("returns auth-required on 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        mockFetchResponse(null, {
          ok: false,
          status: 404,
          statusText: "Not Found",
        }),
      ),
    );

    const result = await getWorkflows("owner", "repo");
    expect(result).toEqual({ ok: false, reason: "auth-required" });
  });

  it("returns generic error on 500 server error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        mockFetchResponse(null, {
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        }),
      ),
    );

    const result = await getWorkflows("owner", "repo");
    expect(result).toEqual({ ok: false, reason: "error" });
  });

  it("returns generic error on unexpected failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValueOnce(new Error("Network failure")),
    );

    const result = await getWorkflows("owner", "repo");
    expect(result).toEqual({ ok: false, reason: "error" });
  });

  it("returns generic error on JSON parse failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () => Promise.reject(new SyntaxError("Unexpected token <")),
        headers: new Headers(),
      } as Response),
    );

    const result = await getWorkflows("owner", "repo");
    expect(result).toEqual({ ok: false, reason: "error" });
  });
});
