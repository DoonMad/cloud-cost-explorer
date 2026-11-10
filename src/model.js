import { dagShortestPath, dijkstraShortestPath } from "./shortest-path.js";

const EPSILON = 1e-9;
const MAX_QOS_PENALTY_INPUT = 0.99;

export function validateScenario(scenario) {
  const errors = [];
  if (!scenario || typeof scenario !== "object") return { ok: false, errors: ["Scenario must be a JSON object."] };
  if (!Array.isArray(scenario.stages) || scenario.stages.length === 0) errors.push("Add at least one pipeline stage.");
  if (!["USD", "INR", "EUR"].includes(scenario.currency)) errors.push("Choose USD, INR, or EUR.");
  const settings = scenario.settings || {};
  if (!["cost", "paper"].includes(settings.objective)) errors.push("Choose a supported optimization objective.");
  if (settings.algorithm !== undefined && !["dijkstra", "dag-dp"].includes(settings.algorithm)) errors.push("Choose a supported shortest-path algorithm.");
  for (const [field, value, min, max] of [
    ["maxStageLatencyMs", settings.maxStageLatencyMs, 0, Infinity],
    ["minAvailabilityPct", settings.minAvailabilityPct, 0, 100],
    ["minDurabilityPct", settings.minDurabilityPct, 0, 100],
    ["maxTransferLatencyMs", settings.maxTransferLatencyMs, 0, Infinity]
  ]) {
    if (!Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max) errors.push("Invalid setting: " + field + ".");
  }
  const cer = settings.cer || {};
  if (settings.objective === "paper" && !(Number(cer.normalization) > 0)) errors.push("CER normalization N must be greater than zero.");
  if (settings.objective === "paper" && !(Number(cer.latencyScaleMs) > 0)) errors.push("Latency scale must be greater than zero.");
  const weights = cer.weights || {};
  for (const key of ["latency", "availability", "durability"]) {
    if (settings.objective === "paper" && (!Number.isFinite(Number(weights[key])) || Number(weights[key]) < 0 || Number(weights[key]) > 100)) errors.push("CER " + key + " weight must be between 0 and 100.");
  }
  if (settings.objective === "paper" && ["latency", "availability", "durability"].every(key => Number(weights[key]) === 0)) errors.push("At least one CER weight must be greater than zero.");
  const usedIds = new Set();

  (scenario.stages || []).forEach((stage, stageIndex) => {
    const label = "Stage " + (stageIndex + 1);
    if (!stage || typeof stage !== "object") { errors.push(label + " is invalid."); return; }
    if (!String(stage.id || "").trim()) errors.push(label + " needs an ID.");
    else if (usedIds.has(stage.id)) errors.push(label + " has a duplicate ID.");
    else usedIds.add(stage.id);
    if (!String(stage.name || "").trim()) errors.push(label + " needs a name.");
    if (!["compute", "storage", "other"].includes(stage.type)) errors.push(label + " has an invalid resource type.");
    if (!Array.isArray(stage.options)) errors.push(label + " resources must be a list.");
    if (!Number.isFinite(Number(stage.flowToNextGB)) || Number(stage.flowToNextGB) < 0) errors.push(label + " data volume must be zero or more GB per month.");
    if (!Number.isFinite(Number(stage.transferLatencyMs)) || Number(stage.transferLatencyMs) < 0) errors.push(label + " transfer latency must be zero or more.");
    (stage.options || []).forEach((option, optionIndex) => {
      const optionLabel = label + ", resource " + (optionIndex + 1);
      if (!option || typeof option !== "object") { errors.push(optionLabel + " is invalid."); return; }
      if (!String(option.id || "").trim()) errors.push(optionLabel + " needs an ID.");
      else if (usedIds.has(option.id)) errors.push(optionLabel + " has a duplicate ID.");
      else usedIds.add(option.id);
      for (const field of ["pricePerMonth", "latencyMs", "availabilityPct", "durabilityPct", "egressPerGB", "ingressPerGB"]) {
        if (!Number.isFinite(Number(option[field])) || Number(option[field]) < 0) errors.push(optionLabel + " has an invalid " + field + ".");
      }
      if (Number(option.availabilityPct) > 100) errors.push(optionLabel + " availability must not exceed 100%.");
      if (Number(option.durabilityPct) > 100) errors.push(optionLabel + " durability must not exceed 100%.");
      for (const field of ["provider", "region", "name"]) if (!String(option[field] || "").trim()) errors.push(optionLabel + " needs a " + field + ".");
    });
  });
  return { ok: errors.length === 0, errors };
}

