<script lang="ts">
import { onMount } from "svelte";
import { enabledStorage, pollIntervalStorage } from "@/lib/github-status";
import { tokenStorage } from "@/lib/storage";

let token = $state("");
let status = $state<"idle" | "saving" | "success" | "error">("idle");
let statusMessage = $state("");
let loaded = $state(false);
let showTokenHelp = $state(false);
let connected = $derived(loaded && token.trim().length > 0);
let statusEnabled = $state(true);
let pollInterval = $state(15);
const POLL_OPTIONS = [1, 5, 10, 15, 30, 45, 60];

// Reset status when user edits the token
$effect(() => {
  token;
  status = "idle";
});

onMount(async () => {
  try {
    token = await tokenStorage.getValue();
  } catch (err) {
    console.error("[grody-github] Failed to load token:", err);
    status = "error";
    statusMessage = "Failed to load saved token from storage.";
  }
  try {
    statusEnabled = await enabledStorage.getValue();
    pollInterval = await pollIntervalStorage.getValue();
  } catch (err) {
    console.error("[grody-github] Failed to load status settings:", err);
    status = "error";
    statusMessage = "Failed to load status settings. Defaults shown.";
  }
  loaded = true;
});

async function validateToken(pat: string): Promise<boolean> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `token ${pat}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  return response.ok;
}

async function handleStatusToggle() {
  statusEnabled = !statusEnabled;
  try {
    await enabledStorage.setValue(statusEnabled);
  } catch {
    statusEnabled = !statusEnabled;
  }
}

async function handleIntervalChange(event: Event) {
  const prev = pollInterval;
  const value = Number((event.target as HTMLSelectElement).value);
  pollInterval = value;
  try {
    await pollIntervalStorage.setValue(value);
  } catch {
    pollInterval = prev;
  }
}

async function handleSave() {
  status = "saving";
  statusMessage = "";
  const trimmed = token.trim();

  if (!trimmed) {
    try {
      await tokenStorage.setValue("");
      status = "success";
      statusMessage =
        "Token cleared. Public repos will still work without a token.";
    } catch (err) {
      console.error("[grody-github] Failed to clear token:", err);
      status = "error";
      statusMessage = "Failed to clear token from storage.";
    }
    return;
  }

  try {
    const valid = await validateToken(trimmed);
    if (!valid) {
      status = "error";
      statusMessage =
        "Token is invalid or expired. Check your token and try again.";
      return;
    }
  } catch (err) {
    console.error("[grody-github] Token validation failed:", err);
    status = "error";
    statusMessage =
      "Could not reach GitHub. Check your connection and try again.";
    return;
  }

  try {
    await tokenStorage.setValue(trimmed);
  } catch (err) {
    console.error("[grody-github] Failed to save token:", err);
    status = "error";
    statusMessage = "Failed to save token to storage.";
    return;
  }
  status = "success";
}
</script>

<main>
  <h1>Grody GitHub Options</h1>
  {#if connected}
    <p class="connected">Connected</p>
  {/if}

  <label for="pat">GitHub Personal Access Token (optional)</label>
  <p>
    Add a token to avoid rate limits or filter workflows in private repos.
    <button
      type="button"
      class="link-btn"
      onclick={() => showTokenHelp = !showTokenHelp}
    >
      {showTokenHelp ? "Hide details" : "Learn more"}
    </button>
  </p>
  {#if showTokenHelp}
    <ul class="scope-list">
      <li>
        <strong>Fine-grained token</strong>: grant
        <strong>Actions (read)</strong>
        on the repos you need. No permissions needed for public repos.
      </li>
      <li>
        <strong>Classic token</strong>: <code>repo</code> scope for private
        repos. No scopes needed for public repos.
      </li>
    </ul>
    <p class="hint">
      Your token is kept in local browser storage and is only ever sent to
      api.github.com. For best security, use a
      <a
        href="https://github.com/settings/personal-access-tokens/new"
        target="_blank"
        rel="noopener noreferrer"
        >fine-grained personal access token</a
      >
      scoped to just the repos you need.
    </p>
  {/if}
  <form
    onsubmit={(e) => {
      e.preventDefault();
      handleSave().catch((err) => {
        console.error("[grody-github] Unexpected error:", err);
        status = "error";
        statusMessage = "An unexpected error occurred.";
      });
    }}
  >
    <input id="pat" type="password" bind:value={token} placeholder="ghp_...">

    <button type="submit" disabled={status === "saving"}>
      {status === "saving" ? "Validating..." : "Save"}
    </button>

    {#if status === "success"}
      <span role="status" class="msg success">{statusMessage || "Saved"}</span>
    {/if}
    {#if status === "error"}
      <span role="alert" class="msg error">Error: {statusMessage}</span>
    {/if}
  </form>

  <hr
    style="margin:1.5rem 0;border:none;border-top:1px solid light-dark(#d0d7de, #30363d);"
  >

  <h2>GitHub Status Notifications</h2>
  <p>Show a banner on GitHub pages when there's an active incident.</p>

  <div
    style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;"
  >
    <label for="status-enabled" style="margin:0;">Enabled</label>
    <input
      id="status-enabled"
      type="checkbox"
      checked={statusEnabled}
      onchange={handleStatusToggle}
    >
  </div>

  <label for="poll-interval">Check for incidents every</label>
  <select
    id="poll-interval"
    value={pollInterval}
    onchange={handleIntervalChange}
    disabled={!statusEnabled}
    style="padding:0.3rem 0.5rem;font-size:0.85rem;border:1px solid light-dark(#d0d7de, #30363d);border-radius:6px;background:light-dark(#ffffff, #161b22);color:light-dark(#24292f, #e6edf3);"
  >
    {#each POLL_OPTIONS as opt}
      <option value={opt}>{opt} {opt === 1 ? "minute" : "minutes"}</option>
    {/each}
  </select>
</main>

<style>
main {
  max-width: 420px;
  margin: 1rem auto;
  padding: 0 1rem;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 0.85rem;
  line-height: 1.5;
  color-scheme: light dark;
  color: light-dark(#24292f, #e6edf3);
  background: transparent;
}
h1 {
  font-size: 1.15rem;
  margin: 0 0 0.75rem;
}
label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.25rem;
}
p {
  color: light-dark(#656d76, #8b949e);
  margin: 0 0 0.5rem;
}
.connected {
  color: light-dark(#1a7f37, #3fb950);
  font-weight: 600;
  margin: 0 0 0.5rem;
}
.scope-list {
  color: light-dark(#656d76, #8b949e);
  margin: 0 0 0.5rem;
  padding-left: 1.25rem;
  font-size: 0.8rem;
}
.hint {
  font-size: 0.8rem;
  color: light-dark(#656d76, #8b949e);
}
.hint a {
  color: light-dark(#0969da, #58a6ff);
}
input {
  width: 100%;
  padding: 0.4rem 0.5rem;
  font-size: 0.85rem;
  border: 1px solid light-dark(#d0d7de, #30363d);
  border-radius: 6px;
  margin-bottom: 0.5rem;
  box-sizing: border-box;
  background: light-dark(#ffffff, #161b22);
  color: light-dark(#24292f, #e6edf3);
}
button {
  padding: 0.4rem 1rem;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid light-dark(#d0d7de, #30363d);
  border-radius: 6px;
  background: light-dark(#f6f8fa, #21262d);
  color: light-dark(#24292f, #e6edf3);
}
button:hover {
  background: light-dark(#e1e4e8, #30363d);
}
button:disabled {
  opacity: 0.6;
  cursor: default;
}
.msg {
  margin-left: 0.75rem;
  font-size: 0.85rem;
}
.success {
  color: light-dark(#1a7f37, #3fb950);
}
.error {
  color: light-dark(#cf222e, #f85149);
}
h2 {
  font-size: 1rem;
  margin: 0 0 0.5rem;
}
select {
  cursor: pointer;
}
select:disabled {
  opacity: 0.6;
  cursor: default;
}
.link-btn {
  background: none;
  border: none;
  color: light-dark(#0969da, #58a6ff);
  cursor: pointer;
  font-size: inherit;
  padding: 0;
  font-weight: 400;
}
.link-btn:hover {
  text-decoration: underline;
}
</style>
