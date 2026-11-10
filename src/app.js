import { buildGraph, compareScenarioAlgorithms, optimizeScenario, validateScenario } from "./model.js";
import { createPaperEtlScenario, createRegionalScaleScenario, createSampleScenario } from "./sample.js";

const $ = selector => document.querySelector(selector);
const svgNS = "http://www.w3.org/2000/svg";
let scenario = loadScenario();
let lastResult = null;
let lastComparison = null;

function selectedAlgorithm() {
  return scenario.settings.algorithm === "dag-dp" ? "dag-dp" : "dijkstra";
}

function loadScenario() {
  try {
    const stored = localStorage.getItem("cloud-cost-explorer-scenario");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (validateScenario(parsed).ok) return parsed;
    }
  } catch (_) { /* Start with the sample if saved data cannot be read. */ }
  return createSampleScenario();
}

function saveScenario() {
  try { localStorage.setItem("cloud-cost-explorer-scenario", JSON.stringify(scenario)); } catch (_) { /* Storage is optional. */ }
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function button(text, action, stageIndex, optionIndex, className) {
  const node = element("button", className || "icon-button", text);
  node.type = "button";
  node.dataset.action = action;
  if (stageIndex !== undefined) node.dataset.stage = String(stageIndex);
  if (optionIndex !== undefined) node.dataset.option = String(optionIndex);
  return node;
}

function field(labelText, value, meta) {
  const label = element("label", meta.className || "", labelText);
  let input;
  if (meta.type === "select") {
    input = document.createElement("select");
    for (const [optionValue, optionLabel] of meta.options) {
      const option = element("option", "", optionLabel);
      option.value = optionValue;
      input.append(option);
    }
    input.value = value;
  } else {
    input = document.createElement("input");
    input.type = meta.type || "text";
    input.value = value === undefined || value === null ? "" : String(value);
    if (meta.type === "number") { input.min = "0"; input.step = "any"; }
    if (meta.max !== undefined) input.max = String(meta.max);
    if (meta.placeholder) input.placeholder = meta.placeholder;
  }
  input.dataset.scope = meta.scope;
  if (meta.stage !== undefined) input.dataset.stage = String(meta.stage);
  if (meta.option !== undefined) input.dataset.option = String(meta.option);
  input.dataset.field = meta.key;
  label.append(input);
  return label;
}

function makeId(prefix) {
  return prefix + "-" + (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
}

function blankOption() {
  return { id: makeId("resource"), provider: "Provider", region: "Region", name: "Resource option", spec: "", pricePerMonth: 0, latencyMs: 0, availabilityPct: 99, durabilityPct: 99, egressPerGB: 0, ingressPerGB: 0 };
}

function blankStage(number) {
  return { id: makeId("stage"), name: "Pipeline stage " + number, type: "compute", flowToNextGB: 0, transferLatencyMs: 0, options: [] };
}

function formatMoney(value) {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: scenario.currency, maximumFractionDigits: 2 }).format(Number(value) || 0); }
  catch (_) { return scenario.currency + " " + (Number(value) || 0).toFixed(2); }
}

function formatScore(value) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(Number(value) || 0);
}

function showStatus(message, type) {
  const box = $("#statusMessage");
  box.textContent = message;
  box.className = "status-message visible " + (type || "success");
  window.clearTimeout(showStatus.timer);
  showStatus.timer = window.setTimeout(() => { box.className = "status-message"; }, 5000);
}

