/**
 * ═══════════════════════════════════════════════════════════
 *  GENERATION SERVICE — Orquestrador SaaS Principal
 * ═══════════════════════════════════════════════════════════
 *
 * PRINCÍPIO: Este é o único ponto de entrada para toda a
 * geração de conteúdo. O index.js chama este serviço.
 * Este serviço chama o pipeline. O pipeline chama os engines.
 *
 * NUNCA chame engines diretamente do index.js — use este serviço.
 *
 * FLUXO:
 *   index.js
 *     ↓
 *   generationService.generateContent()    ← você está aqui
 *     ↓
 *   core/pipeline.js (orquestra engines)
 *     ↓
 *   services/imageService.js (geração visual)
 *     ↓
 *   output + storage + analytics
 *
 * CAPACIDADES SaaS adicionadas:
 *   ✅ Variações A/B automáticas
 *   ✅ Roteamento por ângulo vencedor (memoryEngine)
 *   ✅ Log centralizado de cada execução
 *   ✅ Compatibilidade total com o fluxo CLI existente
 */

import path from 'path';
import { runPipeline } from '../core/pipeline.js';
import { generateVariations, getSingleVariation } from '../core/variationEngine.js';
import { getPreferredAngle } from '../core/memoryEngine.js';
import { generateAndSaveImages } from './imageService.js';
import { generatePreview } from '../utils/previewGenerator.js';
import { ensureDir, saveJSON } from '../utils/fileManager.js';
import { formatTimestamp } from '../utils/dateHelper.js';
import { logStep, logError, logPipelineStart, logPipelineEnd } from '../utils/logger.js';

// ── Função Principal ──────────────────────────────────────────────────────────

/**
 * generateContent
 *
 * Ponto de entrada principal da camada SaaS.
 * Encapsula o pipeline atual e adiciona suporte a variações A/B.
 *
 * @param {object} input
 * @param {string} input.tipo           - 'post' | 'carrossel' | 'autor' | 'growth'
 * @param {string} input.tema           - Tema do conteúdo
 * @param {number} [input.qtd]          - Slides (carrossel)
 * @param {Date}   [input.dataBase]     - Data de agendamento
 * @param {string} [input.autor]        - Autor (modo citação)
 * @param {object} [input.marketingContext]
 * @param {string} [input.estiloBase]   - Estilo visual forçado
 * @param {boolean} [input.withVariations] - Ativar A/B automático
 * @param {string[]} [input.angles]     - Ângulos específicos para A/B
 * @param {object} [input.config]       - Config extra
 *
 * @returns {Promise<object>}  - { dataJson, imageItems, estilo, emotionState, outputDir, execucaoId }
 */
export async function generateContent(input) {
  const {
    tipo             = 'post',
    tema,
    qtd              = tipo === 'carrossel' ? 7 : 1,
    dataBase         = new Date(),
    autor            = null,
    marketingContext = { canal: 'organico', objetivo: 'engajamento', nivel_funil: 'topo' },
    estiloBase       = null,
    withVariations   = false,
    angles           = null,
    config           = {},
  } = input;

  const execucaoId = `${formatTimestamp(dataBase)}_${tipo}`;
  const startTime  = Date.now();

  logPipelineStart(execucaoId, { tipo, tema, qtd, withVariations });

  try {
    // ── Modo A/B: Gerar múltiplas variações ─────────────────────────────────
    if (withVariations) {
      return await generateWithVariations({
        tipo, tema, qtd, dataBase, autor, marketingContext,
        estiloBase, angles, config, execucaoId,
      });
    }

    // ── Modo Padrão: Ângulo único (preferido pelo memoryEngine) ─────────────
    const preferredAngle = getPreferredAngle({ estilo: estiloBase, tipo });
    const baseCtx = {
      tipo, tema, qtd, autor, marketingContext,
      estiloBase, timestamp: Date.now(),
    };
    const ctx = getSingleVariation(baseCtx, preferredAngle);

    logStep('generationService_mode', {
      execucaoId,
      mode: 'single',
      preferredAngle,
    });

    const result = await runPipeline(ctx);

    // ── Criar output dir e salvar dados ─────────────────────────────────────
    const outputDir = path.resolve('output', execucaoId);
    ensureDir(outputDir);

    const metaJson = buildMetaJson({ tipo, autor, qtd: result.imageItems.length, dataBase, marketingContext, result });
    saveJSON(path.join(outputDir, 'data.json'), result.dataJson);
    saveJSON(path.join(outputDir, 'meta.json'), metaJson);

    logPipelineEnd(execucaoId, true, Date.now() - startTime);

    return {
      ...result,
      outputDir,
      execucaoId,
      metaJson,
    };

  } catch (error) {
    logError('generationService', error, { execucaoId, tema });
    logPipelineEnd(execucaoId, false, Date.now() - startTime);
    throw error;
  }
}

