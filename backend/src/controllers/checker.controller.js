const { validateAndNormalize } = require('../services/checker.service');
const { runTriage } = require('../services/triage.service');
const { buildTriageResponse } = require('../services/response.service');

// ---- POST /symptom-checker/submit (any logged-in role) ----
// Day 3: validates + normalizes the submission.
// Day 4: runs the rule-matching engine (ids only).
// Day 5: assembles the full response (conditions, specialty, urgency, articles, disclaimer).
async function submit(req, res) {
  try {
    const result = await validateAndNormalize(req.body);

    if (!result.ok) {
      const body = { error: result.error };
      if (result.details) body.details = result.details;
      return res.status(result.status).json(body);
    }

    const triage = await runTriage(result.normalized);

    const response = await buildTriageResponse(triage, result.normalized);

    const body = { submission: result.normalized, result: response };
    // Raw engine output (facts, every matching rule) is handy while testing; hidden in production.
    if (process.env.NODE_ENV !== 'production') body.debug = triage;

    return res.status(200).json(body);
  } catch (err) {
    console.error('submit error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

module.exports = { submit };