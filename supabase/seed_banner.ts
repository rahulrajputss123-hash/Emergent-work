/**
 * One-off seed: inserts a sample custom banner for the "home" section.
 * Run inside the web container where Supabase env vars are loaded:
 *   bun run supabase/seed_banner.ts
 */
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
  section: "home",
  banner_type: "custom",
  title: "Welcome to CoinQuest 🎮",
  description: "Complete offers & tasks to earn coins. New users get a streak bonus!",
  eyebrow: "Get started",
  icon: "🚀",
  accent: "jade",
  cta_label: "View offers",
  cta_target: { type: "offers" },
  priority: 10,
  is_active: true,
};

const { data, error } = await supabase
  .from("banners")
  .insert(banner)
  .select("id, section, title, is_active")
  .single();

if (error) {
  console.error("Seed failed:", error.message);
  process.exit(1);
}

console.log("Seeded banner:", JSON.stringify(data, null, 2));
