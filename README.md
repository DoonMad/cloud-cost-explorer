# Cloud Cost Explorer

A small, dependency-free browser app for learning and demonstrating the graph-based cloud cost approach in:

Khan et al., “Cost modelling and optimisation for cloud: a graph-based approach,” Journal of Cloud Computing, 2024. DOI: 10.1186/s13677-024-00709-6.

This is an educational implementation, not a production cloud optimizer. It does not connect to cloud accounts, fetch live prices, or provision services.

## Run locally

1. Open PowerShell in this folder.
2. Start the built-in Python web server:

       python -m http.server 8000

3. Open http://localhost:8000 in a browser.

No packages, API keys, or build step are needed.

## Try the examples

**Load sample** opens a fictional multi-provider pipeline with three stages. **Paper ETL example** follows the paper's three-step compute → storage → compute flow from US Central to US East to US West. Its resource options and prices are illustrative; they are not historical Google Cloud prices from the paper. **Large regional example** creates a 14-stage analytics workflow across six candidate provider/region combinations per stage: 84 resource nodes and 468 possible directed connections before QoS filters. It is intentionally dense to make graph search and algorithm work visible. Each stage is sequential; its six choices are alternatives, not six resources that all run together. Every provider label and price in the example is fictional.

Change a candidate's price or QoS values, select a shortest-path method, and compare both algorithms on the same graph. You can also select the paper-style score, change its weights, or set limits that remove candidates from consideration.

Use Export scenario to save the current configuration as JSON. Import JSON loads a previously exported scenario after validating it. New blank starts an empty pipeline.

## What to enter

- A name and type for each pipeline stage.
- One or more feasible resource candidates per stage: provider, region, label, optional specification, monthly cost, latency, availability, durability, egress price per GB, and ingress price per GB.
- For each connection to the next stage: expected GB transferred per month and transfer latency in milliseconds.
- One currency and QoS limits for each resource stage and transfer link.

All entered prices need to use the same currency and monthly billing period. Provider and region values are labels; this app does not check that a real provider supports a selected combination.

## How the model works

1. Each candidate resource at a pipeline stage becomes a graph node.
2. Every candidate in one stage connects to every candidate in the next stage with a directed edge, unless the entered transfer-latency limit rules that connection out.
3. Resource candidates that fail the per-stage latency, availability, or durability limits are removed.
4. Transfer cost is data volume times the source egress rate plus destination ingress rate.
5. The selected shortest-path algorithm finds the lowest-weight path. The first resource cost is the initial distance; each next edge adds the next resource's cost and the transfer cost. This counts each resource once.
6. The graph shows candidate connections and highlights the selected route. The result separates resource cost, transfer cost, estimated bill, and (when enabled) CER adjustment.

## Algorithm comparison

- **Paper-style Dijkstra:** the article describes a Dijkstra variant that scans unvisited nodes, with (O(V^2)) time. The app keeps this method so you can compare with the paper.
- **DAG dynamic programming:** processes the graph in stage order and relaxes each edge once, with (O(V+E)) time for this DAG model.
- Both methods use the same built graph, start and end choices, edge weights, filters, and score. They should find the same minimum score; if several routes tie, the displayed route can differ.
- The app reports observed runtime for the current graph, but timing on a small graph is noisy and shouldn't be taken as a general performance claim. The reproducible synthetic benchmark in `experiments/` compares larger dense and sparse graphs and documents its limitations.
- The comparison also reports node and edge checks performed by these implementations. These counters illustrate the work in their respective traversals; they are not equivalent machine instructions and do not predict wall-clock speed.
- A heap-based or early-exit Dijkstra may outperform this paper-style scan for some single-target graphs. The comparison demonstrates the DAG structure's algorithmic opportunity; it does not prove DP is always the fastest implementation.

The selected route is still one linear pipeline. Every feasible resource choice in one stage connects to every feasible choice in the next stage. The paper's larger big-data architecture includes multiple data marts/branches; this app does not calculate the cost of all required branches together.

The main mode minimizes the estimated monthly bill under the entered per-stage and per-link limits. It reports total route latency but does not enforce a global end-to-end latency limit. Availability and durability limits apply to each resource individually; the app does not multiply them into an end-to-end SLA.

## Paper-style QoS score

The article adds a cost-effectiveness ratio (CER) adjustment for latency, availability, and durability. Its example normalizes latency, but it does not fully define a common scale and direction for every QoS factor; it also adds the CER adjustment to monetary edge costs. The optional score mode therefore makes one explicit demonstrator interpretation:

- Latency adverse value = (resource latency + incoming transfer latency) divided by a user-set latency scale (default 1000 ms).
- Availability adverse value = 1 minus availability percentage divided by 100.
- Durability adverse value = 1 minus durability percentage divided by 100.
- Each CER uses resource monthly cost divided by ((1 - adverse value) times N), multiplied by its normalized importance weight.
- Adverse values are capped below 1 to keep the score finite and edge weights non-negative.

The app displays actual estimated bill separately from the CER-adjusted route score. The score is only comparable within the same scenario and settings; it is not a provider invoice or a universal QoS measure. Use the cost-only mode for the clearest recommendation and discuss this interpretation as a limitation in a presentation.

## Relationship to the research paper

The paper proposes graph-based resource placement and demonstrates pricing scenarios using Google Cloud's pricing API. This app follows its graph and shortest-path idea but accepts user-entered candidate prices. Comparing multiple providers is an extension of the paper's general approach, not a reproduced multi-cloud evaluation. The interface and results are designed to make that distinction visible.

## Current limits

- Example prices are fictional. For actual decisions, enter verified prices from provider calculators and include all relevant fees.
- Egress and ingress rates approximate each candidate's transfer pricing; real tariffs may depend on the exact source/destination region pair, tiers, free allowances, and traffic class.
- Candidate compatibility is assumed. The user must exclude options that cannot connect or interoperate.
- The QoS limits are per stage and per transfer link, not end-to-end service guarantees.
- Costs are static estimates. No usage history, discounts, taxes, migration costs, or changing prices are retrieved automatically.
- Dijkstra assumes non-negative additive weights. This demo uses non-negative price and CER weights and does not model arbitrary coupled resource constraints.
- DAG dynamic programming relies on the app's forward stage order. Do not use it unchanged if the graph model is expanded to arbitrary/cyclic topologies.

## Publish on GitHub Pages

The app is static and requires no build command. To publish it from a GitHub repository, push this folder to a repository, then open **Settings → Pages**, select **Deploy from a branch**, choose the `main` branch and `/ (root)`, and save. GitHub Pages may take a few minutes to publish the site. The PDF and lesson screenshots in the parent course folder are not required to run this app and should not be added to the app repository.

## Files

- index.html: page structure and user-facing explanation.
- styles.css: responsive layout and SVG graph styles.
- src/sample.js: illustrative scenario data.
- src/shortest-path.js: paper-style Dijkstra and topological DAG dynamic programming.
- src/model.js: validation, graph construction, CER scoring, route result construction, and same-graph comparison.
- src/app.js: editable interface, result breakdown, SVG graph, and JSON import/export.
- tests/: dependency-free Node tests for algorithm and example behavior (`node --test tests/*.test.mjs`).
- experiments/: reproducible synthetic algorithm benchmark and its CSV/Markdown results.
- docs/superpowers/specs: design decisions and model assumptions.
- docs/superpowers/plans: implementation plan.