function renderStages() {
  const root = $("#stages");
  root.replaceChildren();
  scenario.stages.forEach((stage, stageIndex) => {
    const card = element("section", "stage-card");
    const header = element("div", "stage-header");
    header.append(element("div", "stage-kicker", "STAGE " + String(stageIndex + 1).padStart(2, "0")));
    const actions = element("div", "stage-actions");
    actions.append(button("↑", "move-up", stageIndex, undefined, "icon-button"));
    actions.append(button("↓", "move-down", stageIndex, undefined, "icon-button"));
    actions.append(button("×", "remove-stage", stageIndex, undefined, "icon-button"));
    header.append(actions);
    card.append(header);

    const mainFields = element("div", "stage-main-fields");
    mainFields.append(field("Stage name", stage.name, { scope: "stage", stage: stageIndex, key: "name", type: "text" }));
    mainFields.append(field("Resource type", stage.type, { scope: "stage", stage: stageIndex, key: "type", type: "select", options: [["compute", "Compute"], ["storage", "Storage"], ["other", "Other"]] }));
    card.append(mainFields);

    const candidatesTitle = element("div", "candidates-title", "Candidate resources");
    candidatesTitle.append(button("＋ Add option", "add-option", stageIndex, undefined, "add-candidate"));
    card.append(candidatesTitle);
    const list = element("div", "candidate-list");
    stage.options.forEach((option, optionIndex) => {
      const candidate = element("div", "candidate-card");
      const candidateHead = element("div", "candidate-head", "Option " + (optionIndex + 1));
      candidateHead.append(button("Remove", "remove-option", stageIndex, optionIndex, "add-candidate"));
      candidate.append(candidateHead);
      const grid = element("div", "candidate-grid");
      const f = (label, key, type, className, max) => field(label, option[key], { scope: "option", stage: stageIndex, option: optionIndex, key, type, className, max });
      grid.append(f("Provider", "provider", "text", ""));
      grid.append(f("Region", "region", "text", ""));
      grid.append(f("Resource name", "name", "text", "wide"));
      grid.append(f("Specification (optional)", "spec", "text", "wide"));
      grid.append(f("Monthly resource cost", "pricePerMonth", "number", ""));
      grid.append(f("Latency (ms)", "latencyMs", "number", ""));
      grid.append(f("Availability (%)", "availabilityPct", "number", "", 100));
      grid.append(f("Durability (%)", "durabilityPct", "number", "", 100));
      grid.append(f("Egress cost per GB", "egressPerGB", "number", ""));
      grid.append(f("Ingress cost per GB", "ingressPerGB", "number", ""));
      candidate.append(grid);
      list.append(candidate);
    });
    if (stage.options.length === 0) list.append(element("div", "graph-caption", "No resource choices yet. Add at least one candidate to optimize this stage."));
    card.append(list);

    if (stageIndex < scenario.stages.length - 1) {
      const flow = element("div", "flow-fields");
      flow.append(element("div", "flow-label", "Data sent to next stage"));
      flow.append(field("Data volume (GB/month)", stage.flowToNextGB, { scope: "stage", stage: stageIndex, key: "flowToNextGB", type: "number" }));
      flow.append(field("Transfer latency (ms)", stage.transferLatencyMs, { scope: "stage", stage: stageIndex, key: "transferLatencyMs", type: "number" }));
      flow.append(element("div", "fine-print", "The source option's egress rate and destination option's ingress rate are applied to this data volume."));
      card.append(flow);
    }
    root.append(card);
  });
}

function syncSettings() {
  const settings = scenario.settings;
  $("#scenarioName").value = scenario.name || "Untitled scenario";
  $("#currency").value = scenario.currency;
  $("#objective").value = settings.objective;
  $("#algorithm").value = selectedAlgorithm();
  $("#maxStageLatencyMs").value = settings.maxStageLatencyMs;
  $("#minAvailabilityPct").value = settings.minAvailabilityPct;
  $("#minDurabilityPct").value = settings.minDurabilityPct;
  $("#maxTransferLatencyMs").value = settings.maxTransferLatencyMs;
  $("#normalization").value = settings.cer.normalization;
  $("#latencyScaleMs").value = settings.cer.latencyScaleMs;
  $("#weightLatency").value = settings.cer.weights.latency;
  $("#weightAvailability").value = settings.cer.weights.availability;
  $("#weightDurability").value = settings.cer.weights.durability;
  $("#paperSettings").classList.toggle("visible", settings.objective === "paper");
}

function svgElement(tag, attrs, text) {
  const node = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attrs || {})) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = String(text);
  return node;
}

