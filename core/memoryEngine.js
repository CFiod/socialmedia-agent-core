/**
 * ═══════════════════════════════════════════════════════════
 *  MEMORY ENGINE — Aprendizado e Reuso de Padrões
 * ═══════════════════════════════════════════════════════════
 *
 * PRINCÍPIO: O sistema aprende com o que funcionou.
 * Este engine armazena insights de performance, prioriza
 * ângulos vencedores e depreca o que não performa.
 *
 * INTEGRAÇÃO COM MEMÓRIA EXISTENTE:
 * O projeto já tem /memory/memory.json (memoryService.js).
 * Este engine cria uma camada SEPARADA de aprendizado SaaS:
 *   /memory/performance.json  → histórico de scores por ângulo
 *   /memory/insights.json     → padrões extraídos automáticamente
 *
 * REGRA DE OURO: NÃO modifica o memoryService.js existente.
 * Cria sua própria camada de persistência paralela.
 */

import fs from 'fs';
import path from 'path';
import { scorePost, getTopPerformingAngles } from './scoringEngine.js';
import { logStep } from '../utils/logger.js';

// ── Caminhos de Persistência ──────────────────────────────────────────────────

const MEMORY_DIR         = path.resolve('memory');
const PERFORMANCE_FILE   = path.join(MEMORY_DIR, 'performance.json');
const INSIGHTS_FILE      = path.join(MEMORY_DIR, 'insights.json');

// ── Helpers de I/O ────────────────────────────────────────────────────────────

function ensureFile(filePath, defaultContent = {}) {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
  }
}

function readJSON(filePath, fallback = {}) {
  ensureFile(filePath, fallback);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ── Core: Store Insight ───────────────────────────────────────────────────────

/**
 * storeInsight
 *
 * Persiste um insight de performance após um post ser pontuado.
 * Alimenta o loop de aprendizado do sistema.
 *
 * @param {object} post    - Contexto do post gerado
 * @param {number} score   - Score calculado pelo scoringEngine
 * @param {object} [meta]  - Metadados adicionais (estilo, tipo, etc.)
 */
export function storeInsight(post, score, meta = {}) {
  const insight = {
    id:        `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    ts:        new Date().toISOString(),
    angulo:    post._variation?.id     || post.angle       || 'unknown',
    emocao:    post.emotionState?.label || post.emotion     || 'unknown',
    estilo:    meta.estilo             || post.estilo       || 'unknown',
    tipo:      meta.tipo               || post.tipo         || 'unknown',
    tema:      meta.tema               || post.tema         || 'unknown',
    score,
    verdict:   meta.verdict            || 'unknown',
  };

  // Carregar histórico atual
  const perf = readJSON(PERFORMANCE_FILE, { history: [], updatedAt: null });
  if (!Array.isArray(perf.history)) perf.history = [];

  // Adicionar novo insight
  perf.history.push(insight);
  perf.updatedAt = insight.ts;

  // Manter apenas os últimos 500 registros (evita crescimento infinito)
  if (perf.history.length > 500) {
    perf.history = perf.history.slice(-500);
  }

  writeJSON(PERFORMANCE_FILE, perf);

  // Recalcular insights consolidados
  refreshInsights(perf.history);

  logStep('memoryEngine_store', {
    id:     insight.id,
    angulo: insight.angulo,
    score,
  });

  return insight;
}

/**
 * getInsights
 *
 * Retorna os insights consolidados: melhores ângulos, estilos
 * e emoções que performam mais.
 *
 * @returns {object} - { topAngles, topEstilos, topEmocoes, totalSamples }
 */
export function getInsights() {
  return readJSON(INSIGHTS_FILE, {
    topAngles:    [],
    topEstilos:   [],
    topEmocoes:   [],
    totalSamples: 0,
    updatedAt:    null,
  });
}

/**
 * getPreferredAngle
 *
 * Retorna o ângulo com melhor performance para um dado tema/estilo.
 * Usado pelo generationService para pré-selecionar o ângulo.
 *
 * @param {object} [filter]             - Filtros opcionais
 * @param {string} [filter.estilo]      - Filtrar por estilo visual
 * @param {string} [filter.tipo]        - Filtrar por tipo (carrossel/post)
 * @returns {string}                    - ID do ângulo preferido
 */
export function getPreferredAngle(filter = {}) {
  const insights = getInsights();
  
  if (!insights.topAngles || insights.topAngles.length === 0) {
    return 'emocional'; // Padrão se não há histórico
  }

  // Por enquanto retorna o melhor ângulo global
  // (pode ser filtrado por estilo/tipo no futuro)
  return insights.topAngles[0]?.angulo || 'emocional';
}

/**
 * loadPerformanceHistory
 *
 * Retorna o histórico bruto de performances.
 * Útil para análise externa ou dashboards.
 *
 * @param {number} [limit=100]  - Máx de registros retornados
 * @returns {object[]}
 */
export function loadPerformanceHistory(limit = 100) {
  const perf = readJSON(PERFORMANCE_FILE, { history: [] });
  const history = perf.history || [];
  return history.slice(-limit);
}

// ── Processamento Interno ─────────────────────────────────────────────────────

/**
 * refreshInsights
 *
 * Recalcula os insights consolidados com base no histórico completo.
 * Chamado automaticamente após cada storeInsight.
 *
 * @param {object[]} history - Histórico completo de performances
 */
function refreshInsights(history) {
  const topAngles  = getTopPerformingAngles(history);
  const topEstilos = getRankedField(history, 'estilo');
  const topEmocoes = getRankedField(history, 'emocao');

  const insights = {
    topAngles:    topAngles.slice(0, 5),
    topEstilos:   topEstilos.slice(0, 5),
    topEmocoes:   topEmocoes.slice(0, 5),
    totalSamples: history.length,
    updatedAt:    new Date().toISOString(),
  };

  writeJSON(INSIGHTS_FILE, insights);
}

/**
 * getRankedField — Ranqueia um campo genérico do histórico por score médio.
 */
function getRankedField(history, field) {
  const map = {};

  for (const entry of history) {
    const key = entry[field];
    if (!key || key === 'unknown') continue;
    if (!map[key]) map[key] = { total: 0, count: 0 };
    map[key].total += entry.score || 0;
    map[key].count += 1;
  }

  return Object.entries(map)
    .map(([value, { total, count }]) => ({
      [field]: value,
      avgScore: Math.round(total / count),
      sampleSize: count,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);
}

/**
 * deprecateUnderperforming
 *
 * Identifica ângulos com score médio < 40 e retorna lista
 * para exclusão ou penalização no variation engine.
 *
 * @returns {string[]} - Array de IDs de ângulos a deprecar
 */
export function deprecateUnderperforming() {
  const history = loadPerformanceHistory(200);
  const angles  = getTopPerformingAngles(history);

  const toDeprecate = angles
    .filter(a => a.avgScore < 40 && a.sampleSize >= 3)
    .map(a => a.angulo);

  if (toDeprecate.length > 0) {
    logStep('memoryEngine_deprecate', { angles: toDeprecate });
    console.log(`[MemoryEngine] ⚠️  Ângulos com baixo desempenho: ${toDeprecate.join(', ')}`);
  }

  return toDeprecate;
}

export default { storeInsight, getInsights, getPreferredAngle, loadPerformanceHistory, deprecateUnderperforming };
