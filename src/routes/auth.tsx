import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { BrandMark } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — CashGPT" },
      { name: "description", content: "Sign in or create your CashGPT account to start earning." },
      { property: "og:title", content: "Sign in — CashGPT" },
      {
        property: "og:description",
        content: "Sign in or create your CashGPT account to start earning.",
      },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, "Use the international format, e.g. +919000000000");

type Channel = "email" | "phone";
type EmailMode = "signin" | "signup" | "forgot";

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={`auth-channel-${active ? "active" : "inactive"}`}
      onClick={onClick}
      className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
        active ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function AuthPage() {
  const [channel, setChannel] = useState<Channel>("email");
  const { session } = useAuth();
  const navigate = useNavigate();

  // Capture ?ref=CODE from an invite link so the profile is attributed on first sign-in.
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) window.localStorage.setItem("coinquest.ref", ref.trim().toUpperCase().slice(0, 20));
  }, []);

  useEffect(() => {
    if (session) navigate({ to: "/home", replace: true });
  }, [session, navigate]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandMark className="size-14" />
          <h1 className="text-2xl">Welcome to CashGPT</h1>
          <p className="text-sm text-muted-foreground">
            Watch, complete, cash out — real rewards in your wallet.
          </p>
        </div>

        <div className="mt-6 flex gap-1 rounded-2xl bg-background-alt p-1">
          <TabButton active={channel === "email"} onClick={() => setChannel("email")}>
            Email
          </TabButton>
          <TabButton active={channel === "phone"} onClick={() => setChannel("phone")}>
            Phone OTP
          </TabButton>
        </div>

        {channel === "email" ? <EmailForm /> : <PhoneForm />}
      </div>
    </main>
  );
}

function EmailForm() {
  const [mode, setMode] = useState<EmailMode>("signin");
  const [busy, setBusy] = useState(false);

  if (mode === "forgot") {
    return (
      <form
        className="surface-card mt-4 space-y-3 p-5"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const email = z.string().trim().email().max(255).safeParse(String(form.get("email")));
          if (!email.success) {
            toast.error("Enter a valid email.");
            return;
          }
          setBusy(true);
          try {
            const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
              redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            toast.success("Reset link sent — check your inbox.");
            setMode("signin");
          } catch (error) {
            toast.error((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="reset-email">Email</Label>
          <Input id="reset-email" name="email" type="email" autoComplete="email" maxLength={255} />
          <p className="text-xs text-muted-foreground">
            We'll email you a link to choose a new password.
          </p>
        </div>
        <Button type="submit" variant="jade" className="w-full" disabled={busy}>
          {busy ? "Sending…" : "Send reset link"}
        </Button>
        <button
          type="button"
          className="w-full pt-1 text-xs font-semibold text-primary"
          onClick={() => setMode("signin")}
        >
          Back to sign in
        </button>
      </form>
    );
  }

  return (
    <form
      className="surface-card mt-4 space-y-3 p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const parsed = emailSchema.safeParse({
          email: String(form.get("email")),
          password: String(form.get("password")),
        });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0]?.message ?? "Check your details.");
          return;
        }
        setBusy(true);
        try {
          if (mode === "signup") {
            const referralCode = String(form.get("referral") ?? "")
              .trim()
              .toUpperCase()
              .slice(0, 20);
            if (referralCode) {
              window.localStorage.setItem("coinquest.ref", referralCode);
            } else {
              window.localStorage.removeItem("coinquest.ref");
            }
            const { error } = await supabase.auth.signUp({
              ...parsed.data,
              options: {
                emailRedirectTo: window.location.origin,
                data: referralCode ? { referral_code: referralCode } : undefined,
              },
            });
            if (error) throw error;
            toast.success("Check your email to confirm your account.");
          } else {
            const { error } = await supabase.auth.signInWithPassword(parsed.data);
            if (error) throw error;
          }
        } catch (error) {
          toast.error((error as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" maxLength={255} />
      </div>
      {mode === "signup" && (
        <div className="space-y-1.5">
          <Label htmlFor="referral">Referral code (optional)</Label>
          <Input
            id="referral"
            name="referral"
            data-testid="signup-referral-input"
            autoComplete="off"
            maxLength={20}
            placeholder="Enter a friend's code"
          />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          maxLength={72}
        />
      </div>
      <Button type="submit" variant="jade" className="w-full" disabled={busy}>
        {mode === "signup" ? "Create account" : "Sign in"}
      </Button>
      {mode === "signin" && (
        <button
          type="button"
          className="w-full text-xs font-semibold text-muted-foreground"
          onClick={() => setMode("forgot")}
        >
          Forgot password?
        </button>
      )}
      <button
        type="button"
        className="w-full pt-1 text-xs font-semibold text-primary"
        onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
      >
        {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
      </button>
    </form>
  );
}

function PhoneForm() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [referral, setReferral] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="surface-card mt-4 space-y-3 p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        const parsed = phoneSchema.safeParse(phone);
        if (!parsed.success) {
          toast.error(parsed.error.issues[0]?.message ?? "Enter a valid phone number.");
          return;
        }
        setBusy(true);
        try {
          if (!sent) {
            const referralCode = referral.trim().toUpperCase().slice(0, 20);
            if (referralCode) {
              window.localStorage.setItem("coinquest.ref", referralCode);
            } else {
              window.localStorage.removeItem("coinquest.ref");
            }
            const { error } = await supabase.auth.signInWithOtp({ phone: parsed.data });
            if (error) throw error;
            setSent(true);
            toast.success("We sent you a 6-digit code.");
          } else {
            const { error } = await supabase.auth.verifyOtp({
              phone: parsed.data,
              token: code.trim(),
              type: "sms",
            });
            if (error) throw error;
          }
        } catch (error) {
          toast.error((error as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone number</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={20}
          placeholder="+919000000000"
          value={phone}
          disabled={sent}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      {!sent && (
        <div className="space-y-1.5">
          <Label htmlFor="phone-referral">Referral code (optional)</Label>
          <Input
            id="phone-referral"
            data-testid="signup-phone-referral-input"
            autoComplete="off"
            maxLength={20}
            placeholder="Enter a friend's code"
            value={referral}
            onChange={(e) => setReferral(e.target.value)}
          />
        </div>
      )}
      {sent && (
        <div className="space-y-1.5">
          <Label htmlFor="otp">Verification code</Label>
          <Input
            id="otp"
            name="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
      )}
      <Button type="submit" variant="jade" className="w-full" disabled={busy}>
        {busy ? "Please wait…" : sent ? "Verify & continue" : "Send code"}
      </Button>
      {sent && (
        <button
          type="button"
          className="w-full pt-1 text-xs font-semibold text-primary"
          onClick={() => {
            setSent(false);
            setCode("");
          }}
        >
          Use a different number
        </button>
      )}
      <p className="pt-1 text-center text-xs text-muted-foreground">
        Signing in with a phone number creates your account automatically.
      </p>
    </form>
  );
}
