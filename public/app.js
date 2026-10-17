import presets from "./presets.js";
import curatedModels from "./models.js";
import { renderAnswer } from "./markdown.js";
import { restoreMissingStart, recordingKey } from "./replay.js";

const $ = (sel) => document.querySelector(sel);
const el = (tag, props = {}, ...kids) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...kids.filter((k) => k != null));
  return node;
};

const state = {
  models: [],
  mode: "chat",
  history: [],          // every chat turn, whether or not it gets sent
  next: { base: "", pieces: [] }, // next-word text: typed base + model-added pieces
  pickedTok: null,
};

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem("chatist:" + k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem("chatist:" + k, JSON.stringify(v)); } catch {} },
};

// ---------- Helpers ----------

const level = (p) => (p >= 0.9 ? 5 : p >= 0.6 ? 4 : p >= 0.35 ? 3 : p >= 0.15 ? 2 : 1);
const percent = (p) => (p >= 0.995 ? "99%+" : p < 0.01 ? "<1%" : `${Math.round(p * 100)}%`);

// The model's "I'm done" marker, which differs per model family.
const isStop = (tok) => /^<\|.*\|>$|^<\/?s>$|^<eos>$|^<end_of_turn>$/.test(tok ?? "");

// How a token reads to a non-technical audience.
function tokenLabel(tok) {
  if (tok == null || tok === "") return "(nothing)";
  if (isStop(tok)) return "(stop)";
  if (/^\s*\n/.test(tok)) return "(new line)";
  return tok.trim() === "" ? "(space)" : tok.trim();
}

function currentModel() {
  return state.models.find((m) => m.id === $("#model").value) || {};
}

// With no server (e.g. GitHub Pages) the page is view-only: it replays the
// recordings directly instead of calling the model.
let viewOnly = false;

async function replayRecording(kind, body) {
  const json = JSON.stringify(recordingKey(kind, body));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(json));
  const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
  const r = await fetch(`recordings/${hash}.json`);
  if (!r.ok) {
    throw new Error("This view-only copy can only replay the demos, using the model and creativity each one sets. Run ChatIST locally to try your own prompts.");
  }
  return { ...restoreMissingStart((await r.json()).response), replayed: true };
}

function enterViewOnly() {
  viewOnly = true;
  const offline = $("#offline");
  offline.checked = true;
  offline.disabled = true;
  offline.nextElementSibling.textContent = "Offline (view-only)";
  $("#chat-input").readOnly = true;
  $("#chat-input").placeholder = "View-only: pick a demo on the left";
  $("#next-text").contentEditable = "false";
  $("#transcript .empty")?.replaceChildren("This is a view-only copy. Pick a demo on the left to replay its recorded answer.");
}

async function post(path, body) {
  if (viewOnly) return replayRecording(path === "/api/chat" ? "chat" : "complete", body);
  const r = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, offline: $("#offline").checked }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
}

// ---------- Token rendering and the inspector ----------

function showProbe(t, node) {
  // A token can be split across several pieces of formatted text; outline them all.
  state.pickedTok?.forEach((n) => n.classList.remove("picked"));
  const msg = node.closest(".msg");
  state.pickedTok = msg && node.dataset.i != null ? [...msg.querySelectorAll(`.tok[data-i="${node.dataset.i}"]`)] : [node];
  state.pickedTok.forEach((n) => n.classList.add("picked"));
  $("#probe-caption").textContent = `At this position, these tokens had the highest probabilities:`;
  $("#probe").replaceChildren(...barRows(t.top.length ? t.top : [t], t.token));
}

function barRows(options, chosen, onPick) {
  return options.map((o) => {
    const row = el(onPick ? "button" : "div", { className: "bar-row" + (o.token === chosen ? " chosen" : "") },
      el("span", { className: "word", title: JSON.stringify(o.token) },
        // Show a leading space, so " Sam" and "Sam" don't look identical.
        /^ \S/.test(o.token) ? el("span", { className: "sp", textContent: "␣" }) : null, tokenLabel(o.token)),
      el("span", { className: "track" }, el("span", { className: "fill" })),
      el("span", { className: "num", textContent: percent(o.prob) }));
    if (onPick) {
      row.type = "button";
      row.addEventListener("click", () => onPick(o));
    }
    // Set width after insertion so the bar grows in.
    requestAnimationFrame(() => (row.querySelector(".fill").style.width = `${Math.max(o.prob * 100, 0.5)}%`));
    return row;
  });
}

function clearProbe() {
  state.pickedTok = null;
  $("#probe").replaceChildren();
  $("#probe-caption").textContent = "Click any word in a response to see the other candidates for that spot.";
}

