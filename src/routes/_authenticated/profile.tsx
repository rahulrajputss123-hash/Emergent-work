import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronRight,
  FileText,
  KeyRound,
  LogOut,
  Pencil,
  Receipt,
  Shield,
  ShieldCheck,
  Trash2,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { SectionTitle } from "@/components/States";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/account.functions";
import { signOutEverywhere, useAuth } from "@/lib/auth";
import { formatMoney } from "@/lib/coinquest";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — CashGPT" },
      { name: "description", content: "Manage your CashGPT account, wallet and settings." },
      { property: "og:title", content: "Profile — CashGPT" },
      {
        property: "og:description",
        content: "Manage your CashGPT account, wallet and settings.",
      },
    ],
  }),
  component: ProfilePage,
});

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "C";
  const first = parts[0]?.[0] ?? "C";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + second).toUpperCase();
}

function ProfilePage() {
  const { session, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }
  if (!session) {
    navigate({ to: "/auth", replace: true });
    return null;
  }
  const queryClient = useQueryClient();
  const removeAccount = useServerFn(deleteMyAccount);

  const [editOpen, setEditOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const savePref = useMutation({
    mutationFn: async (values: { push_enabled?: boolean; language?: string; name?: string }) => {
      const { error } = await supabase.from("profiles").update(values).eq("id", session.user.id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["profile"] }),
    onError: () => toast.error("Couldn't save that setting."),
  });

  const saveName = useMutation({
    mutationFn: async () => {
      const name = nameDraft.trim();
      if (name.length < 2) throw new Error("short");
      const { error } = await supabase.from("profiles").update({ name }).eq("id", session.user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      setEditOpen(false);
      toast.success("Profile updated.");
    },
    onError: () => toast.error("Please enter your full name."),
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      const email = profile?.email ?? session?.user.email;
      if (!email) throw new Error("Your account has no email password to change.");
      if (newPassword.length < 8) throw new Error("New password must be at least 8 characters.");
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signInError) throw new Error("Current password is incorrect.");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setPasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password updated.");
    },
    onError: (error: Error) => toast.error(error.message || "Could not update password."),
  });

  const deleteAccount = useMutation({
    mutationFn: async () => removeAccount({ data: { confirm: "DELETE" as const } }),
    onSuccess: async () => {
      await signOutEverywhere(queryClient);
      toast.success("Your account has been deleted.");
      navigate({ to: "/auth", replace: true });
    },
    onError: () => toast.error("Could not delete your account. Please contact support."),
  });

  const displayName = profile?.name ?? "CashGPT user";

  return (
    <AppShell subtitle="Profile">
      <section className="surface-card mt-2 flex items-center gap-3 p-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-jade-gradient font-display text-xl text-primary-foreground">
          {initialsOf(displayName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {profile?.email ?? session?.user.email}
          </p>
          {profile?.referral_code && (
            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-background-alt px-2 py-0.5 text-[11px] font-semibold">
              Code {profile.referral_code}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => {
            setNameDraft(profile?.name ?? "");
            setEditOpen(true);
          }}
        >
          <Pencil className="size-3.5" /> Edit
        </Button>
      </section>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="surface-card p-3">
          <p className="text-xs text-muted-foreground">Lifetime earned</p>
          <p className="text-amount text-lg">{formatMoney(profile?.lifetime_earned)}</p>
        </div>
        <div className="surface-card p-3">
          <p className="text-xs text-muted-foreground">Withdrawn</p>
          <p className="text-amount text-lg">{formatMoney(profile?.lifetime_withdrawn)}</p>
        </div>
      </div>

      <SectionTitle>Settings</SectionTitle>
      <div className="surface-card divide-y divide-border">
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="font-semibold">Push notifications</p>
            <p className="text-xs text-muted-foreground">Payout and quest alerts</p>
          </div>
          <Switch
            checked={profile?.push_enabled ?? true}
            onCheckedChange={(checked) => savePref.mutate({ push_enabled: checked })}
          />
        </div>
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="font-semibold">Language</p>
            <p className="text-xs text-muted-foreground">App display language</p>
          </div>
          <select
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
            value={profile?.language ?? "en"}
            onChange={(event) => savePref.mutate({ language: event.target.value })}
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
            <option value="es">Español</option>
          </select>
        </div>
        <button
          className="flex w-full items-center justify-between p-4 text-left"
          onClick={() => setPasswordOpen(true)}
        >
          <span className="flex items-center gap-2 font-semibold">
            <KeyRound className="size-4 text-primary" /> Change password
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
        <button
          className="flex w-full items-center justify-between p-4 text-left"
          onClick={() => navigate({ to: "/wallet" })}
        >
          <span className="flex items-center gap-2 font-semibold">
            <Wallet className="size-4 text-primary" /> Wallet & payouts
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
        {isAdmin && (
          <button
            className="flex w-full items-center justify-between p-4 text-left"
            onClick={() => navigate({ to: "/admin" })}
          >
            <span className="flex items-center gap-2 font-semibold">
              <Shield className="size-4 text-primary" /> Admin panel
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <SectionTitle>Legal & policies</SectionTitle>
      <div className="surface-card divide-y divide-border">
        <button
          className="flex w-full items-center justify-between p-4 text-left"
          onClick={() => navigate({ to: "/legal/terms" })}
        >
          <span className="flex items-center gap-2 font-semibold">
            <FileText className="size-4 text-primary" /> Terms & Conditions
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
        <button
          className="flex w-full items-center justify-between p-4 text-left"
          onClick={() => navigate({ to: "/legal/privacy" })}
        >
          <span className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-4 text-primary" /> Privacy Policy
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
        <button
          className="flex w-full items-center justify-between p-4 text-left"
          onClick={() => navigate({ to: "/legal/payouts" })}
        >
          <span className="flex items-center gap-2 font-semibold">
            <Receipt className="size-4 text-primary" /> Payout Policy
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
      </div>

      <Button
        variant="outline"
        className="mt-4 w-full gap-2"
        onClick={async () => {
          await signOutEverywhere(queryClient);
          navigate({ to: "/auth", replace: true });
        }}
      >
        <LogOut className="size-4" /> Sign out
      </Button>

      <Button
        variant="ghost"
        className="mt-2 w-full gap-2 text-destructive hover:text-destructive"
        onClick={() => {
          setDeleteConfirm("");
          setDeleteOpen(true);
        }}
      >
        <Trash2 className="size-4" /> Delete account
      </Button>

      {/* Edit profile */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>
              Your avatar uses the initials from your name.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-14 place-items-center rounded-2xl bg-jade-gradient font-display text-xl text-primary-foreground">
              {initialsOf(nameDraft || displayName)}
            </span>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="edit-name">Full name</Label>
              <Input
                id="edit-name"
                value={nameDraft}
                maxLength={80}
                onChange={(e) => setNameDraft(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="jade" disabled={saveName.isPending} onClick={() => saveName.mutate()}>
              {saveName.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change password */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              Enter your current password, then choose a new one (at least 8 characters).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="jade"
              disabled={changePassword.isPending}
              onClick={() => changePassword.mutate()}
            >
              {changePassword.isPending ? "Updating…" : "Update password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete account */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This is permanent. Your profile, earnings history and any remaining wallet balance of{" "}
              {formatMoney(
                Number(profile?.wallet_balance ?? 0) - Number(profile?.held_balance ?? 0),
              )}{" "}
              will be forfeited. Withdraw your balance first if you want to keep it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
            <Input
              id="delete-confirm"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value.toUpperCase())}
              placeholder="DELETE"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Keep my account
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirm !== "DELETE" || deleteAccount.isPending}
              onClick={() => deleteAccount.mutate()}
            >
              {deleteAccount.isPending ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
