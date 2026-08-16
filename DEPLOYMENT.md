# Deployment

## Vercel

Deploy `zeynalikid-main` as a Vite application using the included `vercel.json`.

1. Install dependencies with `npm install`.
2. Configure the variables listed in `.env.example` in the deployment environment.
3. Build with `npm run build`.
4. Publish the generated `dist` directory according to the Vercel project configuration.

Never commit a real `.env` file, password, token, API key, or other secret. Supabase and admin values must be configured only through the deployment environment.

## Local preview

Use `npm run build` followed by `npm run preview` to inspect the production build locally.