function showSent(messages) {
  const list = $("#sent");
  if (!messages) {
    list.replaceChildren(el("li", { className: "none", textContent: "Nothing yet." }));
    $("#sent-count").textContent = "";
    return;
  }
  list.replaceChildren(...messages.map((m) =>
    el("li", {}, el("span", { className: "role", textContent: m.role === "user" ? "You" : m.role === "assistant" ? "Model" : m.role }), m.content)));
  $("#sent-count").textContent = messages.length === 1 ? "(1 message)" : `(${messages.length} messages)`;
}

document.addEventListener("click", (e) => {
  const tok = e.target.closest(".tok, .added");
  if (!tok?.tokenInfo) return;
  showProbe(tok.tokenInfo, tok);
  if (isPhone.matches) openDrawer("inspector");
});

// ---------- Phone drawers ----------

// On phones the demo list and the inspector slide in over the chat.
const isPhone = matchMedia("(max-width: 900px)");
const drawers = { demos: "#toggle-demos", inspector: "#toggle-inspector" };

function openDrawer(id) {
  for (const [name, toggle] of Object.entries(drawers)) {
    $("#" + name).classList.toggle("open", name === id);
    $(toggle).setAttribute("aria-expanded", String(name === id));
  }
  $("#scrim").hidden = !id;
}

for (const [name, toggle] of Object.entries(drawers)) {
  $(toggle).addEventListener("click", () => openDrawer($("#" + name).classList.contains("open") ? null : name));
}
$("#scrim").addEventListener("click", () => openDrawer(null));
document.addEventListener("keydown", (e) => e.key === "Escape" && openDrawer(null));
isPhone.addEventListener("change", () => openDrawer(null));

$("#toggle-settings").addEventListener("click", (e) => {
  const open = $("#controls").classList.toggle("open");
  e.currentTarget.setAttribute("aria-expanded", String(open));
});

// ---------- Chat mode ----------

function addMessage(node) {
  $("#transcript .empty")?.remove();
  $("#transcript").append(node);
  node.scrollIntoView({ block: "end", behavior: "smooth" });
  return node;
}

async function sendChat(text) {
  if (!text.trim()) return;
  const model = currentModel();
  state.history.push({ role: "user", content: text });
  addMessage(userTurn(text));

  const remember = $("#memory").checked;
  const messages = remember ? [...state.history] : [state.history.at(-1)];
  showSent(messages);

  const pending = addMessage(el("li", { className: "msg msg-model thinking", textContent: "Generating" }));
  try {
    const res = await post("/api/chat", {
      model: model.id, messages, temperature: Number($("#temp").value), max_tokens: 500,
    });
    state.history.push({ role: "assistant", content: res.text });
    const body = renderAnswer(res.text, res.tokens?.filter((t) => !isStop(t.token)), level);
    const notes = [model.name];
    if (!remember) notes.push("sent your last message only");
    else if (messages.length > 1) notes.push(`sent all ${messages.length} messages`);
    if (!res.tokens?.length) notes.push("no probabilities returned");
    if (res.replayed) notes.push("from recording");
    pending.replaceWith(addMessage(el("li", { className: "msg msg-model" + (remember ? "" : " forgot") },
      body, el("span", { className: "msg-meta", textContent: notes.join(", ") }))));
  } catch (err) {
    state.history.pop();
    pending.replaceWith(addMessage(el("li", { className: "msg msg-error", textContent: err.message })));
  }
}

// A sent message, with a button that copies it back into the chat box.
function userTurn(text) {
  const copy = el("button", { type: "button", className: "copy", textContent: "Copy", title: "Copy back into the chat box" });
  copy.addEventListener("click", async () => {
    const input = $("#chat-input");
    input.value = text;
    input.focus();
    try { await navigator.clipboard.writeText(text); } catch {}
    copy.textContent = "Copied";
    setTimeout(() => (copy.textContent = "Copy"), 1500);
  });
  return el("li", { className: "turn-user" }, copy, el("div", { className: "msg msg-user", textContent: text }));
}

function resetConversation() {
  state.history = [];
  $("#transcript").replaceChildren(el("li", { className: "empty", textContent: "New conversation. No earlier messages will be sent." }));
  showSent(null);
  clearProbe();
}

$("#chat-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("#chat-input");
  const text = input.value;
  input.value = "";
  sendChat(text);
});

$("#chat-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    $("#chat-form").requestSubmit();
  }
});

// ---------- Next-word mode ----------

