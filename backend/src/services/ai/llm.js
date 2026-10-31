const cfg = require('../../config/ai');


class AiUnavailableError extends Error {}

async function geminiOnce({ system, user, maxTokens }, key, model) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), cfg.TIMEOUT_MS);
  try {
    const res = await fetch(`${cfg.GEMINI_URL}/${model}:generateContent`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          maxOutputTokens: Math.max(maxTokens * 8, 8192),
        },
      }),
    });
    if (!res.ok) throw new AiUnavailableError(`Gemini ${model} HTTP ${res.status}`); 
    const data = await res.json();
    const cand = data.candidates?.[0];
    const text = (cand?.content?.parts || []).map((p) => p.text || '').join('');
    if (!text) throw new AiUnavailableError(`Gemini ${model} returned no text.`);
    if (cand?.finishReason === 'MAX_TOKENS') throw new AiUnavailableError(`Gemini ${model} hit the output token limit.`);
    return text;
  } catch (err) {
    if (err instanceof AiUnavailableError) throw err;
    throw new AiUnavailableError(err.name === 'AbortError' ? `Gemini ${model} timed out.` : `Gemini ${model} call failed: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}


async function geminiComplete(args, key) {
  const models = [cfg.GEMINI_MODEL, ...cfg.GEMINI_FALLBACK_MODELS.filter((m) => m !== cfg.GEMINI_MODEL)];
  const errors = [];
  for (const model of models) {
    try {
      return await geminiOnce(args, key, model);
    } catch (err) {
      errors.push(err.message);
    }
  }
  throw new AiUnavailableError(errors.join(' | '));
}

async function defaultComplete({ system, user, maxTokens = 900 }) {
  if (process.env.GEMINI_API_KEY) return geminiComplete({ system, user, maxTokens }, process.env.GEMINI_API_KEY);
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiUnavailableError('No GEMINI_API_KEY or ANTHROPIC_API_KEY is set.');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), cfg.TIMEOUT_MS);
  try {
    const res = await fetch(cfg.API_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': cfg.API_VERSION,
      },
      body: JSON.stringify({
        model: cfg.MODEL,
        max_tokens: maxTokens,
        temperature: 0.2, // low: we want consistent clinical-style output
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!res.ok) throw new AiUnavailableError(`LLM HTTP ${res.status}`);
    const data = await res.json();
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    if (!text) throw new AiUnavailableError('LLM returned no text.');
    return text;
  } catch (err) {
    if (err instanceof AiUnavailableError) throw err;
    throw new AiUnavailableError(err.name === 'AbortError' ? 'LLM timed out.' : `LLM call failed: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}

let impl = defaultComplete;
const setLlm = (fn) => { impl = fn || defaultComplete; };
const complete = (args) => impl(args);

function extractJson(text) {
  const s = String(text || '');
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}

module.exports = { complete, setLlm, extractJson, AiUnavailableError };
