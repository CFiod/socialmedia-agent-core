/**
 * src/services/promptBuilder.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Façade SaaS — re-exporta as funções reais de construção de prompt que já
 * existem em:
 *   engines/prompt/buildPrompt.js
 *
 * REGRA: NÃO altera nenhuma lógica existente.
 * Este arquivo expõe uma API limpa para a camada /src/pipeline.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export {
  buildPersona,
  buildStyle,
  buildNegative,
  buildPrompt,
  buildPromptV3,
  attachGenerationMetadata
} from '../../engines/prompt/buildPrompt.js';
