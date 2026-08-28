import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Banner system — admin CRUD + section resolution.
 *
 * Banners live in the `banners` table and resolve to a display shape the client
 * renders via <BannerCarousel />. "smart" banners only surface when their
 * condition evaluates true against REAL app/user data — never fabricated.
 */

export type BannerSection = "home" | "offers" | "tasks" | "offerwall";
export type BannerType = "custom" | "smart" | "scheduled";
export type BannerAccent = "jade" | "gold" | "mint";

export type CtaTarget =
  | { type: "home" }
  | { type: "offers" }
  | { type: "featured" }
  | { type: "tasks" }
  | { type: "offerwall" }
  | { type: "wallet" }
  | { type: "refer" }
  | { type: "support" }
  | { type: "specific_offer"; offerId: string }
  | { type: "specific_offerwall"; slug: string }
  | { type: "external"; url: string };

/** What the client receives and renders. Serialized as JSON by the server fn. */
export type ResolvedBanner = {
  id: string;
  title: string;
  description?: string;
  eyebrow?: string;
  image?: string | null;
  icon?: string | null;
  accent: BannerAccent;
  cta?: { label: string; target: CtaTarget } | null;
  progress?: { current: number; goal: number; suffix?: string } | null;
};

export type BannerInput = {
  id?: string;
  section: BannerSection;
  bannerType: BannerType;
  title: string;
  description: string;
  eyebrow: string;
  imageUrl: string | null;
  icon: string;
  accent: BannerAccent;
  ctaLabel: string | null;
  ctaTarget: CtaTarget | null;
  smartKey: string | null;
  smartConfig: Record<string, unknown>;
  startsAt: string | null;
  endsAt: string | null;
  priority: number;
  isActive: boolean;
};

const ACCENTS: BannerAccent[] = ["jade", "gold", "mint"];

function coerceAccent(value: string | null | undefined): BannerAccent {
  return (ACCENTS as string[]).includes(value ?? "") ? (value as BannerAccent) : "jade";
}

/* ------------------------------- Admin CRUD ------------------------------- */

