import { describe, expect, it } from "vitest";
import { getEnvColor, shouldExpandByDefault } from "./utils";

describe("shouldExpandByDefault", () => {
  it("expands 'production'", () => {
    expect(shouldExpandByDefault("production")).toBe(true);
  });

  it("expands 'staging'", () => {
    expect(shouldExpandByDefault("staging")).toBe(true);
  });

  it("expands 'dev'", () => {
    expect(shouldExpandByDefault("dev")).toBe(true);
  });

  it("expands 'stg-us-east'", () => {
    expect(shouldExpandByDefault("stg-us-east")).toBe(true);
  });

  it("expands 'dev-c1-canary' (contains dev)", () => {
    expect(shouldExpandByDefault("dev-c1-canary")).toBe(true);
  });

  it("does NOT expand 'canary'", () => {
    expect(shouldExpandByDefault("canary")).toBe(false);
  });

  it("does NOT expand 'qa'", () => {
    expect(shouldExpandByDefault("qa")).toBe(false);
  });

  it("does NOT expand 'preview'", () => {
    expect(shouldExpandByDefault("preview")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(shouldExpandByDefault("Production")).toBe(true);
    expect(shouldExpandByDefault("STAGING")).toBe(true);
    expect(shouldExpandByDefault("DEV")).toBe(true);
  });
});

describe("getEnvColor", () => {
  it("returns a color for index 0", () => {
    expect(getEnvColor(0)).toBeTruthy();
  });

  it("wraps around when index exceeds palette length", () => {
    expect(getEnvColor(0)).toBe(getEnvColor(8));
  });

  it("returns different colors for different indices", () => {
    expect(getEnvColor(0)).not.toBe(getEnvColor(1));
  });
});
