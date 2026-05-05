import { AGENTS, MODE } from '../config/models.js';
import { config } from '../../config/config.js';

// ── Verifica quais providers estão realmente disponíveis (com API key) ───────
function getAvailableModels(preferredModels) {
  const available = [];

  for (const model of preferredModels) {
    if (model.includes('anthropic/') || model.includes('openai/') && model.includes('/')) {
      // OpenRouter models
      if (config.OPENROUTER_API_KEY) available.push(model);
    } else if (model.includes('gemini') || model.includes('google/')) {
      if (config.GOOGLE_API_KEY) available.push(model);
    } else if (model.includes('llama') || model.includes('groq/')) {
      if (config.GROQ_API_KEY) available.push(model);
    } else if (model.includes('deepseek')) {
      if (config.DEEPSEEK_API_KEY) available.push(model);
    } else if (model.includes('gpt-')) {
      if (config.OPENAI_API_KEY) available.push(model);
    } else {
      available.push(model); // unknown → tenta
    }
  }

  return available;
}

// ── Cadeia de fallback global (ordem de prioridade quando tudo falha) ────────
const GLOBAL_FALLBACK = [
  'google/gemini-2.0-flash-001',
  'groq/llama-3.3-70b-versatile',
  'deepseek-chat',
  'anthropic/claude-sonnet-4-5',
  'openai/gpt-4o-mini',
];

export function createPlan(intent) {
  let preferredModels;
  let strategy;

  // ── Define modelos preferidos por modo + intenção ──────────────────────────
  if (MODE === 'cheap') {
    preferredModels = [
      'groq/llama-3.3-70b-versatile',
      'google/gemini-2.0-flash-001',
      'deepseek-chat',
    ];
    strategy = 'single';

  } else if (MODE === 'premium') {
    if (intent === 'COPY') {
      preferredModels = [
        'anthropic/claude-sonnet-4-5',
        'google/gemini-2.0-flash-001',
        'deepseek-chat',
      ];
      strategy = 'parallel+rank+refine';
    } else {
      preferredModels = [AGENTS[intent]?.primary, ...GLOBAL_FALLBACK];
      strategy = 'single';
    }

  } else {
    // Balanced Mode (default)
    switch (intent) {
      case 'COPY':
        preferredModels = [
          'google/gemini-2.0-flash-001',   // gratuito + rápido
          'groq/llama-3.3-70b-versatile',  // gratuito + forte
          'anthropic/claude-sonnet-4-5',    // premium fallback
          'deepseek-chat',
        ];
        strategy = 'parallel+rank';
        break;

      case 'ANALYSIS':
        preferredModels = [
          'google/gemini-2.0-flash-001',
          'deepseek-chat',
          'openai/gpt-4o-mini',
        ];
        strategy = 'parallel+rank';
        break;

      case 'STRUCTURE':
        preferredModels = [
          'google/gemini-2.0-flash-001',
          'openai/gpt-4o-mini',
          'deepseek-chat',
        ];
        strategy = 'single';
        break;

      default: // FAST
        preferredModels = [
          'groq/llama-3.3-70b-versatile',
          'google/gemini-2.0-flash-001',
        ];
        strategy = 'single';
        break;
    }
  }

  // ── Filtra para modelos com API key disponível ────────────────────────────
  let models = getAvailableModels(preferredModels);

  // Se nenhum preferido disponível, tenta fallback global
  if (models.length === 0) {
    models = getAvailableModels(GLOBAL_FALLBACK);
  }

  if (models.length === 0) {
    throw new Error('Nenhum provedor de IA configurado (.env). Configure pelo menos uma API key.');
  }

  // Para parallel, precisamos de pelo menos 2 modelos
  if (strategy.includes('parallel') && models.length < 2) {
    strategy = 'single';
  }

  // Em parallel, limitamos a 2 modelos para não gastar demais
  if (strategy.includes('parallel')) {
    models = models.slice(0, 2);
  } else {
    models = [models[0]];
  }

  return { models, strategy };
}
