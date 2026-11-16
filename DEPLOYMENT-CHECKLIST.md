# KMS deployment checks

Use this with the shared documents/testing/deployment-change-checklist.md.

## Before merge

- Check the repository Actions allowlist permits every exact SHA in CI. SHA pinning alone does not grant permission. Keep existing organization restrictions.
- Run formatting, lint, security audits, unit tests, backend E2E and production builds through the existing quality jobs.
- The containers job builds both production Dockerfiles and checks non-root execution and frontend HTTP on port 3005. Publication depends on this job and both quality jobs.
- Publication runs only for a push to develop. Manual/PR runs do not publish. A peer must approve the final PR head before merge; merging by another person alone is insufficient.
- KMS uses runtime URL settings. No PUBLIC_API_ORIGIN repository variable is required by this publishing job.
- Current CI runs tests without coverage collection; configured backend coverage has no threshold. A passing run must not be described as proof of an 80% coverage gate. Address coverage policy with the team before claiming compliance.

## Before VM startup

- Add KMS to infra Compose first; the existing deployment baseline does not include KMS services. Do not run the repository's development compose.yaml on the shared VM.
- Record complete published frontend/backend digests: 64 hexadecimal characters after sha256:. Pull with the same Docker user/config that holds registry credentials.
- Backend: production NODE_ENV, port 4005, complete shared-dev DATABASE_URL, DATABASE_SSL=true. A hostname alone is not a connection URL. Keep certificate verification enabled; never enable schema synchronization or run test seeds on shared Neon.
- KMS_GATEWAY_AUTH_SESSION_URL must reach the shared gateway /kms/auth/session.
- KMS_ORDER_INTAKE_TOKEN must match Food Ordering KMS_SERVICE_API_KEY. Use the shared broker URL for KMS_RABBITMQ_URL, not localhost. Verify exchange/event contracts against current code.
- Frontend: port 3005, API_GATEWAY_URL=http://gateway:8080, APP_ORIGIN matching its agreed public HTTPS domain, SHARED_WEBSOCKET_URL=http://websocket:8081, public socket origin and matching KMS_WEBSOCKET_RELAY_KEY.
- KMS_SESSION_ENCRYPTION_KEY must be a stable base64-encoded random 32-byte key; KMS_ALLOW_INSECURE_LOCAL_COOKIE=false for HTTPS. Never paste keys into examples or Git.
- Check duplicate settings, extra equals signs at the start of values, placeholders, localhost URLs and invalid subsystem JSON without printing secrets.
- Back up private configuration. Preserve all existing WebSocket entries; match KMS registry roles/channels to actual code, not a guessed copy of another service.

## Before public routing

- Check backend /health/live and /health/ready, frontend HTTP, stable restart counts, broker login and intended database identity.
- Verify gateway prefix rewriting against actual backend endpoints. Reserved prefixes and duplicate cross-prefix cookie names can prevent gateway startup. Test authenticated access separately: an unauthenticated 401 proves only rejection, not full functionality.
- Attach only the required frontend/gateway networks persistently through infra Compose. Keep backends/broker private.
- Agree a KMS public domain and verify DNS first. Validate Caddy before reload; preserve current sites, certificate volumes, environment files and mounts.
- Check kitchen login, menu/catalogue, order intake, order-ready events and shared realtime before claiming functional integration. Coordinate any data-changing checks with the team.
- Copy reviewed live configuration changes back into infra so a later upload cannot revert working routes/networks.

## Verification boundary

Workflow syntax and safeguard checks can run locally. Container builds require Docker; they have not passed merely because YAML parses. Server credentials, DNS, action allowlists, registry access and live integration need separate verification. Do not bypass a failing gate.