function renderGraph(graph, result) {
  const wrap = $("#graphWrap");
  wrap.replaceChildren();
  if (!graph || !graph.nodes || graph.nodes.length === 0) {
    wrap.append(element("div", "graph-empty", "Add a resource option to each stage to see the candidate graph."));
    $("#graphCaption").textContent = "Candidate resource options become nodes; data-flow choices become directed edges.";
    return;
  }
  const stageCount = scenario.stages.length;
  const maxRows = Math.max(1, ...graph.nodesByStage.map(items => items.length));
  const width = Math.max(700, 260 * stageCount + 90);
  const height = Math.max(250, maxRows * 128 + 105);
  const svg = svgElement("svg", { viewBox: "0 0 " + width + " " + height, width, height, role: "img", "aria-label": "Directed graph of candidate cloud resources" });
  const defs = svgElement("defs");
  const marker = svgElement("marker", { id: "arrowhead", markerWidth: 8, markerHeight: 8, refX: 6, refY: 3, orient: "auto", markerUnits: "strokeWidth" });
  marker.append(svgElement("path", { d: "M0,0 L0,6 L7,3 z", fill: "#9aa89e" }));
  const selectedMarker = svgElement("marker", { id: "arrowheadSelected", markerWidth: 8, markerHeight: 8, refX: 6, refY: 3, orient: "auto", markerUnits: "strokeWidth" });
  selectedMarker.append(svgElement("path", { d: "M0,0 L0,6 L7,3 z", fill: "#16825d" }));
  defs.append(marker, selectedMarker);
  svg.append(defs);
  const coordinates = new Map();
  const chosenEdgeIds = new Set((result && result.pathEdges || []).map(edge => edge.id));
  graph.nodesByStage.forEach((items, stageIndex) => {
    const x = 22 + stageIndex * 260;
    svg.append(svgElement("text", { x: x + 89, y: 22, "text-anchor": "middle", class: "svg-stage-title" }, scenario.stages[stageIndex].name));
    items.forEach((node, optionIndex) => {
      const y = 44 + optionIndex * 128;
      coordinates.set(node.id, { x, y });
    });
  });
  for (const edge of graph.edges) {
    const from = coordinates.get(edge.from), to = coordinates.get(edge.to);
    if (!from || !to) continue;
    const selected = chosenEdgeIds.has(edge.id);
    const sx = from.x + 182, sy = from.y + 45, tx = to.x - 7, ty = to.y + 45;
    const bend = Math.max(24, (tx - sx) * 0.45);
    const path = svgElement("path", {
      d: "M " + sx + " " + sy + " C " + (sx + bend) + " " + sy + ", " + (tx - bend) + " " + ty + ", " + tx + " " + ty,
      fill: "none", stroke: selected ? "#16825d" : "#b7c2ba", "stroke-width": selected ? 3.5 : 1.25,
      "marker-end": selected ? "url(#arrowheadSelected)" : "url(#arrowhead)"
    });
    const tip = svgElement("title", {}, edge.dataGB + " GB/month; transfer " + formatMoney(edge.transferCost) + "; " + edge.transferLatencyMs + " ms");
    path.append(tip);
    svg.append(path);
    if (selected || graph.edges.length <= 12) {
      const label = svgElement("text", { x: (sx + tx) / 2, y: (sy + ty) / 2 - 6, "text-anchor": "middle", class: selected ? "svg-edge-label selected" : "svg-edge-label" }, formatMoney(edge.transferCost));
      svg.append(label);
    }
  }
  for (const node of graph.nodes) {
    const pos = coordinates.get(node.id);
    const selected = Boolean(result && result.path && result.path.some(step => step.id === node.id));
    const group = svgElement("g", { class: selected ? "svg-node selected" : "svg-node" });
    group.append(svgElement("rect", { x: pos.x, y: pos.y, width: 182, height: 91, rx: 11 }));
    group.append(svgElement("text", { x: pos.x + 11, y: pos.y + 19, class: "svg-provider" }, node.option.provider + " · " + node.option.region));
    group.append(svgElement("text", { x: pos.x + 11, y: pos.y + 39, class: "svg-resource" }, node.option.name));
    group.append(svgElement("text", { x: pos.x + 11, y: pos.y + 57, class: "svg-spec" }, node.option.spec || node.stageType));
    group.append(svgElement("text", { x: pos.x + 11, y: pos.y + 77, class: "svg-price" }, formatMoney(node.resourceCost) + " / month"));
    group.append(svgElement("title", {}, node.option.provider + ", " + node.option.region + ": " + node.option.name));
    svg.append(group);
  }
  wrap.append(svg);
  $("#graphCaption").textContent = result && result.ok
    ? "Green path is the selected route. Muted arrows are other feasible, directed candidate connections."
    : "Muted arrows show feasible directed connections. Run optimization to highlight the selected route.";
}

