/**
 * ============================================================
 * 🔁 ANTI-REPETITION ENGINE — Global Memory Controller
 * ============================================================
 * Sistema de memória de curto prazo que impede repetição de:
 *   - Composição visual
 *   - Tipo de cena
 *   - Estilo visual
 *   - Tipo de copy / hook pattern
 *   - Gênero do personagem
 *   - Ambiente
 *
 * REGRAS MANDATÓRIAS:
 *   - Nunca repetir composição 2x seguidas
 *   - Nunca repetir cena 2x seguidas
 *   - Limitar humano a máximo 3 em 5
 *   - Limitar mesmo gênero a 2 em 4
 *   - Limitar padrão de copy a 2 em 5
 * ============================================================
 */

import fs from 'fs';
import path from 'path';

const HISTORY_FILE = path.resolve('memory', 'history.json');
const PERFORMANCE_FILE = path.resolve('memory', 'performance_log.json');

// ── DEFAULTS ─────────────────────────────────────────────────────────────────

const EMPTY_HISTORY = {
  version: '3.0',
  entries: [],
  constraints: {
    max_consecutive_same_scene: 1,
    max_consecutive_same_composition: 1,
    max_human_in_last_5: 3,
    max_same_gender_in_last_4: 2,
    max_same_hook_in_last_5: 2,
    max_same_environment_in_last_3: 1,
    max_same_style_in_last_3: 2,
  },
};

// ── CORE: LOAD / SAVE ────────────────────────────────────────────────────────

export function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
      return { ...EMPTY_HISTORY, ...data };
    }
  } catch (err) {
    console.warn(`   ⚠️ [AntiRepetition] Erro ao ler histórico: ${err.message}`);
  }
  return { ...EMPTY_HISTORY };
}

