# React + Vite

## Cloudflare TURN configuration

The Vercel endpoint at `/api/hexa-turn` returns short-lived Cloudflare TURN
credentials to authenticated Supabase users. Add these **server-side** variables
to the Vercel project and redeploy:

- `SUPABASE_URL` (or `VITE_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLOUDFLARE_TURN_KEY_ID`
- `CLOUDFLARE_TURN_KEY`

Keep `SUPABASE_SERVICE_ROLE_KEY` and `CLOUDFLARE_TURN_KEY` out of all `VITE_*`
variables; Vite exposes `VITE_*` values in the browser bundle. Clients request
the temporary ICE server configuration using their Supabase access token and
fall back to public STUN servers if TURN is unavailable.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
