/**
 * ============================================================
 * 🔁 GROWTH ORCHESTRATOR V6 — Acquisition Machine Pipeline
 * ============================================================
 * PIPELINE V6 (Acquisition-Grade):
 *   INPUT → growth_engine
 *         → 🆕 scene_engine V3 (diversity + anti-repetition)
 *         → 🆕 copy_intent_engine (strategic hooks)
 *         → 🆕 typography_engine (conversion-oriented)
 *         → style_engine_v2 (instagram-native)
 *         → composition_engine (structural)
 *         → persona_bank (diversity-enforced)
 *         → semantic_scene_builder (copy → visual)
 *         → art_direction_engine (LLM enrichment)
 *         → 🆕 image_prompt_engine V3 (cinematic)
 *         → layout_engine_v2 (probabilistic)
 *         → caption_engine
 *         → 🆕 anti_repetition (global memory)
 *         → 🆕 performance_log (feedback loop)
 *         → OUTPUT
 *
 * NOVIDADES V6:
 * - Scene Engine V3: diversidade de cena obrigatória
 * - Copy Intent Engine: hooks psicológicos estratégicos
 * - Typography Engine: tipografia orientada a conversão
 * - Image Prompt Engine V3: prompts cinematográficos
 * - Anti-Repetition Global: memória de curto prazo
 * - Performance Log: feedback loop simulado
 * - Gender Diversity: bloqueio automático de viés
 * ============================================================
 */

import { growthEngine } from './growth_engine.js';
import { gerarCopy } from './copy_engine.js';
import { sceneDecision, getSinglePostEmotion, getEmotionArc } from './scene_decision_engine.js';
import { layoutEngine } from './layout_engine.js';
import { gerarCaption } from './caption_engine.js';
import { buildPrompt } from '../engines/prompt/buildPrompt.js';
import { escolherComposicao } from './composition_engine.js';
import { classificarConteudo, gerarVariacaoCriativa } from './content_classifier.js';
import { selecionarPersona } from './persona_bank.js';
import { artDirectionEngine } from './art_direction_engine.js';
import { getStyleWithAntiRepetition, INSTAGRAM_STYLES } from '../services/styleEngine.js';
import { buildSceneFromCopy } from './semantic_scene_builder.js';

// ── 🆕 V6 ENGINES ───────────────────────────────────────────────────────────
import { decideScene } from '../engines/scene_engine.js';
import { generateStrategicCopy } from '../engines/copy_intent_engine.js';
import { decideTypography } from '../engines/typography_engine.js';
import { buildCinematicPrompt } from '../engines/image_prompt_engine.js';
import {
  loadHistory, registerPost, getLastN,
  validateAgainstHistory, logPerformance,
} from '../engines/anti_repetition.js';

// ── ORQUESTRADOR COMPLETO V6 ────────────────────────────────────────────────

