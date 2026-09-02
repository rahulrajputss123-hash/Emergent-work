import type { NormalizedOffer, OfferProvider, OfferProviderAdapter } from "../provider-types";

/**
 * Revtoo CPA offer feed adapter.
 * Endpoint: GET https://revtoo.com/api/offers/
 * Query params: api_key, countries, user_id, limit, page
 * Response shape:
 *   { success, status, reward_value, reward_name, reward_round, total_offers,
 *     shown_offers, offers: [...], pagination }
 *
 * IMPORTANT — user_id placeholder:
 * The Revtoo API embeds whatever string you pass as user_id verbatim into every
 * offer's `url` field. Because the sync runs once per provider and the resulting
 * click_url is stored in the DB and shared across all users, we cannot put a real
 * user id here. Instead we embed REVTOO_USER_ID_PLACEHOLDER and replace it at
 * click-time in click-url.ts once we know the actual user.
 */
export const REVTOO_USER_ID_PLACEHOLDER = "REVTOO_USER_ID_PLACEHOLDER";

const REVTOO_API_BASE = "https://revtoo.com/api/offers/";

type RevtooOffer = {
  id?: string | number;
  title?: string;
  description?: string;
  payout?: number | string;
  reward?: number | string;
  url?: string;
  image?: string;
  category?: string;
  countries?: string[];
  os?: string[];
  hasEvents?: boolean;
  featured?: boolean;
  timestamp?: string;
  events?: unknown;
};

type RevtooResponse = {
  success?: boolean;
  status?: number;
  total_offers?: number;
  shown_offers?: number;
  offers?: RevtooOffer[];
  pagination?: unknown;
};

/**
 * Parses payout/reward into a number.
 * Revtoo may return a number OR the literal string "*" for variable payout.
 * Returns null when the value is "*" (variable) so the caller can handle it.
 */
function parsePayout(value: unknown): number | null {
  if (value === "*" || value === "*") return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Maps a Revtoo category string to the NormalizedOffer category enum value.
 * Only "survey" has a direct mapping; everything else is left as null.
 * Verify against a real API response — Revtoo may return other category strings.
 */
function mapCategory(category: string | undefined): string | null {
  if (!category) return null;
  if (category.toLowerCase() === "survey") return "Survey";
  return null;
}

export const revtooAdapter: OfferProviderAdapter = {
  slug: "revtoo",
  providerType: "cpa",

  validateConfig() {
    if (!process.env["REVTOO_API_KEY"]) {
      return "REVTOO_API_KEY is not configured on the server.";
    }
    return null;
  },

  async fetchOffers(provider: OfferProvider): Promise<NormalizedOffer[]> {
    const apiKey = process.env["REVTOO_API_KEY"];
    if (!apiKey) throw new Error("REVTOO_API_KEY is not configured on the server.");

    const cfg = (provider.sync_config ?? {}) as Record<string, unknown>;
    const country = typeof cfg["country"] === "string" && cfg["country"] ? cfg["country"] : undefined;

    const url = new URL(REVTOO_API_BASE);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("user_id", REVTOO_USER_ID_PLACEHOLDER);
    if (country) url.searchParams.set("countries", country);
    // Leave limit and page empty to use Revtoo defaults (full feed).

    const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Revtoo feed error (${response.status}): ${text.slice(0, 200)}`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`Revtoo feed returned non-JSON: ${text.slice(0, 200)}`);
    }

    const body = parsed as RevtooResponse;
    const list: RevtooOffer[] = Array.isArray(body?.offers) ? body.offers : [];

    if (!list.length) throw new Error("Revtoo feed returned no offers.");

    const seen = new Set<string>();
    const offers: NormalizedOffer[] = [];

    for (const item of list) {
      const externalOfferId = String(item.id ?? "").trim();
      const clickUrl = String(item.url ?? "").trim();
      const title = String(item.title ?? "").trim();

      // Skip offers missing required fields.
      if (!externalOfferId || !clickUrl || !title) continue;
      // Dedupe by externalOfferId.
      if (seen.has(externalOfferId)) continue;
      seen.add(externalOfferId);

      // Prefer payout; fall back to reward.
      const payoutRaw = item.payout ?? item.reward;
      const payoutValue = parsePayout(payoutRaw);
      const isVariable = payoutValue === null;

      offers.push({
        externalOfferId,
        title,
        description: String(item.description ?? "").trim() || undefined,
        requirements: isVariable ? "Variable payout" : undefined,
        icon: String(item.image ?? "").trim() || undefined,
        clickUrl,
        networkPayout: isVariable ? 0 : payoutValue,
        countries: Array.isArray(item.countries) ? item.countries.map((c) => String(c).toUpperCase()) : undefined,
        devices: Array.isArray(item.os) ? item.os.map((o) => String(o)) : undefined,
        isFeatured: item.featured === true,
        raw: item,
      });
    }

    return offers;
  },
};

export default revtooAdapter;
