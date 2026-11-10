import test from 'node:test';
import assert from 'node:assert/strict';

test("paper-inspired ETL example follows the paper's three-stage regional flow", async () => {
  const { createPaperEtlScenario } = await import('../src/sample.js');
  assert.equal(typeof createPaperEtlScenario, 'function');
  const scenario = createPaperEtlScenario();
  assert.deepEqual(scenario.stages.map(stage => stage.type), ['compute', 'storage', 'compute']);
  assert.deepEqual(scenario.stages.map(stage => stage.options[0].region), ['US Central', 'US East', 'US West']);
  assert.ok(scenario.stages.every(stage => stage.options.length > 0));
  assert.ok(scenario.stages.flatMap(stage => stage.options).every(option => Number(option.pricePerMonth) >= 0));
});

test('older scenarios without an algorithm remain valid and default to Dijkstra', async () => {
  const [{ optimizeScenario, validateScenario }, { createSampleScenario }] = await Promise.all([
    import('../src/model.js'), import('../src/sample.js')
  ]);
  const scenario = createSampleScenario();
  delete scenario.settings.algorithm;
  assert.equal(validateScenario(scenario).ok, true);
  assert.equal(optimizeScenario(scenario).algorithm, 'dijkstra');
});

test('Dijkstra and DAG DP agree on the paper-inspired ETL preset', async () => {
  const [{ compareScenarioAlgorithms }, { createPaperEtlScenario }] = await Promise.all([
    import('../src/model.js'), import('../src/sample.js')
  ]);
  const comparison = compareScenarioAlgorithms(createPaperEtlScenario());
  assert.equal(comparison.ok, true);
  assert.equal(comparison.results.dijkstra.selectionScore, comparison.results.dagDp.selectionScore);
});

test('large regional example has priced alternatives and compares both methods on the full graph', async () => {
  const [{ compareScenarioAlgorithms, validateScenario }, { createRegionalScaleScenario }] = await Promise.all([
    import('../src/model.js'), import('../src/sample.js')
  ]);
  const scenario = createRegionalScaleScenario();
  const options = scenario.stages.flatMap(stage => stage.options);

  assert.equal(scenario.stages.length, 14);
  assert.ok(scenario.stages.every(stage => stage.options.length === 6));
  assert.equal(validateScenario(scenario).ok, true);
  assert.ok(options.every(option => option.pricePerMonth > 0), 'every candidate resource should have a positive illustrative monthly cost');

  const comparison = compareScenarioAlgorithms(scenario);
  assert.equal(comparison.ok, true);
  assert.equal(comparison.graphStats.nodes, 84);
  assert.equal(comparison.graphStats.edges, 468);
  assert.equal(comparison.results.dijkstra.selectionScore, comparison.results.dagDp.selectionScore);
  assert.deepEqual(comparison.results.dijkstra.work, { nodeChecks: 3570, edgeChecks: 468, processedNodes: 84 });
  assert.deepEqual(comparison.results.dagDp.work, { nodeChecks: 84, edgeChecks: 468, processedNodes: 84 });
  const selectedRegions = new Set(comparison.results.dagDp.path.map(node => node.option.region));
  assert.ok(selectedRegions.size >= 4, 'the illustrative optimum should demonstrate region changes across stages');
});
