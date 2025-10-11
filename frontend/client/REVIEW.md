# Frontend Workflow Review

This document captures the current state of the authenticated pages and highlights opportunities for improvement before expanding the remaining experience.

## Routing overview
- The router exposes authenticated routes for the dashboard, workflow pages, and detail views once a user session is detected, and otherwise forces every path back to the login screen.【F:frontend/client/src/App.tsx†L35-L56】
- Marketing content such as the landing page and the analytics view defined in `operations.tsx` are not reachable because no routes point to them, so there is no unauthenticated discovery path or alternate analytics workspace yet.【F:frontend/client/src/App.tsx†L35-L52】【F:frontend/client/src/pages/landing.tsx†L6-L149】【F:frontend/client/src/pages/operations.tsx†L14-L107】

## Dashboard
- The dashboard already pulls live counts for requests, contracts, LCs, and vessels with 30‑second refresh intervals, and surfaces recent activity cards with drill-down modals.【F:frontend/client/src/pages/dashboard.tsx†L49-L198】
- Consider rendering the `/api/dashboard/stats` payload (currently fetched but unused) for richer KPIs, adding skeletons or error messaging for failed queries, and letting users filter KPIs by date range or business unit.

## Needs management
- Needs support creation, editing, status updates, and deletion with optimistic cache invalidation and granular status dialogs.【F:frontend/client/src/pages/needs.tsx†L24-L118】
- Enhancements to prioritise include: table-level filters/search, grouping by category or urgency, and a timeline of status changes so teams can audit approvals.

## Contract requests
- Requests combine form dialogs, status changes, voting workflows, and summary modals so multiple departments can collaborate before approval.【F:frontend/client/src/pages/requests.tsx†L32-L200】
- The status palette mixes casing and contains typos (e.g., "Legel"), and the view lacks filters by department/phase; adding consistent enums, audit trails of votes, and Slack/email notifications would tighten governance.

## Contracts & contract detail
- Contract listings offer creation/edit dialogs, document voting, approval/rejection flows, and a summary modal that derives dynamic status from linked vessels.【F:frontend/client/src/pages/contracts.tsx†L32-L198】
- The detail view calculates allocation progress and links vessels but always falls back to the reports route for navigation.【F:frontend/client/src/pages/contract-detail.tsx†L20-L120】 Provide breadcrumbs back to the contracts list, display supporting documents, and surface financial KPIs (e.g., payment schedule adherence) to round out the screen.

## Letters of credit & LC detail
- LC management already segments journeys (GASC→UPF vs. UPF→Supplier), supports CRUD and deletion, and normalises amounts/dates for utilization metrics.【F:frontend/client/src/pages/letters-credit.tsx†L32-L158】
- The detail page correlates LCs with linked vessels and calculates utilization but does not expose amendment history or banking documents.【F:frontend/client/src/pages/lc-detail.tsx†L20-L120】 Adding amendment timelines, bank contact info, and alerts for impending expiry would help finance teams act faster.

## Vessels & discharge tracking
- Vessels include status filters, creation/edit dialogs, discharge tracking, and LC badges derived from relationship queries.【F:frontend/client/src/pages/vessels.tsx†L32-L151】
- The vessel-tracking workspace layers timeline chips, discharge update forms with proof uploads, and a process stepper, yet it lacks geospatial context or integrations to AIS feeds.【F:frontend/client/src/pages/vessel-tracking.tsx†L1-L200】 Consider embedding a map, surfacing port congestion indicators, and pushing real-time alerts when ETA thresholds change.

## Document center
- Document management aggregates uploads from requests, contracts, and vessels and reuses the voting flow, but it issues sequential fetches for every related entity which can overwhelm the API for large datasets.【F:frontend/client/src/pages/documents.tsx†L68-L144】
- Introduce a consolidated `/documents` endpoint or batch fetching via `Promise.all`, add pagination, and capture metadata (version history, expiry) so compliance teams can audit document lifecycles.

## Service providers
- Service providers are grouped by type with tabs, offer create/edit/price dialogs, and calculate average pricing from quotes.【F:frontend/client/src/pages/service-providers.tsx†L87-L200】
- Priorities include surfacing performance KPIs (on-time rate, QC issues), allowing file attachments for vetting, and exposing integration points for bid comparisons.

## Reports & analytics
- The reports page mixes tabbed KPIs, supplier/port filters, and multiple Recharts visualisations, normalising LC and vessel data on the fly.【F:frontend/client/src/pages/reports.tsx†L1-L200】
- To deepen insights, add saved report configurations, CSV/PowerBI exports (stubbed in `operations.tsx`), and forecasting that leverages historical vessel discharge trends once data volume grows.

## Cross-cutting opportunities
- Every page manually handles unauthorized redirects with nearly identical `useEffect` blocks; move this logic into a shared hook or an Axios interceptor to reduce duplication and flash-of-logout behaviour.【F:frontend/client/src/pages/requests.tsx†L46-L59】【F:frontend/client/src/pages/documents.tsx†L53-L66】【F:frontend/client/src/pages/service-providers.tsx†L93-L104】
- Introduce a global notification center for workflow events (votes, approvals, discharge updates) so users can see pending actions without polling each module.
- Harden empty and error states; most views return `null` when unauthenticated and rely on toast messaging, leaving blank screens if API calls fail mid-session.
