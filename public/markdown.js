// Renders a model's answer as formatted markdown while keeping every token
// clickable and coloured by probability.
import { Marked } from "./vendor/marked.esm.js";
import katex from "./vendor/katex.mjs";

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function mathHtml({ raw, text, display }) {
  const html = katex.renderToString(text, { throwOnError: false, displayMode: display });
  const tag = display ? "div" : "span";
  return `<${tag} class="math" data-raw="${escapeHtml(raw)}">${html}</${tag}>`;
}

// \[ … \], $$ … $$ (display) and \( … \) (inline). A single $ is left alone
// so prices like "$5 and $10" aren't treated as maths.
const DISPLAY = /^(?:\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\])/;
const INLINE = /^(?:\\\(([\s\S]+?)\\\)|\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\])/;

const marked = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    // Show any HTML the model writes as text instead of running it.
    html: ({ text }) => escapeHtml(text),
    image: ({ text }) => escapeHtml(text),
    link({ href, tokens }) {
      const label = this.parser.parseInline(tokens);
      return /^https?:/i.test(href) ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${label}</a>` : label;
    },
  },
  extensions: [
    {
      name: "mathBlock",
      level: "block",
      start: (src) => src.match(/\$\$|\\\[/)?.index,
      tokenizer(src) {
        const m = DISPLAY.exec(src);
        if (m) return { type: "mathBlock", raw: m[0], text: (m[1] ?? m[2]).trim(), display: true };
      },
      renderer: mathHtml,
    },
    {
      name: "mathInline",
      level: "inline",
      start: (src) => src.match(/\\\(|\\\[|\$\$/)?.index,
      tokenizer(src) {
        const m = INLINE.exec(src);
        if (m) return { type: "mathInline", raw: m[0], text: (m[1] ?? m[2] ?? m[3]).trim(), display: !m[1] };
      },
      renderer: mathHtml,
    },
  ],
});

// tokens: [{ token, prob, top }] or null. level: prob -> 1..5.
export function renderAnswer(text, tokens, level) {
  const box = document.createElement("div");
  box.className = "md";
  box.innerHTML = marked.parse(text);
  if (!tokens?.length) return box;

  // Which token each character of the token stream belongs to.
  const joined = tokens.map((t) => t.token).join("");
  const owner = [];
  tokens.forEach((t, i) => { for (let k = 0; k < t.token.length; k++) owner.push(i); });

  // The rendered text is the token stream minus markup (** # - etc.), in order.
  // Walk it and find each visible character a little further along the stream.
  let pos = 0;
  const find = (ch) => {
    const limit = Math.min(joined.length, pos + 80);
    for (let q = pos; q < limit; q++) {
      if (joined.startsWith(ch, q) || (/\s/.test(ch) && /\s/.test(joined[q]))) {
        pos = q + ch.length;
        return owner[q];
      }
    }
    return -1;
  };

  const wrap = (textNode) => {
    const frag = document.createDocumentFragment();
    let buf = "";
    let cur = -1;
    const flush = () => {
      if (!buf) return;
      const t = tokens[cur];
      if (cur < 0 || t.prob == null) frag.append(buf);
      else {
        const span = Object.assign(document.createElement("span"), { className: `tok p${level(t.prob)}`, textContent: buf });
        span.tokenInfo = t;
        span.dataset.i = cur;
        frag.append(span);
      }
      buf = "";
    };
    for (const ch of textNode.data) {
      const i = find(ch);
      if (i !== cur) { flush(); cur = i; }
      buf += ch;
    }
    flush();
    textNode.replaceWith(frag);
  };

  const visit = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.classList.contains("math")) {
          // Skip past the maths source; the rendered formula isn't split into tokens.
          const at = joined.indexOf(child.dataset.raw, pos);
          if (at >= 0) pos = at + child.dataset.raw.length;
        } else visit(child);
      } else if (child.nodeType === Node.TEXT_NODE && child.data.trim()) {
        wrap(child);
      }
    }
  };
  visit(box);
  return box;
}
