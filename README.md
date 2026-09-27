# HEXA

HEXA offers optional guest access and email/password accounts. Account creation and sign-in use Supabase Auth; usernames are unique case-insensitively in the profiles database. Bot challenges are currently disabled.

## Account signup setup

1. Copy `.env.example` to `.env.local` and enter your Supabase project URL and publishable key. Never expose a Supabase service-role key in a `VITE_` variable.
2. In Supabase Auth, enable email/password signup and disable CAPTCHA protection for now; configure SMTP if email confirmation is enabled.
3. Apply `supabase/migrations/20260927000000_unique_profile_usernames.sql` to the Supabase database. The migration will fail if existing usernames collide after lowercase/whitespace normalization; resolve those duplicates first.
4. Add the public Supabase environment variables to the deployment provider and redeploy.

Email uniqueness is enforced by Supabase Auth. The database unique index enforces unique usernames even under simultaneous signups. Visitors can still choose **Continue as guest**; guest profiles are local to their browser and are not synced.

## Development

Install dependencies with `npm install`, then run `npm run dev`. Create a production build with `npm run build`.
