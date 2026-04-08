import { describe, expect, it } from "vitest";
import { autoDetectPins, getEnvColor, shouldExpandByDefault } from "./utils";

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

describe("autoDetectPins", () => {
  it("pins exact matches from default list", () => {
    const envNames = ["dev", "staging", "prod", "canary", "qa"];
    expect(autoDetectPins(envNames)).toEqual(["dev", "staging", "prod"]);
  });

  it("does not pin substring matches", () => {
    const envNames = [
      "dev-c1-canary",
      "devops-phoenix",
      "prod-au",
      "production",
    ];
    expect(autoDetectPins(envNames)).toEqual(["production"]);
  });

  it("pins 'stg' as an exact match", () => {
    const envNames = ["stg", "stg-us-east"];
    expect(autoDetectPins(envNames)).toEqual(["stg"]);
  });

  it("returns empty array when no matches", () => {
    const envNames = ["canary", "qa", "preview", "ecr/_global"];
    expect(autoDetectPins(envNames)).toEqual([]);
  });

  it("preserves input order", () => {
    const envNames = ["prod", "dev", "staging"];
    expect(autoDetectPins(envNames)).toEqual(["prod", "dev", "staging"]);
  });

  it("is case-sensitive", () => {
    const envNames = ["Dev", "STAGING", "Prod"];
    expect(autoDetectPins(envNames)).toEqual([]);
  });
});