export function saveHistory(history) {
  const dir = path.dirname(HISTORY_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
}

// ── REGISTRAR POST GERADO ───────────────────────────────────────────────────

/**
 * Registra um post gerado no histórico de anti-repetição.
 *
 * @param {Object} entry
 * @param {string} entry.scene_type — tipo de cena (humano, simbolico, etc.)
 * @param {string} entry.composition — tipo de composição (center_focus, side_weight, etc.)
 * @param {string} entry.style — estilo visual (editorial_minimalist, cinematic_soft, etc.)
 * @param {string} entry.hook_pattern — padrão de hook (quebra_crenca, identificacao, etc.)
 * @param {string} entry.copy_intent — intenção da copy (atrair, engajar, converter)
 * @param {string} entry.gender — gênero do personagem (woman, man, neutral, none)
 * @param {string} entry.environment — tipo de ambiente
 * @param {string} entry.objetivo — objetivo de marketing
 * @param {string} entry.tipoPost — tipo de post
 * @param {string} entry.emotionId — emoção usada
 * @param {string} [entry.headline] — headline do post (para análise)
 */
export function registerPost(entry) {
  const history = loadHistory();

  history.entries.push({
    ...entry,
    timestamp: new Date().toISOString(),
    id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
  });

  // Manter apenas últimos 50 posts no histórico ativo
  if (history.entries.length > 50) {
    history.entries = history.entries.slice(-50);
  }

  saveHistory(history);
  console.log(`   🧠 [AntiRepetition] Post registrado no histórico (${history.entries.length} entries)`);
}

// ── CONSULTAS ────────────────────────────────────────────────────────────────

/**
 * Retorna os últimos N valores de um campo específico.
 *
 * @param {Object} history — histórico carregado
 * @param {string} field — campo a consultar
 * @param {number} n — quantidade
 * @returns {string[]}
 */
export function getLastN(history, field, n = 5) {
  const entries = history?.entries || [];
  return entries
    .slice(-n)
    .map(e => e[field])
    .filter(Boolean);
}

/**
 * Verifica se um valor pode ser usado (não viola regras de repetição).
 *
 * @param {Object} history — histórico carregado
 * @param {string} field — campo a verificar
 * @param {string} value — valor proposto
 * @param {number} maxConsecutive — máximo de repetições consecutivas permitidas
 * @returns {boolean}
 */
export function canUse(history, field, value, maxConsecutive = 1) {
  const recent = getLastN(history, field, maxConsecutive);
  const allSame = recent.length >= maxConsecutive && recent.every(v => v === value);
  return !allSame;
}

/**
 * Conta quantas vezes um valor aparece nos últimos N registros.
 *
 * @param {Object} history
 * @param {string} field
 * @param {string} value
 * @param {number} lastN
 * @returns {number}
 */
export function countInLast(history, field, value, lastN = 5) {
  const recent = getLastN(history, field, lastN);
  return recent.filter(v => v === value).length;
}

// ── VALIDAÇÃO COMPLETA ───────────────────────────────────────────────────────

/**
 * Valida se uma configuração de post proposta viola regras de anti-repetição.
 * Retorna lista de violações e sugestões.
 *
 * @param {Object} proposed — configuração proposta
 * @param {Object} [hist] — histórico (carregado automaticamente se não fornecido)
 * @returns {Object} — { valid, violations, suggestions }
 */
export function validateAgainstHistory(proposed, hist = null) {
  const history = hist || loadHistory();
  const violations = [];
  const suggestions = [];

  const c = history.constraints;

  // REGRA 1: Composição consecutiva
  if (proposed.composition && !canUse(history, 'composition', proposed.composition, c.max_consecutive_same_composition)) {
    violations.push(`Composição "${proposed.composition}" usada no último post`);
    const usedComps = getLastN(history, 'composition', 3);
    suggestions.push(`Evitar: ${usedComps.join(', ')}. Sugerir: ${suggestAlternative('composition', usedComps)}`);
  }

  // REGRA 2: Cena consecutiva
  if (proposed.scene_type && !canUse(history, 'scene_type', proposed.scene_type, c.max_consecutive_same_scene)) {
    violations.push(`Cena "${proposed.scene_type}" usada no último post`);
    const usedScenes = getLastN(history, 'scene_type', 3);
    suggestions.push(`Evitar: ${usedScenes.join(', ')}`);
  }

  // REGRA 3: Excesso de humano
  if ((proposed.scene_type === 'humano' || proposed.scene_type === 'silhueta') &&
      countInLast(history, 'scene_type', 'humano', 5) + countInLast(history, 'scene_type', 'silhueta', 5) >= c.max_human_in_last_5) {
    violations.push(`Excesso de cenas humanas: ${c.max_human_in_last_5} nos últimos 5 posts`);
    suggestions.push('Usar: simbolico, objeto, ambiente, abstrato');
  }

  // REGRA 4: Excesso de mesmo gênero
  if (proposed.gender && countInLast(history, 'gender', proposed.gender, 4) >= c.max_same_gender_in_last_4) {
    violations.push(`Gênero "${proposed.gender}" usado ${c.max_same_gender_in_last_4}x nos últimos 4 posts`);
    suggestions.push(`Alternar para: ${proposed.gender === 'woman' ? 'man, neutral' : 'woman, neutral'}`);
  }

  // REGRA 5: Hook pattern repetido
  if (proposed.hook_pattern && countInLast(history, 'hook_pattern', proposed.hook_pattern, 5) >= c.max_same_hook_in_last_5) {
    violations.push(`Hook "${proposed.hook_pattern}" usado demais`);
    suggestions.push('Variar padrão de hook');
  }

  // REGRA 6: Ambiente repetido
  if (proposed.environment && !canUse(history, 'environment', proposed.environment, c.max_same_environment_in_last_3)) {
    violations.push(`Ambiente "${proposed.environment}" usado recentemente`);
  }

  // REGRA 7: Estilo repetido
  if (proposed.style && countInLast(history, 'style', proposed.style, 3) >= c.max_same_style_in_last_3) {
    violations.push(`Estilo "${proposed.style}" usado demais nos últimos 3 posts`);
  }

  return {
    valid: violations.length === 0,
    violations,
    suggestions,
  };
}

// ── SUGESTÃO DE ALTERNATIVA ──────────────────────────────────────────────────

function suggestAlternative(field, usedValues) {
  const ALL = {
    composition: ['center_focus', 'side_weight', 'negative_space', 'symbolic_scene', 'split_emotion'],
    scene_type: ['humano', 'silhueta', 'objeto', 'ambiente', 'simbolico', 'abstrato', 'tipografia'],
    style: ['editorial_minimalist', 'cinematic_soft', 'photoreal_editorial', 'painterly_golden', 'dreamlike_pastel', 'grain_film_editorial'],
  };

  const pool = ALL[field] || [];
  const available = pool.filter(v => !usedValues.includes(v));
  return available.length > 0 ? available.slice(0, 3).join(', ') : 'qualquer alternativa';
}

// ── PERFORMANCE LOG ──────────────────────────────────────────────────────────

/**
 * Registra dados de performance de um post para o feedback loop.
 *
 * @param {Object} entry
 */
export function logPerformance(entry) {
  const dir = path.dirname(PERFORMANCE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let log = { version: '1.0', posts: [] };
  try {
    if (fs.existsSync(PERFORMANCE_FILE)) {
      log = JSON.parse(fs.readFileSync(PERFORMANCE_FILE, 'utf-8'));
    }
  } catch (_) {}

  log.posts.push({
    ...entry,
    logged_at: new Date().toISOString(),
  });

  // Manter últimos 200
  if (log.posts.length > 200) {
    log.posts = log.posts.slice(-200);
  }

  fs.writeFileSync(PERFORMANCE_FILE, JSON.stringify(log, null, 2), 'utf-8');
}

/**
 * Carrega o log de performance.
 * @returns {Object}
 */
export function loadPerformanceLog() {
  try {
    if (fs.existsSync(PERFORMANCE_FILE)) {
      return JSON.parse(fs.readFileSync(PERFORMANCE_FILE, 'utf-8'));
    }
  } catch (_) {}
  return { version: '1.0', posts: [] };
}

/**
 * Placeholder para ajuste de pesos com base em performance.
 * Será integrado quando dados reais de engajamento estiverem disponíveis.
 *
 * @param {Object} performanceLog
 * @returns {Object} — pesos ajustados
 */
export function ajustarPesosComBaseEmPerformance(performanceLog = null) {
  const log = performanceLog || loadPerformanceLog();
  const posts = log.posts || [];

  if (posts.length < 10) {
    console.log('   📊 [Performance] Dados insuficientes para ajuste (mínimo: 10 posts)');
    return null;
  }

  // Agrupar por tipo de cena e calcular performance média
  const byScene = {};
  const byComposition = {};
  const byHookPattern = {};
  const byStyle = {};

  posts.forEach(p => {
    if (!p.metrics) return;

    const score = (p.metrics.likes || 0) * 1 +
                  (p.metrics.saves || 0) * 3 +
                  (p.metrics.shares || 0) * 2 +
                  (p.metrics.comments || 0) * 1.5;

    if (p.scene_type) {
      if (!byScene[p.scene_type]) byScene[p.scene_type] = [];
      byScene[p.scene_type].push(score);
    }
    if (p.composition) {
      if (!byComposition[p.composition]) byComposition[p.composition] = [];
      byComposition[p.composition].push(score);
    }
    if (p.hook_pattern) {
      if (!byHookPattern[p.hook_pattern]) byHookPattern[p.hook_pattern] = [];
      byHookPattern[p.hook_pattern].push(score);
    }
    if (p.style) {
      if (!byStyle[p.style]) byStyle[p.style] = [];
      byStyle[p.style].push(score);
    }
  });

  const average = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const insights = {
    bestScene: Object.entries(byScene).sort((a, b) => average(b[1]) - average(a[1]))[0]?.[0],
    bestComposition: Object.entries(byComposition).sort((a, b) => average(b[1]) - average(a[1]))[0]?.[0],
    bestHookPattern: Object.entries(byHookPattern).sort((a, b) => average(b[1]) - average(a[1]))[0]?.[0],
    bestStyle: Object.entries(byStyle).sort((a, b) => average(b[1]) - average(a[1]))[0]?.[0],
    totalPostsAnalyzed: posts.filter(p => p.metrics).length,
    averagesByScene: Object.fromEntries(Object.entries(byScene).map(([k, v]) => [k, Math.round(average(v))])),
    averagesByComposition: Object.fromEntries(Object.entries(byComposition).map(([k, v]) => [k, Math.round(average(v))])),
  };

  console.log(`   📊 [Performance] Análise de ${insights.totalPostsAnalyzed} posts:`);
  console.log(`      Melhor cena: ${insights.bestScene || 'N/A'}`);
  console.log(`      Melhor composição: ${insights.bestComposition || 'N/A'}`);
  console.log(`      Melhor hook: ${insights.bestHookPattern || 'N/A'}`);

  return insights;
}

// ── EXPORTS ──────────────────────────────────────────────────────────────────

export default {
  loadHistory,
  saveHistory,
  registerPost,
  getLastN,
  canUse,
  countInLast,
  validateAgainstHistory,
  logPerformance,
  loadPerformanceLog,
  ajustarPesosComBaseEmPerformance,
};
