const EPSILON = 1e-9;

function prepareSearch(graph, startNodes, targetNodes) {
  const distance = new Map();
  const previous = new Map();
  const targets = new Set(targetNodes.map(node => node.id));
  const nodeById = new Map(graph.nodes.map(node => [node.id, node]));
  const outgoing = new Map();
  for (const edge of graph.edges) {
    if (!outgoing.has(edge.from)) outgoing.set(edge.from, []);
    outgoing.get(edge.from).push(edge);
  }
  for (const node of startNodes) distance.set(node.id, node.startWeight);
  return { distance, previous, targets, nodeById, outgoing };
}

function resultForTargets(distance, previous, targetNodes) {
  let targetId = null;
  let score = Infinity;
  for (const node of targetNodes) {
    const value = distance.has(node.id) ? distance.get(node.id) : Infinity;
    if (value < score) { score = value; targetId = node.id; }
  }
  return { targetId, score, previous };
}

export function dijkstraShortestPath(graph, startNodes, targetNodes) {
  const { distance, previous, outgoing } = prepareSearch(graph, startNodes, targetNodes);
  const unvisited = new Set(graph.nodes.map(node => node.id));
  const work = { nodeChecks: 0, edgeChecks: 0, processedNodes: 0 };

  while (unvisited.size > 0) {
    let currentId = null;
    let smallest = Infinity;
    for (const id of unvisited) {
      work.nodeChecks += 1;
      const value = distance.has(id) ? distance.get(id) : Infinity;
      if (value < smallest) { smallest = value; currentId = id; }
    }
    if (currentId === null || !Number.isFinite(smallest)) break;
    unvisited.delete(currentId);
    work.processedNodes += 1;
    for (const edge of outgoing.get(currentId) || []) {
      work.edgeChecks += 1;
      if (!unvisited.has(edge.to)) continue;
      const candidate = smallest + edge.weight;
      if (candidate + EPSILON < (distance.has(edge.to) ? distance.get(edge.to) : Infinity)) {
        distance.set(edge.to, candidate);
        previous.set(edge.to, { id: currentId, edge });
      }
    }
  }
  return { ...resultForTargets(distance, previous, targetNodes), work };
}

export function dagShortestPath(graph, startNodes, targetNodes) {
  const { distance, previous, outgoing } = prepareSearch(graph, startNodes, targetNodes);
  const work = { nodeChecks: 0, edgeChecks: 0, processedNodes: 0 };

  // buildGraph stores nodes in stage order, which is a topological order
  // because this application connects only forward between adjacent stages.
  for (const node of graph.nodes) {
    work.nodeChecks += 1;
    const sourceScore = distance.get(node.id);
    if (!Number.isFinite(sourceScore)) continue;
    work.processedNodes += 1;
    for (const edge of outgoing.get(node.id) || []) {
      work.edgeChecks += 1;
      const candidate = sourceScore + edge.weight;
      if (candidate + EPSILON < (distance.has(edge.to) ? distance.get(edge.to) : Infinity)) {
        distance.set(edge.to, candidate);
        previous.set(edge.to, { id: node.id, edge });
      }
    }
  }
  return { ...resultForTargets(distance, previous, targetNodes), work };
}
