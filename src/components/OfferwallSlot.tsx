import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Layers, Lock, Unlock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { listSdkOfferwallProviders } from "@/lib/sdk-offerwall.functions";
import type { PublicSdkOfferwallProvider } from "@/lib/sdk-offerwall/types";

/**
 * INTEGRATION POINT — SDK offerwall networks.
 *
 * Providers are configured in Admin → SDK Offerwalls (table `sdk_offerwall_providers`).
 * Each card shows as LOCKED when:
 *   - time_lock_until is set and is in the future, OR
 *   - min_lifetime_earned is set and the user hasn’t earned enough yet.
 * Locked cards are still visible but cannot be launched.
 * Disabled providers (enabled=false) are hidden entirely.
 */

function isTimeLocked(provider: PublicSdkOfferwallProvider): boolean {
  if (!provider.timeLockUntil) return false;
  return new Date(provider.timeLockUntil) > new Date();
}

function isEarningLocked(
  provider: PublicSdkOfferwallProvider,
  lifetimeEarned: number,
): boolean {
  if (provider.minLifetimeEarned == null) return false;
  return lifetimeEarned < Number(provider.minLifetimeEarned);
}

function lockReason(
  provider: PublicSdkOfferwallProvider,
  lifetimeEarned: number,
): string | null {
  if (provider.lockLabel) return provider.lockLabel;
  if (isTimeLocked(provider)) {
    const until = new Date(provider.timeLockUntil!);
    return `Unlocks ${until.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }
  if (isEarningLocked(provider, lifetimeEarned)) {
    return `Earn $${Number(provider.minLifetimeEarned).toFixed(2)} to unlock`;
  }
  return null;
}

function earningProgress(
  provider: PublicSdkOfferwallProvider,
  lifetimeEarned: number,
): number {
  if (provider.minLifetimeEarned == null || provider.minLifetimeEarned <= 0) return 100;
  return Math.min(100, (lifetimeEarned / Number(provider.minLifetimeEarned)) * 100);
}

function ProviderCard({
  provider,
  lifetimeEarned,
}: {
  provider: PublicSdkOfferwallProvider;
  lifetimeEarned: number;
}) {
  const timeLocked = isTimeLocked(provider);
  const earningLocked = isEarningLocked(provider, lifetimeEarned);
  const locked = timeLocked || earningLocked;
  const reason = lockReason(provider, lifetimeEarned);
  const progress = earningLocked ? earningProgress(provider, lifetimeEarned) : null;

  return (
    <article
      className={`surface-card flex flex-col gap-2 p-3 transition-opacity ${
        locked ? "opacity-75" : ""
      }`}
    >
      {/* Logo + lock indicator */}
      <div className="flex items-start justify-between">
        <span className="grid size-9 place-items-center overflow-hidden rounded-xl bg-jade-gradient text-primary-foreground">
          {provider.logoUrl ? (
            <img
              src={provider.logoUrl}
              alt={`${provider.name} logo`}
              className="size-9 object-cover"
            />
          ) : (
            <Layers className="size-4" />
          )}
        </span>
        {locked ? (
          <Lock className="size-4 text-muted-foreground" aria-label="Locked" />
        ) : (
          <Unlock className="size-4 text-emerald-500" aria-label="Unlocked" />
        )}
      </div>

      {/* Name + tagline */}
      <div>
        <p className="font-semibold leading-tight">{provider.name}</p>
        <p className="text-xs text-muted-foreground">{provider.tagline}</p>
      </div>

      {/* Lock reason label */}
      {locked && reason && (
        <p className="text-xs font-medium text-amber-500">{reason}</p>
      )}

      {/* Earning progress bar (only shown for earning locks) */}
      {earningLocked && progress !== null && (
        <div className="grid gap-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-jade-gradient transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-right text-[10px] text-muted-foreground">
            ${lifetimeEarned.toFixed(2)} / ${Number(provider.minLifetimeEarned).toFixed(2)}
          </p>
        </div>
      )}

      {/* CTA button */}
      <Button size="sm" variant="outline" className="mt-auto gap-1" disabled>
        {locked ? (
          <>
            <Lock className="size-3.5" /> Locked
          </>
        ) : (
          <>
            Mobile app only <ExternalLink className="size-3.5" />
          </>
        )}
      </Button>
    </article>
  );
}

export function OfferwallSlot({ limit }: { limit?: number }) {
  const fetchProviders = useServerFn(listSdkOfferwallProviders);
  const { profile } = useAuth();
  const lifetimeEarned = Number(profile?.lifetime_earned ?? 0);

  const providers = useQuery({
    queryKey: ["sdk-offerwall-public", limit ?? "all"],
    queryFn: () => fetchProviders({ data: limit ? { limit } : {} }),
  });

  if (providers.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading offerwalls…</p>;
  }

  if (!providers.data?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No offerwall networks are active yet. Check back soon.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {providers.data.map((provider) => (
        <ProviderCard
          key={provider.id}
          provider={provider}
          lifetimeEarned={lifetimeEarned}
        />
      ))}
    </div>
  );
}
