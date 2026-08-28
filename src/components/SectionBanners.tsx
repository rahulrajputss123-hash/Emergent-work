import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { BannerCarousel, type DisplayBanner } from "@/components/BannerCarousel";
import { getSectionBanners } from "@/lib/banners.functions";
import type { BannerSection } from "@/lib/banners/banners.server";

/**
 * Renders admin-managed banners for a section. When no banners resolve
 * (empty table / no eligible smart banners), an optional `fallback` banner
 * is shown so existing pages keep their original look.
 */
export function SectionBanners({
  section,
  fallback,
}: {
  section: BannerSection;
  fallback?: DisplayBanner | null;
}) {
  const fetchBanners = useServerFn(getSectionBanners);

  const { data } = useQuery({
    queryKey: ["section-banners", section],
    queryFn: () => fetchBanners({ data: { section } }),
  });

  const banners = data && data.length > 0 ? data : fallback ? [fallback] : [];
  if (banners.length === 0) return null;

  return <BannerCarousel banners={banners} />;
}