export async function listAdminBannersImpl() {
  const { data, error } = await supabaseAdmin
    .from("banners")
    .select("*")
    .order("section", { ascending: true })
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function upsertBannerImpl(input: BannerInput) {
  const row = {
    section: input.section,
    banner_type: input.bannerType,
    title: input.title,
    description: input.description,
    eyebrow: input.eyebrow,
    image_url: input.imageUrl,
    icon: input.icon,
    accent: input.accent,
    cta_label: input.ctaLabel,
    cta_target: (input.ctaTarget ?? null) as Record<string, unknown> | null,
    smart_key: input.smartKey,
    smart_config: input.smartConfig as Record<string, unknown>,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    priority: input.priority,
    is_active: input.isActive,
  };

  if (input.id) {
    const { data, error } = await supabaseAdmin
      .from("banners")
      .update(row)
      .eq("id", input.id)
      .select("id")
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabaseAdmin
    .from("banners")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBannerImpl(id: string) {
  const { error } = await supabaseAdmin.from("banners").delete().eq("id", id);
  if (error) throw error;
  return { ok: true };
}

export async function setBannerActiveImpl(id: string, isActive: boolean) {
  const { error } = await supabaseAdmin
    .from("banners")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw error;
  return { ok: true };
}

/* --------------------------- Section resolution --------------------------- */

type ProfileCtx = {
  streak_count: number;
  lifetime_earned: number;
  created_at: string;
} | null;

type SmartContext = {
  profile: ProfileCtx;
  offers:
    | {
        reward_amount: number;
        is_featured: boolean;
        is_active: boolean;
        last_seen_at: string | null;
        created_at: string;
        expires_at: string | null;
      }[]
    | null;
  userTasks: { task_id: string; status: string; progress: number; target: number }[] | null;
  tasks: { id: string; is_active: boolean }[] | null;
  offerwallRows: { id: string; enabled: boolean }[] | null;
};

async function buildSmartContext(
  userId: string,
  profile: ProfileCtx,
  keys: Set<string>,
): Promise<SmartContext> {
  const ctx: SmartContext = {
    profile,
    offers: null,
    userTasks: null,
    tasks: null,
    offerwallRows: null,
  };

  const jobs: Promise<unknown>[] = [];

  if (
    keys.has("new_offers") ||
    keys.has("high_value_offers") ||
    keys.has("featured_offers")
  ) {
    jobs.push(
      supabaseAdmin
        .from("offers")
        .select(
          "reward_amount, is_featured, is_active, last_seen_at, created_at, expires_at",
        )
        .then((r) => {
          ctx.offers = r.data ?? [];
        }),
    );
  }

  if (
    keys.has("task_progress") ||
    keys.has("completed_tasks") ||
    keys.has("incomplete_tasks") ||
    keys.has("new_user")
  ) {
    jobs.push(
      supabaseAdmin
        .from("user_tasks")
        .select("task_id, status, progress, target")
        .eq("user_id", userId)
        .then((r) => {
          ctx.userTasks = r.data ?? [];
        }),
    );
  }

  if (keys.has("incomplete_tasks")) {
    jobs.push(
      supabaseAdmin
        .from("tasks")
        .select("id, is_active")
        .then((r) => {
          ctx.tasks = r.data ?? [];
        }),
    );
  }

  if (keys.has("new_offerwall")) {
    jobs.push(
      supabaseAdmin
        .from("sdk_offerwall_providers")
        .select("id, enabled")
        .then((r) => {
          ctx.offerwallRows = r.data ?? [];
        }),
    );
  }

  await Promise.all(jobs);
  return ctx;
}

function evaluateSmart(
  key: string | null,
  ctx: SmartContext,
  config: Record<string, unknown>,
): boolean {
  const now = Date.now();

  switch (key) {
    case "new_user": {
      const created = ctx.profile ? new Date(ctx.profile.created_at).getTime() : 0;
      const fresh = now - created < 24 * 3600 * 1000;
      const noActivity =
        (ctx.profile?.lifetime_earned ?? 0) === 0 &&
        (ctx.profile?.streak_count ?? 0) === 0;
      const noCompleted = (ctx.userTasks ?? []).every((t) => t.status !== "completed");
      return fresh || (noActivity && noCompleted);
    }

    case "returning_user":
      return (
        (ctx.profile?.lifetime_earned ?? 0) > 0 ||
        (ctx.profile?.streak_count ?? 0) > 0
      );

    case "streak":
      return (ctx.profile?.streak_count ?? 0) > 0;

    case "new_offers": {
      const cutoff = now - 7 * 24 * 3600 * 1000;
      return (ctx.offers ?? []).some((o) => {
        if (!o.is_active) return false;
        if (o.expires_at && new Date(o.expires_at).getTime() <= now) return false;
        const ts = o.last_seen_at
          ? new Date(o.last_seen_at).getTime()
          : new Date(o.created_at).getTime();
        return ts >= cutoff;
      });
    }

    case "high_value_offers": {
      const threshold = Number(config.threshold ?? 5);
      return (ctx.offers ?? []).some(
        (o) =>
          o.is_active &&
          Number(o.reward_amount) >= threshold &&
          (!o.expires_at || new Date(o.expires_at).getTime() > now),
      );
    }

    case "featured_offers":
      return (ctx.offers ?? []).some((o) => o.is_active && o.is_featured);

    case "task_progress":
      return (ctx.userTasks ?? []).some(
        (t) => t.status !== "completed" && t.progress > 0,
      );

    case "incomplete_tasks": {
      const active = (ctx.tasks ?? []).filter((t) => t.is_active);
      if (!active.length) return false;
      const done = new Set(
        (ctx.userTasks ?? [])
          .filter((t) => t.status === "completed")
          .map((t) => t.task_id),
      );
      return active.some((t) => !done.has(t.id));
    }

    case "completed_tasks":
      return (ctx.userTasks ?? []).some((t) => t.status === "completed");

    case "new_offerwall":
      return (ctx.offerwallRows ?? []).some((o) => o.enabled);

    default:
      return false;
  }
}

export async function getSectionBannersImpl(
  userId: string,
  section: BannerSection,
): Promise<ResolvedBanner[]> {
  const now = new Date();

  const [bannersRes, profileRes] = await Promise.all([
    supabaseAdmin
      .from("banners")
      .select("*")
      .eq("section", section)
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("profiles")
      .select("streak_count, lifetime_earned, created_at")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  const all = bannersRes.data ?? [];
  const profile: ProfileCtx = (profileRes.data as SmartContext["profile"]) ?? null;

  // Schedule window: skip not-yet-started and already-ended banners.
  const inWindow = all.filter((b) => {
    const start = b.starts_at ? new Date(b.starts_at) : null;
    const end = b.ends_at ? new Date(b.ends_at) : null;
    if (start && start > now) return false;
    if (end && end <= now) return false;
    return true;
  });

  const smartKeys = new Set(
    inWindow
      .filter((b) => b.banner_type === "smart")
      .map((b) => b.smart_key)
      .filter(Boolean) as string[],
  );
  const ctx = await buildSmartContext(userId, profile, smartKeys);

  const resolved: ResolvedBanner[] = [];
  for (const b of inWindow) {
    const cfg = (b.smart_config ?? {}) as Record<string, unknown>;
    if (b.banner_type === "smart" && !evaluateSmart(b.smart_key, ctx, cfg)) continue;

    let progress: ResolvedBanner["progress"] = null;
    if (b.banner_type === "smart" && b.smart_key === "streak" && ctx.profile) {
      progress = {
        current: ctx.profile.streak_count,
        goal: Number(cfg.goal ?? 7),
        suffix: "to bonus",
      };
    }

    const cta =
      b.cta_label && b.cta_target
        ? { label: b.cta_label, target: b.cta_target as unknown as CtaTarget }
        : null;

    resolved.push({
      id: b.id,
      title: b.title,
      description: b.description || undefined,
      eyebrow: b.eyebrow || undefined,
      image: b.image_url ?? null,
      icon: b.icon || null,
      accent: coerceAccent(b.accent),
      cta,
      progress,
    });
  }

  return resolved;
}
