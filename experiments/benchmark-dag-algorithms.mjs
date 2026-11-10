import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';

// Reproducible algorithm-only benchmark. Edges and node weights are created
// before timing; all algorithms solve the same multi-source to final-stage task.
const seed0 = 20251109;
let seed = seed0;
function rand() { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32; }

function layered(width, stageCount = 6) {
  const n = width * stageCount;
  const nodeCost = Float64Array.from({ length: n }, () => 1 + rand() * 100);
  const starts = Array.from({ length: width }, (_, i) => i);
  const targets = Array.from({ length: width }, (_, i) => (stageCount - 1) * width + i);
  const out = Array.from({ length: n }, () => []);
  for (let s = 0; s < stageCount - 1; s++) {
    for (let i = 0; i < width; i++) {
      const u = s * width + i;
      for (let j = 0; j < width; j++) {
        const v = (s + 1) * width + j;
        // Mirrors app semantics: destination resource cost plus transfer cost.
        out[u].push([v, nodeCost[v] + rand() * 8]);
      }
    }
  }
  return { n, width, stageCount, nodeCost, starts, targets, out, type: 'complete layered' };
}

function sparseDag(n, degree = 5) {
  const nodeCost = Float64Array.from({ length: n }, () => 1 + rand() * 100);
  const out = Array.from({ length: n }, () => []);
  for (let u = 0; u < n - 1; u++) {
    const used = new Set();
    used.add(u + 1);
    const available = n - u - 1;
    while (used.size < Math.min(degree, available)) used.add(u + 1 + Math.floor(rand() * available));
    for (const v of used) out[u].push([v, nodeCost[v] + rand() * 8]);
  }
  return { n, width: null, stageCount: null, nodeCost, starts: [0], targets: [n - 1], out, type: `sparse DAG (outdegree ~${degree})` };
}

function scanDijkstra(g, stopAtTarget) {
  const d = new Float64Array(g.n); d.fill(Infinity);
  const prev = new Int32Array(g.n); prev.fill(-1);
  const seen = new Uint8Array(g.n), target = new Uint8Array(g.n);
  for (const t of g.targets) target[t] = 1;
  for (const s of g.starts) d[s] = g.nodeCost[s];
  for (let round = 0; round < g.n; round++) {
    let u = -1, best = Infinity;
    for (let v = 0; v < g.n; v++) if (!seen[v] && d[v] < best) { best = d[v]; u = v; }
    if (u < 0) break;
    seen[u] = 1;
    if (stopAtTarget && target[u]) break;
    for (const [v, w] of g.out[u]) if (!seen[v] && best + w < d[v]) { d[v] = best + w; prev[v] = u; }
  }
  let best = Infinity, end = -1;
  for (const t of g.targets) if (d[t] < best) { best = d[t]; end = t; }
  return { cost: best, end, prev };
}

function dagDp(g) {
  const d = new Float64Array(g.n); d.fill(Infinity);
  const prev = new Int32Array(g.n); prev.fill(-1);
  for (const s of g.starts) d[s] = g.nodeCost[s];
  // All generated graphs are in topological vertex order.
  for (let u = 0; u < g.n; u++) if (Number.isFinite(d[u]))
    for (const [v, w] of g.out[u]) if (d[u] + w < d[v]) { d[v] = d[u] + w; prev[v] = u; }
  let best = Infinity, end = -1;
  for (const t of g.targets) if (d[t] < best) { best = d[t]; end = t; }
  return { cost: best, end, prev };
}

class MinHeap {
  a = [];
  push(item) { let i = this.a.length; this.a.push(item); while (i) { const p = (i - 1) >> 1; if (this.a[p][0] <= item[0]) break; this.a[i] = this.a[p]; i = p; } this.a[i] = item; }
  pop() { const root = this.a[0], last = this.a.pop(); if (this.a.length) { let i = 0; while (true) { let c = i * 2 + 1; if (c >= this.a.length) break; if (c + 1 < this.a.length && this.a[c + 1][0] < this.a[c][0]) c++; if (this.a[c][0] >= last[0]) break; this.a[i] = this.a[c]; i = c; } this.a[i] = last; } return root; }
  get size() { return this.a.length; }
}

function heapDijkstra(g) {
  const d = new Float64Array(g.n); d.fill(Infinity);
  const prev = new Int32Array(g.n); prev.fill(-1);
  const target = new Uint8Array(g.n); for (const t of g.targets) target[t] = 1;
  const heap = new MinHeap();
  for (const s of g.starts) { d[s] = g.nodeCost[s]; heap.push([d[s], s]); }
  let finalCost = Infinity, end = -1;
  while (heap.size) {
    const [du, u] = heap.pop(); if (du !== d[u]) continue;
    if (target[u]) { finalCost = du; end = u; break; }
    for (const [v, w] of g.out[u]) if (du + w < d[v]) { d[v] = du + w; prev[v] = u; heap.push([d[v], v]); }
  }
  return { cost: finalCost, end, prev };
}

