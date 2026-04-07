export const deploymentsEnabledStorage = storage.defineItem<boolean>(
  "local:org-deployments:enabled",
  { fallback: true },
);
