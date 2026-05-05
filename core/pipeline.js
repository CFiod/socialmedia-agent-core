/**
 * ═══════════════════════════════════════════════════════════
 *  PIPELINE ADAPTER — Camada de Organização dos Engines
 * ═══════════════════════════════════════════════════════════
 *
 * PRINCÍPIO: Este arquivo NÃO altera nenhum engine existente.
 * Ele apenas organiza e orquestra as chamadas aos engines
 * que já existem no projeto, com log de cada etapa.
 *
 * FLUXO:
 *   ctx → [COPY] → [SCENE] → [PROMPT] → output
 *
 * Os engines chamados (sem modificação):
 *   - contentService.generateContent()
 *   - artDirectionEngine()
 *   - buildSceneFromCopy()
 *   - normalizarOutput()
 *   - validateAndCorrectSlides()
 *
 * NOVO: Cada etapa é agora logada e rastreável via logger.js
 */

import { generateContent } from '../services/contentService.js';
import { normalizarOutput } from '../agents/content_classifier.js';
import { artDirectionEngine } from '../agents/art_direction_engine.js';
import { buildSceneFromCopy } from '../agents/semantic_scene_builder.js';
import { getSinglePostEmotion } from '../agents/scene_decision_engine.js';
import { getStyleWithAntiRepetition } from '../services/styleEngine.js';
import { validateAndCorrectSlides } from '../services/slideValidator.js';
import { logStep, logError } from '../utils/logger.js';

// ── Pipeline Principal ────────────────────────────────────────────────────────

/**
 * runPipeline
 *
 * Orquestra todos os engines existentes em sequência.
 * Retorna o dataJson enriquecido com scene, artDirection e
 * análise semântica — pronto para o imageService.
 *
 * @param {object} ctx
 * @param {string} ctx.tipo           - 'post' | 'carrossel' | 'autor'
 * @param {string} ctx.tema           - Tema do conteúdo
 * @param {number} [ctx.qtd]          - Quantidade de slides
 * @param {string} [ctx.autor]        - Autor (modo citação)
 * @param {object} [ctx.marketingContext]
 * @param {string} [ctx.estiloBase]   - Estilo visual pré-selecionado
 * @param {object} [ctx._variation]   - Variação A/B (do variationEngine)
 * @returns {object}  - { dataJson, imageItems, estilo, emotionState }
 */
export async function runPipeline(ctx) {
  const {
    tipo,
    tema,
    qtd        = tipo === 'carrossel' ? 7 : 1,
    autor      = null,
    marketingContext = {
      canal: 'organico',
      objetivo: 'engajamento',
      nivel_funil: 'topo',
    },
    estiloBase = null,
    _variation = null,
    timestamp  = Date.now(),
  } = ctx;

  logStep('pipeline_run', { tipo, tema, qtd, angulo: _variation?.id || 'default' });

  // ── 1. Emotion State ─────────────────────────────────────────────────────────
  const emotionState = getSinglePostEmotion(marketingContext.objetivo);
  logStep('pipeline_emotion', { emotion: emotionState?.label });

  // ── 2. Estilo Visual ─────────────────────────────────────────────────────────
  const estilo = estiloBase
    ? { base: estiloBase, grupo: 'manual' }
    : getStyleWithAntiRepetition({
        marketing: marketingContext,
        estrategia: { emocao_principal: tema, emocao: emotionState?.label || '' },
      });
  logStep('pipeline_style', { base: estilo.base, grupo: estilo.grupo });

  // ── 3. Geração de Copy (engine existente — inalterado) ───────────────────────
  logStep('pipeline_copy_start', { tema });
  let dataJson = await generateContent(
    tipo,
    tema,
    qtd,
    autor,
    marketingContext,
    estilo.base,
  );
  dataJson = normalizarOutput(dataJson);
  logStep('pipeline_copy_done', { slides: dataJson?.slides?.length || 1 });

  // ── 4. Extrair imageItems ────────────────────────────────────────────────────
  let imageItems = extractImageItems(dataJson, tipo);

  if (imageItems.length === 0) {
    throw new Error('[Pipeline] Conteúdo gerado está vazio ou inválido.');
  }

  // ── 5. Validação de Slides (engine existente — inalterado) ───────────────────
  if (!autor && tipo === 'carrossel') {
    const { slides: validados, isValid, issues } = validateAndCorrectSlides(imageItems);
    imageItems = validados;
    dataJson.slides = imageItems;

    logStep('pipeline_validation', {
      isValid,
      issues: issues.length,
      details: issues.slice(0, 3),
    });
  }

  // ── 6. Art Direction (engine existente — inalterado) ─────────────────────────
  if (!autor) {
    logStep('pipeline_artdirection_start', { slides: imageItems.length });
    await Promise.all(imageItems.map(async (slide) => {
      try {
        const ad = await artDirectionEngine({
          copy: {
            headline: slide.texto_principal,
            subtexto: slide.texto_secundario,
          },
          estrategia: dataJson.estrategia || { emocao: tema },
          modo: tipo,
          category: dataJson._classificacao?.categoria || tipo,
        });
        slide.descricao_visual = `${ad.scene_construction.ambiente}. ${ad.symbol_mapping}`;
        slide.artDirection = ad;
      } catch (err) {
        logError('pipeline_artdirection', err, { slide: slide.tipo });
      }
    }));
    logStep('pipeline_artdirection_done', {});
  }

  // ── 7. Semantic Scene (engine existente — inalterado) ────────────────────────
  if (!autor) {
    logStep('pipeline_scene_start', {});
    for (const slide of imageItems) {
      try {
        const sceneResult = buildSceneFromCopy({
          texto:   slide.texto_principal || slide.titulo || '',
          subtexto: slide.texto_secundario || '',
          emocao:  emotionState?.label || dataJson.estrategia?.emocao_principal || '',
          tema,
          estilo:  estilo.base,
        });
        slide._semanticAnalysis = sceneResult.analysis;

        // Injetar metadado de variação A/B se existir
        if (_variation) {
          slide._variation = _variation;
        }
      } catch (err) {
        logError('pipeline_scene', err, { slide: slide.tipo });
      }
    }
    logStep('pipeline_scene_done', { slides: imageItems.length });
  }

  // ── 8. Narrative State (carrossel) ──────────────────────────────────────────
  if (tipo === 'carrossel') {
    dataJson._narrativeState = {
      seed: `${tipo}_${Math.random().toString(36).substring(7)}`,
      persona_locked: true,
      visual_identity: dataJson._persona || {
        genero:         'woman',
        idade_aparente: 30,
        pele:           'light brown',
        cabelo:         'dark wavy',
        roupa_base:     'neutral casual',
      },
      progression:    'emocional_progressiva',
      estilo_visual:  estilo,
      angulo_variacao: _variation?.id || 'default',
    };
  }

  return {
    dataJson,
    imageItems,
    estilo,
    emotionState,
  };
}

// ── Helper ────────────────────────────────────────────────────────────────────

function extractImageItems(dataJson, tipo) {
  if (tipo === 'post') {
    if (Array.isArray(dataJson.conteudo)) return [dataJson.conteudo[0]];
    if (dataJson.conteudo) return [dataJson.conteudo];
    return [];
  }
  return (
    dataJson.slides ||
    (Array.isArray(dataJson.conteudo) ? dataJson.conteudo : dataJson.conteudo ? [dataJson.conteudo] : [])
  );
}

export default runPipeline;
