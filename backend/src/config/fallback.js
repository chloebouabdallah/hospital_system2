// What the symptom checker returns when NO triage rule matches a submission.
//
// "No rule matched" is not the same as "nothing is wrong", so the fallback is deliberately
// cautious: moderate urgency + a general practitioner, never a reassuring "low".
// Change these three values to change the behaviour everywhere.
//
// To give a specific symptom its own fallback instead, add a catch-all TriageRule with empty
// conditions ({}) for that symptom in the Day 7 rule admin. A catch-all matches every
// submission for that symptom, so this generic fallback is only used if even that doesn't exist.

const FALLBACK_URGENCY = 'moderate';

// Must match a Specialty name (names are unique). If it isn't found, recommendedSpecialty is null.
const FALLBACK_SPECIALTY_NAME = 'General Practitioner';

const FALLBACK_MESSAGE =
  "We couldn't match your answers to a specific condition. This doesn't mean nothing is wrong. " +
  'We recommend speaking with a doctor who can assess your symptoms properly. ' +
  'If your symptoms get worse, or you develop severe symptoms such as difficulty breathing, ' +
  'chest pain, or confusion, seek urgent medical care.';

module.exports = { FALLBACK_URGENCY, FALLBACK_SPECIALTY_NAME, FALLBACK_MESSAGE };