function metric(label, value, sub) {
  const box = element("div", "metric");
  box.append(element("div", "metric-label", label), element("div", "metric-value", value), element("div", "metric-sub", sub || ""));
  return box;
}

function breakdownRow(label, value) {
  const row = element("div", "breakdown-row");
  row.append(element("span", "", label), element("strong", "", value));
  return row;
}

function renderResults(result) {
  const root = $("#resultPanel");
  root.replaceChildren();
  if (!result.ok) {
    root.append(element("div", "panel-kicker", "02 · RESULT"), element("h2", "result-title", "No valid route yet"), element("div", "no-route", result.reason));
    if (result.errors && result.errors.length > 1) root.append(element("p", "fine-print", result.errors.slice(1).join(" ")));
    return;
  }
  const objectiveTitle = result.objective === "paper" ? "Lowest paper-style selection score" : "Lowest estimated monthly bill";
  root.append(element("div", "panel-kicker", "02 · RESULT"), element("h2", "result-title", objectiveTitle));
  const metrics = element("div", "metric-grid");
  metrics.append(metric("Estimated monthly bill", formatMoney(result.totalCost), "resource + transfer estimates"));
  metrics.append(metric("Data transfer", formatMoney(result.totalTransferCost), "across " + result.pathEdges.length + " directed link(s)"));
  metrics.append(metric("Total route latency", Math.round(result.totalLatencyMs) + " ms", "sum of entered stage and link values"));
  if (result.objective === "paper") metrics.append(metric("CER-adjusted score", formatScore(result.selectionScore), "comparison score, not an invoice"));
  root.append(metrics);

  const route = element("div", "route-summary");
  const routeNames = result.path.map((node, index) => (index ? " → " : "") + node.option.provider + " / " + node.option.region);
  route.append(element("strong", "", "Selected route: "), document.createTextNode(routeNames.join("")));
  route.append(document.createElement("br"), document.createTextNode("Per-stage minimum availability " + result.minimumAvailabilityPct + "% · durability " + result.minimumDurabilityPct + "%"));
  root.append(route);

  const details = element("div", "breakdown");
  result.path.forEach((node, index) => details.append(breakdownRow("Stage " + (index + 1) + " · " + node.option.name, formatMoney(node.resourceCost) + " / month")));
  result.pathEdges.forEach((edge, index) => details.append(breakdownRow("Transfer " + (index + 1) + " · " + edge.dataGB + " GB/month", formatMoney(edge.transferCost))));
  details.append(breakdownRow("Estimated monthly total", formatMoney(result.totalCost)));
  if (result.objective === "paper") details.append(breakdownRow("QoS CER adjustment", formatScore(result.totalQosPenalty) + " score points"));
  root.append(details);
}

