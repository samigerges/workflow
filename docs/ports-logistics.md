# Ports logistics dashboards & APIs

## Overview

The logistics workspace introduces structured port metadata and scheduled vessel assignments so planners can balance berth load and storage capacity. Ports are persisted in the backend, linked to vessels through `PortSchedule` records, and exposed to the frontend via the `/api/ports/logistics` endpoint. The new **Ports Logistics** page (`/ports-logistics`) surfaces current utilisation, upcoming arrivals, and redistribution suggestions when a port approaches its configured capacity threshold.

## Backend endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/ports` | Returns the catalog of configured ports. |
| `POST` | `/api/ports` | Creates a port (name, optional code, country/region, capacity fields). |
| `PUT` | `/api/ports/{id}` | Updates an existing port. |
| `POST` | `/api/ports/{id}/schedules` | Links or updates a vessel assignment for a port, including ETA/ETD, quantity, and forecast status. |
| `GET` | `/api/ports/logistics` | Aggregates per-port capacity utilisation, vessel assignments, upcoming arrivals, and redistribution options. |

### Logistics query parameters

`GET /api/ports/logistics` accepts optional filters:

- `region`: limit results to a specific region (case-insensitive).
- `portId` or `portIds`: restrict to a single port or a set of ports.
- `alertThreshold`: decimal between 0.05 and 0.99 representing the utilisation ratio that triggers `capacityAlert` in the response (defaults to `0.8`).

### Logistics response shape

Each record in the response provides:

- `portId`, `portName`, `region`, `country`.
- Capacity inputs: `maxConcurrentVessels`, `storageCapacity`, `dailyThroughputCapacity`.
- Live metrics: `assignedVessels`, `occupiedBerths`, `availableBerths`, `capacityUtilization`, `capacityAlert`, `totalAssignedQuantity`, `remainingStorageCapacity`, and `nextArrival`.
- `upcomingArrivals`: top five ETA-ordered arrivals (with forecast flag).
- `assignments`: current vessel schedule snapshot (status, ETA/ETD, tonnage, forecast flag).
- `redistributionOptions`: up to three alternative ports with the most spare capacity and suggested rationale for re-routing vessels.

These contracts are defined in `PortLogisticsStatsDto` and companion DTOs. 【F:backend/DTOs/PortDtos.cs†L1-L58】【F:backend/Controllers/PortsController.cs†L1-L247】

## Frontend workflow

The **Ports Logistics** page is available from the primary navigation. Key planner controls include:

- Region/port filters to scope the dashboard to specific geographies or terminals.
- A capacity alert slider (50–95%) that forwards the selected utilisation threshold to the backend query.
- Highlighted alert banner and per-port cards whenever utilisation exceeds the threshold.
- Inline vessel schedules (latest eight assignments) showing ETA/ETD and forecast status badges.
- “View redistribution” dialog surfacing backend recommendations, with automatic fallbacks calculated in `deriveRedistributionOptions` when backend guidance is absent.

Implementation references:

- Query key helpers and logistics types. 【F:frontend/client/src/features/logistics/api.ts†L1-L13】【F:frontend/client/src/features/logistics/types.ts†L1-L40】
- Recommendation helpers for redistribution copy and fallback ranking. 【F:frontend/client/src/features/logistics/recommendations.ts†L1-L53】
- Ports Logistics UI and planner interactions. 【F:frontend/client/src/pages/ports-logistics.tsx†L1-L263】

## Planner workflow summary

1. Use the region filter to focus on the relevant part of the network. Adjust the alert slider to match the planning horizon.
2. Review port cards: metrics summarise berth usage, committed tonnage, and the next arrival.
3. If a port is flagged, open the redistribution dialog to see recommended relief ports and rationale. Options consider spare berths and remaining storage capacity.
4. Update vessel assignments through `/api/ports/{id}/schedules` or by reassigning in the operations tooling; refreshed metrics will reflect the new plan immediately after the next query.