export async function gerarPostCompleto(input = {}) {
  const SEP = '─'.repeat(60);

  console.log(`\n${SEP}`);
  console.log('🧠 GROWTH SYSTEM V6 — Acquisition Machine Pipeline');
  console.log(SEP);

  // ── 0. Load anti-repetition history ────────────────────────────────────────
  const history = loadHistory();
  const lastScenes = getLastN(history, 'scene_type', 5);
  const lastComps = getLastN(history, 'composition', 5);
  const lastHooks = getLastN(history, 'hook_pattern', 5);
  const lastStyles = getLastN(history, 'style', 3);
  const lastTypePairs = getLastN(history, 'typography_pair', 3);

  // ── 1. Growth Engine: Decisões de Crescimento ─────────────────────────────
  const growth = growthEngine(input);

  // ── 2. 🆕 Scene Engine V3: Cena Diversificada + Anti-Repetição ────────────
  const emotionState = getSinglePostEmotion(growth.objetivo);
  const sceneV3 = decideScene({
    objetivo: growth.objetivo,
    emotionId: emotionState?.id || 'curiosidade',
    tipoPost: growth.tipoPost,
    modo: growth.modo,
    history,
  });

  // V2 legacy scene (mantém compatibilidade)
  const cena = sceneDecision(growth.modo, growth.tipoPost, emotionState);

  // ── 3. 🆕 Copy Intent Engine: Hooks Estratégicos ──────────────────────────
  const strategicCopy = generateStrategicCopy({
    objetivo: growth.objetivo,
    tipoPost: growth.tipoPost,
    emotionId: emotionState?.id || 'curiosidade',
    lastHookPatterns: lastHooks,
    lastStructures: getLastN(history, 'copy_structure', 3),
  });

  // V2 legacy copy (fallback enrichment)
  const legacyCopy = gerarCopy({
    modo: growth.modo,
    tipoPost: growth.tipoPost,
    emotion: emotionState,
  });

  // Use strategic copy as primary, legacy as fallback
  const copy = {
    headline: strategicCopy.copy.headline,
    subtexto: strategicCopy.copy.subtexto || legacyCopy.subtexto || '',
  };

  console.log(`   ✍️  Headline   : "${copy.headline}"`);
  if (copy.subtexto) {
    console.log(`   ✍️  Subtexto   : "${copy.subtexto.substring(0, 80)}${copy.subtexto.length > 80 ? '...' : ''}"`);
  }

  // ── 4. 🆕 Typography Engine: Tipografia de Conversão ──────────────────────
  const typography = decideTypography({
    tipoPost: growth.tipoPost,
    objetivo: growth.objetivo,
    copyIntent: strategicCopy.intent,
    tipoCena: sceneV3.tipo,
    headlineLength: copy.headline.length,
    lastTypePairs,
  });

  // ── 5. Style Engine V2: Estética Instagram-Nativa ─────────────────────────
  const marketingContext = {
    canal: 'organico',
    objetivo: growth.objetivo,
  };

  let estiloResult;
  if (input.estilo && INSTAGRAM_STYLES[input.estilo]) {
    estiloResult = getStyleWithAntiRepetition({
      marketing: marketingContext,
      estrategia: { emocao_principal: emotionState?.label || '' },
      forceStyle: input.estilo,
    });
  } else {
    estiloResult = getStyleWithAntiRepetition({
      marketing: marketingContext,
      estrategia: { emocao_principal: emotionState?.label || '' },
    });
  }

  // ── 6. Composition Engine: Decisão Visual Estrutural ──────────────────────
  const composicao = escolherComposicao({
    objetivo: growth.objetivo,
    formato: growth.formato,
    tipoCena: sceneV3.tipo,
    ultimasComposicoes: lastComps,
    humanCount: lastScenes.filter(s => s === 'humano' || s === 'silhueta').length,
  });

  // ── 7. Content Classifier + Persona Bank ──────────────────────────────────
  const classificacao = classificarConteudo({ tipo: 'growth', qtdSlides: 1, tema: input.tema || '' });
  const variacao = gerarVariacaoCriativa(classificacao.categoria);

  // 🆕 V6: Gender from Scene Engine, not from input
  const genderForPersona = sceneV3.gender?.gender === 'man' ? 'masculino'
    : sceneV3.gender?.gender === 'woman' ? 'feminino'
    : 'universal';

  const persona = selecionarPersona({
    categoria: classificacao.categoria,
    genero: sceneV3.requer_personagem ? genderForPersona : 'universal',
    styleCategory: estiloResult.base.includes('minimal') ? 'clean' : 'painterly',
  });
  console.log(`   🏷️ [Classifier] Growth → Persona: ${persona.id} | Abstrata: ${persona.isAbstract}`);

  // ── 8. Semantic Scene Builder: Copy → Cena Visual ─────────────────────────
  const semanticResult = buildSceneFromCopy({
    texto: copy.headline,
    subtexto: copy.subtexto || '',
    emocao: emotionState?.label || '',
    tema: input.tema || '',
    estilo: estiloResult.base,
  });

  // ── 9. Art Direction Engine: Enriquecimento Visual (LLM) ──────────────────
  const artDirection = await artDirectionEngine({
    copy: copy,
    estrategia: { ...growth, emocao_principal: emotionState?.label || 'reflexão' },
    modo: growth.modo,
    category: classificacao.categoria
  });

  // ── 10. 🆕 Image Prompt Engine V3: Prompt Cinematográfico ─────────────────
  const promptImagemV3 = buildCinematicPrompt({
    scene: sceneV3,
    composition: composicao,
    copyResult: strategicCopy,
    typography,
    estilo: estiloResult.base,
    persona: sceneV3.requer_personagem ? persona : null,
    semanticScene: semanticResult?.fullPrompt || null,
  });

  // V5 legacy prompt (fallback)
  const slideVirtual = {
    tipo: growth.tipoPost,
    texto_principal: copy.headline,
    texto_secundario: copy.subtexto || '',
    descricao_visual: artDirection.scene_construction.ambiente + ". " + artDirection.symbol_mapping,
    artDirection: artDirection,
    _persona: persona,
    _semanticAnalysis: semanticResult.analysis,
  };

  const promptLegacy = buildPrompt({
    slide: slideVirtual,
    globalState: { estilo_visual: { base: estiloResult.base } },
  });

  // Use V3 prompt as primary
  const promptImagem = promptImagemV3 || promptLegacy;

  // ── 11. Layout Engine V2: Posicionamento Probabilístico ───────────────────
  const layout = layoutEngine(growth.formato, sceneV3.tipo, copy, composicao, {
    isAutor: false,
    slideIndex: 0,
    previousLayout: null,
    emotion: emotionState,
  });

  // ── 12. Caption Engine: Legenda + Hashtags ────────────────────────────────
  const caption = gerarCaption({
    objetivo: growth.objetivo,
    tipoPost: growth.tipoPost,
    headline: copy.headline,
  });

  // ── 13. 🆕 Anti-Repetition: Registrar no histórico ───────────────────────
  registerPost({
    scene_type: sceneV3.tipo,
    composition: composicao.tipo,
    style: estiloResult.base,
    hook_pattern: strategicCopy.hookPattern,
    copy_structure: strategicCopy.structure,
    copy_intent: strategicCopy.intent,
    gender: sceneV3.gender?.gender || 'none',
    environment: sceneV3.ambiente?.id || '',
    objetivo: growth.objetivo,
    tipoPost: growth.tipoPost,
    emotionId: emotionState?.id || '',
    headline: copy.headline,
    typography_pair: typography.pair.id,
    persona: persona.id,
  });

  // ── 14. 🆕 Performance Log: Registrar para feedback loop ──────────────────
  logPerformance({
    scene_type: sceneV3.tipo,
    composition: composicao.tipo,
    style: estiloResult.base,
    hook_pattern: strategicCopy.hookPattern,
    copy_intent: strategicCopy.intent,
    gender: sceneV3.gender?.gender || 'none',
    objetivo: growth.objetivo,
    tipoPost: growth.tipoPost,
    headline: copy.headline,
    typography_pair: typography.pair.id,
    // metrics: null — será preenchido quando dados reais forem disponíveis
  });

  // ── RESULTADO FINAL V6 ────────────────────────────────────────────────────

  const resultado = {
    // Decisões do Growth Engine
    modo: growth.modo,
    objetivo: growth.objetivo,
    formato: growth.formato,
    tipoPost: growth.tipoPost,

    // 🆕 V6: Cena Visual Cinematográfica
    tipoCena: sceneV3.tipo,
    cenaDescricao: sceneV3.descricao,
    requerPersonagem: sceneV3.requer_personagem,
    emotionState: emotionState,
    sceneV3: {
      tipo: sceneV3.tipo,
      camera: sceneV3.camera,
      ambiente: sceneV3.ambiente,
      iluminacao: sceneV3.iluminacao,
      emotionalLevel: sceneV3.emotionalLevel,
      gender: sceneV3.gender,
    },

    // Composição Estrutural
    composicao: composicao.meta,

    // Estilo Instagram-Nativo
    estiloInstagram: {
      id: estiloResult.base,
      vibe: estiloResult.style?.vibe || '',
      typography: estiloResult.style?.typography || 'bold',
    },

    // 🆕 V6: Copy Estratégica
    copy: {
      headline: copy.headline,
      subtexto: copy.subtexto || '',
    },
    copyStrategy: {
      intent: strategicCopy.intent,
      hookPattern: strategicCopy.hookPattern,
      structure: strategicCopy.structure,
      psychology: strategicCopy.psychology,
    },

    // 🆕 V6: Tipografia de Conversão
    typography: {
      pairId: typography.pair.id,
      pairVibe: typography.pair.vibe,
      headlineFont: typography.headline.font.family,
      bodyFont: typography.subtexto.font.family,
      hierarchy: typography.meta.hierarchy,
    },

    // Prompt de Imagem (V3 cinematic)
    promptImagem: promptImagem,

    // Layout V2
    layout: layout,

    // Art Direction Meta
    artDirection: artDirection,

    // Caption
    caption: {
      texto: caption.texto,
      hashtags: caption.hashtags,
      cta: caption.cta,
      textoCompleto: caption.textoCompleto,
    },

    // Metadata V6
    _meta: {
      geradoEm: new Date().toISOString(),
      versao: '6.0',
      estiloBase: estiloResult.base,
      gender: sceneV3.gender?.gender || 'none',
      tema: input.tema || null,
      classificacao: classificacao.categoria,
      persona: persona.id,
      personaAbstrata: persona.isAbstract,
      variacao: variacao,
      emotionId: emotionState?.id || null,
      hookPattern: strategicCopy.hookPattern,
      copyIntent: strategicCopy.intent,
      typographyPair: typography.pair.id,
      sceneType: sceneV3.tipo,
      cameraLens: sceneV3.camera?.lens || null,
      ambiente: sceneV3.ambiente?.id || null,
    },
  };

  console.log(`\n${SEP}`);
  console.log('✅ GROWTH SYSTEM V6 — Post gerado com sucesso!');
  console.log(`   🎨 Estilo: ${estiloResult.base} | 📐 Layout: ${layout.layoutId} | 🎭 Emoção: ${emotionState?.label || 'N/A'}`);
  console.log(`   🎬 Cena: ${sceneV3.tipo} | 📸 Câmera: ${sceneV3.camera?.lens || 'N/A'} | 🔤 Fonte: ${typography.pair.id}`);
  console.log(`   🧠 Hook: ${strategicCopy.hookPattern} | 🎯 Intent: ${strategicCopy.intent}`);
  console.log(SEP);

  return resultado;
}

