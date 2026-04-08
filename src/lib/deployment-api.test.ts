import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import {
  fetchOrgDeployments,
  getOrgDeployments,
  transformDeploymentData,
} from "./deployment-api";
import type { EnvironmentGroup } from "./deployment-types";
import { GitHubApiError } from "./github-api";
import { setCachedDeployments } from "./storage";

function mockGraphQLResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: () => Promise.resolve(data),
    headers: new Headers(),
  } as Response;
}

function gqlSuccess(
  nodes: unknown[],
  hasNextPage = false,
  endCursor: string | null = null,
) {
  return mockGraphQLResponse({
    data: {
      organization: {
        repositories: {
          nodes,
          pageInfo: { hasNextPage, endCursor },
        },
      },
    },
  });
}

describe("transformDeploymentData", () => {
  it("groups deployments by environment", () => {
    const raw = [
      {
        name: "api",
        deployments: {
          nodes: [
            {
              environment: "production",
              latestStatus: { state: "SUCCESS" },
              creator: { login: "alice" },
              ref: { name: "v1.0.0" },
              commit: { abbreviatedOid: "abc" },
              createdAt: "2026-04-06T12:00:00Z",
            },
            {
              environment: "staging",
              latestStatus: { state: "SUCCESS" },
              creator: { login: "alice" },
              ref: { name: "v1.1.0-rc1" },
              commit: { abbreviatedOid: "def" },
              createdAt: "2026-04-06T11:00:00Z",
            },
          ],
        },
      },
    ];

    const result = transformDeploymentData(raw);
    expect(result).toHaveLength(2);
    expect(
      result.find((g) => g.name === "production")?.deployments,
    ).toHaveLength(1);
    expect(result.find((g) => g.name === "staging")?.deployments).toHaveLength(
      1,
    );
  });

  it("keeps only latest deployment per repo per env", () => {
    const raw = [
      {
        name: "api",
        deployments: {
          nodes: [
            {
              environment: "production",
              latestStatus: { state: "SUCCESS" },
              creator: { login: "alice" },
              ref: { name: "v2.0.0" },
              commit: { abbreviatedOid: "aaa" },
              createdAt: "2026-04-06T14:00:00Z",
            },
            {
              environment: "production",
              latestStatus: { state: "FAILURE" },
              creator: { login: "bob" },
              ref: { name: "v1.9.0" },
              commit: { abbreviatedOid: "bbb" },
              createdAt: "2026-04-06T10:00:00Z",
            },
          ],
        },
      },
    ];

    const result = transformDeploymentData(raw);
    expect(
      result.find((g) => g.name === "production")?.deployments,
    ).toHaveLength(1);
    expect(result[0].deployments[0].ref).toBe("v2.0.0");
  });

  it("sorts environments alphabetically", () => {
    const raw = [
      {
        name: "api",
        deployments: {
          nodes: [
            {
              environment: "staging",
              latestStatus: { state: "SUCCESS" },
              creator: { login: "a" },
              ref: { name: "v1" },
              commit: { abbreviatedOid: "a" },
              createdAt: "2026-04-06T12:00:00Z",
            },
            {
              environment: "dev",
              latestStatus: { state: "SUCCESS" },
              creator: { login: "a" },
              ref: { name: "main" },
              commit: { abbreviatedOid: "b" },
              createdAt: "2026-04-06T12:00:00Z",
            },
            {
              environment: "production",
              latestStatus: { state: "SUCCESS" },
              creator: { login: "a" },
              ref: { name: "v1" },
              commit: { abbreviatedOid: "c" },
              createdAt: "2026-04-06T12:00:00Z",
            },
          ],
        },
      },
    ];

    const result = transformDeploymentData(raw);
    expect(result.map((g) => g.name)).toEqual(["dev", "production", "staging"]);
  });

  it("sorts failures first within env", () => {
    const raw = [
      {
        name: "api",
        deployments: {
          nodes: [
            {
              environment: "production",
              latestStatus: { state: "SUCCESS" },
              creator: { login: "a" },
              ref: { name: "v2" },
              commit: { abbreviatedOid: "a" },
              createdAt: "2026-04-06T14:00:00Z",
            },
          ],
        },
      },
      {
        name: "auth",
        deployments: {
          nodes: [
            {
              environment: "production",
              latestStatus: { state: "FAILURE" },
              creator: { login: "b" },
              ref: { name: "v1" },
              commit: { abbreviatedOid: "b" },
              createdAt: "2026-04-06T10:00:00Z",
            },
          ],
        },
      },
      {
        name: "web",
        deployments: {
          nodes: [
            {
              environment: "production",
              latestStatus: { state: "IN_PROGRESS" },
              creator: { login: "c" },
              ref: { name: "v3" },
              commit: { abbreviatedOid: "c" },
              createdAt: "2026-04-06T13:00:00Z",
            },
          ],
        },
      },
    ];

    const result = transformDeploymentData(raw);
    const prod = result.find((g) => g.name === "production");
    expect(prod?.deployments.map((d) => d.repoName)).toEqual([
      "auth",
      "web",
      "api",
    ]);
  });

  it("skips repos with no deployment nodes", () => {
    const raw = [
      { name: "empty-repo", deployments: { nodes: [] } },
      {
        name: "has-deploys",
        deployments: {
          nodes: [
            {
              environment: "production",
              latestStatus: { state: "SUCCESS" },
              creator: { login: "alice" },
              ref: { name: "v1.0.0" },
              commit: { abbreviatedOid: "abc" },
              createdAt: "2026-04-06T12:00:00Z",
            },
          ],
        },
      },
    ];

    const result = transformDeploymentData(raw);
    expect(result).toHaveLength(1);
    expect(result[0].deployments).toHaveLength(1);
  });

  it("normalizes GraphQL state to lowercase", () => {
    const raw = [
      {
        name: "api",
        deployments: {
          nodes: [
            {
              environment: "prod",
              latestStatus: { state: "IN_PROGRESS" },
              creator: { login: "a" },
              ref: { name: "main" },
              commit: { abbreviatedOid: "abc" },
              createdAt: "2026-04-06T12:00:00Z",
            },
          ],
        },
      },
    ];

    expect(transformDeploymentData(raw)[0].deployments[0].state).toBe(
      "in_progress",
    );
  });

  it("handles null ref and creator", () => {
    const raw = [
      {
        name: "api",
        deployments: {
          nodes: [
            {
              environment: "prod",
              latestStatus: { state: "SUCCESS" },
              creator: null,
              ref: null,
              commit: { abbreviatedOid: "abc1234" },
              createdAt: "2026-04-06T12:00:00Z",
            },
          ],
        },
      },
    ];

    const d = transformDeploymentData(raw)[0].deployments[0];
    expect(d.ref).toBe("abc1234");
    expect(d.creator).toBe("unknown");
  });
});

