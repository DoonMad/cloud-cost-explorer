# Cloud Cost Explorer — Design

## Intent
Build a small browser GUI that teaches and demonstrates the graph-based cloud cost model in Khan et al. (2024). A user describes a multi-stage data pipeline, supplies feasible resource options and pricing assumptions, sets service requirements, and sees a recommended directed route with estimated monthly cost and score.

## Goals
- Make the paper's resource-placement and shortest-path idea tangible.
- Support multiple providers and regions as user-supplied candidate options.
- Draw a directed graph showing candidate resources, data-flow links, and selected route.
- Compare a lowest-bill route under hard QoS constraints with an optional paper-style QoS score.
- Show a transparent cost breakdown and assumptions.
- Run locally without credentials or external services; remain publishable as a static GitHub Pages site.
- Teach through source comments and README mapping UI concepts to the paper.

## Non-goals
- No changes to Vikrand Times or any production cloud account.
- No automatic provisioning, deployment, billing access, or live multi-provider pricing API.
- No promise to enumerate every cloud SKU; the user supplies a finite, feasible candidate set.
- No claim that sample prices represent current provider prices.

## Approaches considered
1. Dependency-free static HTML/CSS/JavaScript app (selected): simplest to run, no install or secrets, customizable SVG graph, and GitHub Pages hosting. Trade-off: prices are entered manually and no server-side persistence exists.
2. Streamlit/Python: convenient forms and calculations, but needs a Python environment and hosted execution for sharing; graph interactions and deployment are less direct.
3. React app: flexible UI and graph libraries, but adds build tooling and package dependencies unnecessary for this course demo.

## User flow
1. Load a clearly labeled illustrative sample pipeline or start a blank scenario.
2. Add, rename, reorder, or remove compute/storage stages.
3. Add/remove candidate resources for each stage, specifying provider, region, resource label, monthly cost, latency, availability, durability, and network transfer rates.
4. Set data volume per directed connection, currency, and per-stage QoS limits.
5. Choose lowest estimated bill or paper-style QoS-adjusted score.
6. Run optimization and inspect the selected route, cost/transfer breakdown, and graph.
7. Export/import a scenario as JSON.

## Model and interpretation
- A graph vertex represents one candidate deployment for one pipeline stage.
- Directed edges connect candidates in consecutive stages, matching data-flow direction.
- Edge transfer charge is data volume times source egress and destination ingress rates.
- Each resource's monthly price is counted once: the first-stage resource cost initializes a path; each subsequent edge adds the destination resource's monthly cost and transfer cost.
- The optimizer enumerates feasible adjacent-stage connections and runs Dijkstra on the resulting non-negative layered graph. Per-stage QoS limits filter infeasible candidates before routing.
- The main objective minimizes estimated monthly bill subject to those limits.
- Optional paper-style score mode applies a transparent CER penalty using normalized adverse QoS values and weights. Since the article does not fully define consistent normalization for all QoS variables and combines monetary cost with a score, the UI labels this mode experimental, displays bill and score separately, and documents its interpretation.
- The graph shows feasible candidate edges in muted colors and the chosen path highlighted.
- If no path satisfies constraints, explain which constraints filtered candidates.

## Constraints and assumptions
- Prices are user-entered estimates and must share one currency and monthly period.
- Candidate options must be compatible with their stage; this version does not validate real provider compatibility.
- Latency/availability/durability are user-supplied estimates or SLA values. Per-stage limits are not an end-to-end guarantee.
- Availability/durability path composition is not modeled as a guaranteed SLA; show per-stage values.
- Network pricing depends on provider/region pair. User-entered egress and ingress rates are an approximation, not a full tariff engine.
- The paper's case studies use Google Cloud pricing data. Cross-provider comparison is an extension of its general graph approach, not a reproduced evaluation.

## Success criteria
- A user can edit a pipeline and candidate resources without editing source code.
- The chosen path is directed, feasible under entered limits, and lowest-objective among enumerated candidates.
- Cost, transfer charge, QoS values, and scoring assumptions are inspectable.
- The sample can be run locally and JSON can be exported/imported.
- No keys, external services, or production credentials are required.

## Builder-review clarifications
- Every candidate in adjacent stages connects by default; users are responsible for supplying only compatible candidates. The prototype does not verify real provider compatibility.
- QoS constraints are per resource stage and per transfer link. The app reports total route latency but does not enforce an end-to-end latency budget.
- In optional CER mode, latency becomes an adverse normalized value using (service latency + incoming link latency) / latency scale (default 1000 ms); availability and durability become failure fractions (1 - percentage/100). Each value is capped below 1 to keep a non-negative finite score. The paper-style weights default to 50/25/25 percent and are normalized to sum to one; N defaults to 10.
- CER is added to estimated bill only for route ranking; the app reports the actual bill and the CER-adjusted selection score separately. This is an explicit demonstrator interpretation because the paper does not fully specify common units/normalization for the QoS formula.
