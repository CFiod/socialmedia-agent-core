/**
 * ═══════════════════════════════════════════════════════════
 *  VARIATION ENGINE — Geração de Variações A/B
 * ═══════════════════════════════════════════════════════════
 *
 * PRINCÍPIO: A partir de um conteúdo base (copy), gera N
 * variações com ângulos emocionais distintos para A/B test.
 *
 * Cada variação é tratada como um "candidato" independente
 * pelo pipeline. O scoringEngine depois ranqueia qual performa.
 *
 * ÂNGULOS DISPONÍVEIS:
 *   emocional   → foca na dor e identificação
 *   racional    → foca em causa/efeito e lógica
 *   confronto   → foca em quebra de crença, provoca desconforto
 *   curiosidade → foca em mistério, gancho, gera clique
 *   esperanca   → foca em transformação e possibilidade
 *
 * Sem tocar nos engines existentes — apenas gera variantes
 * do contexto de entrada para o pipeline processar.
 */

import { logStep } from '../utils/logger.js';

// ── Definições de Ângulos ──────────────────────────────────────────────────────

const ANGLES = {
  emocional: {
    id: 'emocional',
    label: 'Emocional',
    description: 'Identificação e dor — foca no que a pessoa sente agora',
    hookBias: 'espelho',
    intensidade: 'alta',
    gatilho: 'identificação',
    arquetipo: 'espelho',
    bias_prompt: 'Foque na dor presente, no que a pessoa sente AGORA. Espelhamento puro.',
  },
  racional: {
    id: 'racional',
    label: 'Racional',
    description: 'Causa-efeito — explica o mecanismo de forma clara',
    hookBias: 'insight',
    intensidade: 'media',
    gatilho: 'curiosidade',
    arquetipo: 'mentor',
    bias_prompt: 'Explique o mecanismo de forma clara e objetiva. "O problema não é X, é Y."',
  },
  confronto: {
    id: 'confronto',
    label: 'Confronto',
    description: 'Quebra de crença — provoca desconforto produtivo',
    hookBias: 'provocacao',
    intensidade: 'muito_alta',
    gatilho: 'choque',
    arquetipo: 'confrontador',
    bias_prompt: 'Quebre uma crença forte. Seja direto e desconfortável. "Ninguém fala isso, mas..."',
  },
  curiosidade: {
    id: 'curiosidade',
    label: 'Curiosidade',
    description: 'Mistério e gancho — gera clique e compartilhamento',
    hookBias: 'curiosidade',
    intensidade: 'media',
    gatilho: 'curiosidade',
    arquetipo: 'guia',
    bias_prompt: 'Crie mistério. Use gancho aberto que exige leitura completa para fechar.',
  },
  esperanca: {
    id: 'esperanca',
    label: 'Esperança',
    description: 'Transformação possível — micro-alívio e direcionamento',
    hookBias: 'alivio',
    intensidade: 'media',
    gatilho: 'identificação',
    arquetipo: 'guia',
    bias_prompt: 'Mostre que existe saída. Valide a dor e aponte possibilidade real de mudança.',
  },
};

// ── Geração de Variações ──────────────────────────────────────────────────────

/**
 * generateVariations
 *
 * Retorna N variações do contexto de entrada com ângulos distintos.
 * Cada variação enriquece o contexto original — não o substitui.
 *
 * @param {object} baseContext  - Contexto base (tema, tipo, estilo, etc.)
 * @param {object} [options]
 * @param {string[]} [options.angles]   - Ângulos específicos a usar
 * @param {number}  [options.limit]     - Máx de variações (padrão: 4)
 * @returns {object[]} Array de contextos enriquecidos com ângulo
 */
export function generateVariations(baseContext, options = {}) {
  const {
    angles = ['emocional', 'racional', 'confronto', 'curiosidade'],
    limit = 4,
  } = options;

  const selectedAngles = angles.slice(0, limit);

  const variations = selectedAngles.map((angleId) => {
    const angle = ANGLES[angleId];
    if (!angle) {
      console.warn(`[VariationEngine] Ângulo desconhecido: ${angleId}. Pulando.`);
      return null;
    }

    return {
      ...baseContext,
      _variation: {
        id: angle.id,
        label: angle.label,
        intensidade: angle.intensidade,
        gatilho: angle.gatilho,
        arquetipo: angle.arquetipo,
        bias_prompt: angle.bias_prompt,
      },
      // Injeta no contexto de marketing/estratégia para o pipeline usar
      marketingContext: {
        ...(baseContext.marketingContext || {}),
        variacao_angulo: angle.id,
        gatilho: angle.gatilho,
      },
    };
  }).filter(Boolean);

  logStep('variationEngine', {
    tema: baseContext.tema,
    total_variations: variations.length,
    angles: selectedAngles,
  });

  return variations;
}

/**
 * getSingleVariation
 *
 * Retorna apenas 1 variação pelo ID do ângulo.
 * Útil para forçar um ângulo específico via CLI.
 *
 * @param {object} baseContext - Contexto base
 * @param {string} angleId     - ID do ângulo (ex: 'emocional')
 * @returns {object}           - Contexto enriquecido
 */
export function getSingleVariation(baseContext, angleId = 'emocional') {
  const result = generateVariations(baseContext, {
    angles: [angleId],
    limit: 1,
  });
  return result[0] || baseContext;
}

/**
 * listAngles — Retorna todos os ângulos disponíveis com descrição.
 */
export function listAngles() {
  return Object.values(ANGLES).map(({ id, label, description, intensidade }) => ({
    id, label, description, intensidade,
  }));
}

export default generateVariations;
