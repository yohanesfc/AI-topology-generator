// app/api/traffic-telemetry/route.ts
import { NextRequest, NextResponse } from 'next/server';

const PROM_API = 'https://prom.yohanesfc.web.id/api/v1/query';

// Query Prometheus and return raw result array
async function queryProm(query: string): Promise<any[]> {
  try {
    const res = await fetch(`${PROM_API}?query=${encodeURIComponent(query)}`, {
      cache: 'no-store',
    });
    const data = await res.json();
    if (data.status === 'success') return data.data.result;
  } catch (e) {
    console.error('Prometheus query failed:', e);
  }
  return [];
}

const formatSpeed = (bps: number): string => {
  if (bps >= 1_000_000_000) return `${(bps / 1_000_000_000).toFixed(1)}G`;
  if (bps >= 1_000_000)     return `${(bps / 1_000_000).toFixed(1)}M`;
  if (bps >= 1_000)         return `${(bps / 1_000).toFixed(1)}K`;
  return `${bps.toFixed(0)}bps`;
};

export async function GET(_req: NextRequest) {
  // Query real interface rates (bits per second) from Node Exporter sidecars
  // Keys: <router>/<device>  e.g. "r1/eth0", "r1/eth1"
  const [rxResults, txResults] = await Promise.all([
    queryProm('rate(node_network_receive_bytes_total{device!="lo"}[30s]) * 8'),
    queryProm('rate(node_network_transmit_bytes_total{device!="lo"}[30s]) * 8'),
  ]);

  type Stats = { up: string; down: string };

  // Keyed by "router/device" and also by "router" (aggregate per router)
  const trafficData: Record<string, Stats> = {};

  const rxMap = new Map<string, number>();
  const txMap = new Map<string, number>();

  for (const m of rxResults) {
    const router = m.metric.router || '';
    const device = m.metric.device || '';
    const bps = parseFloat(m.value[1]);
    rxMap.set(`${router}/${device}`, bps);
    // Store by loopback IP as well (used when topology IP = router loopback)
    const loopback = m.metric.loopback || '';
    if (loopback) rxMap.set(`${loopback}/${device}`, bps);
  }

  for (const m of txResults) {
    const router = m.metric.router || '';
    const device = m.metric.device || '';
    const bps = parseFloat(m.value[1]);
    txMap.set(`${router}/${device}`, bps);
    const loopback = m.metric.loopback || '';
    if (loopback) txMap.set(`${loopback}/${device}`, bps);
  }

  // Build per-interface and per-router aggregates
  const allKeys = new Set([...rxMap.keys(), ...txMap.keys()]);
  for (const key of allKeys) {
    const rx = rxMap.get(key) ?? 0;
    const tx = txMap.get(key) ?? 0;
    trafficData[key] = { down: formatSpeed(rx), up: formatSpeed(tx) };
  }

  // Also build per-router totals (sum all interfaces for that router)
  // Useful when topology links don't have explicit interface names
  const routerRx = new Map<string, number>();
  const routerTx = new Map<string, number>();

  for (const m of rxResults) {
    const router = m.metric.router || '';
    const bps = parseFloat(m.value[1]);
    routerRx.set(router, (routerRx.get(router) ?? 0) + bps);
  }
  for (const m of txResults) {
    const router = m.metric.router || '';
    const bps = parseFloat(m.value[1]);
    routerTx.set(router, (routerTx.get(router) ?? 0) + bps);
  }
  for (const router of new Set([...routerRx.keys(), ...routerTx.keys()])) {
    trafficData[router] = {
      down: formatSpeed(routerRx.get(router) ?? 0),
      up:   formatSpeed(routerTx.get(router) ?? 0),
    };
  }

  return NextResponse.json({ trafficData });
}
