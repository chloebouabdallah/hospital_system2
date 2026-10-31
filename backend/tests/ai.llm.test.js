const { test } = require('node:test');
const assert = require('node:assert/strict');
const llm = require('../src/services/ai/llm');

test('Gemini provider: correct URL, key header, body, and parses the reply', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  const real = global.fetch; let seen;
  global.fetch = async (url, init) => { seen = { url, init }; return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"action":"finish"}' }] } }] }) }; };
  try {
    const out = await llm.complete({ system: 'sys', user: 'hi', maxTokens: 500 });
    assert.deepEqual(llm.extractJson(out), { action: 'finish' });
    assert.match(seen.url, /generativelanguage\.googleapis\.com\/v1beta\/models\/.+:generateContent$/);
    assert.equal(seen.init.headers['x-goog-api-key'], 'test-key');
    const body = JSON.parse(seen.init.body);
    assert.equal(body.generationConfig.responseMimeType, 'application/json');
    assert.equal(body.system_instruction.parts[0].text, 'sys');
  } finally { global.fetch = real; delete process.env.GEMINI_API_KEY; }
});

test('rate limit (429) surfaces as AiUnavailableError so the app falls back', async () => {
  process.env.GEMINI_API_KEY = 'k';
  const real = global.fetch; global.fetch = async () => ({ ok: false, status: 429 });
  try { await assert.rejects(() => llm.complete({ system: 's', user: 'u' }), llm.AiUnavailableError); }
  finally { global.fetch = real; delete process.env.GEMINI_API_KEY; }
});

test('no key at all -> AiUnavailableError', async () => {
  delete process.env.GEMINI_API_KEY; delete process.env.ANTHROPIC_API_KEY;
  await assert.rejects(() => llm.complete({ system: 's', user: 'u' }), llm.AiUnavailableError);
});
