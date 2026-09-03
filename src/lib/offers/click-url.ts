import { REVTOO_USER_ID_PLACEHOLDER } from "./adapters/revtoo.server";

/**
 * Resolves the final click URL for a given offer and user.
 *
 * Some network adapters embed a placeholder string into the offer's click_url
 * at sync time (because the sync runs once per provider and is shared across
 * all users). This function replaces those placeholders with the real user id
 * at click-time, just before the user is redirected.
 *
 * Rules:
 * - If providerSlug is unknown or no substitution is needed, return url as-is.
 * - If userId is missing/empty, return url as-is (the placeholder stays in the
 *   URL, which is better than crashing — the network will reject it gracefully).
 */
export function resolveClickUrl({
  url,
  providerSlug,
  userId,
}: {
  url: string;
  providerSlug: string | null | undefined;
  userId: string | null | undefined;
}): string {
  if (!url) return url;

  // ── Revtoo ──────────────────────────────────────────────────────────────────
  // The adapter stores REVTOO_USER_ID_PLACEHOLDER in every offer URL.
  // Replace it with the real user id so Revtoo can attribute the conversion.
  if (providerSlug === "revtoo") {
    if (url.includes(REVTOO_USER_ID_PLACEHOLDER) && userId) {
      return url.replace(REVTOO_USER_ID_PLACEHOLDER, encodeURIComponent(userId));
    }
    return url;
  }

  // ── AdBlueMedia ─────────────────────────────────────────────────────────────
  // AdBlueMedia embeds a static user_id from sync_config at fetch time, so no
  // per-user substitution is needed here. Kept as a named branch for clarity.
  if (providerSlug === "adbluemedia") {
    return url;
  }

  // Default: return the stored URL unchanged.
  return url;
}
