/**
 * ═══════════════════════════════════════════════════════════
 *  OPTIMIZE WORKER — Aprendizado Automático de Performance
 * ═══════════════════════════════════════════════════════════
 *
 * PRINCÍPIO: Este worker é chamado APÓS a publicação do post,
 * quando as métricas do Instagram estão disponíveis.
 * Ele fecha o loop de aprendizado:
 *   publicar → coletar métricas → score → armazenar insight → priorizar
 *
 * USO ATUAL (manual — coleta de métricas via CLI):
 *   node workers/optimizeWorker.js --postId=... --likes=120 --comments=15
 *
 * USO FUTURO (automático via Instagram API / webhook):
 *   O worker será chamado automaticamente pelo analyticsService.js
 *
 * FLUXO:
 *   métricas brutas
 *     ↓
 *   scoringEngine.scorePost()
 *     ↓
 *   memoryEngine.storeInsight()
 *     ↓
 *   insights.json atualizado
 *     ↓
 *   próxima geração prioriza o que funciona
 */

import path from 'path';
import fs from 'fs';
import { scorePost, getTopPerformingAngles } from '../core/scoringEngine.js';
import {
  storeInsight,
  getInsights,
  deprecateUnderperforming,
  loadPerformanceHistory,
} from '../core/memoryEngine.js';
import { readJSON as readJSONUtil } from '../utils/fileManager.js';
import { logStep, logError } from '../utils/logger.js';

// ── Função Principal ──────────────────────────────────────────────────────────

/**
 * run
 *
 * Processa as métricas de um post publicado e armazena o aprendizado.
 *
 * @param {object} post
 * @param {string} post.execucaoId     - ID da execução do post (nome da pasta em /output/)
 * @param {object} post.metrics        - Métricas brutas do Instagram
 * @param {number} [post.metrics.likes]
 * @param {number} [post.metrics.comments]
 * @param {number} [post.metrics.shares]
 * @param {number} [post.metrics.saves]
 * @param {number} [post.metrics.retention]  - % de leitura (0-100)
 * @returns {Promise<object>}          - { score, verdict, insight, suggestions }
 */
