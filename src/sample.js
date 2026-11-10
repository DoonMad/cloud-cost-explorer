export function createSampleScenario() {
  return {
    version: 1,
    name: "Three-stage analytics pipeline",
    currency: "INR",
    settings: {
      objective: "cost",
      maxStageLatencyMs: 500,
      minAvailabilityPct: 99,
      minDurabilityPct: 99,
      maxTransferLatencyMs: 200,
      cer: { normalization: 10, latencyScaleMs: 1000, weights: { latency: 50, availability: 25, durability: 25 } }
    },
    stages: [
      {
        id: "stage-ingest", name: "Ingest and prepare", type: "compute", flowToNextGB: 60, transferLatencyMs: 75,
        options: [
          { id: "ingest-north", provider: "Provider North", region: "Mumbai", name: "General VM", spec: "2 vCPU · 4 GB RAM", pricePerMonth: 2200, latencyMs: 180, availabilityPct: 99.9, durabilityPct: 99.9, egressPerGB: 0.70, ingressPerGB: 0 },
          { id: "ingest-south", provider: "Provider South", region: "Chennai", name: "Container worker", spec: "2 vCPU · 4 GB RAM", pricePerMonth: 1900, latencyMs: 250, availabilityPct: 99.5, durabilityPct: 99.5, egressPerGB: 0.45, ingressPerGB: 0 }
        ]
      },
      {
        id: "stage-store", name: "Store transformed data", type: "storage", flowToNextGB: 30, transferLatencyMs: 65,
        options: [
          { id: "storage-north", provider: "Provider North", region: "Mumbai", name: "Standard object store", spec: "500 GB", pricePerMonth: 1600, latencyMs: 90, availabilityPct: 99.9, durabilityPct: 99.99, egressPerGB: 0.55, ingressPerGB: 0 },
          { id: "storage-south", provider: "Provider South", region: "Hyderabad", name: "Object storage", spec: "500 GB", pricePerMonth: 1250, latencyMs: 130, availabilityPct: 99.5, durabilityPct: 99.9, egressPerGB: 0.40, ingressPerGB: 0 }
        ]
      },
      {
        id: "stage-analyze", name: "Run analytics", type: "compute", flowToNextGB: 0, transferLatencyMs: 0,
        options: [
          { id: "analytics-north", provider: "Provider North", region: "Bengaluru", name: "Compute VM", spec: "4 vCPU · 8 GB RAM", pricePerMonth: 2500, latencyMs: 120, availabilityPct: 99.9, durabilityPct: 99.9, egressPerGB: 0.55, ingressPerGB: 0 },
          { id: "analytics-south", provider: "Provider South", region: "Mumbai", name: "Compute worker", spec: "4 vCPU · 8 GB RAM", pricePerMonth: 2100, latencyMs: 240, availabilityPct: 99.7, durabilityPct: 99.5, egressPerGB: 0.45, ingressPerGB: 0 }
        ]
      }
    ]
  };
}

export function createPaperEtlScenario() {
  return {
    version: 1,
    name: "Paper-inspired ETL: illustrative prices",
    currency: "USD",
    settings: {
      objective: "cost",
      algorithm: "dijkstra",
      maxStageLatencyMs: 500,
      minAvailabilityPct: 99,
      minDurabilityPct: 99,
      maxTransferLatencyMs: 200,
      cer: { normalization: 10, latencyScaleMs: 1000, weights: { latency: 50, availability: 25, durability: 25 } }
    },
    stages: [
      {
        id: "paper-etl-compute-east", name: "Transform data", type: "compute", flowToNextGB: 80, transferLatencyMs: 75,
        options: [
          { id: "paper-central-standard", provider: "Illustrative cloud", region: "US Central", name: "General-purpose VM", spec: "2 vCPU · 8 GB RAM", pricePerMonth: 72, latencyMs: 160, availabilityPct: 99.9, durabilityPct: 99.9, egressPerGB: 0.08, ingressPerGB: 0 },
          { id: "paper-central-fast", provider: "Illustrative cloud", region: "US Central", name: "Compute-optimized VM", spec: "4 vCPU · 16 GB RAM", pricePerMonth: 118, latencyMs: 105, availabilityPct: 99.95, durabilityPct: 99.9, egressPerGB: 0.08, ingressPerGB: 0 }
        ]
      },
      {
        id: "paper-etl-storage", name: "Store transformed data", type: "storage", flowToNextGB: 30, transferLatencyMs: 65,
        options: [
          { id: "paper-east-standard", provider: "Illustrative cloud", region: "US East", name: "Standard object storage", spec: "500 GB", pricePerMonth: 46, latencyMs: 35, availabilityPct: 99.9, durabilityPct: 99.99, egressPerGB: 0.09, ingressPerGB: 0 },
          { id: "paper-east-nearline", provider: "Illustrative cloud", region: "US East", name: "Nearline object storage", spec: "500 GB", pricePerMonth: 27, latencyMs: 115, availabilityPct: 99.5, durabilityPct: 99.99, egressPerGB: 0.12, ingressPerGB: 0 }
        ]
      },
      {
        id: "paper-etl-compute-west", name: "Analyze data", type: "compute", flowToNextGB: 0, transferLatencyMs: 0,
        options: [
          { id: "paper-west-standard", provider: "Illustrative cloud", region: "US West", name: "General-purpose VM", spec: "4 vCPU · 16 GB RAM", pricePerMonth: 142, latencyMs: 175, availabilityPct: 99.9, durabilityPct: 99.9, egressPerGB: 0.08, ingressPerGB: 0 },
          { id: "paper-west-fast", provider: "Illustrative cloud", region: "US West", name: "Compute-optimized VM", spec: "8 vCPU · 32 GB RAM", pricePerMonth: 216, latencyMs: 115, availabilityPct: 99.95, durabilityPct: 99.9, egressPerGB: 0.08, ingressPerGB: 0 }
        ]
      }
    ]
  };
}