const nextText = () => state.next.base + state.next.pieces.map((p) => p.token).join("");

function renderNext() {
  const box = $("#next-text");
  box.replaceChildren(state.next.base, ...state.next.pieces.map((p) => {
    const s = el("span", { className: `added tok p${p.prob != null ? level(p.prob) : 5}`, textContent: p.token });
    if (p.top) s.tokenInfo = p;
    return s;
  }));
  $("#next-undo").disabled = state.next.pieces.length === 0;
  showSent([{ role: "Raw text, no chat", content: nextText() }]);
}

$("#next-text").addEventListener("input", () => {
  // Typing turns everything into plain text the presenter owns.
  state.next = { base: $("#next-text").innerText.replace(/\n$/, ""), pieces: [] };
  $("#next-undo").disabled = true;
});

let lastGuess = null;

async function predict() {
  const box = $("#next-candidates");
  box.replaceChildren(el("p", { className: "thinking", textContent: "Predicting" }));
  $("#next-take").disabled = true;
  showSent([{ role: "Raw text, no chat", content: nextText() }]);
  try {
    const res = await post("/api/complete", {
      model: currentModel().id, prompt: nextText(), temperature: Number($("#temp").value), max_tokens: 1,
    });
    const first = res.tokens?.[0];
    if (!first) {
      lastGuess = { token: res.text, prob: null };
      box.replaceChildren(el("p", {}, `Next: “${res.text}”`),
        el("p", { className: "note", textContent: "This model's provider doesn't return probabilities. Choose another model to see them." }));
    } else {
      lastGuess = first;
      box.replaceChildren(...barRows(first.top.length ? first.top : [first], first.token, (o) => addPiece({ ...o, top: first.top })),
        el("p", { className: "note", textContent: res.replayed ? "From recording. Click a word to add it." : "Click any word to add it." }));
    }
    $("#next-take").disabled = false;
  } catch (err) {
    box.replaceChildren(el("p", { className: "msg-error", textContent: err.message }));
  }
}

function addPiece(piece) {
  state.next.pieces.push(piece);
  renderNext();
  predict();
}

async function keepWriting() {
  const box = $("#next-candidates");
  box.replaceChildren(el("p", { className: "thinking", textContent: "Generating" }));
  try {
    const res = await post("/api/complete", {
      model: currentModel().id, prompt: nextText(), temperature: Number($("#temp").value), max_tokens: 40,
    });
    const pieces = res.tokens?.length ? res.tokens : [{ token: res.text, prob: null }];
    state.next.pieces.push(...pieces);
    renderNext();
    box.replaceChildren(el("p", { className: "note", textContent: "Click any added word to see the other candidates for that spot." }));
  } catch (err) {
    box.replaceChildren(el("p", { className: "msg-error", textContent: err.message }));
  }
}

$("#next-predict").addEventListener("click", predict);
$("#next-take").addEventListener("click", () => lastGuess && addPiece(lastGuess));
$("#next-run").addEventListener("click", keepWriting);
$("#next-undo").addEventListener("click", () => {
  state.next.pieces.pop();
  renderNext();
  $("#next-candidates").replaceChildren();
});

// ---------- Modes, presets, settings ----------

function setMode(mode) {
  state.mode = mode;
  $("#tab-chat").setAttribute("aria-selected", mode === "chat");
  $("#tab-next").setAttribute("aria-selected", mode === "next");
  $("#chat-view").hidden = mode !== "chat";
  $("#next-view").hidden = mode !== "next";
  clearProbe();
  if (mode === "chat") showSent(state.history.length ? ($("#memory").checked ? state.history : state.history.slice(-1)) : null);
  else renderNext();
}

$("#tab-chat").addEventListener("click", () => setMode("chat"));
$("#tab-next").addEventListener("click", () => setMode("next"));

// Sections start collapsed; click a heading to open it.
function renderPresets() {
  $("#presets").replaceChildren(...presets.map((group, i) => {
    if (!group.items.length) {
      // No demos: the heading just opens the explanation.
      const b = el("button", { type: "button", className: "section-btn info-btn" },
        group.section, el("span", { className: "q", textContent: "?", ariaHidden: "true" }));
      b.addEventListener("click", () => showAbout(group.section, group.about));
      return el("section", { className: "preset-group info-group" }, el("h2", {}, b));
    }
    const list = el("ul", { id: `section-${i}`, hidden: true }, ...group.items.map((p) => {
      const b = el("button", { type: "button", className: "preset", title: p.text },
        p.label, el("span", { className: "preset-hint", textContent: presetHint(p) }));
      b.addEventListener("click", () => usePreset(p, b));
      return el("li", {}, b);
    }));
    const toggle = el("button", { type: "button", className: "section-btn" },
      el("span", { className: "chevron", ariaHidden: "true" }), group.section);
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", list.id);
    toggle.addEventListener("click", () => {
      list.hidden = !list.hidden;
      toggle.setAttribute("aria-expanded", String(!list.hidden));
    });
    const about = el("button", { type: "button", className: "q", textContent: "?", title: `What is “${group.section}” about?` });
    about.addEventListener("click", () => showAbout(group.section, group.about));
    return el("section", { className: "preset-group" }, el("h2", {}, toggle, about), list);
  }));
}

