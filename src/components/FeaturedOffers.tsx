import { ArrowUpRight, Check, Clock, Gift } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/States";
import { formatMoney } from "@/lib/coinquest";
import { claimOffer } from "@/lib/coinquest.functions";
import { useOfferClaims, useOffers } from "@/lib/queries";
import { Skeleton } from "@/components/ui/skeleton";

export function FeaturedOffers({
  featuredOnly = true,
  limit,
}: {
  featuredOnly?: boolean;
  limit?: number;
}) {
  const { data, isLoading, isError, refetch } = useOffers(featuredOnly);
  const claims = useOfferClaims();
  const queryClient = useQueryClient();
  const claim = useServerFn(claimOffer);

  const mutation = useMutation({
    mutationFn: async (offerId: string) => claim({ data: { offerId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["offer-claims"] });
      toast.success("Claim submitted — an admin will review it shortly.");
    },
    onError: (err: Error) =>
      toast.error(err.message || "Could not submit that claim. Try again."),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-2xl" />
        ))}
      </div>
    );
  }
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  if (!data?.length) {
    return (
      <EmptyState
        icon={Gift}
        title="No offers available right now"
        description="Check back soon — new partner offers land every day."
      />
    );
  }

  const offers = typeof limit === "number" ? data.slice(0, limit) : data;

  return (
    <ul className="grid grid-cols-3 gap-3">
      {offers.map((offer) => {
        const existing = (claims.data ?? []).find((c) => c.offer_id === offer.id);
        const pending = mutation.isPending && mutation.variables === offer.id;
        return (
          <li key={offer.id} className="surface-card flex flex-col gap-2 p-3">
            <span className="grid size-9 place-items-center overflow-hidden rounded-xl bg-background-alt">
  {offer.icon && offer.icon.startsWith("http") ? (
    <img
      src={offer.icon}
      alt=""
      className="size-full object-cover"
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  ) : (
    <Gift className="size-4 text-primary" />
  )}
</span>
              
            
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">{offer.title}</p>
              <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                {offer.description}
              </p>
            </div>
            <span className="text-amount text-sm text-gold-dark">
              {formatMoney(offer.reward_amount)}
            </span>
            {existing ? (
              <span className="mt-auto flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                {existing.status === "approved" ? (
                  <>
                    <Check className="size-3.5 text-primary" /> Approved
                  </>
                ) : existing.status === "rejected" ? (
                  <>Rejected</>
                ) : (
                  <>
                    <Clock className="size-3.5" /> In review
                  </>
                )}
              </span>
            ) : (
              <Button
                size="sm"
                variant="mint"
                className="mt-auto w-full gap-1 px-2 text-xs"
                disabled={pending}
                onClick={() => {
                  if (offer.click_url) {
                    window.open(offer.click_url, "_blank", "noopener,noreferrer");
                  }
                  mutation.mutate(offer.id);
                }}
              >
                {pending ? "Sending…" : "Claim"} <ArrowUpRight className="size-3.5" />
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
