// node defers abort listener errors via nextTick, so they fire after test
// lifecycle hooks complete. suppress only the intentional "teardown boom"
// error from the feature-manager teardown isolation test.
process.on("uncaughtException", (err) => {
  if (err instanceof Error && err.message === "teardown boom") return;
  throw err;
});
