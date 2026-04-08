<script lang="ts">
import { onMount } from "svelte";
import { enabledStorage, pollIntervalStorage } from "@/lib/github-status";
import { deploymentsEnabledStorage, tokenStorage } from "@/lib/storage";

let token = $state("");
let status = $state<"idle" | "saving" | "success" | "error">("idle");
let statusMessage = $state("");
let loaded = $state(false);
let showTokenHelp = $state(false);
let savedFlash = $state<string | null>(null);

function flash(id: string) {
  savedFlash = null;
  requestAnimationFrame(() => {
    savedFlash = id;
  });
}

function stripNonASCII(raw: string): string {
  return raw.replace(/[^\x20-\x7E]/g, "").trim();
}

let connected = $derived(loaded && stripNonASCII(token).length > 0);
let statusEnabled = $state(true);
let deploymentsEnabled = $state(true);
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
    deploymentsEnabled = await deploymentsEnabledStorage.getValue();
  } catch (err) {
    console.error("[grody-github] Failed to load feature settings:", err);
    status = "error";
    statusMessage = "Failed to load feature settings. Defaults shown.";
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

function toggleSetting(
  get: () => boolean,
  set: (v: boolean) => void,
  store: { setValue: (v: boolean) => Promise<void> },
  flashId: string,
) {
  const next = !get();
  set(next);
  store
    .setValue(next)
    .then(() => flash(flashId))
    .catch(() => set(!next));
}

async function handleIntervalChange(event: Event) {
  const prev = pollInterval;
  const value = Number((event.target as HTMLSelectElement).value);
  pollInterval = value;
  try {
    await pollIntervalStorage.setValue(value);
    flash("interval");
  } catch {
    pollInterval = prev;
  }
}

function handleSubmit(e: Event) {
  e.preventDefault();
  handleSave().catch((err) => {
    console.error("[grody-github] Unexpected error:", err);
    status = "error";
    statusMessage = "An unexpected error occurred.";
  });
}

async function handleSave() {
  status = "saving";
  statusMessage = "";
  const trimmed = stripNonASCII(token);

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
  {#if connected}
    <p class="connected">Connected</p>
  {/if}

  <h2><label for="pat">GitHub Personal Access Token</label></h2>
  <p>
    Optional but recommended. Without a token, you're limited to public repos.
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
        <strong>Fine-grained</strong>
        (recommended): scope to just the repos you need
        <ul>
          <li>Actions (read) for workflow status</li>
          <li>Deployments + Metadata (read) for the org dashboard</li>
        </ul>
      </li>
      <li>
        <strong>Classic</strong>: <code>repo</code> scope covers everything
      </li>
    </ul>
    <p class="hint">
      Stored locally, only sent to
      <a
        href="https://github.com/settings/personal-access-tokens/new"
        target="_blank"
        rel="noopener noreferrer"
        >api.github.com</a
      >. We don't have servers to store it on.
    </p>
  {/if}
  <form onsubmit={handleSubmit}>
    <input id="pat" type="password" bind:value={token} placeholder="ghp_...">

    <button type="submit" disabled={status === "saving"}>
      {status === "saving" ? "Validating..." : "Save"}
    </button>

    {#if status === "success"}
      <span role="status" class="msg saved-flash"
        >{statusMessage || "Saved"}</span
      >
    {/if}
    {#if status === "error"}
      <span role="alert" class="msg error">Error: {statusMessage}</span>
    {/if}
  </form>

  <hr>

  <h2>Org Deployments Dashboard</h2>
  <p>View deployment status across all repos in an organization.</p>

  <div class="toggle-row">
    <label for="deployments-enabled">Enabled</label>
    <input
      id="deployments-enabled"
      type="checkbox"
      checked={deploymentsEnabled}
      onchange={() => toggleSetting(() => deploymentsEnabled, v => deploymentsEnabled = v, deploymentsEnabledStorage, "deployments")}
    >
    {#if savedFlash === "deployments"}
      <span
        class="saved-flash"
        role="status"
        onanimationend={() => savedFlash = null}
        >Saved</span
      >
    {/if}
  </div>

  <p class="hint">Requires a token — see permission details above.</p>

  <hr>

  <h2>GitHub Status Notifications</h2>
  <p>Show a banner on GitHub pages when there's an active incident.</p>

  <div class="toggle-row">
    <label for="status-enabled">Enabled</label>
    <input
      id="status-enabled"
      type="checkbox"
      checked={statusEnabled}
      onchange={() => toggleSetting(() => statusEnabled, v => statusEnabled = v, enabledStorage, "status")}
    >
    {#if savedFlash === "status"}
      <span
        class="saved-flash"
        role="status"
        onanimationend={() => savedFlash = null}
        >Saved</span
      >
    {/if}
  </div>

  <label for="poll-interval">Check for incidents every</label>
  <select
    id="poll-interval"
    value={pollInterval}
    onchange={handleIntervalChange}
    disabled={!statusEnabled}
  >
    {#each POLL_OPTIONS as opt}
      <option value={opt}>{opt} {opt === 1 ? "minute" : "minutes"}</option>
    {/each}
  </select>
  {#if savedFlash === "interval"}
    <span
      class="saved-flash"
      role="status"
      onanimationend={() => savedFlash = null}
      >Saved</span
    >
  {/if}
</main>

<style>
main {
  max-width: 420px;
  margin: 0.5rem auto;
  padding: 0 1rem;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 0.85rem;
  line-height: 1.5;
  color-scheme: light dark;
  color: light-dark(#24292f, #e6edf3);
  background: transparent;
}
label {
  font-weight: 600;
  margin-bottom: 0.25rem;
}
h2 > label {
  font: inherit;
  margin: 0;
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
}
.hint a {
  color: light-dark(#0969da, #58a6ff);
}
hr {
  margin: 1rem 0;
  border: none;
  border-top: 1px solid light-dark(#d0d7de, #30363d);
}
.toggle-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.toggle-row label {
  margin: 0;
}
input,
select {
  padding: 0.4rem 0.5rem;
  font-size: 0.85rem;
  border: 1px solid light-dark(#d0d7de, #30363d);
  border-radius: 6px;
  background: light-dark(#ffffff, #161b22);
  color: light-dark(#24292f, #e6edf3);
}
input {
  width: 100%;
  margin-bottom: 0.5rem;
  box-sizing: border-box;
}
input[type="checkbox"] {
  width: auto;
  margin-bottom: 0;
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
.error {
  color: light-dark(#cf222e, #f85149);
}
h2 {
  font-size: 1rem;
  margin: 0 0 0.25rem;
}
select {
  cursor: pointer;
}
select:disabled {
  opacity: 0.6;
  cursor: default;
}
.saved-flash {
  font-size: 0.8rem;
  color: light-dark(#1a7f37, #3fb950);
  animation: fade-out 1.5s ease-out forwards;
}
@keyframes fade-out {
  0%,
  60% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
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