function feasibleOption(option, settings) {
  return Number(option.latencyMs) <= Number(settings.maxStageLatencyMs) &&
    Number(option.availabilityPct) >= Number(settings.minAvailabilityPct) &&
    Number(option.durabilityPct) >= Number(settings.minDurabilityPct);
}

function cerPenalty(option, inboundLatencyMs, settings) {
  const cer = settings.cer || {};
  const weights = cer.weights || {};
  const weightTotal = Number(weights.latency) + Number(weights.availability) + Number(weights.durability);
  if (weightTotal <= 0 || Number(option.pricePerMonth) === 0) return { total: 0, parts: { latency: 0, availability: 0, durability: 0 } };
  const n = Number(cer.normalization);
  const latencyScale = Number(cer.latencyScaleMs);
  const latencyAdverse = Math.min(MAX_QOS_PENALTY_INPUT, Math.max(0, (Number(option.latencyMs) + Number(inboundLatencyMs)) / latencyScale));
  const availabilityFailure = Math.min(MAX_QOS_PENALTY_INPUT, Math.max(0, 1 - Number(option.availabilityPct) / 100));
  const durabilityFailure = Math.min(MAX_QOS_PENALTY_INPUT, Math.max(0, 1 - Number(option.durabilityPct) / 100));
  const part = (q, weight) => Number(option.pricePerMonth) / ((1 - q) * n) * (Number(weight) / weightTotal);
  const parts = {
    latency: part(latencyAdverse, weights.latency),
    availability: part(availabilityFailure, weights.availability),
    durability: part(durabilityFailure, weights.durability)
  };
  return { total: parts.latency + parts.availability + parts.durability, parts };
}

export function buildGraph(scenario, settingsOverride) {
  const settings = settingsOverride || scenario.settings || {};
  const objective = settings.objective || "cost";
  const nodes = [];
  const edges = [];
  const nodesByStage = [];
  const filteredByStage = [];

  scenario.stages.forEach((stage, stageIndex) => {
    const kept = [];
    let filtered = 0;
    (stage.options || []).forEach(option => {
      if (!feasibleOption(option, settings)) { filtered += 1; return; }
      const inboundLatency = stageIndex > 0 ? Number(scenario.stages[stageIndex - 1].transferLatencyMs) : 0;
      const penalty = objective === "paper" ? cerPenalty(option, inboundLatency, settings) : { total: 0, parts: { latency: 0, availability: 0, durability: 0 } };
      const node = {
        id: option.id, stageIndex, stageName: stage.name, stageType: stage.type, option,
        resourceCost: Number(option.pricePerMonth), inboundLatencyMs: inboundLatency,
        qosPenalty: penalty.total, qosParts: penalty.parts,
        startWeight: Number(option.pricePerMonth) + penalty.total
      };
      nodes.push(node);
      kept.push(node);
    });
    nodesByStage.push(kept);
    filteredByStage.push(filtered);
  });

  for (let stageIndex = 0; stageIndex < scenario.stages.length - 1; stageIndex += 1) {
    const stage = scenario.stages[stageIndex];
    if (Number(stage.transferLatencyMs) > Number(settings.maxTransferLatencyMs)) continue;
    for (const from of nodesByStage[stageIndex]) {
      for (const to of nodesByStage[stageIndex + 1]) {
        const volume = Number(stage.flowToNextGB);
        const transferCost = volume * (Number(from.option.egressPerGB) + Number(to.option.ingressPerGB));
        edges.push({
          id: from.id + "->" + to.id, from: from.id, to: to.id,
          fromStage: stageIndex, toStage: stageIndex + 1, dataGB: volume,
          transferLatencyMs: Number(stage.transferLatencyMs), transferCost,
          weight: to.resourceCost + transferCost + to.qosPenalty
        });
      }
    }
  }
  return { nodes, edges, nodesByStage, filteredByStage, objective };
}

const emptyGraph = () => ({ nodes: [], edges: [], nodesByStage: [], filteredByStage: [] });

function scenarioError(scenario, settings, graph) {
  const stageCount = scenario.stages.length;
  for (let i = 0; i < stageCount; i += 1) {
    if (graph.nodesByStage[i].length === 0) return "No resource in stage " + (i + 1) + " meets the current per-stage limits. Relax a limit or add another candidate.";
  }
  for (let i = 0; i < stageCount - 1; i += 1) {
    if (Number(scenario.stages[i].transferLatencyMs) > Number(settings.maxTransferLatencyMs)) return "The transfer from stage " + (i + 1) + " exceeds the transfer-latency limit.";
    if (!graph.edges.some(edge => edge.fromStage === i)) return "No directed connection is available between stages " + (i + 1) + " and " + (i + 2) + ".";
  }
  return null;
}

