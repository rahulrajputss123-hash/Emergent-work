import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

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

export type DisplayBanner = {
  id: string;
  title: string;
  description?: string;
  eyebrow?: string;
  image?: string | null;
  icon?: string | null;
  accent?: "jade" | "gold" | "mint";
  cta?: { label: string; target: CtaTarget } | null;
  progress?: { current: number; goal: number; suffix?: string } | null;
};

const ACCENT_STYLES: Record<
  NonNullable<DisplayBanner["accent"]>,
  { surface: string; text: string; track: string; bar: string; pill: string }
> = {
  jade: {
    surface: "bg-jade-gradient text-primary-foreground",
    text: "text-primary-foreground",
    track: "bg-primary-foreground/20",
    bar: "bg-primary-foreground",
    pill: "bg-primary-foreground/15 text-primary-foreground",
  },
  gold: {
    surface: "bg-gold-gradient text-gold-foreground",
    text: "text-gold-foreground",
    track: "bg-gold-foreground/15",
    bar: "bg-gold-foreground",
    pill: "bg-gold-foreground/15 text-gold-foreground",
  },
  mint: {
    surface: "bg-mint-gradient text-mint-foreground",
    text: "text-mint-foreground",
    track: "bg-mint-foreground/15",
    bar: "bg-mint-foreground",
    pill: "bg-mint-foreground/15 text-mint-foreground",
  },
};

function useCtaHandler() {
  const navigate = useNavigate();
  return useCallback(
    (target: CtaTarget) => {
      switch (target.type) {
        case "home":
          void navigate({ to: "/" });
          break;
        case "offers":
          void navigate({ to: "/offers" });
          break;
        case "featured":
          void navigate({ to: "/featured" });
          break;
        case "tasks":
          void navigate({ to: "/task" });
          break;
        case "offerwall":
          void navigate({ to: "/offerwall" });
          break;
        case "wallet":
          void navigate({ to: "/wallet" });
          break;
        case "refer":
          void navigate({ to: "/refer" });
          break;
        case "support":
          void navigate({ to: "/support" });
          break;
        case "specific_offer":
          void navigate({ to: "/offers" });
          break;
        case "specific_offerwall":
          void navigate({ to: "/offerwall" });
          break;
        case "external":
          if (target.url) window.open(target.url, "_blank", "noopener,noreferrer");
          break;
      }
    },
    [navigate],
  );
}

export function BannerCarousel({
  banners,
  interval = 4500,
}: {
  banners: DisplayBanner[];
  interval?: number;
}) {
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const count = banners.length;
  const onCta = useCtaHandler();

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => clearInterval(t);
  }, [count, interval]);

  if (count === 0) return null;

  return (
    <section aria-roledescription="carousel" className="relative overflow-hidden rounded-3xl shadow-lift">
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
        onTouchStart={(e) => {
          touchX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchX.current;
          const end = e.changedTouches[0]?.clientX;
          if (start == null || end == null) return;
          const dx = end - start;
          if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
          touchX.current = null;
        }}
      >
        {banners.map((b, i) => {
          const accent = b.accent ?? "jade";
          const s = ACCENT_STYLES[accent];
          const progressPct =
            b.progress && b.progress.goal > 0
              ? Math.min(100, (b.progress.current / b.progress.goal) * 100)
              : 0;
          return (
            <div
              key={b.id}
              aria-hidden={i !== index}
              className={`relative w-full shrink-0 ${s.surface}`}
            >
              {b.image ? (
                <>
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${b.image})` }}
                  />
                  <div className={`absolute inset-0 ${s.surface} opacity-80`} />
                </>
              ) : null}
              <div className="relative p-5">
                <div className="flex items-start gap-3">
                  {b.icon ? (
                    <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-black/10 text-xl backdrop-blur-sm">
                      {b.icon}
                    </span>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    {b.eyebrow ? (
                      <p className={`text-sm opacity-80 ${s.text}`}>{b.eyebrow}</p>
                    ) : null}
                    <h2 className="mt-1 text-2xl">{b.title}</h2>
                    {b.description ? (
                      <p className="mt-1.5 text-sm opacity-85">{b.description}</p>
                    ) : null}
                  </div>
                </div>

                {b.progress ? (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold">{b.progress.current}</span>
                      <span className="opacity-70">
                        {b.progress.suffix ? `· ${Math.max(0, b.progress.goal - b.progress.current)} ${b.progress.suffix}` : ""}
                      </span>
                    </div>
                    <div className={`mt-2 h-2 overflow-hidden rounded-full ${s.track}`}>
                      <div
                        className={`h-full rounded-full ${s.bar} transition-all`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                ) : null}

                {b.cta ? (
                  <button
                    type="button"
                    onClick={() => b.cta && onCta(b.cta.target)}
                    className={`mt-4 rounded-full px-4 py-2 text-sm font-semibold ${s.pill}`}
                  >
                    {b.cta.label}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {count > 1 ? (
        <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-label={`Go to banner ${i + 1}`}
              onClick={() => go(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-primary-foreground" : "w-1.5 bg-primary-foreground/50"
              }`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
