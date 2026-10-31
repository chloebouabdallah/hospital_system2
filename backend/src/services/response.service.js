const prisma = require('../lib/prisma');
const { DISCLAIMER } = require('../config/disclaimer');
const {
  FALLBACK_URGENCY,
  FALLBACK_SPECIALTY_NAME,
  FALLBACK_MESSAGE,
} = require('../config/fallback');


async function loadBookingPolicy(urgencyLevel) {
  const level = ['urgent', 'moderate', 'low'].includes(urgencyLevel)
    ? urgencyLevel
    : 'no_triage';

  try {
    const rule = await prisma.urgencyBookingRule.findUnique({
      where: { urgencyLevel: level },
    });
    if (!rule) return null;
    return {
      urgencyLevel: rule.urgencyLevel,
      minHoursAhead: rule.minHoursAhead,
      maxDaysAhead: rule.maxDaysAhead,
      radiusKm: rule.radiusKm,
      message: rule.message,
    };
  } catch (err) {
   
    console.error('loadBookingPolicy error:', err);
    return null;
  }
}


async function buildTriageResponse(triage, normalized) {
  const { primary, matches } = triage;
  const incomplete = (normalized?.unansweredQuestionIds?.length || 0) > 0;

  if (!primary) {
    const fallbackSpecialty = await prisma.specialty.findUnique({
      where: { name: FALLBACK_SPECIALTY_NAME },
      select: { id: true, name: true, description: true },
    });

    const booking = await loadBookingPolicy('no_triage');

    return {
      matched: false,
      urgencyLevel: FALLBACK_URGENCY,
      recommendedSpecialty: fallbackSpecialty,
      conditions: [],
      message: FALLBACK_MESSAGE,
      incomplete,
      disclaimer: DISCLAIMER,
      booking,
    };
  }

  const conditionIds = [...new Set(matches.flatMap((m) => m.matchedConditionIds))];

  const [conditionRows, articleRows] = conditionIds.length
    ? await Promise.all([
        prisma.condition.findMany({
          where: { id: { in: conditionIds } },
          select: {
            id: true,
            name: true,
            description: true,
            causes: true,
            whenToSeekCare: true,
            specialtyId: true,
          },
        }),
        prisma.medicalArticle.findMany({
          where: { conditionId: { in: conditionIds } },
          select: { id: true, conditionId: true, title: true, content: true, source: true },
          orderBy: { id: 'asc' },
        }),
      ])
    : [[], []];

  const articlesByCondition = new Map();
  for (const a of articleRows) {
    if (!articlesByCondition.has(a.conditionId)) articlesByCondition.set(a.conditionId, []);
    articlesByCondition.get(a.conditionId).push({
      id: a.id,
      title: a.title,
      content: a.content,
      source: a.source,
    });
  }

  const conditionById = new Map(conditionRows.map((c) => [c.id, c]));

  const orderedConditions = conditionIds.map((id) => conditionById.get(id)).filter(Boolean);

  const conditions = orderedConditions.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    causes: c.causes,
    whenToSeekCare: c.whenToSeekCare,
    articles: articlesByCondition.get(c.id) || [],
  }));

  const specialtyId =
    primary.recommendedSpecialtyId ??
    orderedConditions.find((c) => c.specialtyId != null)?.specialtyId ??
    null;

  const recommendedSpecialty = specialtyId
    ? await prisma.specialty.findUnique({
        where: { id: specialtyId },
        select: { id: true, name: true, description: true },
      })
    : null;

  const booking = await loadBookingPolicy(primary.urgencyLevel);

  return {
    matched: true,
    urgencyLevel: primary.urgencyLevel,
    recommendedSpecialty,
    conditions,
    message: null,
    incomplete,
    disclaimer: DISCLAIMER,
    booking,
  };
}

module.exports = { buildTriageResponse, loadBookingPolicy };