// ── GERAÇÃO EM LOTE (BATCH) ──────────────────────────────────────────────────

export async function gerarLote(input = {}, quantidade = 7) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🚀 GROWTH SYSTEM V6 — Gerando LOTE de ${quantidade} posts`);
  console.log('═'.repeat(60));

  const posts = [];

  for (let i = 0; i < quantidade; i++) {
    console.log(`\n📌 POST ${i + 1}/${quantidade}`);
    const post = await gerarPostCompleto(input);

    // V6: Anti-repetition is now handled by the global engine
    // Validate against history
    const validation = validateAgainstHistory({
      scene_type: post.tipoCena,
      composition: post.composicao?.tipo,
      style: post.estiloInstagram?.id,
      hook_pattern: post.copyStrategy?.hookPattern,
      gender: post._meta?.gender,
    });

    if (!validation.valid && i < quantidade - 1) {
      console.log(`   ⚠️  Violações detectadas: ${validation.violations.join('; ')} — regerando...`);
      const retry = await gerarPostCompleto(input);
      posts.push(retry);
    } else {
      posts.push(post);
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ LOTE V6 COMPLETO: ${posts.length} posts gerados`);
  console.log('═'.repeat(60));

  // Sumário V6
  console.log('\n📊 SUMÁRIO DO LOTE V6:');
  posts.forEach((p, i) => {
    const g = p._meta?.gender || '?';
    const h = p.copyStrategy?.hookPattern || '?';
    console.log(`   ${i + 1}. [${p.modo.toUpperCase().padEnd(12)}] ${p.tipoPost.padEnd(16)} → ${p.objetivo} | 🎬 ${p.tipoCena} | 👤 ${g} | 🧠 ${h} | 🎨 ${p.estiloInstagram?.id || 'N/A'}`);
  });

  return posts;
}

// ── EXPORTS ──────────────────────────────────────────────────────────────────

export default gerarPostCompleto;
