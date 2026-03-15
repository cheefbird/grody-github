// node defers errors from abort signal listeners via nextTick instead of
// rethrowing synchronously (browsers rethrow). suppress these so teardown
// isolation tests pass cleanly. rethrow anything else.
process.on("uncaughtException", (err) => {
  if (err instanceof Error && err.stack?.includes("abort_controller")) return;
  throw err;
});
