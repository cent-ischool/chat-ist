// Shared by server.js and the view-only page.

// Some providers skip probabilities for the first few tokens. Put the missing
// start of the answer back as one token with no probability.
export function restoreMissingStart(response) {
  const { text, tokens } = response;
  if (!tokens?.length) return response;
  const joined = tokens.map((t) => t.token).join("");
  const at = text.indexOf(joined.slice(0, 40));
  if (at <= 0) return response;
  return { ...response, tokens: [{ token: text.slice(0, at), prob: null, top: [] }, ...tokens] };
}

// A recording is saved as recordings/<first 16 hex digits of SHA-256(key)>.json.
// The key's property order matters: it's hashed as JSON.
export const recordingKey = (kind, { model, messages, prompt, temperature, max_tokens }) =>
  ({ kind, model, messages, prompt, temperature, max_tokens });