function renderAlgorithmComparison(comparison) {
  const root = $("#algorithmComparison");
  const status = $("#comparisonStatus");
  root.replaceChildren();
  if (!comparison) {
    status.textContent = "Ready";
    status.className = "comparison-status";
    root.append(element("p", "helper-copy", "Run both algorithms on the same candidates, edge weights, and constraints. Runtime on small graphs is only a rough observation."));
    return;
  }

  const dijkstra = comparison.results.dijkstra;
  const dagDp = comparison.results.dagDp;
  const scoresAgree = dijkstra.ok && dagDp.ok && Math.abs(dijkstra.selectionScore - dagDp.selectionScore) < 1e-8;
  status.textContent = scoresAgree ? "Same minimum score" : comparison.ok ? "Check score difference" : "No complete route";
  status.className = "comparison-status " + (scoresAgree ? "agrees" : "disagrees");

  const summary = element("div", "comparison-summary");
  summary.append(element("strong", "", scoresAgree ? "Both methods found the same minimum score." : comparison.ok ? "The methods returned different scores; review the scenario assumptions." : "At least one method could not find a complete route."));
  summary.append(element("span", "", comparison.graphStats.nodes + " nodes (V) · " + comparison.graphStats.edges + " edges (E)"));
  root.append(summary);

  const wrapper = element("div", "comparison-table-wrap");
  const table = element("table", "comparison-table");
  const thead = document.createElement("thead");
  const header = document.createElement("tr");
  for (const title of ["Method", "Worst-case time", "Work counted (node / edge checks)", "Observed", "Estimated bill", "Selection score", "Chosen route"]) header.append(element("th", "", title));
  thead.append(header);
  const tbody = document.createElement("tbody");
  const rows = [
    { key: "dijkstra", title: "Paper-style Dijkstra", complexity: "O(V²)" },
    { key: "dagDp", title: "DAG dynamic programming", complexity: "O(V + E)" }
  ];
  for (const rowInfo of rows) {
    const result = comparison.results[rowInfo.key];
    const tr = document.createElement("tr");
    const routeText = result.ok
      ? result.path.map(node => node.option.provider + " / " + node.option.region).join(" → ")
      : result.reason || "No route";
    const observed = Number.isFinite(comparison.timingsMs[rowInfo.key]) ? comparison.timingsMs[rowInfo.key].toFixed(3) + " ms" : "—";
    const cells = [
      rowInfo.title,
      rowInfo.complexity,
      result.work ? result.work.nodeChecks.toLocaleString() + " / " + result.work.edgeChecks.toLocaleString() : "—",
      observed,
      result.ok ? formatMoney(result.totalCost) : "—",
      result.ok ? formatScore(result.selectionScore) : "—",
      routeText
    ];
    for (const [index, value] of cells.entries()) tr.append(element(index === 0 ? "th" : "td", index === 6 ? "comparison-route" : "", value));
    tbody.append(tr);
  }
  table.append(thead, tbody);
  wrapper.append(table);
  root.append(wrapper);
  root.append(element("p", "fine-print", "Both algorithms use this exact same graph. Work counts show node checks / outgoing-edge checks performed by these implementations; these aren't directly comparable machine instructions or a timing prediction. Equal scores can have different tied routes. Observed times include route-result construction, exclude graph construction, and remain noisy. This Dijkstra row represents the paper-style node scan, not every optimized Dijkstra implementation; heap-based or early-exit Dijkstra can be faster for some single-target graphs."));
}

function renderAll() {
  renderStages();
  syncSettings();
  lastResult = optimizeScenario(scenario, undefined, selectedAlgorithm());
  renderResults(lastResult);
  renderGraph(lastResult.graph || buildGraph(scenario), lastResult);
  renderAlgorithmComparison(lastComparison);
}

function updateFromInput(target) {
  const scope = target.dataset.scope;
  const fieldName = target.dataset.field;
  const value = target.type === "number" ? Number(target.value) : target.value;
  if (scope === "scenario") scenario.name = target.value;
  if (scope === "currency") scenario.currency = target.value;
  if (scope === "settings") scenario.settings[fieldName] = value;
  if (scope === "cer") {
    if (fieldName.startsWith("weight")) {
      const map = { weightLatency: "latency", weightAvailability: "availability", weightDurability: "durability" };
      scenario.settings.cer.weights[map[fieldName]] = value;
    } else scenario.settings.cer[fieldName] = value;
  }
  if (scope === "stage") scenario.stages[Number(target.dataset.stage)][fieldName] = value;
  if (scope === "option") scenario.stages[Number(target.dataset.stage)].options[Number(target.dataset.option)][fieldName] = value;
}

document.addEventListener("change", event => {
  const target = event.target;
  if (target.dataset.scope) {
    updateFromInput(target);
    if (!(target.dataset.scope === "settings" && target.dataset.field === "algorithm")) lastComparison = null;
    saveScenario();
    renderAll();
  }
});

