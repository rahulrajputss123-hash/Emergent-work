import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Banner management + section resolution API. */

const ctaTargetSchema = z.object({
  type: z.enum([
    "home",
    "offers",
    "featured",
    "tasks",
    "offerwall",
    "wallet",
    "refer",
    "support",
    "specific_offer",
    "specific_offerwall",
    "external",
  ]),
  url: z.string().trim().url().max(1000).optional(),
  offerId: z.string().uuid().optional(),
  slug: z.string().trim().max(80).optional(),
});

const bannerInputSchema = z.object({
  id: z.string().uuid().optional(),
  section: z.enum(["home", "offers", "tasks", "offerwall"]),
  bannerType: z.enum(["custom", "smart", "scheduled"]),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(400).default(""),
  eyebrow: z.string().trim().max(80).default(""),
  imageUrl: z.string().trim().url().max(1000).nullable().optional(),
  icon: z.string().trim().max(60).default(""),
  accent: z.enum(["jade", "gold", "mint"]).default("jade"),
  ctaLabel: z.string().trim().max(40).nullable().optional(),
  ctaTarget: ctaTargetSchema.nullable().optional(),
  smartKey: z
    .enum([
      "new_user",
      "returning_user",
      "streak",
      "new_offers",
      "high_value_offers",
      "featured_offers",
      "task_progress",
      "incomplete_tasks",
      "completed_tasks",
      "new_offerwall",
    ])
    .nullable()
    .optional(),
  smartConfig: z.record(z.string(), z.unknown()).default({}),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  priority: z.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
});

export const getSectionBanners = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ section: z.enum(["home", "offers", "tasks", "offerwall"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { getSectionBannersImpl } = await import("./banners/banners.server");
    return getSectionBannersImpl(context.userId, data.section);
  });

export const listAdminBanners = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("./coinquest.server");
    await assertAdmin(context.supabase, context.userId);
    const { listAdminBannersImpl } = await import("./banners/banners.server");
    return listAdminBannersImpl();
  });

export const saveBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => bannerInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./coinquest.server");
    await assertAdmin(context.supabase, context.userId);
    const { upsertBannerImpl } = await import("./banners/banners.server");
    return upsertBannerImpl(data);
  });

export const deleteBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./coinquest.server");
    await assertAdmin(context.supabase, context.userId);
    const { deleteBannerImpl } = await import("./banners/banners.server");
    return deleteBannerImpl(data.id);
  });

export const setBannerActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), isActive: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./coinquest.server");
    await assertAdmin(context.supabase, context.userId);
    const { setBannerActiveImpl } = await import("./banners/banners.server");
    return setBannerActiveImpl(data.id, data.isActive);
  });