describe("fetchOrgDeployments", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("sends GraphQL query with correct org and auth header", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(gqlSuccess([]));
    vi.stubGlobal("fetch", fetchMock);

    await fetchOrgDeployments("my-org", "ghp_token123");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.github.com/graphql");
    expect(opts.method).toBe("POST");
    expect(opts.headers.Authorization).toBe("bearer ghp_token123");
    const body = JSON.parse(opts.body);
    expect(body.variables.org).toBe("my-org");
  });

  it("returns transformed deployment data", async () => {
    const repoNode = {
      name: "api",
      deployments: {
        nodes: [
          {
            environment: "production",
            latestStatus: { state: "SUCCESS" },
            creator: { login: "alice" },
            ref: { name: "v1.0.0" },
            commit: { abbreviatedOid: "abc" },
            createdAt: "2026-04-06T12:00:00Z",
          },
        ],
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(gqlSuccess([repoNode])),
    );

    const result = await fetchOrgDeployments("my-org", "ghp_token");
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].name).toBe("production");
    expect(result.groups[0].deployments[0].repoName).toBe("api");
  });

  it("paginates through multiple pages of repos", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        gqlSuccess(
          [
            {
              name: "repo-1",
              deployments: {
                nodes: [
                  {
                    environment: "prod",
                    latestStatus: { state: "SUCCESS" },
                    creator: { login: "a" },
                    ref: { name: "v1" },
                    commit: { abbreviatedOid: "aaa" },
                    createdAt: "2026-04-06T12:00:00Z",
                  },
                ],
              },
            },
          ],
          true,
          "cursor1",
        ),
      )
      .mockResolvedValueOnce(
        gqlSuccess([
          {
            name: "repo-2",
            deployments: {
              nodes: [
                {
                  environment: "prod",
                  latestStatus: { state: "SUCCESS" },
                  creator: { login: "b" },
                  ref: { name: "v2" },
                  commit: { abbreviatedOid: "bbb" },
                  createdAt: "2026-04-06T13:00:00Z",
                },
              ],
            },
          },
        ]),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchOrgDeployments("my-org", "ghp_token");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const prod = result.groups.find((g) => g.name === "prod");
    expect(prod?.deployments).toHaveLength(2);
  });

  it("throws GitHubApiError on non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(mockGraphQLResponse(null, false, 401)),
    );

    await expect(fetchOrgDeployments("my-org", "ghp_token")).rejects.toThrow(
      GitHubApiError,
    );
  });

  it("throws GitHubApiError on GraphQL-level errors (200 with errors)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        mockGraphQLResponse({
          errors: [{ message: "Insufficient scopes" }],
          data: null,
        }),
      ),
    );

    await expect(fetchOrgDeployments("my-org", "ghp_token")).rejects.toThrow(
      GitHubApiError,
    );
  });
});

describe("getOrgDeployments", () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns cached data when cache is fresh", async () => {
    const groups: EnvironmentGroup[] = [
      {
        name: "production",
        deployments: [
          {
            repoName: "api",
            environment: "production",
            state: "success",
            ref: "v1.0.0",
            commitSha: "abc",
            creator: "alice",
            createdAt: "2026-04-06T12:00:00Z",
          },
        ],
      },
    ];
    await setCachedDeployments("my-org", groups);

    const result = await getOrgDeployments("my-org");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.groups).toEqual(groups);
    }
  });

  it("returns rate-limited on 403", async () => {
    await fakeBrowser.storage.local.set({ "github-pat": "ghp_test" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(mockGraphQLResponse(null, false, 403)),
    );

    const result = await getOrgDeployments("my-org");
    expect(result).toEqual({ ok: false, reason: "rate-limited" });
  });

  it("returns auth-required on 401", async () => {
    await fakeBrowser.storage.local.set({ "github-pat": "ghp_test" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(mockGraphQLResponse(null, false, 401)),
    );

    const result = await getOrgDeployments("my-org");
    expect(result).toEqual({ ok: false, reason: "auth-required" });
  });

  it("returns auth-required when no token is set", async () => {
    const result = await getOrgDeployments("my-org");
    expect(result).toEqual({ ok: false, reason: "auth-required" });
  });
});
