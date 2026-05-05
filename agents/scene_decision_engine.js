/**
 * ============================================================
 * 🎬 SCENE ENGINE V2 — Emotion-Driven Scene Decision
 * ============================================================
 * Evolução do scene_decision_engine:
 * - Cada slide = 1 estado emocional
 * - Emoção afeta: copy, imagem, layout
 * - Arco emocional para carrosséis (7 emoções progressivas)
 * - Integração com Style Engine V2
 * ============================================================
 */

import { weightedRandom } from './growth_engine.js';

// ── ARCO EMOCIONAL DO CARROSSEL ──────────────────────────────────────────────
// Sequência de 7 emoções que formam uma jornada psicológica completa.
// Cada slide de um carrossel recebe uma emoção da sequência.

export const EMOTION_ARC = [
  { id: "curiosidade",   label: "Curiosidade",   energia: "crescente",  copy_tone: "provocativo",     scene_bias: "simbolico" },
  { id: "identificacao", label: "Identificação",  energia: "crescente",  copy_tone: "empático",        scene_bias: "humano" },
  { id: "ansiedade",     label: "Ansiedade",      energia: "alta",       copy_tone: "tenso",           scene_bias: "ambiente" },
  { id: "tensao",        label: "Tensão",         energia: "pico",       copy_tone: "confrontador",    scene_bias: "silhueta" },
  { id: "insight",       label: "Insight",        energia: "descendente", copy_tone: "revelador",       scene_bias: "simbolico" },
  { id: "alivio",        label: "Alívio",         energia: "baixa",      copy_tone: "acolhedor",       scene_bias: "objeto" },
  { id: "acao",          label: "Ação",           energia: "direcional", copy_tone: "imperativo",      scene_bias: "tipografia" },
];

// ── PESOS POR MODO (mantidos do V1) ─────────────────────────────────────────

const PESOS_COTIDIANO = {
  tipografia: 0.35,
  simbolico:  0.25,
  objeto:     0.20,
  ambiente:   0.20,
};

const PESOS_ESTRATEGICO = {
  humano:    0.40,
  silhueta:  0.25,
  simbolico: 0.20,
  ambiente:  0.15,
};

// ── DESCRITORES VISUAIS POR TIPO DE CENA ─────────────────────────────────────

const DESCRITORES = {
  tipografia: {
    descricao: "Fundo limpo editorial com espaço para texto",
    prompt_hint: "clean minimal background, soft neutral tones, editorial layout, space for text overlay, no subject, abstract soft gradient",
    requer_personagem: false,
  },
  simbolico: {
    descricao: "Objeto simbólico como protagonista da imagem",
    prompt_hint: "symbolic object as main subject, clean background, editorial composition, metaphorical imagery, soft lighting",
    requer_personagem: false,
  },
  objeto: {
    descricao: "Close de objeto cotidiano com peso emocional",
    prompt_hint: "close-up of everyday object, shallow depth of field, soft natural lighting, intimate composition, cozy atmosphere",
    requer_personagem: false,
  },
  ambiente: {
    descricao: "Cenário atmosférico sem personagem",
    prompt_hint: "atmospheric environment scene, empty space with emotional weight, soft lighting, editorial mood, no people",
    requer_personagem: false,
  },
  humano: {
    descricao: "Personagem humano como protagonista da cena",
    prompt_hint: "person as main subject, emotional expression, contextual environment, editorial composition",
    requer_personagem: true,
  },
  silhueta: {
    descricao: "Figura humana em contraluz ou desfocada",
    prompt_hint: "silhouette of person, backlit, atmospheric scene, emotional depth, soft focus, editorial mood",
    requer_personagem: true,
  },
};

// ── EMOTION-TO-SCENE MAPPING ─────────────────────────────────────────────────
// Mapeia emoção para o tipo de cena mais adequado (bias probabilístico)