// ── Modo A/B ──────────────────────────────────────────────────────────────────

/**
 * generateWithVariations
 *
 * Gera N variações do mesmo tema com ângulos diferentes.
 * Salva cada variação em um subdiretório separado.
 * Útil para testes A/B antes de publicar.
 *
 * @returns {Promise<object[]>} - Array de resultados por variação
 */
async function generateWithVariations({
  tipo, tema, qtd, dataBase, autor, marketingContext,
  estiloBase, angles, config, execucaoId,
}) {
  const baseCtx = {
    tipo, tema, qtd, autor, marketingContext,
    estiloBase, timestamp: Date.now(),
  };

  const selectedAngles = angles || ['emocional', 'racional', 'confronto', 'curiosidade'];
  const variations     = generateVariations(baseCtx, { angles: selectedAngles });

  logStep('generationService_ab', {
    execucaoId,
    total_variations: variations.length,
    angles: selectedAngles,
  });

  const results = [];

  for (const variation of variations) {
    const varId    = variation._variation?.id || 'default';
    const varExecId = `${execucaoId}_${varId}`;
    const outputDir = path.resolve('output', varExecId);
    ensureDir(outputDir);

    try {
      const result = await runPipeline(variation);

      const metaJson = buildMetaJson({
        tipo, autor,
        qtd: result.imageItems.length,
        dataBase,
        marketingContext,
        result,
        variation: variation._variation,
      });

      saveJSON(path.join(outputDir, 'data.json'), result.dataJson);
      saveJSON(path.join(outputDir, 'meta.json'), metaJson);

      results.push({
        ...result,
        outputDir,
        execucaoId: varExecId,
        metaJson,
        variation: variation._variation,
      });

      console.log(`  ✅ [A/B] Variação "${varId}" gerada → /output/${varExecId}`);

    } catch (err) {
      logError('generationService_ab', err, { varId, tema });
      console.error(`  ❌ [A/B] Falha na variação "${varId}": ${err.message}`);
    }
  }

  return results;
}

// ── Helper: MetaJson ──────────────────────────────────────────────────────────

function buildMetaJson({ tipo, autor, qtd, dataBase, marketingContext, result, variation = null }) {
  return {
    tipo,
    autor,
    status:       'draft',
    qtd_slides:   tipo === 'post' ? 1 : qtd,
    data_agendada: dataBase instanceof Date ? dataBase.toISOString() : new Date(dataBase).toISOString(),
    formatos:     ['feed', 'story'],
    resolucoes:   { feed: '1080x1440', story: '1080x1920' },
    marketing:    marketingContext,
    estrategia:   result.dataJson?.estrategia || {},
    _classificacao: result.dataJson?._classificacao || null,
    _persona:     result.dataJson?._persona || null,
    _variacao:    result.dataJson?._variacao || null,
    // SaaS extras
    _saas: {
      angulo_variacao: variation?.id || result.dataJson?._narrativeState?.angulo_variacao || 'default',
      pipeline_version: 'saas_v1',
      generatedAt: new Date().toISOString(),
    },
  };
}

export default generateContent;
