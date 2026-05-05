/**
 * src/pipeline/llmRouter.js
 * ─────────────────────────────────────────────────────────────────────────────
 * LLM Router — seleciona o modelo correto para cada tarefa com base no
 * mapa AGENTS existente em ai/config/models.js.
 *
 * Suporta:
 *  - Seleção por role (COPY | ANALYSIS | STRUCTURE | FAST | VISION | IMAGE)
 *  - Cascata automática: primary → fallbacks em caso de erro
 *  - Modo de operação: cheap | balanced | premium (lido de .env ou models.js)
 *
 * REGRA: NÃO altera nenhuma lógica existente.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { AGENTS, MODE } from '../../ai/config/models.js';

// ── Mapa de override por modo de operação ─────────────────────────────────────
const MODE_OVERRIDES = {
  cheap: {
    COPY:      'groq/llama-3.3-70b-versatile',
    ANALYSIS:  'deepseek-chat',
    STRUCTURE: 'deepseek-chat'
  },
  balanced: {},   // usa primários definidos em AGENTS (padrão)
  premium: {
    COPY:      'anthropic/claude-opus-4-5',
    ANALYSIS:  'openai/gpt-4o',
    STRUCTURE: 'openai/gpt-4o'
  }
};

/**
 * Retorna o modelo primário para o role solicitado,
 * respeitando o modo de operação ativo.
 *
 * @param {'COPY'|'ANALYSIS'|'STRUCTURE'|'FAST'|'VISION'|'IMAGE'} role
 * @param {string} [modeOverride]  - 'cheap' | 'balanced' | 'premium'
 * @returns {string} ID do modelo
 */
export function resolveModel(role, modeOverride) {
  const activeMode = modeOverride || MODE || 'balanced';
  const overrides  = MODE_OVERRIDES[activeMode] || {};

  if (overrides[role]) return overrides[role];

  const agentConfig = AGENTS[role];
  if (!agentConfig) {
    throw new Error(`[llmRouter] Role desconhecido: "${role}". Use: ${Object.keys(AGENTS).join(' | ')}`);
  }

  return agentConfig.primary;
}

/**
 * Retorna a lista de fallbacks para o role solicitado.
 *
 * @param {'COPY'|'ANALYSIS'|'STRUCTURE'|'FAST'|'VISION'|'IMAGE'} role
 * @returns {string[]}
 */
export function getFallbacks(role) {
  return AGENTS[role]?.fallback ?? [];
}

/**
 * Executa uma função de chamada LLM com cascata automática.
 * Tenta o modelo primário e, em caso de falha, percorre os fallbacks.
 *
 * @param {string}   role        - Role do agente (ex: 'COPY')
 * @param {Function} callFn      - async (modelId: string) => resultado
 * @param {string}   [modeOverride]
 * @returns {Promise<any>}
 */
export async function routeWithFallback(role, callFn, modeOverride) {
  const primary   = resolveModel(role, modeOverride);
  const fallbacks = getFallbacks(role);
  const chain     = [primary, ...fallbacks];

  let lastError;
  for (const modelId of chain) {
    try {
      const result = await callFn(modelId);
      return result;
    } catch (err) {
      console.warn(`[llmRouter] Falhou com "${modelId}" (${role}): ${err.message}`);
      lastError = err;
    }
  }

  throw new Error(
    `[llmRouter] Todos os modelos falharam para role "${role}". Último erro: ${lastError?.message}`
  );
}

/**
 * Lista todos os roles disponíveis e seus modelos primários.
 * Útil para diagnóstico e logs.
 *
 * @returns {Object}
 */
export function listRoutes() {
  return Object.fromEntries(
    Object.keys(AGENTS).map(role => [role, resolveModel(role)])
  );
}