function showAbout(title, about = {}) {
  $("#about-title").textContent = title;
  $("#about-tagline").textContent = about.tagline ?? "";
  $("#about-tagline").hidden = !about.tagline;
  $("#about-text").textContent = about.text ?? "";
  $("#about-points").replaceChildren(...(about.points ?? []).map((p) => el("li", { textContent: p })));
  $("#about-share").hidden = !about.share;
  $("#about").showModal();
}

const ABOUT_SITE = {
  tagline: "Understand how generative AI works, so you can use it wisely.",
  text: "ChatIST is a chatbot with the curtain pulled back. Popular AI apps wrap the model in hidden instructions, web search and behind-the-scenes reasoning steps. ChatIST sends your text to the bare model, so you can see what it actually does: predict the next word, one word at a time.",
  share: true,
};
$("#about-site").addEventListener("click", () => showAbout("ChatIST", ABOUT_SITE));
$("#brand-tagline").textContent = ABOUT_SITE.tagline;

// Clicking outside the popup closes it.
$("#about").addEventListener("click", (e) => {
  if (e.target === $("#about")) $("#about").close();
});

// e.g. "GPT-4o mini, creativity 0"
function presetHint(p) {
  const name = curatedModels.find((m) => m.id === p.model)?.name.replace(/ \(.*\)$/, "");
  return [name, p.temperature != null ? `creativity ${p.temperature}` : null].filter(Boolean).join(", ");
}

function setTemperature(value) {
  $("#temp").value = value;
  $("#temp-value").textContent = $("#temp").value;
  store.set("temp", $("#temp").value);
}

function usePreset(p, button) {
  button.classList.add("used");
  openDrawer(null);
  if (p.model && state.models.some((m) => m.id === p.model)) {
    $("#model").value = p.model;
    describeModel();
  }
  if (p.temperature != null) setTemperature(p.temperature);
  setMode(p.mode);
  if (p.mode === "next") {
    state.next = { base: p.text, pieces: [] };
    renderNext();
    $("#next-candidates").replaceChildren();
    $("#next-predict").focus();
  } else {
    if (p.fresh) resetConversation();
    const input = $("#chat-input");
    input.value = p.text;
    input.focus();
  }
}

function describeModel() {
  const m = currentModel();
  $("#cutoff").replaceChildren(...(m.cutoff
    ? ["Training data up to ", el("strong", { textContent: m.cutoff })]
    : ["Training cutoff not published"]));
  store.set("model", m.id);
}

async function loadModels() {
  try {
    const r = await fetch("/api/models");
    if (!r.ok) throw new Error(r.statusText);
    state.models = await r.json();
  } catch {
    state.models = curatedModels.map((m) => ({ ...m, probabilities: true }));
    enterViewOnly();
  }
  $("#model").replaceChildren(...state.models.map((m) =>
    el("option", { value: m.id, textContent: m.name + (m.probabilities ? "" : " (no probabilities)") })));
  const saved = store.get("model");
  if (state.models.some((m) => m.id === saved)) $("#model").value = saved;
  describeModel();
}

$("#model").addEventListener("change", describeModel);

$("#temp").addEventListener("input", () => setTemperature($("#temp").value));

$("#show-probs").addEventListener("change", () => {
  document.body.classList.toggle("show-probs", $("#show-probs").checked);
  store.set("showProbs", $("#show-probs").checked);
});

$("#memory").addEventListener("change", () => state.mode === "chat" && setMode("chat"));
$("#reset").addEventListener("click", resetConversation);

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === "l") {
    e.preventDefault();
    if (state.mode === "chat") resetConversation();
  }
});

// ---------- Start ----------

$("#temp").value = store.get("temp", "0.7");
$("#temp-value").textContent = $("#temp").value;
$("#show-probs").checked = store.get("showProbs", true);
document.body.classList.toggle("show-probs", $("#show-probs").checked);
renderPresets();
showSent(null);
loadModels();
