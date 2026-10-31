

module.exports = {
  GEMINI_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.8-flash', 
  GEMINI_FALLBACK_MODELS: (process.env.GEMINI_FALLBACK_MODELS || 'gemini-3.5-flash-lite,gemini-flash-latest')
    .split(',').map((m) => m.trim()).filter(Boolean),
  API_URL: 'https://api.anthropic.com/v1/messages',
  API_VERSION: '2023-06-01',
  MODEL: process.env.AI_MODEL || 'claude-haiku-5-5',
  TIMEOUT_MS: Number(process.env.AI_TIMEOUT_MS) || 15000,

  MIN_QUESTIONS: 5,
  MAX_QUESTIONS: 10,

  MAX_SYMPTOM_CHARS: 300,
  MAX_QUESTION_CHARS: 300,
  MAX_OPTION_CHARS: 150,
  MAX_OPTIONS: 8,

  RATE_LIMIT_MAX: 80,
  RATE_LIMIT_WINDOW_MS: 10 * 60 * 1000,
};
