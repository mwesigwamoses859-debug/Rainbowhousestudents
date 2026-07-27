# Rainbow House deployment

The application is full-stack. It must be deployed to a Node.js host that runs
`npm start`; a static Vite/Cloudflare Assets deployment does not run the `/api`
routes.

## Required production environment variables

- `RESEND_API_KEY`: transactional email API key.
- `EMAIL_FROM`: verified sender, for example
  `Rainbow House Portal <portal@ashinaga.org>`.
- `OTP_PEPPER`: a long random secret used to hash one-time codes.
- `GEMINI_API_KEY`: required only for the AI assistant.
- `NODE_ENV=production`.
- `VITE_API_BASE_URL`: required in the frontend build when the UI and Node API
  are hosted on different domains, for example `https://api.example.com`.
- `CORS_ORIGIN`: comma-separated frontend origins allowed by the Node API.

Verify the `ashinaga.org` sending domain with the email provider before enabling
staff sign-in. Never commit real secret values to Git.

## Build and start

```sh
npm install
npm run lint
npm run build
npm start
```

The current `workers.dev` URL is a static deployment and returns `index.html`
for `/api/*`. Move it to a Node-compatible service or add a Worker-native API
and durable data store before using that URL in production.
