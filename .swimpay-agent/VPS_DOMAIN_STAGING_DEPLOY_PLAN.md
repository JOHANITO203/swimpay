# VPS Domain Staging Deploy Plan

generated_at: 2026-05-08T00:00:00+03:00

## Target

- Host: one Ubuntu VPS.
- Domain: `staging.swimpay.pro`.
- DNS: `A staging.swimpay.pro -> <VPS IPv4>`.
- Public ports: 80 and 443 only, plus SSH from operator-controlled IPs.
- Runtime: Docker Compose with Postgres, Valkey, NATS, API, web, signal worker, job worker and Caddy/Nginx.

## Deployment Steps

1. Point DNS `A` record for `staging.swimpay.pro` to the VPS IPv4.
2. Provision Ubuntu with SSH keys, UFW and Docker Engine/Compose.
3. Create an ignored staging env file on the server, not in git.
4. Set `NODE_ENV=production`, `HTTP_PORT=80`, HTTPS proxy config and staging base URLs.
5. Run additive migrations against the staging Postgres volume before traffic.
6. Run `scripts/seed-staging-auth-bff.mjs` with explicit staging seed flags.
7. Build images sequentially on the VPS or ship prebuilt images.
8. Start Compose.
9. Verify health:
   - `docker compose ps`
   - `curl https://staging.swimpay.pro/api-health`
   - API, web, signal worker, job worker healthchecks.
10. Keep webhook worker enabled only after external staging app endpoint and secret are configured.

## HTTPS / Proxy

The committed local Caddyfile is HTTP-only and disables automatic HTTPS. Staging needs a separate server-side Caddyfile equivalent to:

```text
staging.swimpay.pro {
  encode zstd gzip

  handle /v1/* {
    reverse_proxy swimpay-api:3000
  }

  handle /api/* {
    uri strip_prefix /api
    reverse_proxy swimpay-api:3000
  }

  handle /api-health {
    rewrite * /health
    reverse_proxy swimpay-api:3000
  }

  handle {
    reverse_proxy swimpay-web:3001
  }
}
```

## Blocker

No VPS access or DNS resolution proof was available in this session, so deployment was not executed.
