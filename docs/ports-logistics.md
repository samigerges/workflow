# Ports logistics bar chart

The Ports Logistics workspace now focuses exclusively on a stacked bar chart that compares delivered and upcoming tonnage for every configured port. The chart renders data from the `/api/ports/logistics` endpoint, summing confirmed assignments into the **delivered** series and forecast assignments into the **upcoming** series.

## Data flow

1. The frontend queries `buildPortsLogisticsQueryKey()` with no filters to fetch all port logistics records. 【F:frontend/client/src/features/logistics/api.ts†L1-L13】
2. Each `PortLogisticsStats` record is reduced into delivered/upcoming totals inside `quantityChartData`. 【F:frontend/client/src/pages/ports-logistics.tsx†L90-L118】
3. The stacked bars are drawn with Recharts inside the Ports Logistics page. 【F:frontend/client/src/pages/ports-logistics.tsx†L153-L177】

## Frontend entry point

All UI for the Ports Logistics bar chart lives in `frontend/client/src/pages/ports-logistics.tsx`. 【F:frontend/client/src/pages/ports-logistics.tsx†L1-L191】
