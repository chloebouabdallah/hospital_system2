const crypto = require('crypto');
const db = () => require('../../lib/prisma');



const norm = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function makeKey(kind, symptom, answers) {
  const sig = JSON.stringify([
    kind,
    norm(symptom),
    answers.map((a) => [norm(a.question), a.values.map((v) => norm(v.value || v.text)).sort()]),
  ]);
  return crypto.createHash('sha256').update(sig).digest('hex');
}

async function get(key) {
  try {
    const row = await db().aiCheckerCache.findUnique({ where: { cacheKey: key } });
    if (!row || row.status === 'rejected') return null;
    db().aiCheckerCache.update({ where: { id: row.id }, data: { hits: { increment: 1 } } }).catch(() => {});
    return row.payload;
  } catch (err) {
    console.error('ai cache get failed:', err.message);
    return null;
  }
}

async function set(key, kind, symptom, payload) {
  try {
    const data = { kind, symptomText: String(symptom).slice(0, 300), payload };
    await db().aiCheckerCache.upsert({
      where: { cacheKey: key },
      create: { cacheKey: key, ...data },
      update: { payload, status: 'pending', reviewedAt: null, updatedAt: new Date() },
    });
  } catch (err) {
    console.error('ai cache set failed:', err.message);
  }
}

module.exports = { makeKey, get, set };