export function createRegionalScaleScenario() {
  const stages = [
    ["Receive raw events", "compute", 160],
    ["Validate event schema", "compute", 148],
    ["Deduplicate events", "compute", 132],
    ["Archive raw records", "storage", 118],
    ["Normalize records", "compute", 104],
    ["Enrich location data", "compute", 91],
    ["Join reference tables", "compute", 78],
    ["Write curated data lake", "storage", 66],
    ["Build hourly aggregates", "compute", 54],
    ["Detect anomalous activity", "compute", 43],
    ["Calculate customer metrics", "compute", 32],
    ["Persist analytical results", "storage", 23],
    ["Refresh dashboard cache", "compute", 15],
    ["Serve analytics queries", "compute", 26]
  ];
  const candidates = [
    { provider: "Cloud Alpha", region: "Mumbai", factor: 1.08, network: 0.075, latency: 42 },
    { provider: "Cloud Alpha", region: "Frankfurt", factor: 0.94, network: 0.095, latency: 118 },
    { provider: "Cloud Beta", region: "Singapore", factor: 0.89, network: 0.068, latency: 78 },
    { provider: "Cloud Beta", region: "Virginia", factor: 1.02, network: 0.082, latency: 155 },
    { provider: "Cloud Gamma", region: "Hyderabad", factor: 0.83, network: 0.058, latency: 55 },
    { provider: "Cloud Delta", region: "Tokyo", factor: 1.13, network: 0.105, latency: 96 }
  ];
  const resourceFactor = { compute: 1, storage: 0.72 };
  const optionsFor = (stageIndex, type, basePrice) => candidates.map((candidate, candidateIndex) => {
    const id = "regional-s" + String(stageIndex + 1).padStart(2, "0") + "-c" + String(candidateIndex + 1);
    const premium = 1 + ((stageIndex * 7 + candidateIndex * 3) % 9) / 100;
    // Give each stage a different illustrative regional price advantage. This
    // makes the cheapest end-to-end route move between regions instead of
    // selecting the same globally cheapest region at every stage.
    const workloadFit = candidateIndex === (stageIndex + 4) % candidates.length ? 0.58 : 1;
    return {
      id,
      provider: candidate.provider,
      region: candidate.region,
      name: type === "storage" ? "Object storage" : "General compute",
      spec: type === "storage" ? "Illustrative capacity tier" : "Illustrative 4 vCPU · 16 GB",
      pricePerMonth: Math.round(basePrice * resourceFactor[type] * candidate.factor * premium * workloadFit * 100) / 100,
      latencyMs: candidate.latency + ((stageIndex + candidateIndex) % 4) * 7,
      availabilityPct: 99.5 + ((candidateIndex + stageIndex) % 5) * 0.1,
      durabilityPct: type === "storage" ? 99.9 + (candidateIndex % 2) * 0.09 : 99.5 + (candidateIndex % 4) * 0.1,
      egressPerGB: candidate.network,
      ingressPerGB: 0
    };
  });

  return {
    version: 1,
    name: "Regional analytics workflow · 14 stages · illustrative prices",
    currency: "USD",
    settings: {
      objective: "cost", algorithm: "dijkstra", maxStageLatencyMs: 500,
      minAvailabilityPct: 99, minDurabilityPct: 99, maxTransferLatencyMs: 200,
      cer: { normalization: 10, latencyScaleMs: 1000, weights: { latency: 50, availability: 25, durability: 25 } }
    },
    stages: stages.map(([name, type, basePrice], stageIndex) => ({
      id: "regional-stage-" + String(stageIndex + 1).padStart(2, "0"),
      name,
      type,
      flowToNextGB: stageIndex === stages.length - 1 ? 0 : Math.max(12, 160 - stageIndex * 10),
      transferLatencyMs: stageIndex === stages.length - 1 ? 0 : 55 + (stageIndex % 4) * 14,
      options: optionsFor(stageIndex, type, basePrice)
    }))
  };
}