function path(result) { const p = []; for (let u = result.end; u >= 0; u = result.prev[u]) p.push(u); return p.reverse(); }
function verifyPath(g, result) {
  const p = path(result);
  if (!g.starts.includes(p[0]) || !g.targets.includes(p.at(-1))) throw new Error('Path endpoints are invalid.');
  let score = g.nodeCost[p[0]];
  for (let i = 1; i < p.length; i++) {
    const edge = g.out[p[i - 1]].find(([v]) => v === p[i]);
    if (!edge) throw new Error('Returned path contains a nonexistent edge.');
    score += edge[1];
  }
  if (Math.abs(score - result.cost) > 1e-8) throw new Error('Returned path score does not match reported cost.');
  return p;
}
function median(xs) { return [...xs].sort((a,b) => a-b)[Math.floor(xs.length / 2)]; }
function measure(fn, repeats) {
  fn();
  const times = [];
  let result;
  for (let i = 0; i < repeats; i++) { const t = performance.now(); result = fn(); times.push(performance.now() - t); }
  return { ms: median(times), result };
}

const cases = [];
for (const width of [20, 50, 100, 200, 350]) cases.push(layered(width, 6));
for (const n of [1000, 3000, 6000]) cases.push(sparseDag(n, 5));
const rows = [];
for (const g of cases) {
  const edges = g.out.reduce((a, x) => a + x.length, 0);
  const reps = g.n >= 6000 ? 9 : 15;
  const methods = [
    ['Dijkstra scan (all vertices)', () => scanDijkstra(g, false)],
    ['Dijkstra scan (stop at goal)', () => scanDijkstra(g, true)],
    ['Dijkstra binary heap', () => heapDijkstra(g)],
    ['DAG dynamic programming', () => dagDp(g)]
  ];
  const measured = {};
  for (const [name, fn] of methods) measured[name] = measure(fn, reps);
  const expected = measured['DAG dynamic programming'].result;
  for (const [name, m] of Object.entries(measured)) {
    if (Math.abs(m.result.cost - expected.cost) > 1e-8) throw new Error(`Cost mismatch in ${g.type} V=${g.n}: ${name}=${m.result.cost}, DP=${expected.cost}`);
    const p = verifyPath(g, m.result);
    if (p.length !== verifyPath(g, expected).length) throw new Error(`Path length mismatch for ${name}`);
  }
  rows.push({ type: g.type, stages: g.stageCount ?? 'topological vertices', width: g.width ?? '—', V: g.n, E: edges,
    ...Object.fromEntries(Object.entries(measured).map(([k,v]) => [k, Number(v.ms.toFixed(3))])),
    minimumCost: Number(expected.cost.toFixed(6)), pathLength: path(expected).length, repeats: reps });
  console.log(`${g.type.padEnd(30)} V=${String(g.n).padStart(5)} E=${String(edges).padStart(8)} DP=${measured['DAG dynamic programming'].ms.toFixed(3)}ms scan=${measured['Dijkstra scan (all vertices)'].ms.toFixed(3)}ms heap=${measured['Dijkstra binary heap'].ms.toFixed(3)}ms`);
}

const esc = v => `"${String(v).replaceAll('"','""')}"`;
const columns = Object.keys(rows[0]);
const csv = [columns.join(','), ...rows.map(r => columns.map(c => esc(r[c])).join(','))].join('\n') + '\n';
writeFileSync(new URL('./benchmark-results.csv', import.meta.url), csv);
const md = `# DAG shortest-path algorithm benchmark\n\nGenerated by \`benchmark-dag-algorithms.mjs\` on Node ${process.version}; seed ${seed0}. This is an algorithm-only experiment: graph construction is excluded from timings. Every method receives the same graph, starts, targets, node costs, and nonnegative edge weights. Each number is the median of ${rows[0].repeats} runs (larger cases use fewer repeats); one untimed warm-up is performed. All methods returned the same minimum cost and path length.\n\nThe layered cases are six-stage, complete bipartite transitions between resource choices, analogous to the app's pipeline model. Sparse cases are topologically ordered DAGs with about five outgoing edges per nonterminal vertex. The sparse cases have one start/goal; layered cases have all first/last-stage candidates as simultaneous starts/goals.\n\n${rows[0] ? `| Graph | V | E | Scan, all vertices (ms) | Scan, stop at goal (ms) | Heap Dijkstra (ms) | DAG DP (ms) | Cost |\n|---|---:|---:|---:|---:|---:|---:|---:|\n${rows.map(r=>`| ${r.type}${r.width !== '—' ? `, width ${r.width}` : ''} | ${r.V} | ${r.E} | ${r['Dijkstra scan (all vertices)']} | ${r['Dijkstra scan (stop at goal)']} | ${r['Dijkstra binary heap']} | ${r['DAG dynamic programming']} | ${r.minimumCost} |`).join('\n')}` : ''}\n\n## Interpretation limits\n\nThese synthetic graphs establish behavior for this benchmark, not production performance or a universal winner. The paper's stated \(O(V^2)\) scan is the most direct comparison; heap Dijkstra is a stronger implementation baseline. DAG DP is \(O(V+E)\), and in this topologically ordered data it has no priority-queue/selection overhead. On very small graphs, constant factors and implementation details may dominate. The graph model assumes known, additive, nonnegative costs and a valid DAG; richer constraints (shared capacities, concurrent tasks, nonlinear pricing, deadlines) may require a different optimization model.\n`;
writeFileSync(new URL('./benchmark-results.md', import.meta.url), md);
console.log('Saved experiments/benchmark-results.csv and experiments/benchmark-results.md');
