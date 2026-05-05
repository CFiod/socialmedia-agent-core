export const AGENTS = {
  COPY: {
    primary: 'anthropic/claude-sonnet-4-5',
    fallback: ['openai/gpt-4o', 'google/gemini-2.0-flash-001']
  },
  ANALYSIS: {
    primary: 'deepseek-chat',
    fallback: ['openai/gpt-4o-mini']
  },
  STRUCTURE: {
    primary: 'openai/gpt-4o-mini',
    fallback: ['deepseek-chat']
  },
  FAST: {
    primary: 'groq/llama-3.3-70b-versatile',
    fallback: ['deepseek-chat']
  },
  VISION: {
    primary: 'google/gemini-2.0-flash-001',
    fallback: []
  },
  IMAGE: {
    primary: 'flux',
    fallback: []
  }
};

export const MODE = 'balanced'; // cheap | balanced | premium
