# Cloud Cost Explorer Algorithm Learning Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teach the paper's Dijkstra method and compare it with DAG dynamic programming on the same cloud-cost pipeline, with a paper-inspired ETL example.

**Architecture:** Keep the dependency-free browser app and the existing layered pipeline graph. Move shortest-path methods behind a small shared interface in `src/shortest-path.js`; `src/model.js` keeps graph validation, scoring, and result construction. The UI can choose the paper-style Dijkstra scan and compare it against topological DAG DP using one built graph.

**Tech Stack:** Static HTML, CSS, and browser JavaScript ES modules; no package manager or third-party dependencies.

**Spec:** `docs/superpowers/specs/2026-11-09-algorithm-learning-demo-design.md`

## Global Constraints

- No live pricing API, credentials, backend, external dependencies, or provisioning.
- The graph remains a linear, stage-by-stage pipeline with all feasible adjacent-stage candidate pairs connected.
- Do not claim DAG DP is always faster than heap-based or early-exit Dijkstra.
- Clearly label example prices illustrative unless verified against a documented source snapshot.
- Do not imply the linear app models a branching deployment as a whole.
- Keep imported scenarios without an algorithm field valid; default them to the paper-style Dijkstra method.

## Review Focus

- Equal-score algorithms can choose different tied routes; compare objective scores and validate each returned route, not route identity.
- A stage filtered to zero candidates or an unavailable edge must yield the existing no-route experience for either method.
- Imported/exported scenarios without a selected method must continue to work and default to Dijkstra.
- The paper-inspired ETL option must state that prices are illustrative and show the linear compute → storage → compute structure.
- The UI must not suggest it handles every branch in the paper's larger big-data architecture.

---

### Task 1: Implement shared shortest-path algorithms

**Files:**
- Create: `src/shortest-path.js`
- Modify: `src/model.js`

**Interfaces:**
- `dijkstraShortestPath(graph, startNodes, targetNodes)` returns `{ targetId, score, previous }`, where `previous` is a `Map` from node ID to `{ id, edge }`; it uses the current unvisited-node scan and accepts multiple starting and target nodes.
- `dagShortestPath(graph, startNodes, targetNodes)` returns the same shape; it relaxes nodes in the existing `graph.nodes` stage order.
- `optimizeScenario(scenario, settingsOverride, algorithm = "dijkstra")` accepts `"dijkstra"` or `"dag-dp"`, preserves current callers and result fields, and adds the selected algorithm name.
- `compareScenarioAlgorithms(scenario, settingsOverride)` validates/builds the graph once and returns `{ ok, graph, results: { dijkstra, dagDp }, timingsMs: { dijkstra, dagDp } }`; each result uses the existing optimizer result shape, and timings exclude graph construction.

- [x] **Step 1: Implement Dijkstra over the built graph**

Move the current scan into `dijkstraShortestPath`. Preserve epsilon tie handling and multiple-source start weights.

- [x] **Step 2: Implement DAG dynamic programming over the same graph**

Process nodes in stage order, initialize every start candidate with its `startWeight`, relax each outgoing edge, then select the cheapest reachable final-stage target.

- [x] **Step 3: Route scenario optimization through the selected method**

Refactor result construction so either method uses the same graph, predecessor format, route-cost breakdown, QoS fields, and no-route reasons. `settings.algorithm` is optional; absent values default to `"dijkstra"`, and validation rejects unknown non-empty values.

- [x] **Step 4: Add a shared-graph comparison entry point**

Build and validate once; time only the two shortest-path/result computations (not graph construction); return graph node/edge counts and both results.

- [x] **Step 5: Check algorithm agreement on existing examples and limits**

Use the browser comparison after Task 3 to confirm equal minimum scores on the existing sample and CER mode, valid routes, and consistent no-route output when a limit removes all options.

### Task 2: Add a paper-inspired ETL preset

**Files:**
- Modify: `src/sample.js`
- Modify: `index.html`
- Modify: `src/app.js`
- Modify: `styles.css`

**Interfaces:**
- Export `createPaperEtlScenario()` returning the existing scenario schema with three stages: compute in US Central, storage in US East, and compute in US West.
- Add a visible button or preset selector that loads this scenario without removing the existing multi-provider sample.

- [x] **Step 1: Define the ETL example data**

Use clear resource labels and non-negative sample costs/QoS/transfer values. Label all values as illustrative and do not describe them as Google Cloud prices from the paper.

- [x] **Step 2: Add an ETL preset control**

Expose the new example in the existing toolbar; load it through `createPaperEtlScenario()`, save it, render it, and show a status message that its numerical values are illustrative.

- [x] **Step 3: Check preset behavior**

Load the original and ETL examples in the browser; confirm each has three stages, a valid route, and the correct labels.

### Task 3: Add algorithm selection and comparison UI

**Files:**
- Modify: `index.html`
- Modify: `src/app.js`
- Modify: `styles.css`
- Consume: `optimizeScenario` and `compareScenarioAlgorithms` from Task 1

- [x] **Step 1: Add algorithm selection and compare controls**

Add a selection for “Paper-style Dijkstra” and “DAG dynamic programming,” defaulting to Dijkstra, plus a “Compare both” action and an accessible result region.

- [x] **Step 2: Wire selection into rendering**

Pass the selected method to `optimizeScenario`; persist the setting with the scenario while defaulting older imported scenarios to Dijkstra.

- [x] **Step 3: Render the comparison results**

Show both method names, theoretical complexities, observed times, selected-path scores, and graph (V/E) counts. State that tied routes may differ and small-graph runtime is noisy. Keep the main graph highlighted for the selected method.

- [x] **Step 4: Check comparison behavior**

Compare both methods on the original sample, ETL preset, and paper-style CER objective. Confirm scores match, graph counts are shared, selected algorithm updates the displayed route, and missing-algorithm imports use Dijkstra.

### Task 4: Update user-facing documentation

**Files:**
- Modify: `README.md`

- [x] **Step 1: Document the new examples and algorithm comparison**

Explain the Dijkstra/DP distinction, complexities, benchmark caveat, illustrative ETL values, and linear-graph limitation. Maintain the paper-versus-extension distinction.

- [x] **Step 2: Check the run instructions and claims**

Confirm existing static-server instructions remain correct and every description matches the final app behavior.