const EMOTION_SCENE_WEIGHTS = {
  curiosidade:   { simbolico: 0.40, objeto: 0.30, tipografia: 0.20, ambiente: 0.10 },
  identificacao: { humano: 0.45, silhueta: 0.25, ambiente: 0.20, objeto: 0.10 },
  ansiedade:     { ambiente: 0.35, silhueta: 0.30, simbolico: 0.20, objeto: 0.15 },
  tensao:        { silhueta: 0.40, ambiente: 0.30, simbolico: 0.20, humano: 0.10 },
  insight:       { simbolico: 0.40, tipografia: 0.25, objeto: 0.20, ambiente: 0.15 },
  alivio:        { objeto: 0.35, ambiente: 0.30, humano: 0.20, simbolico: 0.15 },
  acao:          { tipografia: 0.50, simbolico: 0.20, humano: 0.15, objeto: 0.15 },
};

// ── ENGINE PRINCIPAL (V2) ────────────────────────────────────────────────────

/**
 * Decide o tipo de cena visual com base no modo, tipo de post, e emoção.
 *
 * @param {string} modo — "cotidiano" ou "estrategico"
 * @param {string} tipoPost — tipo de post do growth engine
 * @param {Object} [emotionState] — estado emocional (do arco emocional)
 * @returns {Object} — { tipo, descricao, prompt_hint, requer_personagem, emotion }
 */
export function sceneDecision(modo, tipoPost, emotionState = null) {
  let tipoCena;

  // ── Se temos um estado emocional (carousel slide), usa emotion-based decision ──
  if (emotionState && EMOTION_SCENE_WEIGHTS[emotionState.id]) {
    tipoCena = weightedRandom(EMOTION_SCENE_WEIGHTS[emotionState.id]);
  } else {
    // Fallback V1: peso por modo
    tipoCena = modo === "cotidiano"
      ? weightedRandom(PESOS_COTIDIANO)
      : weightedRandom(PESOS_ESTRATEGICO);
  }

  // ── Override inteligente: alguns tipos de post forçam cena específica ──
  const overrides = {
    checklist:   "tipografia",
    mini_guia:   "tipografia",
    convite:     "humano",
    dor_solucao: "humano",
  };

  if (overrides[tipoPost]) {
    tipoCena = overrides[tipoPost];
  }

  const descritor = DESCRITORES[tipoCena] || DESCRITORES.simbolico;

  console.log(`   🎬 Cena Visual : ${tipoCena} (${descritor.descricao})${emotionState ? ` [emoção: ${emotionState.label}]` : ''}`);

  return {
    tipo: tipoCena,
    descricao: descritor.descricao,
    prompt_hint: descritor.prompt_hint,
    requer_personagem: descritor.requer_personagem,
    emotion: emotionState || null,
  };
}

// ── CAROUSEL EMOTION ARC ─────────────────────────────────────────────────────

/**
 * Gera o arco emocional para um carrossel.
 * Retorna N emoções (uma por slide), seguindo a progressão dramática.
 *
 * @param {number} slideCount — número de slides do carrossel
 * @returns {Array} — array de emotionState para cada slide
 */
export function getEmotionArc(slideCount) {
  if (slideCount <= 0) return [];

  const arc = [];
  for (let i = 0; i < slideCount; i++) {
    // Distribui as 7 emoções proporcionalmente ao número de slides
    const arcIndex = Math.floor((i / slideCount) * EMOTION_ARC.length);
    arc.push(EMOTION_ARC[Math.min(arcIndex, EMOTION_ARC.length - 1)]);
  }

  console.log(`   🎭 Arco Emocional: ${arc.map(e => e.label).join(' → ')}`);
  return arc;
}

/**
 * Retorna a emoção para um slide individual (post único).
 * Para posts únicos, escolhe a emoção mais impactante baseada no objetivo.
 */
export function getSinglePostEmotion(objetivo) {
  const emotionMap = {
    engajamento:      EMOTION_ARC[0],  // curiosidade
    salvamento:       EMOTION_ARC[4],  // insight
    compartilhamento: EMOTION_ARC[3],  // tensão
    autoridade:       EMOTION_ARC[4],  // insight
    conversao:        EMOTION_ARC[6],  // ação
  };

  return emotionMap[objetivo] || EMOTION_ARC[0];
}

// ── EXPORTS ──────────────────────────────────────────────────────────────────

export {
  PESOS_COTIDIANO,
  PESOS_ESTRATEGICO,
  DESCRITORES,
  EMOTION_SCENE_WEIGHTS,
};

export default sceneDecision;