export async function run(post = {}) {
  const { execucaoId, metrics = {} } = post;

  if (!execucaoId) {
    throw new Error('[OptimizeWorker] execucaoId é obrigatório.');
  }

  logStep('optimizeWorker_start', { execucaoId, metrics });
  console.log(`\n📊 [OptimizeWorker] Processando métricas para: ${execucaoId}`);

  try {
    // ── 1. Carregar contexto do post salvo ─────────────────────────────────
    const outputDir = path.resolve('output', execucaoId);
    const dataJson  = loadPostData(outputDir);
    const metaJson  = loadMetaData(outputDir);

    const postContext = {
      _variation:   dataJson?._narrativeState?.angulo_variacao
                    ? { id: dataJson._narrativeState.angulo_variacao } : null,
      emotionState: metaJson?.estrategia?.emocao_principal
                    ? { label: metaJson.estrategia.emocao_principal } : null,
      tema:         metaJson?.estrategia?.tema || execucaoId,
      tipo:         metaJson?.tipo || 'unknown',
      estilo:       dataJson?.estilo_visual?.base || metaJson?.estrategia?.estilo || 'unknown',
    };

    // ── 2. Calcular score ──────────────────────────────────────────────────
    const scoreResult = scorePost(metrics, {
      tema:   postContext.tema,
      angulo: postContext._variation?.id || 'default',
    });

    console.log(`\n  📈 Score: ${scoreResult.score}/100 — ${scoreResult.icon} ${scoreResult.verdict}`);

    if (scoreResult.suggestions.length > 0) {
      console.log('\n  💡 Sugestões:');
      scoreResult.suggestions.forEach(s => console.log(`     ${s}`));
    }

    // ── 3. Armazenar insight no memoryEngine ───────────────────────────────
    const insight = storeInsight(postContext, scoreResult.score, {
      estilo:  postContext.estilo,
      tipo:    postContext.tipo,
      tema:    postContext.tema,
      verdict: scoreResult.verdict,
    });

    logStep('optimizeWorker_stored', {
      execucaoId,
      score: scoreResult.score,
      verdict: scoreResult.verdict,
      angulo: postContext._variation?.id || 'default',
    });

    // ── 4. Verificar deprecação de ângulos ─────────────────────────────────
    const toDeprecate = deprecateUnderperforming();
    if (toDeprecate.length > 0) {
      console.log(`\n  ⚠️  [MemoryEngine] Ângulos com baixo desempenho detectados: ${toDeprecate.join(', ')}`);
      console.log('     → Serão evitados nas próximas gerações automaticamente.');
    }

    // ── 5. Salvar score no meta.json do post ───────────────────────────────
    if (metaJson && outputDir) {
      metaJson.performance_score = {
        score:       scoreResult.score,
        verdict:     scoreResult.verdict,
        metrics,
        scoredAt:    new Date().toISOString(),
        suggestions: scoreResult.suggestions,
      };
      saveMetaData(outputDir, metaJson);
    }

    // ── 6. Mostrar ranking atualizado ──────────────────────────────────────
    const history  = loadPerformanceHistory(50);
    const topAngles = getTopPerformingAngles(history);

    if (topAngles.length > 0) {
      console.log('\n  🏆 Top ângulos atuais:');
      topAngles.slice(0, 3).forEach((a, i) =>
        console.log(`     ${i + 1}. ${a.angulo} → avg ${a.avgScore}/100 (${a.sampleSize} posts)`)
      );
    }

    const result = {
      execucaoId,
      score:    scoreResult.score,
      verdict:  scoreResult.verdict,
      insight,
      suggestions: scoreResult.suggestions,
      breakdown:   scoreResult.breakdown,
    };

    console.log(`\n  ✅ [OptimizeWorker] Aprendizado armazenado com sucesso.`);
    return result;

  } catch (error) {
    logError('optimizeWorker', error, { execucaoId });
    console.error(`  ❌ [OptimizeWorker] Falha: ${error.message}`);
    throw error;
  }
}

/**
 * runFromCLI
 *
 * Entry point para execução direta via CLI:
 *   node workers/optimizeWorker.js --postId=2026-04-28T10-00_carrossel --likes=200 --saves=80
 */
export async function runFromCLI() {
  const args    = process.argv.slice(2);
  const getArg  = (key) => {
    const found = args.find(a => a.startsWith(`--${key}=`));
    return found ? found.split('=')[1] : null;
  };

  const execucaoId = getArg('postId');
  if (!execucaoId) {
    console.error('Uso: node workers/optimizeWorker.js --postId=<id> [--likes=N] [--comments=N] [--shares=N] [--saves=N] [--retention=N]');
    process.exit(1);
  }

  const metrics = {
    likes:     Number(getArg('likes')     || 0),
    comments:  Number(getArg('comments')  || 0),
    shares:    Number(getArg('shares')    || 0),
    saves:     Number(getArg('saves')     || 0),
    retention: Number(getArg('retention') || 0),
  };

  await run({ execucaoId, metrics });
}

// ── Helpers I/O ───────────────────────────────────────────────────────────────

function loadPostData(outputDir) {
  const filePath = path.join(outputDir, 'data.json');
  if (!fs.existsSync(filePath)) return null;
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch { return null; }
}

function loadMetaData(outputDir) {
  const filePath = path.join(outputDir, 'meta.json');
  if (!fs.existsSync(filePath)) return null;
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch { return null; }
}

function saveMetaData(outputDir, data) {
  const filePath = path.join(outputDir, 'meta.json');
  try { fs.writeFileSync(filePath, JSON.stringify(data, null, 2)); } catch {}
}

// ── Auto-execução via CLI ─────────────────────────────────────────────────────
// Detecta se foi chamado diretamente: node workers/optimizeWorker.js
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  runFromCLI().catch(err => {
    console.error('Erro fatal:', err.message);
    process.exit(1);
  });
}

export default { run, runFromCLI };
