const crypto = require('crypto');
const db = () => require('../../lib/prisma');

// Cache of AI output, which doubles as the admin review queue.
//   get()          exact match for (kind, symptom, answers); pending + approved are served.
//   findApproved() used only when the AI is unavailable: the closest ADMIN-APPROVED entry
//                  for the same symptom (needs the `context` column, see ai_checker_cache_context.sql).

const norm = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

const signature = (answers) =>
  answers.map((a) => [norm(a.question), a.values.map((v) => norm(v.value || v.text)).sort()]);

function makeKey(kind, symptom, answers) {
  const sig = JSON.stringify([kind, norm(symptom), signature(answers)]);
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

async function set(key, kind, symptom, payload, answers) {
  const data = { kind, symptomText: String(symptom).slice(0, 300), payload };
  const context = Array.isArray(answers) ? { answers: signature(answers) } : null;
  const write = (withContext) =>
    db().aiCheckerCache.upsert({
      where: { cacheKey: key },
      create: { cacheKey: key, ...data, ...(withContext ? { context } : {}) },
      update: {
        payload, status: 'pending', reviewedAt: null, updatedAt: new Date(),
        ...(withContext ? { context } : {}),
      },
    });
  try {
    await write(!!context);
  } catch (err) {
    // The `context` column/field may not exist yet (migration not run or client not regenerated):
    // still save the entry so caching and the review queue keep working.
    if (context && /context/i.test(err.message)) {
      try { await write(false); } catch (e) { console.error('ai cache set failed:', e.message); }
    } else {
      console.error('ai cache set failed:', err.message);
    }
  }
}

// Jaccard overlap of the "question=answer" pairs.
function overlap(a, b) {
  const toSet = (sig) => new Set(sig.map(([q, vs]) => `${q}=${vs.join(',')}`));
  const A = toSet(a);
  const B = toSet(b);
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  return inter / (A.size + B.size - inter);
}

// Minimum overlap for reusing an approved ASSESSMENT for different answers. Questions are
// only reused at the same step number, so they need no threshold.
const MIN_ASSESSMENT_OVERLAP = 0.75;

async function findApproved(kind, symptom, answers) {
  try {
    const rows = await db().aiCheckerCache.findMany({
      where: { kind, status: 'approved' },
      select: { id: true, symptomText: true, payload: true, context: true },
      orderBy: { id: 'desc' },
      take: 500,
    });
    const target = signature(answers);
    const sym = norm(symptom);
    let best = null;
    let bestScore = -1;
    for (const r of rows) {
      if (norm(r.symptomText) !== sym) continue;
      const ctx = r.context?.answers;
      if (!Array.isArray(ctx)) continue;
      if (kind === 'question' && ctx.length !== target.length) continue;
      const score = overlap(ctx, target);
      if (kind === 'assessment' && score < MIN_ASSESSMENT_OVERLAP) continue;
      if (score > bestScore) { best = r; bestScore = score; }
    }
    if (!best) return null;
    db().aiCheckerCache.update({ where: { id: best.id }, data: { hits: { increment: 1 } } }).catch(() => {});
    return best.payload;
  } catch (err) {
    console.error('ai cache findApproved failed:', err.message);
    return null;
  }
}

module.exports = { makeKey, get, set, findApproved, overlap, signature };