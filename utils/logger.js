/**
 * ════════════════════════════════════════════
 *  LOGGER — Sistema de Log Centralizado
 * ════════════════════════════════════════════
 *
 * Registra cada etapa do pipeline em /logs/generation.log
 * com timestamp ISO + dados estruturados (JSON).
 *
 * USO:
 *   import { logStep } from '../utils/logger.js';
 *   logStep('sceneEngine', { slide: 1, emotion: 'ansiedade' });
 *
 * O arquivo de log é acumulativo (append-only).
 * Para debug em tempo real, habilite LOG_CONSOLE=true no .env
 */

import fs from 'fs';
import path from 'path';

// ── Configuração ──────────────────────────────────────────────────────────────

const LOG_DIR  = path.resolve('logs');
const LOG_FILE = path.join(LOG_DIR, 'generation.log');
const LOG_CONSOLE = process.env.LOG_CONSOLE === 'true';

// Garante que o diretório existe (sync — só na inicialização)
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ── Funções Exportadas ────────────────────────────────────────────────────────

/**
 * logStep — Registra uma etapa do pipeline no arquivo de log.
 *
 * @param {string} step  - Nome da etapa (ex: 'sceneEngine', 'llmRouter')
 * @param {object} data  - Dados associados à etapa (qualquer JSON serializável)
 */
export function logStep(step, data = {}) {
  const entry = {
    ts: new Date().toISOString(),
    step,
    ...data,
  };

  const line = `\n[${entry.ts}] [${step}]\n${JSON.stringify(entry, null, 2)}\n${'─'.repeat(60)}`;

  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch (e) {
    // Log de arquivo não pode bloquear o pipeline — falha silenciosa
    console.warn('[Logger] Falha ao escrever log:', e.message);
  }

  if (LOG_CONSOLE) {
    console.log(`[LOG] ${step}:`, data);
  }
}

/**
 * logError — Registra um erro com stack trace completo.
 *
 * @param {string} step   - Etapa onde o erro ocorreu
 * @param {Error}  error  - Objeto de erro
 * @param {object} [ctx]  - Contexto adicional (tema, slide, etc.)
 */
export function logError(step, error, ctx = {}) {
  logStep(`${step}_ERROR`, {
    message: error?.message || String(error),
    stack: error?.stack?.substring(0, 500) || '',
    ...ctx,
  });
}

/**
 * logPipelineStart — Marca o início de uma execução de pipeline.
 *
 * @param {string} execId - ID da execução (ex: '2026-04-28T10-00_carrossel')
 * @param {object} ctx    - Contexto inicial (tipo, tema, qtd, etc.)
 */
export function logPipelineStart(execId, ctx = {}) {
  logStep('pipeline_start', { execId, ...ctx });
}

/**
 * logPipelineEnd — Marca o fim de uma execução de pipeline.
 *
 * @param {string} execId     - ID da execução
 * @param {boolean} success   - Se concluiu com sucesso
 * @param {number} durationMs - Duração em ms
 */
export function logPipelineEnd(execId, success, durationMs = 0) {
  logStep('pipeline_end', { execId, success, duration_ms: durationMs });
}

export default { logStep, logError, logPipelineStart, logPipelineEnd };
