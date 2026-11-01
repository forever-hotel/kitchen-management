# KMS API and Integration Contract Review

## Tracking

- Issue: DDP-234 / #40
- Status: Proposed — requires subsystem owner review
- Scope: API Gateway, KMS, FOSS and shared frontend contracts

## 1. Architecture

The KMS frontend uses the shared Forever Hotel API Gateway.

- Staff authentication is owned by the Gateway.
- KMS owns kitchen menu, order and operational business state.
- FOSS submits guest food orders through an approved service integration.
- WKMS receives order-ready events through RabbitMQ.
- The frontend must not access KMS database tables or use
  direct browser-to-KMS backend connections.

## 2. Verified Gateway Authentication

| Method | Route                 | Purpose                |
| ------ | --------------------- | ---------------------- |
| POST   | /auth/login           | Staff login            |
| GET    | /auth/session         | Validate staff session |
| POST   | /auth/logout          | Revoke staff session   |
| POST   | /auth/change-password | Change password        |

Login request fields:

- username
- password
- subsystem: "kms"

Supported roles:

- KITCHEN_MANAGER
- KITCHEN_STAFF

Session response fields:

- sub
- username
- role
- expiresAt
- passwordChangeRequired

Login and successful password-change responses additionally
include accessToken.

The Gateway currently expects Bearer authorization for
protected staff requests.

Browser token persistence is not approved for KMS.
The secure server-side session implementation belongs to DDP-235.

## 3. Gateway Routing

Current Gateway configuration:

- Public prefix: /kms
- Rewrite prefix: /kms
- Upstream: KMS_SERVICE_URL

This preserves /kms when forwarding requests.

Existing KMS controllers use routes such as /health/live
without this prefix.

Decision pending: align the Gateway rewrite configuration
or the KMS backend routing without breaking other consumers.

## 4. Existing FOSS-to-KMS Endpoint Expectations

| Method | Expected service path     | Purpose               |
| ------ | ------------------------- | --------------------- |
| GET    | /api/v1/menu              | Retrieve menu catalog |
| POST   | /api/v1/orders            | Create kitchen order  |
| GET    | /api/v1/orders/:id        | Retrieve order        |
| POST   | /api/v1/orders/:id/cancel | Request cancellation  |

These are existing FOSS adapter expectations, not confirmation
that the corresponding KMS backend controllers exist.

The existing FOSS adapter can use X-KMS-API-Key for
service authentication.

The current Gateway staff authorization flow does not
establish an equivalent FOSS service-to-service identity
mechanism. This boundary requires separate agreement.

## 5. Verified Order Statuses

Both KMS and FOSS define:

- PLACED
- IN_PREPARATION
- READY
- DELIVERED
- CANCELLED

KMS is authoritative for kitchen status transitions.

## 6. Meal-Period Difference

Existing KMS order meal periods:

- BREAKFAST
- LUNCH
- DINNER
- TEA_TIME

The FOSS menu contract defines ALL_DAY, while FOSS frontend
types also include TEA_TIME.

Decision pending: agree on the catalog availability mapping
and the valid meal period for actual order placement.

Do not silently convert ALL_DAY into a KMS order meal period.

## 7. Currency and Price Representation

Existing KMS database entities store menu prices, unit
prices and order totals as integers.

Existing FOSS DTOs use TypeScript numbers. Some examples
describe prices in USD.

Decisions pending:

- Authoritative currency for the integrated hotel system
- Whether integer values represent major or minor units
- Required rounding and conversion rules
- Consistency between menu prices and submitted order totals

Do not introduce automatic price conversion until agreed.

## 8. Idempotency

FOSS supplies idempotencyKey for order submission.

The currently inspected KMS food-order entity does not
contain an equivalent persisted idempotency field.

Decision pending: define KMS-side duplicate detection,
key retention, retry behavior and conflict responses.

No database migration is included in DDP-234.

## 9. Ownership and Security

- Gateway: shared staff authentication and route controls
- KMS: menu, kitchen orders, stock and kitchen operations
- FOSS: guest ordering flow and order submission
- WKMS: worker delivery workflow
- KMS: RabbitMQ order-ready event producer

Credentials and service API keys must remain server-side.
Feature components must use the shared API infrastructure.

## 10. Required Review Decisions

The KMS, FOSS and shared Gateway owners must agree on:

1. Gateway-to-KMS route prefix handling
2. FOSS service authentication and routing
3. Currency and price units
4. TEA_TIME and ALL_DAY mapping
5. Idempotency implementation
6. Final API versions and request/response DTOs
7. Integration error and cancellation behavior

These decisions must be approved before the corresponding
production integrations are enabled.
