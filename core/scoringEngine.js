/**
 * ═══════════════════════════════════════════════════════════
 *  SCORING ENGINE — Cérebro de Performance
 * ═══════════════════════════════════════════════════════════
 *
 * PRINCÍPIO: Sem scoring = sistema burro.
 * Este engine transforma métricas brutas em uma nota ponderada
 * que o memoryEngine usa para priorizar o que funciona e
 * eliminar o que não performa.
 *
 * PESOS (baseados em valor de engajamento real do Instagram):
 *   likes     × 1   → sinal fraco (passivo)
 *   comments  × 2   → sinal médio (esforço)
 *   shares    × 3   → sinal forte (distribuição)
 *   saves     × 4   → sinal forte (valor percebido)
 *   retention × 5   → sinal premium (carrossel/tempo de leitura)
 *
 * VEREDICTOS:
 *   ≥ 80   → VIRAL      → prioridade máxima
 *   ≥ 60   → APPROVED   → usar padrão nos próximos posts
 *   ≥ 40   → AVERAGE    → manter com cautela
 *   < 40   → UNDERPERFORMING → deprecar ângulo/estilo
 */

import { logStep } from '../utils/logger.js';

// ── Pesos de Engajamento ──────────────────────────────────────────────────────

const WEIGHTS = {
  likes:     1,
  comments:  2,
  shares:    3,
  saves:     4,
  retention: 5,  // % de leitura do carrossel (0-100)
};

// Escala máxima esperada por métrica (para normalização 0-100)
const MAX_EXPECTED = {
  likes:     500,
  comments:  50,
  shares:    100,
  saves:     200,
  retention: 100,
};

const TOTAL_WEIGHT = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);

// ── Veredictos ────────────────────────────────────────────────────────────────

const VERDICTS = [
  { min: 80, label: 'VIRAL',           icon: '🔥', action: 'replicate'   },
  { min: 60, label: 'APPROVED',        icon: '✅', action: 'keep'        },
  { min: 40, label: 'AVERAGE',         icon: '⚠️', action: 'watch'       },
  { min:  0, label: 'UNDERPERFORMING', icon: '❌', action: 'deprecate'   },
];

function getVerdict(score) {
  return VERDICTS.find(v => score >= v.min) || VERDICTS[VERDICTS.length - 1];
}

// ── Funções Principais ────────────────────────────────────────────────────────

/**
 * scorePost
 *
 * Calcula a nota ponderada de um post com base nas métricas brutas.
 * Retorna nota de 0-100 + veredicto + sugestões.
 *
 * @param {object} metrics
 * @param {number} [metrics.likes]
 * @param {number} [metrics.comments]
 * @param {number} [metrics.shares]
 * @param {number} [metrics.saves]
 * @param {number} [metrics.retention]  - % de leitura (0-100)
 * @param {object} [meta]               - Metadados do post para log
 * @returns {object}                    - { score, verdict, suggestions, breakdown }
 */
export function scorePost(metrics = {}, meta = {}) {
  const breakdown = {};
  let weightedSum = 0;

  for (const [key, weight] of Object.entries(WEIGHTS)) {
    const raw   = metrics[key] || 0;
    const max   = MAX_EXPECTED[key] || 100;
    // Normaliza para 0-100, cap em 100
    const normalized = Math.min(100, (raw / max) * 100);
    const contribution = (normalized * weight) / TOTAL_WEIGHT;

    breakdown[key] = {
      raw,
      normalized: Math.round(normalized),
      weight,
      contribution: Math.round(contribution * 10) / 10,
    };

    weightedSum += contribution;
  }

  const score   = Math.round(weightedSum);
  const verdict = getVerdict(score);

  const suggestions = buildSuggestions(breakdown, score);

  const result = {
    score,
    verdict: verdict.label,
    icon: verdict.icon,
    action: verdict.action,
    breakdown,
    suggestions,
    scoredAt: new Date().toISOString(),
  };

  logStep('scoringEngine', {
    score,
    verdict: verdict.label,
    tema: meta.tema || 'unknown',
    angulo: meta.angulo || 'unknown',
  });

  return result;
}

/**
 * scoreVariations
 *
 * Ranqueia um array de variações já pontuadas.
 * Retorna as variações em ordem decrescente de score.
 *
 * @param {object[]} variations  - Array de { context, metrics }
 * @returns {object[]}           - Variações ranqueadas com score
 */
export function scoreVariations(variations = []) {
  const scored = variations.map(v => ({
    ...v,
    _score: scorePost(v.metrics || {}, {
      tema:   v.context?.tema,
      angulo: v.context?._variation?.id,
    }),
  }));

  return scored.sort((a, b) => b._score.score - a._score.score);
}

/**
 * buildSuggestions — Gera sugestões de melhoria baseadas no breakdown.
 */
function buildSuggestions(breakdown, score) {
  const suggestions = [];

  if (breakdown.comments?.normalized < 30) {
    suggestions.push('💬 Comentários baixos — adicionar pergunta direta ao final do CTA.');
  }
  if (breakdown.shares?.normalized < 20) {
    suggestions.push('🔁 Compartilhamentos baixos — testar ângulo de confronto ou curiosidade.');
  }
  if (breakdown.saves?.normalized < 25) {
    suggestions.push('🔖 Saves baixos — adicionar conteúdo de valor prático (lista, framework, dica).');
  }
  if (breakdown.retention?.normalized < 40) {
    suggestions.push('📖 Retenção baixa — encurtar slides ou melhorar gancho do slide 1.');
  }
  if (score < 40) {
    suggestions.push('⚠️ Score crítico — considerar deprecar este ângulo/estilo e testar alternativo.');
  }

  return suggestions;
}

/**
 * getTopPerformingAngles
 *
 * Analisa um histórico de scores e retorna os ângulos que mais
 * performam (para uso pelo memoryEngine).
 *
 * @param {object[]} history - Array de { angulo, score }
 * @returns {object[]}       - Ângulos ranqueados por score médio
 */
export function getTopPerformingAngles(history = []) {
  const angleMap = {};

  for (const entry of history) {
    const { angulo, score } = entry;
    if (!angulo) continue;
    if (!angleMap[angulo]) {
      angleMap[angulo] = { total: 0, count: 0 };
    }
    angleMap[angulo].total += score;
    angleMap[angulo].count += 1;
  }

  return Object.entries(angleMap)
    .map(([angulo, { total, count }]) => ({
      angulo,
      avgScore: Math.round(total / count),
      sampleSize: count,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);
}

export default scorePost;
