import dotenv from 'dotenv';
dotenv.config();

export const config = {
    // ── Provedores de Texto ────────────────────────────────────────────────────
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
    GROQ_API_KEY: process.env.GROQ_API_KEY || '',
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || '',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',

    // ── URLs Base ─────────────────────────────────────────────────────────────
    OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',

    // ── Modelos ───────────────────────────────────────────────────────────────
    // Claude Sonnet é o modelo PRIMÁRIO para geração de copy (via OpenRouter)
    // Fallback automático: Gemini → Groq → DeepSeek → GPT-4o-mini
    MODEL_TEXT:   process.env.MODEL_TEXT   || 'anthropic/claude-sonnet-4-5',
    MODEL_IMAGE:  process.env.MODEL_IMAGE  || 'flux',
    MODEL_VISION: process.env.MODEL_VISION || 'google/gemini-2.0-flash-001',
};
