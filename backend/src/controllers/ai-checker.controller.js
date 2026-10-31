const cfg = require('../config/ai');
const { validateStepInput } = require('../services/ai/validate');
const { runStep } = require('../services/ai/aiChecker.service');
const prisma = require('../lib/prisma');

const hits = new Map(); 
function rateLimited(userId) {
  const now = Date.now();
  const recent = (hits.get(userId) || []).filter((t) => now - t < cfg.RATE_LIMIT_WINDOW_MS);
  if (recent.length >= cfg.RATE_LIMIT_MAX) {
    hits.set(userId, recent);
    return true;
  }
  recent.push(now);
  hits.set(userId, recent);
  return false;
}


async function step(req, res) {
  try {
    if (rateLimited(req.user.id)) {
      return res.status(429).json({ error: 'Too many requests. Please wait a few minutes and try again.' });
    }
    const v = validateStepInput(req.body);
    if (!v.ok) return res.status(400).json({ error: v.error });

    const out = await runStep(v.input);
    return res.status(200).json(out);
  } catch (err) {
    console.error('ai step error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

const KINDS = ['question', 'assessment'];
const STATUSES = ['pending', 'approved', 'rejected'];

async function listReview(req, res) {
  try {
    const where = {};
    if (STATUSES.includes(req.query.status)) where.status = req.query.status;
    if (KINDS.includes(req.query.kind)) where.kind = req.query.kind;

    const [items, counts] = await Promise.all([
      prisma.aiCheckerCache.findMany({ where, orderBy: { id: 'desc' }, take: 200 }),
      prisma.aiCheckerCache.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    const summary = { pending: 0, approved: 0, rejected: 0 };
    counts.forEach((c) => { summary[c.status] = c._count._all; });
    return res.json({ items, summary });
  } catch (err) {
    console.error('listReview error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

async function setReviewStatus(req, res) {
  try {
    const id = Number(req.params.id);
    const { status } = req.body || {};
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id.' });
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'status must be pending, approved or rejected.' });

    const item = await prisma.aiCheckerCache.update({
      where: { id },
      data: { status, reviewedAt: status === 'pending' ? null : new Date(), updatedAt: new Date() },
    });
    return res.json({ item });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found.' });
    console.error('setReviewStatus error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

async function deleteReviewItem(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id.' });
    await prisma.aiCheckerCache.delete({ where: { id } });
    return res.status(204).end();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found.' });
    console.error('deleteReviewItem error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

module.exports = { step, listReview, setReviewStatus, deleteReviewItem };
