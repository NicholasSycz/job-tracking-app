/**
 * Load test runner using autocannon.
 * Run against a live server: npm run perf
 *
 * Required env vars (or set in .env.perf):
 *   SERVER_URL  — defaults to http://localhost:4000
 *   AUTH_TOKEN  — JWT token for an existing user (optional: will signup/login if not set)
 *   TENANT_ID   — tenant UUID (optional: derived from AUTH_TOKEN signup if not set)
 */
import autocannon from "autocannon";
import http from "http";

const SERVER_URL = process.env.SERVER_URL || "http://localhost:4000";
const DURATION_SECONDS = 15;
const P99_THRESHOLD_MS = 1000;

// Seed a test user and return credentials
async function seedCredentials(): Promise<{ token: string; tenantId: string }> {
  const email = `perf-${Date.now()}@example.com`;
  const body = JSON.stringify({ email, password: "password123", name: "Perf User" });

  return new Promise((resolve, reject) => {
    const url = new URL(`${SERVER_URL}/auth/signup`);
    const req = http.request(
      { hostname: url.hostname, port: url.port || 4000, path: url.pathname, method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          const parsed = JSON.parse(data);
          if (!parsed.token) return reject(new Error(`Signup failed: ${data}`));
          resolve({ token: parsed.token, tenantId: parsed.tenantId });
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function seedApplications(token: string, tenantId: string, count: number) {
  const apps = Array.from({ length: count }, (_, i) => ({
    company: `Perf Co ${i}`, role: "Engineer", status: "APPLIED",
  }));
  const body = JSON.stringify({ applications: apps });

  return new Promise<void>((resolve, reject) => {
    const url = new URL(`${SERVER_URL}/api/tenants/${tenantId}/applications/bulk`);
    const req = http.request(
      { hostname: url.hostname, port: url.port || 4000, path: url.pathname, method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`,
          "Content-Length": Buffer.byteLength(body) } },
      (res) => { res.resume(); res.on("end", resolve); }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function run(
  title: string,
  opts: autocannon.Options
): Promise<autocannon.Result> {
  return new Promise((resolve, reject) => {
    console.log(`\n▶ ${title}`);
    const instance = autocannon(opts, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    autocannon.track(instance, { renderProgressBar: true });
  });
}

function check(result: autocannon.Result, title: string) {
  const p99 = result.latency.p99;
  const rps = result.requests.mean;
  const passed = p99 < P99_THRESHOLD_MS;
  const icon = passed ? "✓" : "✗";
  console.log(`${icon} ${title}: p99=${p99}ms  RPS=${rps.toFixed(0)}  errors=${result.errors}`);
  return passed;
}

async function main() {
  const token = process.env.AUTH_TOKEN;
  const tenantId = process.env.TENANT_ID;
  let creds: { token: string; tenantId: string };

  if (token && tenantId) {
    creds = { token, tenantId };
  } else {
    console.log("No AUTH_TOKEN/TENANT_ID provided — seeding test credentials...");
    creds = await seedCredentials();
    await seedApplications(creds.token, creds.tenantId, 200);
    console.log(`Seeded 200 applications for tenant ${creds.tenantId}`);
  }

  const headers = {
    Authorization: `Bearer ${creds.token}`,
    "Content-Type": "application/json",
  };

  const scenarios: Array<{ title: string; opts: autocannon.Options }> = [
    {
      title: "GET /applications (read-heavy)",
      opts: {
        url: `${SERVER_URL}/api/tenants/${creds.tenantId}/applications`,
        connections: 10,
        duration: DURATION_SECONDS,
        headers,
      },
    },
    {
      title: "GET /settings",
      opts: {
        url: `${SERVER_URL}/api/settings`,
        connections: 20,
        duration: DURATION_SECONDS,
        headers,
      },
    },
    {
      title: "GET /goals/current",
      opts: {
        url: `${SERVER_URL}/api/goals/current`,
        connections: 10,
        duration: DURATION_SECONDS,
        headers,
      },
    },
    {
      title: "GET /events",
      opts: {
        url: `${SERVER_URL}/api/tenants/${creds.tenantId}/events`,
        connections: 10,
        duration: DURATION_SECONDS,
        headers,
      },
    },
    {
      title: "POST /applications (write throughput)",
      opts: {
        url: `${SERVER_URL}/api/tenants/${creds.tenantId}/applications`,
        method: "POST",
        connections: 5,
        duration: DURATION_SECONDS,
        headers,
        body: JSON.stringify({ company: "Load Test Co", role: "Engineer" }),
      },
    },
  ];

  const results: boolean[] = [];
  for (const scenario of scenarios) {
    const result = await run(scenario.title, scenario.opts);
    results.push(check(result, scenario.title));
  }

  console.log("\n─────────────────────────────────────");
  const passed = results.filter(Boolean).length;
  console.log(`${passed}/${results.length} scenarios passed p99 < ${P99_THRESHOLD_MS}ms`);

  if (passed < results.length) {
    console.error("Some scenarios exceeded the p99 threshold.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Perf runner failed:", err);
  process.exit(1);
});
