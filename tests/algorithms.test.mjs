import test from 'node:test';
import assert from 'node:assert/strict';

function assertValidPath(graph, result, scenario) {
  assert.equal(result.ok, true);
  assert.ok(result.path.length > 0);
  assert.equal(result.path[0].stageIndex, 0);
  assert.equal(result.path.at(-1).stageIndex, scenario.stages.length - 1);
  assert.equal(result.path.length, scenario.stages.length);
  for (let i = 0; i < result.pathEdges.length; i++) {
    const edge = result.pathEdges[i];
    assert.ok(graph.edges.some(candidate => candidate.id === edge.id));
    assert.equal(edge.from, result.path[i].id);
    assert.equal(edge.to, result.path[i + 1].id);
  }
}

test('model exposes a comparison API for both shortest-path methods', async () => {
  const model = await import('../src/model.js');
  assert.equal(typeof model.compareScenarioAlgorithms, 'function');
});

test('scenario optimization identifies the requested algorithm', async () => {
  const [{ optimizeScenario }, { createSampleScenario }] = await Promise.all([
    import('../src/model.js'), import('../src/sample.js')
  ]);
  const result = optimizeScenario(createSampleScenario(), undefined, 'dag-dp');
  assert.equal(result.algorithm, 'dag-dp');
});

test('scenario algorithm setting is used when no method argument is supplied', async () => {
  const [{ optimizeScenario }, { createSampleScenario }] = await Promise.all([
    import('../src/model.js'), import('../src/sample.js')
  ]);
  const scenario = createSampleScenario();
  scenario.settings.algorithm = 'dag-dp';
  assert.equal(optimizeScenario(scenario).algorithm, 'dag-dp');
});

test('both methods find equal-scoring valid routes on the same graph', async () => {
  const [{ compareScenarioAlgorithms }, { createSampleScenario }] = await Promise.all([
    import('../src/model.js'), import('../src/sample.js')
  ]);
  const scenario = createSampleScenario();
  const comparison = compareScenarioAlgorithms(scenario);
  assert.equal(comparison.ok, true);
  assert.equal(comparison.results.dijkstra.selectionScore, comparison.results.dagDp.selectionScore);
  assert.equal(comparison.results.dijkstra.totalCost, comparison.results.dagDp.totalCost);
  assertValidPath(comparison.graph, comparison.results.dijkstra, scenario);
  assertValidPath(comparison.graph, comparison.results.dagDp, scenario);
  assert.equal(comparison.results.dijkstra.graph, comparison.graph);
  assert.equal(comparison.results.dagDp.graph, comparison.graph);
  assert.equal(comparison.results.dijkstra.work.edgeChecks, comparison.results.dagDp.work.edgeChecks);
});

test('both methods agree when the experimental CER score is selected', async () => {
  const [{ compareScenarioAlgorithms }, { createSampleScenario }] = await Promise.all([
    import('../src/model.js'), import('../src/sample.js')
  ]);
  const scenario = createSampleScenario();
  scenario.settings.objective = 'paper';
  const comparison = compareScenarioAlgorithms(scenario);
  assert.equal(comparison.ok, true);
  assert.equal(comparison.results.dijkstra.objective, 'paper');
  assert.equal(comparison.results.dijkstra.selectionScore, comparison.results.dagDp.selectionScore);
  assert.equal(comparison.results.dijkstra.totalCost, comparison.results.dagDp.totalCost);
});

test('both methods report no route when a stage has no feasible candidates', async () => {
  const [{ compareScenarioAlgorithms }, { createSampleScenario }] = await Promise.all([
    import('../src/model.js'), import('../src/sample.js')
  ]);
  const scenario = createSampleScenario();
  scenario.stages[1].options = [];
  const comparison = compareScenarioAlgorithms(scenario);
  assert.equal(comparison.ok, false);
  assert.equal(comparison.results.dijkstra.ok, false);
  assert.equal(comparison.results.dagDp.ok, false);
  assert.equal(comparison.results.dijkstra.reason, comparison.results.dagDp.reason);
});

test('both methods report no route when QoS filters every resource in a stage', async () => {
  const [{ compareScenarioAlgorithms }, { createSampleScenario }] = await Promise.all([
    import('../src/model.js'), import('../src/sample.js')
  ]);
  const scenario = createSampleScenario();
  scenario.settings.maxStageLatencyMs = 1;
  const comparison = compareScenarioAlgorithms(scenario);
  assert.equal(comparison.ok, false);
  assert.equal(comparison.results.dijkstra.reason, comparison.results.dagDp.reason);
  assert.match(comparison.reason, /No resource in stage 1/);
});

test('validation rejects unsupported algorithm names when present', async () => {
  const [{ validateScenario }, { createSampleScenario }] = await Promise.all([
    import('../src/model.js'), import('../src/sample.js')
  ]);
  const scenario = createSampleScenario();
  scenario.settings.algorithm = 'magic';
  assert.equal(validateScenario(scenario).ok, false);
});
