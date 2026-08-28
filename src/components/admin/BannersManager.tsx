import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { BannerCarousel, type DisplayBanner } from "@/components/BannerCarousel";
import { EmptyState } from "@/components/States";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/coinquest";
import {
  deleteBanner,
  listAdminBanners,
  saveBanner,
  setBannerActive,
} from "@/lib/banners.functions";

type AdminBanner = Awaited<ReturnType<typeof listAdminBanners>>[number];
type SectionFilter = "all" | "home" | "offers" | "tasks" | "offerwall";

const SECTIONS: SectionFilter[] = ["all", "home", "offers", "tasks", "offerwall"];
const ACCENTS = ["jade", "gold", "mint"] as const;
const BANNER_TYPES = ["custom", "smart", "scheduled"] as const;

const SMART_KEYS = [
  { value: "new_user", label: "New user — start earning" },
  { value: "returning_user", label: "Returning user — welcome back" },
  { value: "streak", label: "Active streak" },
  { value: "new_offers", label: "New offers available" },
  { value: "high_value_offers", label: "High-paying offers" },
  { value: "featured_offers", label: "Featured offers available" },
  { value: "task_progress", label: "Task in progress" },
  { value: "incomplete_tasks", label: "Incomplete tasks" },
  { value: "completed_tasks", label: "Completed tasks" },
  { value: "new_offerwall", label: "New offerwall network" },
] as const;

const CTA_TYPES = [
  { value: "home", label: "Home" },
  { value: "offers", label: "Offers" },
  { value: "featured", label: "Featured offers" },
  { value: "tasks", label: "Tasks" },
  { value: "offerwall", label: "Offerwall" },
  { value: "wallet", label: "Wallet" },
  { value: "refer", label: "Refer" },
  { value: "support", label: "Support" },
  { value: "specific_offer", label: "Specific offer" },
  { value: "specific_offerwall", label: "Specific offerwall" },
  { value: "external", label: "External link" },
] as const;

const emptyForm = {
  id: undefined as string | undefined,
  section: "home" as "home" | "offers" | "tasks" | "offerwall",
  bannerType: "custom" as "custom" | "smart" | "scheduled",
  title: "",
  description: "",
  eyebrow: "",
  imageUrl: "",
  icon: "",
  accent: "jade" as (typeof ACCENTS)[number],
  ctaLabel: "",
  ctaTargetType: "" as "" | (typeof CTA_TYPES)[number]["value"],
  ctaUrl: "",
  ctaOfferId: "",
  ctaSlug: "",
  smartKey: "" as "" | (typeof SMART_KEYS)[number]["value"],
  smartThreshold: "5",
  smartGoal: "7",
  startsAt: "",
  endsAt: "",
  priority: "0",
  isActive: true,
};

type FormState = typeof emptyForm;

function buildCtaTarget(form: FormState) {
  if (!form.ctaLabel.trim() || !form.ctaTargetType) return null;
  switch (form.ctaTargetType) {
    case "external":
      return form.ctaUrl.trim()
        ? { type: "external" as const, url: form.ctaUrl.trim() }
        : null;
    case "specific_offer":
      return form.ctaOfferId.trim()
        ? { type: "specific_offer" as const, offerId: form.ctaOfferId.trim() }
        : null;
    case "specific_offerwall":
      return form.ctaSlug.trim()
        ? { type: "specific_offerwall" as const, slug: form.ctaSlug.trim() }
        : null;
    default:
      return { type: form.ctaTargetType };
  }
}

function previewBanner(form: FormState): DisplayBanner {
  const target = buildCtaTarget(form);
  return {
    id: "preview",
    title: form.title || "Banner title",
    description: form.description || undefined,
    eyebrow: form.eyebrow || undefined,
    image: form.imageUrl.trim() || null,
    icon: form.icon || null,
    accent: form.accent,
    cta: target ? { label: form.ctaLabel.trim(), target } : null,
    progress:
      form.bannerType === "smart" && form.smartKey === "streak"
        ? { current: 3, goal: Number(form.smartGoal) || 7, suffix: "to bonus" }
        : null,
  };
}

