/**
 * ═══════════════════════════════════════════════════════════
 *  GENERATE WORKER — Execução Assíncrona de Geração
 * ═══════════════════════════════════════════════════════════
 *
 * PRINCÍPIO: O pipeline NÃO deve rodar de forma síncrona
 * quando há múltiplos jobs. Este worker permite escala real:
 * - Processamento em fila (1 job por vez por ora, multi-job no futuro)
 * - Persistência de estado do job (pending → running → done/failed)
 * - Isolamento de falhas (1 job falhar não mata os outros)
 *
 * USO ATUAL (CLI, sem fila real):
 *   import { run } from './workers/generateWorker.js';
 *   await run({ tipo: 'carrossel', tema: '...', dataBase: new Date() });
 *
 * USO FUTURO (com fila BullMQ / p-queue):
 *   queue.add('generate', job.data);
 *
 * INTERFACE DO JOB:
 *   job.id     - ID único do job
 *   job.data   - Mesmo input do generationService.generateContent()
 *   job.status - 'pending' | 'running' | 'done' | 'failed'
 */

import path from 'path';
import fs from 'fs';
import { generateContent } from '../services/generationService.js';
import { generateAndSaveImages } from '../services/imageService.js';
import { generatePreview } from '../utils/previewGenerator.js';
import { saveToMemory } from '../services/memoryService.js';
import { saveJSON } from '../utils/fileManager.js';
import { logStep, logError } from '../utils/logger.js';

// ── Jobs em memória (substituir por Redis/DB no SaaS real) ────────────────────
const jobRegistry = new Map();

// ── Funções Exportadas ────────────────────────────────────────────────────────

/**
 * run
 *
 * Executa um job de geração completo: copy → scene → imagem → preview.
 * Retorna o resultado completo ou lança erro em caso de falha.
 *
 * @param {object} job
 * @param {string} job.id        - ID do job (gerado automaticamente se omitido)
 * @param {object} job.data      - Input para generateContent()
 * @param {boolean} [job.saveImages] - Se deve gerar imagens (padrão: true)
 * @param {boolean} [job.savePreview] - Se deve gerar preview HTML (padrão: true)
 * @param {boolean} [job.autoApprove] - Se aprova automaticamente (padrão: false)
 * @returns {Promise<object>}    - Resultado completo da geração
 */
export async function run(job = {}) {
  const jobId = job.id || `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const {
    data         = {},
    saveImages   = true,
    savePreview  = true,
    autoApprove  = false,
  } = job;

  // ── Registrar job ─────────────────────────────────────────────────────────
  updateJob(jobId, 'running', {});
  logStep('generateWorker_start', { jobId, tipo: data.tipo, tema: data.tema });
  console.log(`\n⚙️  [Worker] Job ${jobId} iniciado — tipo: ${data.tipo}, tema: "${data.tema}"`);

  try {
    // ── 1. Geração de conteúdo (copy + scene) ─────────────────────────────
    const result = await generateContent(data);
    const { dataJson, imageItems, estilo, emotionState, outputDir, execucaoId, metaJson } = result;

    logStep('generateWorker_content_done', { jobId, slides: imageItems.length });

    // ── 2. Geração de imagens ──────────────────────────────────────────────
    if (saveImages && outputDir) {
      console.log(`\n🎨 [Worker] Gerando imagens para job ${jobId}...`);
      await generateAndSaveImages(
        outputDir,
        metaJson,
        imageItems,
        data.autor || null,
        estilo?.base || 'editorial_minimalist',
        dataJson?.publico,
        data.tema,
      );
      logStep('generateWorker_images_done', { jobId });
    }

    // ── 3. Preview HTML ────────────────────────────────────────────────────
    if (savePreview && outputDir) {
      generatePreview(outputDir, metaJson, dataJson);
      logStep('generateWorker_preview_done', { jobId });
    }

    // ── 4. Auto-aprovação (modo batch/lote) ────────────────────────────────
    if (autoApprove && outputDir) {
      metaJson.status = 'approved';
      saveJSON(path.join(outputDir, 'meta.json'), metaJson);
      saveToMemory(dataJson, metaJson);
      logStep('generateWorker_auto_approved', { jobId });
      console.log(`  ✅ [Worker] Job ${jobId} auto-aprovado e salvo na memória.`);
    }

    // ── Finalizar job ──────────────────────────────────────────────────────
    const finalResult = {
      jobId,
      execucaoId,
      outputDir,
      slides: imageItems.length,
      estilo: estilo?.base,
    };

    updateJob(jobId, 'done', finalResult);
    logStep('generateWorker_done', finalResult);
    console.log(`  ✅ [Worker] Job ${jobId} concluído → /output/${execucaoId}`);

    return { ...result, jobId };

  } catch (error) {
    logError('generateWorker', error, { jobId, tema: data.tema });
    updateJob(jobId, 'failed', { error: error.message });
    console.error(`  ❌ [Worker] Job ${jobId} falhou: ${error.message}`);
    throw error;
  }
}

/**
 * runBatch
 *
 * Executa múltiplos jobs em sequência (1 por vez).
 * Para execução paralela, substituir por Promise.allSettled() com
 * concurrency limit (ex: p-queue).
 *
 * @param {object[]} jobs  - Array de objetos de job
 * @param {object}   [opts]
 * @param {boolean}  [opts.continueOnError] - Continua em caso de falha (padrão: true)
 * @returns {Promise<object[]>}             - Resultados de cada job
 */
export async function runBatch(jobs = [], opts = {}) {
  const { continueOnError = true } = opts;
  const results = [];

  console.log(`\n📦 [Worker] Iniciando batch de ${jobs.length} jobs...`);

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📌 Batch ${i + 1}/${jobs.length}`);
    console.log('─'.repeat(60));

    try {
      const result = await run(job);
      results.push({ status: 'fulfilled', value: result });
    } catch (err) {
      results.push({ status: 'rejected', reason: err.message, job: job.id || i });
      if (!continueOnError) {
        console.error(`\n❌ [Worker] Batch interrompido no job ${i + 1}.`);
        break;
      }
    }
  }

  const done   = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ Batch concluído: ${done} OK / ${failed} falhas de ${jobs.length} total`);
  console.log('═'.repeat(60));

  return results;
}

/**
 * getJobStatus — Retorna o status atual de um job pelo ID.
 */
export function getJobStatus(jobId) {
  return jobRegistry.get(jobId) || { status: 'not_found' };
}

// ── Helpers Internos ──────────────────────────────────────────────────────────

function updateJob(jobId, status, data = {}) {
  jobRegistry.set(jobId, {
    jobId,
    status,
    updatedAt: new Date().toISOString(),
    ...data,
  });
}

export default { run, runBatch, getJobStatus };