document.addEventListener("click", event => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  const stageIndex = Number(target.dataset.stage);
  const optionIndex = Number(target.dataset.option);
  lastComparison = null;
  if (action === "add-stage") scenario.stages.push(blankStage(scenario.stages.length + 1));
  if (action === "remove-stage") scenario.stages.splice(stageIndex, 1);
  if (action === "move-up" && stageIndex > 0) [scenario.stages[stageIndex - 1], scenario.stages[stageIndex]] = [scenario.stages[stageIndex], scenario.stages[stageIndex - 1]];
  if (action === "move-down" && stageIndex < scenario.stages.length - 1) [scenario.stages[stageIndex + 1], scenario.stages[stageIndex]] = [scenario.stages[stageIndex], scenario.stages[stageIndex + 1]];
  if (action === "add-option") scenario.stages[stageIndex].options.push(blankOption());
  if (action === "remove-option") scenario.stages[stageIndex].options.splice(optionIndex, 1);
  saveScenario();
  renderAll();
});

$("#scenarioName").dataset.scope = "scenario";
$("#scenarioName").dataset.field = "name";
$("#currency").dataset.scope = "currency";
for (const fieldName of ["objective", "algorithm", "maxStageLatencyMs", "minAvailabilityPct", "minDurabilityPct", "maxTransferLatencyMs"]) {
  $("#" + fieldName).dataset.scope = "settings";
  $("#" + fieldName).dataset.field = fieldName;
}
for (const fieldName of ["normalization", "latencyScaleMs", "weightLatency", "weightAvailability", "weightDurability"]) {
  $("#" + fieldName).dataset.scope = "cer";
  $("#" + fieldName).dataset.field = fieldName;
}

$("#addStage").addEventListener("click", () => { scenario.stages.push(blankStage(scenario.stages.length + 1)); lastComparison = null; saveScenario(); renderAll(); });
$("#optimize").addEventListener("click", () => { renderAll(); showStatus("Route recalculated from the current candidate options and assumptions.", "success"); });
$("#newScenario").addEventListener("click", () => {
  scenario = { version: 1, name: "New cloud pipeline", currency: "USD", settings: { objective: "cost", algorithm: "dijkstra", maxStageLatencyMs: 500, minAvailabilityPct: 99, minDurabilityPct: 99, maxTransferLatencyMs: 200, cer: { normalization: 10, latencyScaleMs: 1000, weights: { latency: 50, availability: 25, durability: 25 } } }, stages: [blankStage(1), blankStage(2)] };
  lastComparison = null;
  saveScenario(); renderAll(); showStatus("Blank pipeline created. Add resource options to each stage.", "success");
});
$("#resetSample").addEventListener("click", () => { scenario = createSampleScenario(); lastComparison = null; saveScenario(); renderAll(); showStatus("Illustrative multi-provider sample loaded. Its prices are fictional.", "success"); });
$("#paperEtlExample").addEventListener("click", () => {
  scenario = createPaperEtlScenario();
  lastComparison = null;
  saveScenario(); renderAll();
  showStatus("Paper-inspired three-stage ETL example loaded. Every price is illustrative, not a quoted Google Cloud rate.", "success");
});
$("#regionalExample").addEventListener("click", () => {
  scenario = createRegionalScaleScenario();
  lastComparison = compareScenarioAlgorithms(scenario);
  saveScenario(); renderAll();
  showStatus("14-stage multi-region example loaded and both methods compared. Prices are fictional; each stage is sequential with six alternative resources.", "success");
});
$("#compareAlgorithms").addEventListener("click", () => {
  lastComparison = compareScenarioAlgorithms(scenario);
  renderAll();
  if (lastComparison.ok) showStatus("Both algorithms ran on the same graph and constraints.", "success");
  else showStatus(lastComparison.reason || "No complete route is available for comparison.", "error");
});
$("#exportScenario").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(scenario, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = (scenario.name || "cloud-scenario").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".json";
  link.click();
  URL.revokeObjectURL(url);
  showStatus("Scenario exported as JSON.", "success");
});
$("#importScenario").addEventListener("click", () => $("#fileInput").click());
$("#fileInput").addEventListener("change", async event => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const validation = validateScenario(parsed);
    if (!validation.ok) throw new Error(validation.errors.join(" "));
    scenario = parsed;
    lastComparison = null;
    saveScenario(); renderAll(); showStatus("Scenario imported. Review its prices and assumptions before using the result.", "success");
  } catch (error) {
    showStatus("Could not import this scenario: " + error.message, "error");
  } finally { event.target.value = ""; }
});

renderAll();
