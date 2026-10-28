// Rating math for doctor reviews.
// Uses a "smoothed" (Bayesian) average for sorting so that one 5-star review
// doesn't outrank a 4.8 average built from 60 reviews.
//
//   score = (sum + C * m) / (count + C)
//
// m = prior mean (neutral), C = confidence weight ("reviews it takes to trust the raw average").

const PRIOR_MEAN = 3.5;
const PRIOR_WEIGHT = 5;

function summarize(rawRatings) {
  const count = rawRatings.length;
  if (count === 0) {
    return { count: 0, average: null, score: PRIOR_MEAN };
  }
  const sum = rawRatings.reduce((a, b) => a + b, 0);
  const average = sum / count;
  const score = (sum + PRIOR_WEIGHT * PRIOR_MEAN) / (count + PRIOR_WEIGHT);
  return {
    count,
    average: Math.round(average * 10) / 10,
    score: Math.round(score * 1000) / 1000,
  };
}

function parseRating(v) {
  if (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5) return v;
  if (typeof v === 'string' && /^[1-5]$/.test(v.trim())) return parseInt(v.trim(), 10);
  return null;
}

module.exports = { summarize, parseRating, PRIOR_MEAN, PRIOR_WEIGHT };