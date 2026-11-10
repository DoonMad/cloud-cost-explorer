# Regional Scale Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Add a dense regional scenario and transparent algorithm work counts, then prepare the project for GitHub.

**Architecture:** Keep the dependency-free static app and its layered DAG model. Add a sample factory, operation counters to the existing graph algorithms, presentation UI for those counters, and repository setup/documentation.

**Tech Stack:** HTML, CSS, vanilla JavaScript modules, SVG, Git.

**Spec:** `docs/superpowers/specs/2026-11-10-regional-scale-demo-design.md`

## Global Constraints
- Do not use external packages or hosted APIs.
- Label all sample prices/provider names as fictional.
- Preserve linear layered DAG semantics; do not imply parallel branch-cost support.
- Do not publish until an authenticated GitHub repository route is available.

## Review Focus
- Candidate filtering must keep work counters valid for the graph actually optimized.
- Disconnected/empty graphs must not crash or show fabricated successful work counts.
- All counters must count operations performed by these exact implementations, not generic complexity approximations.
- The large SVG must remain horizontally/vertically scrollable and preserve visible selected route.
- Git staging must exclude PDF, lesson images, credentials, and generated benchmark outputs unless intentionally documented.

---

### Task 1: Large multi-region example and UI entry point

**Files:** Modify `src/sample.js`, `src/app.js`, `index.html`, `README.md`.

- [ ] Add a named sample factory for a 14-stage workflow with six fictional resource options per stage, several cloud-provider labels, and regions spanning Asia, Europe, and North America. Use stable unique IDs, valid non-negative costs, and transition volumes/latencies.
- [ ] Add a toolbar button that loads it and optimizes/renders through the existing flow.
- [ ] Document dimensions (84 nodes, 468 edges before filters), fictional assumptions, and that each stage is sequential with alternatives.

### Task 2: Algorithm work counters

**Files:** Modify `src/shortest-path.js`, `src/model.js`, `src/app.js`.

- [ ] Return Dijkstra counts for minimum-selection comparisons and examined outgoing edges.
- [ ] Return DAG-DP counts for processed nodes and examined outgoing edges.
- [ ] Carry the counters through both optimized results and algorithm comparison.
- [ ] Display counters next to theoretical complexity, graph size, and measured time; explain that these are implementation operation counts, not wall-clock guarantees.
- [ ] Keep failure/no-route presentations truthful when one or both algorithms don't complete.

### Task 3: GitHub readiness

**Files:** Create `.gitignore`; modify `README.md` as needed.

- [ ] Ignore local environment files, dependencies, editor/OS artifacts, and test coverage output.
- [ ] Document static GitHub Pages deployment and verify that no secret, research PDF, or lesson screenshot is required by the app.
- [ ] Initialize Git locally and inspect staged files before any commit or push.
- [ ] If connected GitHub repository creation is available, create a public repository only after reviewing staged contents; otherwise leave a clean local repository and give the exact next steps.

### Task 4: Verification

**Files:** No additional files expected.

- [ ] Inspect the scenario factory, graph construction, counters, UI wiring, and README for consistency.
- [ ] Do not report tests or browser verification unless actually run and requested.
