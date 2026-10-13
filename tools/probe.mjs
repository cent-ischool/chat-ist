// Probe which OpenRouter models actually return token probabilities.
// Usage: node tools/probe.mjs [model ...]
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const KEY = env.OPENROUTER_API_KEY;

const DEFAULT = [
  "openai/gpt-3.5-turbo-instruct",
  "openai/gpt-3.5-turbo",
  "openai/gpt-4o-mini",
  "openai/gpt-4o",
  "meta-llama/llama-3.2-3b-instruct",
  "meta-llama/llama-3.1-8b-instruct",
  "meta-llama/llama-3.3-70b-instruct",
  "google/gemma-3-27b-it",
  "google/gemma-4-31b-it",
  "deepseek/deepseek-v4-flash",
  "qwen/qwen3.7-flash",
];
const models = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT;

async function call(path, body) {
  const t = Date.now();
  const r = await fetch(`https://openrouter.ai/api/v1${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j, ms: Date.now() - t };
}

const common = { logprobs: true, top_logprobs: 5, temperature: 0, max_tokens: 8,
  provider: { require_parameters: true } };

for (const model of models) {
  const chat = await call("/chat/completions", { ...common, model,
    messages: [{ role: "user", content: "Complete: I do not like green eggs and" }] });
  const lp = chat.j.choices?.[0]?.logprobs?.content;
  const chatRes = chat.ok
    ? (lp?.length ? `OK ${lp.length} toks, top: ${lp[0].top_logprobs?.map((t) => JSON.stringify(t.token)).join(" ")}` : "no logprobs")
    : `ERR ${chat.status} ${chat.j.error?.message?.slice(0, 80)}`;

  const comp = await call("/completions", { ...common, model,
    prompt: "I do not like green eggs and ham. I do not like them," });
  const c = comp.j.choices?.[0];
  const compRes = comp.ok
    ? `${JSON.stringify(c?.text)} logprobs=${c?.logprobs ? "yes" : "no"}`
    : `ERR ${comp.status} ${comp.j.error?.message?.slice(0, 80)}`;

  console.log(`\n${model}  [${chat.ms}ms / ${comp.ms}ms]\n  chat: ${chatRes}\n  completions: ${compRes}`);
  if (process.env.DUMP) console.log(String(JSON.stringify(c?.logprobs ?? chat.j.choices?.[0]?.logprobs)).slice(0, 300));
}