export function BannersManager() {
  const queryClient = useQueryClient();
  const fetchBanners = useServerFn(listAdminBanners);
  const save = useServerFn(saveBanner);
  const remove = useServerFn(deleteBanner);
  const toggle = useServerFn(setBannerActive);

  const [section, setSection] = useState<SectionFilter>("all");
  const [form, setForm] = useState<FormState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminBanner | null>(null);

  const banners = useQuery({
    queryKey: ["admin-banners"],
    queryFn: () => fetchBanners({}),
  });

  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
  const onError = (error: Error) => toast.error(error.message);

  const saveAction = useMutation({
    mutationFn: (state: FormState) =>
      save({
        data: {
          ...(state.id ? { id: state.id } : {}),
          section: state.section,
          bannerType: state.bannerType,
          title: state.title.trim(),
          description: state.description.trim(),
          eyebrow: state.eyebrow.trim(),
          imageUrl: state.imageUrl.trim() ? state.imageUrl.trim() : null,
          icon: state.icon.trim(),
          accent: state.accent,
          ctaLabel: state.ctaLabel.trim() ? state.ctaLabel.trim() : null,
          ctaTarget: buildCtaTarget(state),
          smartKey: state.bannerType === "smart" && state.smartKey ? state.smartKey : null,
          smartConfig:
            state.bannerType === "smart"
              ? {
                  ...(state.smartKey === "high_value_offers"
                    ? { threshold: Number(state.smartThreshold) || 5 }
                    : {}),
                  ...(state.smartKey === "streak" ? { goal: Number(state.smartGoal) || 7 } : {}),
                }
              : {},
          startsAt: state.startsAt ? new Date(state.startsAt).toISOString() : null,
          endsAt: state.endsAt ? new Date(state.endsAt).toISOString() : null,
          priority: Number(state.priority) || 0,
          isActive: state.isActive,
        },
      }),
    onSuccess: () => {
      toast.success("Banner saved.");
      setForm(null);
      refresh();
      void queryClient.invalidateQueries({ queryKey: ["section-banners"] });
    },
    onError,
  });

  const deleteAction = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Banner deleted.");
      setPendingDelete(null);
      refresh();
      void queryClient.invalidateQueries({ queryKey: ["section-banners"] });
    },
    onError,
  });

  const toggleAction = useMutation({
    mutationFn: (input: { id: string; isActive: boolean }) =>
      toggle({ data: input }),
    onSuccess: () => {
      refresh();
      void queryClient.invalidateQueries({ queryKey: ["section-banners"] });
    },
    onError,
  });

  const openEdit = (b: AdminBanner) => {
    const cta = (b.cta_target ?? null) as { type: string; url?: string; offerId?: string; slug?: string } | null;
    setForm({
      id: b.id,
      section: b.section as FormState["section"],
      bannerType: b.banner_type as FormState["bannerType"],
      title: b.title,
      description: b.description ?? "",
      eyebrow: b.eyebrow ?? "",
      imageUrl: b.image_url ?? "",
      icon: b.icon ?? "",
      accent: (b.accent as FormState["accent"]) ?? "jade",
      ctaLabel: b.cta_label ?? "",
      ctaTargetType: (cta?.type as FormState["ctaTargetType"]) ?? "",
      ctaUrl: cta?.url ?? "",
      ctaOfferId: cta?.offerId ?? "",
      ctaSlug: cta?.slug ?? "",
      smartKey: (b.smart_key as FormState["smartKey"]) ?? "",
      smartThreshold: String((b.smart_config as Record<string, unknown>)?.threshold ?? 5),
      smartGoal: String((b.smart_config as Record<string, unknown>)?.goal ?? 7),
      startsAt: b.starts_at ? b.starts_at.slice(0, 16) : "",
      endsAt: b.ends_at ? b.ends_at.slice(0, 16) : "",
      priority: String(b.priority ?? 0),
      isActive: b.is_active,
    });
  };

  const list =
    section === "all"
      ? (banners.data ?? [])
      : (banners.data ?? []).filter((b) => b.section === section);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {SECTIONS.map((key) => (
          <Button
            key={key}
            size="sm"
            variant={section === key ? "jade" : "outline"}
            onClick={() => setSection(key)}
            className="capitalize"
          >
            {key}
          </Button>
        ))}
        <Button size="sm" variant="gold" className="ml-auto" onClick={() => setForm({ ...emptyForm })}>
          <Plus className="mr-1 h-4 w-4" /> New banner
        </Button>
      </div>

      {banners.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading banners…</p>
      ) : !list.length ? (
        <EmptyState
          icon={Plus}
          title="No banners yet"
          description="Create a custom, smart or scheduled banner for any section."
        />
      ) : (
        <ul className="space-y-2">
          {list.map((b) => (
            <li key={b.id} className="surface-card space-y-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{b.title}</p>
                  {b.description ? (
                    <p className="line-clamp-1 text-xs text-muted-foreground">{b.description}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="rounded-full bg-background-alt px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                    {b.section}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      b.banner_type === "smart"
                        ? "bg-mint/30 text-mint-foreground"
                        : b.banner_type === "scheduled"
                          ? "bg-gold/30 text-gold-foreground"
                          : "bg-primary/15 text-primary"
                    }`}
                  >
                    {b.banner_type}
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Accent {b.accent} · Priority {b.priority}
                {b.smart_key ? ` · smart: ${b.smart_key}` : ""}
                {b.cta_label ? ` · CTA “${b.cta_label}”` : " · no CTA"}
              </p>
              <p className="text-xs text-muted-foreground">
                {b.starts_at || b.ends_at
                  ? `${b.starts_at ? formatDateTime(b.starts_at) : "now"} → ${b.ends_at ? formatDateTime(b.ends_at) : "ongoing"}`
                  : "Always visible"}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs">
                  <Switch
                    checked={b.is_active}
                    onCheckedChange={(value) =>
                      toggleAction.mutate({ id: b.id, isActive: value })
                    }
                  />
                  Active
                </label>
                <Button size="sm" variant="outline" onClick={() => openEdit(b)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPendingDelete(b)}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={Boolean(form)} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit banner" : "New banner"}</DialogTitle>
          </DialogHeader>
          {form ? (
            <div className="space-y-3">
              {(() => {
                const preview = previewBanner(form);
                return preview.title ? (
                  <div data-testid="banner-preview">
                    <BannerCarousel banners={[preview]} />
                  </div>
                ) : null;
              })()}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Section">
                  <NativeSelect
                    value={form.section}
                    onChange={(v) => setForm({ ...form, section: v as FormState["section"] })}
                    options={SECTIONS.filter((s) => s !== "all").map((s) => ({ value: s, label: s }))}
                  />
                </Field>
                <Field label="Banner type">
                  <NativeSelect
                    value={form.bannerType}
                    onChange={(v) => setForm({ ...form, bannerType: v as FormState["bannerType"] })}
                    options={BANNER_TYPES.map((t) => ({ value: t, label: t }))}
                  />
                </Field>
              </div>

              <Field label="Title">
                <Input
                  value={form.title}
                  maxLength={120}
                  placeholder="e.g. Let's earn today"
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </Field>
              <Field label="Eyebrow (small line above title)">
                <Input
                  value={form.eyebrow}
                  maxLength={80}
                  placeholder="e.g. Welcome back"
                  onChange={(e) => setForm({ ...form, eyebrow: e.target.value })}
                />
              </Field>
              <Field label="Short description">
                <Textarea
                  rows={2}
                  maxLength={400}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Icon (emoji)">
                  <Input
                    value={form.icon}
                    maxLength={10}
                    placeholder="🔥"
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  />
                </Field>
                <Field label="Accent">
                  <NativeSelect
                    value={form.accent}
                    onChange={(v) => setForm({ ...form, accent: v as FormState["accent"] })}
                    options={ACCENTS.map((a) => ({ value: a, label: a }))}
                  />
                </Field>
              </div>
              <Field label="Image URL (optional illustration)">
                <Input
                  value={form.imageUrl}
                  placeholder="https://…"
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                />
              </Field>

              {form.bannerType === "smart" ? (
                <div className="space-y-3 rounded-xl border border-border p-3">
                  <Field label="Smart logic (shows only when condition is true)">
                    <NativeSelect
                      value={form.smartKey}
                      onChange={(v) => setForm({ ...form, smartKey: v as FormState["smartKey"] })}
                      options={[{ value: "", label: "Select logic…" }, ...SMART_KEYS.map((k) => ({ value: k.value, label: k.label }))]}
                    />
                  </Field>
                  {form.smartKey === "high_value_offers" ? (
                    <Field label="Min reward to count as high-value ($)">
                      <Input
                        inputMode="decimal"
                        value={form.smartThreshold}
                        onChange={(e) => setForm({ ...form, smartThreshold: e.target.value })}
                      />
                    </Field>
                  ) : null}
                  {form.smartKey === "streak" ? (
                    <Field label="Streak goal (days to bonus)">
                      <Input
                        inputMode="numeric"
                        value={form.smartGoal}
                        onChange={(e) => setForm({ ...form, smartGoal: e.target.value })}
                      />
                    </Field>
                  ) : null}
                </div>
              ) : null}

              {form.bannerType === "scheduled" || form.bannerType === "custom" ? (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start (blank = immediately)">
                    <Input
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                    />
                  </Field>
                  <Field label="End (blank = ongoing)">
                    <Input
                      type="datetime-local"
                      value={form.endsAt}
                      onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                    />
                  </Field>
                </div>
              ) : null}

              <div className="space-y-2 rounded-xl border border-border p-3">
                <p className="text-xs font-semibold text-muted-foreground">
                  CTA button (optional)
                </p>
                <Field label="Button label">
                  <Input
                    value={form.ctaLabel}
                    maxLength={40}
                    placeholder="e.g. View offers"
                    onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
                  />
                </Field>
                <Field label="CTA opens">
                  <NativeSelect
                    value={form.ctaTargetType}
                    onChange={(v) => setForm({ ...form, ctaTargetType: v as FormState["ctaTargetType"] })}
                    options={[{ value: "", label: "None" }, ...CTA_TYPES.map((c) => ({ value: c.value, label: c.label }))]}
                  />
                </Field>
                {form.ctaTargetType === "external" ? (
                  <Field label="External URL">
                    <Input
                      value={form.ctaUrl}
                      placeholder="https://…"
                      onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })}
                    />
                  </Field>
                ) : null}
                {form.ctaTargetType === "specific_offer" ? (
                  <Field label="Offer ID">
                    <Input
                      value={form.ctaOfferId}
                      placeholder="uuid"
                      onChange={(e) => setForm({ ...form, ctaOfferId: e.target.value })}
                    />
                  </Field>
                ) : null}
                {form.ctaTargetType === "specific_offerwall" ? (
                  <Field label="Offerwall slug">
                    <Input
                      value={form.ctaSlug}
                      placeholder="e.g. adgate"
                      onChange={(e) => setForm({ ...form, ctaSlug: e.target.value })}
                    />
                  </Field>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Priority (higher shows first)">
                  <Input
                    inputMode="numeric"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  />
                </Field>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={form.isActive}
                      onCheckedChange={(value) => setForm({ ...form, isActive: value })}
                    />
                    Active
                  </label>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button
              variant="jade"
              disabled={!form || form.title.trim().length < 2 || saveAction.isPending}
              onClick={() => form && saveAction.mutate(form)}
            >
              {saveAction.isPending ? "Saving…" : "Save banner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{pendingDelete?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the banner. It will no longer appear in its section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && deleteAction.mutate(pendingDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function NativeSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      className="h-9 w-full rounded-xl border border-input bg-background px-2 text-sm capitalize"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="capitalize">
          {o.label}
        </option>
      ))}
    </select>
  );
}
