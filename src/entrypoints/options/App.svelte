<script lang="ts">
import { onMount } from "svelte";
import { tokenStorage } from "@/lib/storage";

let token = $state("");
let status = $state<"idle" | "saving" | "success" | "error">("idle");
let statusMessage = $state("");
let loaded = $state(false);
let connected = $derived(loaded && token.trim().length > 0);

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
    Add a token to avoid rate limits or filter workflows in private repos. Needs
    <code>repo</code> scope for private repos, or no scopes for public repos only.
  </p>
  <p class="hint">
    Your token is kept in local browser storage and is only ever sent to
    api.github.com. For best security, use a
    <a
      href="https://github.com/settings/personal-access-tokens/new"
      target="_blank"
      rel="noopener noreferrer">fine-grained personal access token</a
    >
    scoped to just the repos you need.
  </p>
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
    <input id="pat" type="password" bind:value={token} placeholder="ghp_..." />

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
    background: light-dark(#ffffff, #0d1117);
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
</style>