function failedResult(reason, graph, errors) {
  return { ok: false, reason, errors, graph };
}

function createOptimizedResult(graph, settings, search, algorithm) {
  const { targetId, score: bestScore, previous } = search;
  if (targetId === null || !Number.isFinite(bestScore)) return { ...failedResult("No complete path connects the resource choices across every stage.", graph), algorithm, work: search.work };

  const nodeById = new Map(graph.nodes.map(node => [node.id, node]));
  const reversedPath = [];
  const reversedEdges = [];
  let cursor = targetId;
  while (cursor !== null && cursor !== undefined) {
    reversedPath.push(nodeById.get(cursor));
    const prior = previous.get(cursor);
    if (!prior) break;
    reversedEdges.push(prior.edge);
    cursor = prior.id;
  }
  const path = reversedPath.reverse();
  const pathEdges = reversedEdges.reverse();
  const totalResourceCost = path.reduce((sum, node) => sum + node.resourceCost, 0);
  const totalTransferCost = pathEdges.reduce((sum, edge) => sum + edge.transferCost, 0);
  const totalQosPenalty = path.reduce((sum, node) => sum + node.qosPenalty, 0);
  const totalLatencyMs = path.reduce((sum, node) => sum + Number(node.option.latencyMs), 0) + pathEdges.reduce((sum, edge) => sum + edge.transferLatencyMs, 0);
  const totalCost = totalResourceCost + totalTransferCost;
  return {
    ok: true, graph, path, pathEdges, totalResourceCost, totalTransferCost,
    totalQosPenalty, totalCost, totalLatencyMs,
    minimumAvailabilityPct: Math.min(...path.map(node => Number(node.option.availabilityPct))),
    minimumDurabilityPct: Math.min(...path.map(node => Number(node.option.durabilityPct))),
    selectionScore: totalCost + totalQosPenalty, work: search.work,
    objective: settings.objective || "cost", exploredNodeCount: graph.nodes.length, algorithm
  };
}

function solveGraph(graph, scenario, settings, algorithm) {
  const reason = scenarioError(scenario, settings, graph);
  if (reason) return failedResult(reason, graph);
  const startNodes = graph.nodesByStage[0];
  const targetNodes = graph.nodesByStage[graph.nodesByStage.length - 1];
  const search = algorithm === "dag-dp"
    ? dagShortestPath(graph, startNodes, targetNodes)
    : dijkstraShortestPath(graph, startNodes, targetNodes);
  return createOptimizedResult(graph, settings, search, algorithm);
}

function invalidScenarioResult(validation) {
  const graph = emptyGraph();
  return failedResult(validation.errors[0], graph, validation.errors);
}

export function optimizeScenario(scenario, settingsOverride, algorithm = (settingsOverride || scenario?.settings || {}).algorithm || "dijkstra") {
  const validation = validateScenario(scenario);
  if (!validation.ok) return invalidScenarioResult(validation);
  const settings = settingsOverride || scenario.settings;
  const selectedAlgorithm = algorithm || settings.algorithm || "dijkstra";
  if (!["dijkstra", "dag-dp"].includes(selectedAlgorithm)) return failedResult("Choose a supported shortest-path algorithm.", emptyGraph());
  const graph = buildGraph(scenario, settings);
  return solveGraph(graph, scenario, settings, selectedAlgorithm);
}

export function compareScenarioAlgorithms(scenario, settingsOverride) {
  const validation = validateScenario(scenario);
  if (!validation.ok) {
    const result = invalidScenarioResult(validation);
    return { ...result, results: { dijkstra: result, dagDp: result }, timingsMs: { dijkstra: 0, dagDp: 0 }, graphStats: { nodes: 0, edges: 0 } };
  }
  const settings = settingsOverride || scenario.settings;
  const graph = buildGraph(scenario, settings);
  const now = () => globalThis.performance && typeof globalThis.performance.now === "function" ? globalThis.performance.now() : Date.now();
  const runTimed = algorithm => {
    const start = now();
    const result = solveGraph(graph, scenario, settings, algorithm);
    return { result, elapsedMs: Math.max(0, now() - start) };
  };
  const dijkstra = runTimed("dijkstra");
  const dagDp = runTimed("dag-dp");
  const ok = dijkstra.result.ok && dagDp.result.ok;
  return {
    ok, graph, results: { dijkstra: dijkstra.result, dagDp: dagDp.result },
    timingsMs: { dijkstra: dijkstra.elapsedMs, dagDp: dagDp.elapsedMs },
    graphStats: { nodes: graph.nodes.length, edges: graph.edges.length },
    reason: ok ? null : dijkstra.result.reason || dagDp.result.reason
  };
}
