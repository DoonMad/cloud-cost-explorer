# Cloud Cost Explorer: Algorithm Learning Demo Design

## Intent

Improve the existing Cloud Cost Explorer so it helps a college student explain both the 2024 Springer paper's Dijkstra-based method and the DAG dynamic-programming alternative evaluated in our benchmark. Add examples that make the relationship to the paper clearer while keeping the app small, static, and easy to run.

## Goals

- Keep a clearly labeled implementation of the paper-style (O(V^2)) Dijkstra scan.
- Add topological DAG dynamic programming over the same graph and cost model.
- Let a student compare both algorithms on one scenario, inspecting minimum score, selected path, graph size, and observed runtime.
- Explain that both methods should produce the same minimum score, while ties may result in different but equally good routes.
- Add selectable, clearly labeled examples: retain the existing fictional multi-provider sample and add a paper-inspired three-step ETL scenario. Any prices not copied from a verified table/API snapshot must be labeled illustrative, not historical provider prices.
- Make the app's present model boundary visible: it models one linear, stage-by-stage route and automatically connects every feasible candidate in adjacent stages.

## Non-goals

- Do not change Vikrand Times or deploy/provision cloud resources.
- Do not add a live cloud pricing API, credentials, backend, or external dependencies.
- Do not implement arbitrary user-drawn graphs, selective pairwise compatibility, or branching workflow cost aggregation in this iteration.
- Do not claim DAG DP is always faster than heap-based or early-exit Dijkstra.
- Do not describe the linear app as a faithful executable model of the paper's branching big-data infrastructure.

## Approaches considered

1. **Focused algorithm learning demo (selected):** retain the linear pipeline and paper-style Dijkstra, add DAG DP and a side-by-side comparison, and add a paper-inspired ETL preset with explicit price labels. This directly supports the course presentation and reuses the existing graph model. The trade-off is that branching topologies remain out of scope.
2. **Arbitrary directed graph redesign:** let users draw individual connections and model branches. This better represents larger architectures, but a shortest path only prices one route and does not automatically account for every required branch. It needs a separate objective/model design before it can be correct, so it is deferred.

## User experience

- The user chooses an example scenario without overwriting the existing multi-provider sample unless they load it.
- The paper-inspired ETL preset has the paper's three stages (compute, storage, compute) and its US Central → US East → US West direction. Prices and any candidate options are labeled illustrative unless verified against a documented source snapshot.
- The user runs a comparison. The app builds the graph once, runs both algorithms against the same start candidates, target candidates, constraints, and edge weights, then displays both result paths, objective scores, graph (V/E) counts, observed runtimes, and theoretical complexity.
- The comparison shows whether scores agree. It explains that equivalent tied paths can differ and that millisecond timing on a small graph is illustrative, not a reliable performance claim.
- The existing result graph continues to highlight the selected route for the chosen method. The default remains the paper-style Dijkstra method to preserve the paper mapping.
- A short model note says this version solves a linear pipeline choice: all feasible adjacent-stage candidate pairs are connected. It does not optimize a multi-branch deployment as a whole.

## Model and algorithm behavior

- Both algorithms operate on the graph produced by the existing `buildGraph`; no algorithm may silently change the edge weights or feasibility rules.
- Multi-source initialization gives each first-stage candidate its starting resource cost plus any score adjustment, matching current app semantics.
- The DAG algorithm processes graph nodes in stage/topological order and relaxes each outgoing edge once, with expected time (O(V+E)).
- Dijkstra remains the paper-style unvisited-node scan ((O(V^2))), to keep the comparison explicit. The app must not imply that this is the only or fastest possible Dijkstra implementation.
- Costs remain non-negative and additive. The optional CER score uses the current documented demonstrator interpretation.
- If there is no complete feasible route, each method reports no route consistently.

## Constraints and assumptions

- The current app has one three-stage fictional sample and builds every feasible edge between adjacent stages. The new paper-inspired preset must not imply that the app handles arbitrary topology.
- Paper scenario structure is safe to label as inspired by the article. Any numerical values must have a provenance note; use fictional illustrative values rather than claiming reproduction if the paper does not supply the exact full candidate-price input set.
- Runtime measurements use browser performance timing and are noisy on small graphs. Correctness and same-score output matter more than small timing differences.
- Existing JSON imports should remain valid; if preset selection needs a schema change, it must be backward-compatible or explicitly versioned.

## Success criteria

- Both algorithms return the same minimum selection score for the same feasible scenario; tests/manual checks also validate their routes and no-route behavior.
- The app displays graph size and clearly explains each algorithm's complexity and relationship to the paper.
- A user can load the original multi-provider sample or the paper-inspired ETL example and compare both methods without editing code.
- The ETL example clearly labels any illustrative prices and its simplified linear scope.
- The app remains dependency-free and usable from the current local static-server workflow.
