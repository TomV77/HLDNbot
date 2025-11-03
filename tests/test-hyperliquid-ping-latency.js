import HyperliquidConnector from '../connectors/hyperliquid.js';
import { getExchangeConfig } from '../utils/config.js';

const toInt = (v, d) => {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : d;
};

const hlCfg = getExchangeConfig('hyperliquid') || {};
const PING_MS = typeof hlCfg.pingInterval === 'number' ? hlCfg.pingInterval : 30000;
const PONG_TIMEOUT_MS = typeof hlCfg.pongTimeout === 'number' ? hlCfg.pongTimeout : 10000;
const TEST_RUN_DURATION_MS = toInt(process.env.TEST_RUN_DURATION_MS, 60000); // default 60s
const MAX_SAMPLES = toInt(process.env.MAX_SAMPLES, Math.ceil(TEST_RUN_DURATION_MS / PING_MS) + 1);

function fmtTs(ts) {
  return new Date(ts).toISOString();
}

async function run() {
  const hl = new HyperliquidConnector({
    pingInterval: PING_MS,
    pongTimeout: PONG_TIMEOUT_MS
  });

  console.log(`[PingTest][HL] pingInterval=${PING_MS}ms, pongTimeout=${PONG_TIMEOUT_MS}ms, maxSamples=${MAX_SAMPLES}`);

  await hl.connect();

  if (!hl.ws) {
    throw new Error('WebSocket not initialized');
  }

  // Intercept native ws.ping() calls to timestamp pings
  const state = { lastPingTs: null, seq: 0 };
  const originalPing = hl.ws.ping.bind(hl.ws);
  hl.ws.ping = (...args) => {
    state.lastPingTs = Date.now();
    state.seq += 1;
    return originalPing(...args);
  };

  // Collect samples when ws emits native 'pong'
  const samples = [];
  const onPong = () => {
    const pongTs = Date.now();
    const pingTs = state.lastPingTs;
    if (pingTs) {
      const latency = pongTs - pingTs;
      samples.push({ idx: samples.length + 1, pingTs, pongTs, latency });
      console.log(`[PingTest][HL] #${samples.length} ping ${fmtTs(pingTs)} -> pong ${fmtTs(pongTs)} = ${latency} ms`);
    }
  };
  hl.ws.on('pong', onPong);

  // Run for duration or until enough samples captured
  const endAt = Date.now() + TEST_RUN_DURATION_MS;
  while (Date.now() < endAt && samples.length < MAX_SAMPLES) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise(r => setTimeout(r, 100));
  }

  try { hl.ws.off('pong', onPong); } catch {}
  hl.disconnect();

  if (samples.length === 0) {
    console.log('[PingTest][HL] No pong samples collected');
    process.exit(1);
  }

  const latencies = samples.map(s => s.latency);
  const sum = latencies.reduce((a, b) => a + b, 0);
  const avg = sum / latencies.length;
  const min = Math.min(...latencies);
  const max = Math.max(...latencies);
  const std = Math.sqrt(latencies.map(x => (x - avg) ** 2).reduce((a, b) => a + b, 0) / latencies.length);

  console.log('\n[HL] Ping latency summary (ms):');
  console.log(`  Samples: ${samples.length}`);
  console.log(`  Avg:     ${avg.toFixed(2)}`);
  console.log(`  Min:     ${min}`);
  console.log(`  Max:     ${max}`);
  console.log(`  StdDev:  ${std.toFixed(2)}`);

  // Aligned table
  const header = ['#', 'Ping Sent', 'Pong Recv', 'Latency (ms)'];
  const rows = samples.map(s => [String(s.idx), fmtTs(s.pingTs), fmtTs(s.pongTs), String(s.latency)]);
  const table = [header, ...rows];
  const widths = Array.from({ length: header.length }, (_, i) => Math.max(...table.map(r => r[i].length)));
  const pad = (t, w, left) => (left ? t.padEnd(w, ' ') : t.padStart(w, ' '));
  const render = (r) => '  ' + r.map((c, i) => pad(c, widths[i], i < 3)).join(' | ');
  const sep = '  ' + widths.map(w => '-'.repeat(w)).join('-+-');

  console.log('\n[HL] Samples:');
  console.log(render(header));
  console.log(sep);
  rows.forEach(r => console.log(render(r)));
}

run().catch(err => {
  console.error('Hyperliquid ping latency test failed:', err.message);
  process.exit(1);
});
