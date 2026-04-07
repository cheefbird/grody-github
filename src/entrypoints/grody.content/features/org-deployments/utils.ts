const ENV_COLORS = [
  "var(--fgColor-success, #3fb950)",
  "var(--fgColor-attention, #d29922)",
  "var(--fgColor-accent, #388bfd)",
  "var(--fgColor-done, #a371f7)",
  "var(--fgColor-sponsors, #f778ba)",
  "var(--fgColor-severe, #db6d28)",
  "var(--fgColor-open, #3fb950)",
  "var(--fgColor-danger, #f85149)",
];

export function getEnvColor(index: number): string {
  return ENV_COLORS[index % ENV_COLORS.length];
}

const EXPANDED_PATTERNS = [/dev/i, /staging/i, /stg/i, /prod/i];

export function shouldExpandByDefault(envName: string): boolean {
  return EXPANDED_PATTERNS.some((p) => p.test(envName));
}
