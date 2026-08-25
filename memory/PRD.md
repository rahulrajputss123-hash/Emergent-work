# Product Requirements Document

## Original problem statement

Please completely remove the dark mode feature — I don't want it anymore.

1. Remove the ThemeProvider wrapping from src/routes/__root.tsx (undo that change, go back to how it was before dark mode was added).
2. Delete src/lib/theme.tsx entirely (or leave it unused, whichever is cleaner for you).
3. Remove the dark mode toggle from the Profile page — delete that UI element completely.
4. Make sure the app goes back to loading only the original light theme, with no theme-switching logic left anywhere.

Also, separately: the Referral code (optional) field is still on the post-login onboarding "Welcome to CashGPT" screen instead of the signup form. Please move it into the actual sign-up form on src/routes/auth.tsx, right below the email/phone fields, so it's captured during account creation itself — not after.

After these changes, verify in preview: (a) app loads normally in light theme with no dark mode option anywhere, (b) referral code field appears on the /auth signup page.

## Architecture decisions

- Keep the existing light theme tokens in `src/styles.css` as the sole visual theme.
- Remove the ThemeProvider/context and the unused theme module instead of leaving dead theme state in the application.
- Preserve referral attribution through the existing `coinquest.ref` local-storage handoff used when the first authenticated profile is created, while collecting the value in the signup form.
- Support both email signup and phone OTP account creation, placing an optional referral input directly beneath each channel's email/phone field.

## Implemented

- Removed ThemeProvider from the root route.
- Deleted `src/lib/theme.tsx`.
- Removed the Profile dark-mode icon, label, switch, and theme hook.
- Removed dark CSS variables/variant and dark-specific chart/alert logic.
- Removed referral state and payload from post-login onboarding and its server validator/handler.
- Added referral inputs to email signup and phone OTP signup flows.
- Referral values are normalized, stored before account creation, and passed as signup metadata for email signup.
- Verified focused preview flows at `http://127.0.0.1:8080` and confirmed the production build passes.
- Configured the Supabase project environment in `.env` with `VITE_SUPABASE_URL`, `SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Verified Supabase service-role access and authenticated login with a disposable confirmed test user; the test user was deleted afterward.
- Verified the browser preview loads with the new Supabase settings and the production build still passes.

## Prioritized backlog

### P0

- None.

### P1

- Retry a real email signup after Supabase's `over_email_send_rate_limit` clears; the signup endpoint was reachable but rejected the disposable test request due to the provider email-send limit.

### P2

- Clean the repository-wide pre-existing Prettier violations so the full `yarn lint` command is clean.

## Next tasks

- Review and format unrelated legacy files when broader maintenance work is scheduled.