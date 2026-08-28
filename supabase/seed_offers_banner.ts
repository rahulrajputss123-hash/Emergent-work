/** One-off seed: inserts a sample Offers banner using the generated illustration. */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const banner = {
  section: "offers",
  banner_type: "custom",
  title: "Gift rewards await",
  description: "Claim high-value offers and unlock bonus coins every day.",
  eyebrow: "Daily rewards",
  image_url: "/images/banner-offers.svg",
  icon: "🎁",
  accent: "gold",
  cta_label: "Browse offers",
  cta_target: { type: "offers" },
  priority: 20,
  is_active: true,
};

const { data, error } = await supabase
  .from("banners")
  .insert(banner)
  .select("id, section, title, image_url, is_active")
  .single();

if (error) {
  console.error("Seed failed:", error.message);
  process.exit(1);
}

console.log("Seeded offers banner:", JSON.stringify(data, null, 2));
