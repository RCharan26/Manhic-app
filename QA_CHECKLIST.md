QA Checklist — Manhic app

Purpose: verify end-to-end customer and mechanic flows and backend integration.

Prerequisites:
- Dev server running: `npm run dev` (default at http://localhost:8082/)
- Supabase project with migrations applied and edge functions deployed (or local supabase emulator)
- Environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`
- Clerk auth setup or test tokens

High-level flows to test:

1) Customer onboarding + vehicle
- Sign up as a customer (or use test account).
- Complete `ProfileSetup` and `VehicleOnboarding`.
- Verify `profiles` row exists in DB and `vehicles` entry created.

2) Create service request
- From `CustomerDashboard`, create a request using `ServiceRequest`.
- Verify request created in `service_requests` with status `pending`.
- If auto-allocation runs, verify `mechanic_id` is set and `eta_minutes` populated.

3) Mechanic onboarding
- Sign up as mechanic; complete `ProfileSetup` with `mechanic` role and shop details.
- Verify `mechanic_details` row exists; `is_available` toggling updates DB.

4) Mechanic accepts job
- As mechanic, open `JobManagement` for a `pending` request and `Accept Job`.
- Verify RPC `assign_mechanic_to_request` is invoked, `service_requests.mechanic_id` set, and status transitions to `accepted`.

5) Live location tracking
- Start a job as mechanic; ensure `useMechanicJobLocation` updates `mechanic_details.current_lat/lng` and `service_requests.mechanic_lat/lng` in DB every 10s.
- As customer, open `RequestTracking` and confirm realtime subscription displays mechanic marker.

6) Complete job & payment
- Mechanic pushes status transitions to `in_progress` → `completed`; `final_cost` set.
- Customer goes to `Payment` and simulate payment; verify `payments` row inserted and `service_requests.payment_status` updated to `paid`.

7) Rating & review
- Customer submits rating via `RatingReview`; secure function should create `service_ratings` and trigger `update_mechanic_rating`.
- Verify `mechanic_details.rating` and `total_reviews` updated.

8) Edge cases
- Prevent duplicate active requests for same customer.
- Prevent rating before completion or duplicate ratings.
- Mechanic decline flow: job remains `pending` and available to others.

Manual verification commands (recommended):
- Tail supabase logs / function logs while testing.
- Query DB tables: `service_requests`, `mechanic_details`, `payments`, `service_ratings`, `profiles`.

Postman & automation notes
- Use the provided Postman collection to exercise secure endpoints.
- For automated e2e, install Playwright and run the scaffolded smoke test (instructions in `scripts/e2e/README.md`).

If you want, I can: deploy functions, run API tests against your Supabase (requires keys), or extend the Playwright tests to a full e2e scenario.
