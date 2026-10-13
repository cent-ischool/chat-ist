// ChatIST server: serves the page and proxies OpenRouter so the API key
// stays in .env. Every live answer is saved to recordings/ so the demo can
// be replayed without internet.
import http from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import curated from "./public/models.js";
import { restoreMissingStart, recordingKey } from "./public/replay.js";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC = join(ROOT, "public");
const RECORDINGS = join(ROOT, "recordings");
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "127.0.0.1"; // the devcontainer sets 0.0.0.0
const API = "https://openrouter.ai/api/v1";

function loadKey() {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return process.env.OPENROUTER_API_KEY;
  const line = readFileSync(envPath, "utf8").split(/\r?\n/)
    .find((l) => l.startsWith("OPENROUTER_API_KEY="));
  return line?.slice("OPENROUTER_API_KEY=".length).trim().replace(/^["']|["']$/g, "")
    || process.env.OPENROUTER_API_KEY;
}

// ---- Model list, merged with OpenRouter's capability metadata ----

let modelCache = null;
async function models() {
  if (modelCache) return modelCache;
  let meta = {};
  try {
    const r = await fetch(`${API}/models`);
    for (const m of (await r.json()).data) meta[m.id] = m.supported_parameters || [];
  } catch {
    // Offline: assume probabilities so recordings still render.
  }
  const list = curated.map((m) => {
    const params = meta[m.id];
    return {
      ...m,
      probabilities: params ? params.includes("top_logprobs") : true,
      reasoning: params ? params.includes("reasoning") : false,
    };
  });
  if (Object.keys(meta).length) modelCache = list;
  return list;
}

// ---- Normalising probabilities ----

const pct = (logprob) => Math.exp(logprob);

function normaliseTokens(logprobs) {
  if (!logprobs) return null;
  // Chat-style: { content: [{ token, logprob, top_logprobs: [{ token, logprob }] }] }
  if (Array.isArray(logprobs.content)) {
    return logprobs.content.map((t) => ({
      token: t.token,
      prob: pct(t.logprob),
      top: (t.top_logprobs || []).map((a) => ({ token: a.token, prob: pct(a.logprob) })),
    }));
  }
  // Legacy completions-style: { tokens, token_logprobs, top_logprobs: [{ tok: lp }] }
  if (Array.isArray(logprobs.tokens)) {
    return logprobs.tokens.map((token, i) => ({
      token,
      prob: pct(logprobs.token_logprobs[i]),
      top: Object.entries(logprobs.top_logprobs?.[i] || {})
        .map(([tok, lp]) => ({ token: tok, prob: pct(lp) }))
        .sort((a, b) => b.prob - a.prob),
    }));
  }
  return null;
}

// ---- OpenRouter calls with record / replay ----

// model id -> providers that answered without probabilities
const noProbabilities = new Map();

const recordingPath = (key) =>
  join(RECORDINGS, createHash("sha256").update(JSON.stringify(key)).digest("hex").slice(0, 16) + ".json");

async function ask(kind, { model, messages, prompt, temperature, max_tokens, offline }) {
  const key = recordingKey(kind, { model, messages, prompt, temperature, max_tokens });
  const file = recordingPath(key);
  const replay = () => ({ ...restoreMissingStart(JSON.parse(readFileSync(file, "utf8")).response), replayed: true });

  if (offline) {
    if (existsSync(file)) return replay();
    throw new Error("No recording of this exact prompt for this model yet. Run it once while online to record it.");
  }

  const info = (await models()).find((m) => m.id === model) || {};
  const body = { model, temperature, max_tokens };
  if (kind === "chat") body.messages = messages;
  else body.prompt = prompt;
  // Keep the model "bare": no hidden thinking before it answers.
  if (info.reasoning) body.reasoning = { enabled: false };

  let response;
  let withProbs = info.probabilities;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (withProbs) {
      body.logprobs = true;
      body.top_logprobs = 5;
      body.provider = { require_parameters: true, ignore: [...(noProbabilities.get(model) || [])] };
    } else {
      delete body.logprobs;
      delete body.top_logprobs;
      delete body.provider;
    }
    let r, j;
    try {
      r = await fetch(`${API}/${kind === "chat" ? "chat/completions" : "completions"}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${loadKey()}`,
          "Content-Type": "application/json",
          "X-Title": "ChatIST",
        },
        body: JSON.stringify(body),
      });
      j = await r.json();
    } catch (err) {
      if (existsSync(file)) return replay();
      throw new Error(`Couldn't reach OpenRouter (${err.message}). Check the internet connection or turn on Offline.`);
    }
    if (!r.ok || j.error) {
      if (response) break; // keep the answer without probabilities
      // The providers that return probabilities may be down: get a plain answer instead.
      if (withProbs) { withProbs = false; continue; }
      throw new Error(`OpenRouter: ${j.error?.message || r.statusText}`);
    }

    const choice = j.choices?.[0] || {};
    response = restoreMissingStart({
      text: kind === "chat" ? choice.message?.content ?? "" : choice.text ?? "",
      tokens: normaliseTokens(choice.logprobs),
      provider: j.provider,
    });
    // Some providers claim to return probabilities but don't. Skip them from now on.
    if (response.tokens || !withProbs || !j.provider) break;
    noProbabilities.set(model, new Set([...(noProbabilities.get(model) || []), j.provider]));
  }
  mkdirSync(RECORDINGS, { recursive: true });
  writeFileSync(file, JSON.stringify({ request: key, response, savedAt: new Date().toISOString() }, null, 2));
  return response;
}

// ---- HTTP ----

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".woff2": "font/woff2", ".svg": "image/svg+xml", ".json": "application/json" };

function send(res, status, data, type = "application/json") {
  res.writeHead(status, { "Content-Type": `${type}; charset=utf-8`, "Cache-Control": "no-store" });
  res.end(type === "application/json" ? JSON.stringify(data) : data);
}

async function readBody(req) {
  let s = "";
  for await (const chunk of req) s += chunk;
  return JSON.parse(s || "{}");
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (url.pathname === "/api/models") return send(res, 200, await models());
    if (req.method === "POST" && url.pathname === "/api/chat") return send(res, 200, await ask("chat", await readBody(req)));
    if (req.method === "POST" && url.pathname === "/api/complete") return send(res, 200, await ask("complete", await readBody(req)));

    const path = normalize(join(PUBLIC, url.pathname === "/" ? "index.html" : url.pathname));
    if (!path.startsWith(PUBLIC) || !existsSync(path)) return send(res, 404, "Not found", "text/plain");
    send(res, 200, readFileSync(path), TYPES[extname(path)] || "application/octet-stream");
  } catch (err) {
    send(res, 500, { error: err.message });
  }
}).listen(PORT, HOST, () => {
  console.log(`ChatIST is running at http://localhost:${PORT}`);
  if (!loadKey()) console.log("Warning: no OPENROUTER_API_KEY in .env. Only Offline mode will work.");
});
