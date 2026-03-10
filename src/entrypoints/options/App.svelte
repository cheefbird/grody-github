<script lang="ts">
  import { onMount } from "svelte";
  import { tokenStorage } from "@/lib/storage";

  let token = $state("");
  let status = $state<"idle" | "saving" | "success" | "error">("idle");
  let errorMessage = $state("");

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
    }
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
    errorMessage = "";
    const trimmed = token.trim();

    if (!trimmed) {
      try {
        await tokenStorage.setValue("");
        status = "success";
        errorMessage = "Token cleared. Workflow filtering is disabled.";
      } catch (err) {
        console.error("[grody-github] Failed to clear token:", err);
        status = "error";
        errorMessage = "Failed to clear token from storage.";
      }
      return;
    }

    try {
      const valid = await validateToken(trimmed);
      if (!valid) {
        status = "error";
        errorMessage =
          "Token is invalid or expired. Check your token and try again.";
        return;
      }
    } catch (err) {
      console.error("[grody-github] Token validation failed:", err);
      status = "error";
      errorMessage =
        "Could not reach GitHub. Check your connection and try again.";
      return;
    }

    try {
      await tokenStorage.setValue(trimmed);
    } catch (err) {
      console.error("[grody-github] Failed to save token:", err);
      status = "error";
      errorMessage = "Failed to save token to storage.";
      return;
    }
    status = "success";
  }
</script>

<main
  style="max-width: 480px; margin: 2rem auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;"
>
  <h1 style="font-size: 1.25rem; margin-bottom: 1rem;">Grody GitHub Options</h1>

  <label
    for="pat"
    style="display: block; margin-bottom: 0.5rem; font-weight: 600;"
  >
    GitHub Personal Access Token
  </label>
  <p style="font-size: 0.85rem; color: #666; margin-bottom: 0.5rem;">
    Required for filtering workflows in private repos. Needs <code>repo</code> scope
    for private repos, or no scopes for public repos only.
  </p>
  <form
    onsubmit={(e) => {
      e.preventDefault();
      handleSave();
    }}
  >
    <input
      id="pat"
      type="password"
      bind:value={token}
      placeholder="ghp_..."
      style="width: 100%; padding: 0.5rem; font-size: 0.9rem;
        border: 1px solid #ccc; border-radius: 4px;
        margin-bottom: 0.75rem;"
    />

    <button
      type="submit"
      disabled={status === "saving"}
      style="padding: 0.5rem 1rem; font-size: 0.9rem; cursor: pointer;"
    >
      {status === "saving" ? "Validating..." : "Save"}
    </button>

    {#if status === "success"}
      <span role="status" style="margin-left: 0.75rem; color: green;"
        >{errorMessage || "Saved"}</span
      >
    {/if}
    {#if status === "error"}
      <span role="alert" style="margin-left: 0.75rem; color: red;"
        >Error: {errorMessage}</span
      >
    {/if}
  </form>
</main>
