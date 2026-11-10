# Cloud Cost Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build a dependency-free browser GUI applying the paper's graph-based cloud placement idea to a user-defined pipeline and candidate resource set.

**Architecture:** Static HTML/CSS provides the interface, JavaScript modules hold scenario state and perform graph optimization, and SVG renders candidate connections and the selected route. Scenario JSON import/export provides portability without a backend.

**Tech Stack:** HTML, CSS, vanilla JavaScript modules, SVG, Python's built-in HTTP server for local serving.

**Spec:** docs/superpowers/specs/2026-11-09-cloud-cost-explorer-design.md

## Global Constraints
- Use no external packages or hosted APIs.
- Treat example pricing as illustrative; the user supplies estimates for real comparisons.
- Keep the main cost-only objective distinct from the optional experimental CER score.
- Do not modify production apps or provision cloud services.
- Do not add automated tests unless requested; perform a manual browser walkthrough because the user asked whether the app works.

## Review Focus
- Empty stages or missing candidates must show a helpful message, not crash.
- Zero cost, zero transfer, and missing optional QoS values must not create invalid weights.
- QoS limits that exclude every candidate must explain why no route exists.
- Imported JSON must be validated before replacing the current scenario.
- The optimizer must not double-count a resource's monthly cost on a multi-stage path.

---

### Task 1: Project shell and user documentation

**Files:** index.html, styles.css, README.md, design spec, implementation plan.

- [ ] Create the static page shell with workspace header, input area, optimization controls, result region, and graph region.
- [ ] Add responsive styling with clear units and a persistent illustrative-prices notice.
- [ ] Document local run steps, model approximations, and mapping to the paper.

### Task 2: Scenario model and shortest-path optimizer

**Files:** src/model.js, src/sample.js.

**Interfaces:** Export createSampleScenario(), validateScenario(scenario), optimizeScenario(scenario, settings), and buildGraph(scenario, settings). optimizeScenario returns selected candidates, component cost breakdown, monthly bill, selection score, or a structured no-route reason.

- [ ] Define scenario shape for stages, candidates, transfer assumptions, currency, and QoS thresholds.
- [ ] Implement feasibility filtering, transfer charges, transparent CER adjustment, and layered directed graph generation.
- [ ] Implement Dijkstra with initial distances equal to first-stage candidate costs, adding each later resource cost and link charge once.
- [ ] Seed a sample three-stage, two-provider pipeline with fictional prices and explanatory labels.

### Task 3: Editable GUI and graph rendering

**Files:** src/app.js.

- [ ] Render/edit stages, candidate resources, per-link data volumes, and optimization limits from scenario state.
- [ ] Add stage/candidate insertion and removal, sample reset, objective selection, and optimize action.
- [ ] Render feasible directed candidate links in SVG and highlight the selected route.
- [ ] Display recommendation, bill/transfer breakdown, constraints, and CER assumptions.
- [ ] Add validated JSON import/export.

### Task 4: Manual run-through and finish

**Files:** README.md, src/app.js, src/model.js, styles.css as needed.

- [ ] Start with Python's built-in HTTP server.
- [ ] Walk through sample, edit a candidate, change a QoS limit, and verify route and graph update.
- [ ] Import/export a scenario and inspect the result.
- [ ] Record limitations and local run instructions in README.
