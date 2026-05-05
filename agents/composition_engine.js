/**
 * ============================================================
 * 🎯 COMPOSITION ENGINE (v1.0) — Motor de Composição Visual
 * ============================================================
 * Separa COMPOSIÇÃO (estrutura) de ESTILO (estética).
 * 
 * 5 TIPOS DE COMPOSIÇÃO:
 *   center_focus   — Sujeito central com fundo limpo (alta conversão)
 *   side_weight    — Sujeito lateral + espaço negativo (cinematográfico)
 *   negative_space — Muito espaço vazio, elemento pequeno (premium)
 *   symbolic_scene — Cena metafórica sem rosto humano (variação)
 *   split_emotion  — Dualidade emocional com gradiente suave (contraste)
 *
 * REGRAS FUNDAMENTAIS:
 *   - COMPOSIÇÃO escolhe a ESTRUTURA
 *   - ESTILO só pinta a cena
 *   - NUNCA repetir composição 2x seguidas
 *   - NUNCA repetir estilo + composição juntos
 *   - Após 3 posts com pessoas → forçar symbolic_scene
 * ============================================================
 */

import { weightedRandom } from './growth_engine.js';

// ── 5 TIPOS DE COMPOSIÇÃO ────────────────────────────────────────────────────

const COMPOSITION_TYPES = {

  // ── A. CENTER FOCUS (Alta Performance) ─────────────────────────────────────
  center_focus: {
    descricao: 'Sujeito central com fundo limpo',
    uso: ['conversao', 'mensagem_direta', 'cta'],
    requer_personagem: true,
    layout: {
      subject_position: 'center',
      subject_max_area: 0.40,
      negative_space_min: 0.60,
      text_position: 'top_bottom',
      background: 'clean',
    },
    prompt_block: `COMPOSITION RULES:
- Subject centered in frame, occupying max 40% of image area
- Vast, clean, uncluttered background behind subject (extreme minimalism)
- Clear negative space at top 20% for headline text
- Clear negative space at bottom 20% for CTA text
- Strong focal point at center
- No competing visual elements around subject
- Balanced symmetrical or near-symmetrical framing`,
    copy_adaptation: {
      headline_position: 'top',
      subtitle_position: 'bottom',
      text_alignment: 'center',
    },
  },

  // ── B. SIDE WEIGHT (Cinematográfico) ───────────────────────────────────────
  side_weight: {
    descricao: 'Sujeito lateral + espaço negativo',
    uso: ['emocional', 'storytelling', 'introspecção'],
    requer_personagem: true,
    layout: {
      subject_position: 'left_or_right',
      subject_max_area: 0.35,
      negative_space_min: 0.65,
      text_position: 'opposite_side',
      background: 'rich',
    },
    prompt_block: `COMPOSITION RULES:
- Subject positioned on the FAR LEFT or FAR RIGHT third of the frame
- Subject occupying max 35% of image area
- Massive empty or softly textured area on the OPPOSITE side (65%+ of image)
- This empty area is intentional — reserved for text overlay
- Cinematic rule-of-thirds framing
- Shallow depth of field on background
- Atmospheric depth and environmental storytelling`,
    copy_adaptation: {
      headline_position: 'opposite_side',
      subtitle_position: 'opposite_side',
      text_alignment: 'left_or_right',
    },
  },

  // ── C. NEGATIVE SPACE (Premium) ────────────────────────────────────────────
  negative_space: {
    descricao: 'Muito espaço vazio com elemento pequeno',
    uso: ['minimalista', 'reflexao', 'alto_impacto'],
    requer_personagem: false,
    layout: {
      subject_position: 'small_centered',
      subject_max_area: 0.20,
      negative_space_min: 0.80,
      text_position: 'dominant',
      background: 'minimal',
    },
    prompt_block: `COMPOSITION RULES:
- Subject is TINY — occupying max 20% of image area
- Vast empty negative space (80%+) dominates the image
- Subject can be a person from far, a symbolic object, or a small figure
- Background is minimal, clean, softly textured
- Text will be the DOMINANT visual element (placed by system later)
- The image serves as atmospheric backdrop for bold typography
- Premium, gallery-quality minimalism`,
    copy_adaptation: {
      headline_position: 'center',
      subtitle_position: 'center_below',
      text_alignment: 'center',
      text_is_dominant: true,
    },
  },

  // ── D. SYMBOLIC SCENE (Sem Pessoa) ─────────────────────────────────────────
  symbolic_scene: {
    descricao: 'Cena metafórica sem rosto humano',
    uso: ['engajamento', 'variedade', 'anti_fadiga'],
    requer_personagem: false,
    layout: {
      subject_position: 'center_or_offset',
      subject_max_area: 0.30,
      negative_space_min: 0.70,
      text_position: 'overlay_clean',
      background: 'contextual',
    },
    prompt_block: `COMPOSITION RULES:
- NO human face or figure in the image
- Main subject is a SYMBOLIC OBJECT or METAPHORICAL SCENE
- Examples: an open diary, a broken mirror, floating feathers, an empty chair, a single candle
- Object occupying max 50% of frame
- Clean areas at top and bottom for text overlay
- Rich symbolic meaning connected to emotional theme
- Editorial composition, premium aesthetic`,
    copy_adaptation: {
      headline_position: 'top',
      subtitle_position: 'bottom',
      text_alignment: 'center',
    },
  },

  // ── E. SPLIT EMOTION (Controlado — NÃO é grid) ────────────────────────────
  split_emotion: {
    descricao: 'Dualidade emocional com transição suave',
    uso: ['contraste', 'insight', 'antes_depois'],
    requer_personagem: true,
    layout: {
      subject_position: 'center',
      subject_max_area: 0.40,
      negative_space_min: 0.60,
      text_position: 'top_bottom',
      background: 'gradient_dual',
    },
    prompt_block: `COMPOSITION RULES:
- SINGLE cohesive scene (NOT split screen, NOT grid)
- Emotional duality expressed through SOFT GRADIENT transition in background
- Left side may have cooler tones, right side warmer tones (or top-to-bottom)
- NO hard division lines — only smooth color/mood transition
- Subject centered, occupying max 40% of frame, with plenty of breathing room
- The transition is subtle and atmospheric, not a literal split
- Clear areas at top and bottom for text overlay`,
    copy_adaptation: {
      headline_position: 'top',
      subtitle_position: 'bottom',
      text_alignment: 'center',
    },
  },
};

// ── PESOS POR OBJETIVO ───────────────────────────────────────────────────────
// Cada objetivo de marketing prioriza composições diferentes.

const COMPOSITION_WEIGHTS = {
  engajamento: {
    center_focus:   0.25,
    side_weight:    0.25,
    negative_space: 0.15,
    symbolic_scene: 0.20,
    split_emotion:  0.15,
  },
  conversao: {
    center_focus:   0.40,
    side_weight:    0.20,
    negative_space: 0.15,
    symbolic_scene: 0.10,
    split_emotion:  0.15,
  },
  salvamento: {
    center_focus:   0.20,
    side_weight:    0.30,
    negative_space: 0.20,
    symbolic_scene: 0.15,
    split_emotion:  0.15,
  },
  compartilhamento: {
    center_focus:   0.30,
    side_weight:    0.20,
    negative_space: 0.10,
    symbolic_scene: 0.25,
    split_emotion:  0.15,
  },
  autoridade: {
    center_focus:   0.25,
    side_weight:    0.25,
    negative_space: 0.25,
    symbolic_scene: 0.15,
    split_emotion:  0.10,
  },
  // Fallback genérico
  default: {
    center_focus:   0.25,
    side_weight:    0.25,
    negative_space: 0.15,
    symbolic_scene: 0.20,
    split_emotion:  0.15,
  },
};

// ── ANTI-GRID: BLOCO DE RESTRIÇÃO OBRIGATÓRIO ────────────────────────────────
// Injetado em TODOS os prompts, independente da composição escolhida.

const FORBIDDEN_COMPOSITION_BLOCK = `
🚫 FORBIDDEN COMPOSITION (ABSOLUTE RULES):
- NO grid layouts
- NO multiple images in one frame
- NO collage or mosaic
- NO repeated characters or subjects
- NO UI mockups or design previews
- NO multiple panels or frames
- NO split screen with hard divisions
- NO storyboard or comic strip layout
- NO gallery style or Pinterest layout
- NO before-and-after side-by-side
- NO cluttered scenes or visually overloaded environments
- NO busy or heavy backgrounds that distract from text readability
- ONLY ONE single cohesive scene per image
The image MUST represent a SINGLE cohesive scene filling the entire canvas, prioritizing minimalism and empty space.`;

// ── SAFE ZONES POR FORMATO ───────────────────────────────────────────────────

const SAFE_ZONES = {
  feed: {
    width: 1080, height: 1440,
    safe_area: { top: 200, bottom: 200, sides: 100 },
    prompt_hint: 'Keep top 15% and bottom 15% of the image clean and low-detail for text overlay',
  },
  story: {
    width: 1080, height: 1920,
    safe_area: { top: 250, bottom: 300, sides: 80 },
    prompt_hint: 'Keep top 13% and bottom 16% of the image clean for text overlay and UI elements',
  },
};

// ── ENGINE PRINCIPAL ─────────────────────────────────────────────────────────

/**
 * Escolhe a composição ideal com base no contexto.
 *
 * @param {Object} params
 * @param {string} params.objetivo — objetivo de marketing (engajamento, conversao, etc.)
 * @param {string} params.emocao — emoção principal do conteúdo
 * @param {string} params.tipoCena — tipo de cena do scene_decision_engine
 * @param {string[]} params.ultimasComposicoes — últimas composições usadas (da memória)
 * @param {number} params.humanCount — quantos posts recentes tiveram pessoa
 * @param {string} params.formato — feed, story
 * @returns {Object} — composição completa com todas as regras
 */
export function escolherComposicao({
  objetivo = 'engajamento',
  emocao = '',
  tipoCena = '',
  ultimasComposicoes = [],
  humanCount = 0,
  formato = 'feed',
} = {}) {
  const weights = { ...(COMPOSITION_WEIGHTS[objetivo] || COMPOSITION_WEIGHTS.default) };
  const lastComp = ultimasComposicoes[ultimasComposicoes.length - 1] || null;
  const last3 = ultimasComposicoes.slice(-3);

  // ── REGRA 1: Nunca repetir composição 2x seguidas ─────────────────────────
  if (lastComp && weights[lastComp]) {
    weights[lastComp] = 0;
    console.log(`   🔄 Anti-repetição: bloqueando "${lastComp}" (usada no último post)`);
  }

  // ── REGRA 2: Após 3+ posts com pessoas → forçar symbolic_scene ────────────
  if (humanCount >= 3) {
    // Zera todas e força symbolic_scene
    Object.keys(weights).forEach(k => { weights[k] = 0; });
    weights.symbolic_scene = 1.0;
    console.log(`   🎭 Anti-fadiga: forçando "symbolic_scene" (${humanCount} posts com humano seguidos)`);
  }

  // ── REGRA 3: Emoção alta → priorizar side_weight ──────────────────────────
  const emocoesAltas = ['dor profunda', 'angústia', 'abandono', 'trauma', 'solidão', 'culpa', 'medo'];
  if (emocao && emocoesAltas.some(e => emocao.toLowerCase().includes(e))) {
    weights.side_weight = (weights.side_weight || 0.25) * 1.8;
    weights.split_emotion = (weights.split_emotion || 0.15) * 1.4;
  }

  // ── REGRA 4: Scene decision override ──────────────────────────────────────
  if (tipoCena === 'tipografia' || tipoCena === 'simbolico' || tipoCena === 'objeto') {
    weights.symbolic_scene = (weights.symbolic_scene || 0.20) * 2.0;
    weights.negative_space = (weights.negative_space || 0.15) * 1.5;
  }

  // ── REGRA 5: Evitar mesma composição nos últimos 3 ────────────────────────
  last3.forEach(comp => {
    if (weights[comp]) {
      weights[comp] *= 0.4; // Reduz mas não zera (pode voltar se necessário)
    }
  });

  // ── Normalizar pesos (garantir que soma > 0) ──────────────────────────────
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  if (totalWeight === 0) {
    // Safety fallback: distribuir uniformemente
    Object.keys(weights).forEach(k => { weights[k] = 0.2; });
  }

  // ── SELEÇÃO ────────────────────────────────────────────────────────────────
  const tipo = weightedRandom(weights);
  const composicao = COMPOSITION_TYPES[tipo];
  const safeZone = SAFE_ZONES[formato] || SAFE_ZONES.feed;

  console.log(`   🎯 Composição : ${tipo} (${composicao.descricao})`);
  console.log(`   📐 Formato    : ${formato} (${safeZone.width}x${safeZone.height})`);

  return {
    tipo,
    descricao: composicao.descricao,
    requer_personagem: composicao.requer_personagem,
    layout: composicao.layout,
    prompt_block: composicao.prompt_block,
    forbidden_block: FORBIDDEN_COMPOSITION_BLOCK,
    safe_zone: safeZone,
    copy_adaptation: composicao.copy_adaptation,
    meta: {
      tipo,
      sujeito_max_area: composicao.layout.subject_max_area,
      espaco_negativo_min: composicao.layout.negative_space_min,
      permitir_repeticao: false,
      permitir_grid: false,
      subject_position: composicao.layout.subject_position,
      formato,
    },
  };
}

// ── COMPOSIÇÃO PARA CARROSSEL (Variação entre slides) ────────────────────────
// Em carrossel, a composição principal é mantida mas com micro-variações.

/**
 * Gera variações de composição para cada slide de um carrossel.
 * Mantém a composição-base mas varia a posição do sujeito.
 *
 * @param {Object} composicaoBase — resultado de escolherComposicao()
 * @param {number} totalSlides — quantidade de slides
 * @returns {Object[]} — array de composições por slide
 */
export function variarComposicaoCarrossel(composicaoBase, totalSlides) {
  const variacoes = [];
  const tipo = composicaoBase.tipo;

  // Micro-variações por composição
  const MICRO_VARIATIONS = {
    center_focus: [
      'subject slightly left of center',
      'subject perfectly centered',
      'subject slightly right of center',
      'subject centered, slight low angle',
      'subject centered, eye level',
    ],
    side_weight: [
      'subject on left third',
      'subject on right third',
      'subject on left third, looking right',
      'subject on right third, looking left',
      'subject on left, background depth right',
    ],
    negative_space: [
      'small subject bottom-center',
      'small subject upper-left',
      'small subject center',
      'small subject lower-right',
      'tiny subject center with vast space',
    ],
    symbolic_scene: [
      'symbolic object centered',
      'symbolic object slightly offset',
      'symbolic elements scattered softly',
      'single symbolic object with depth',
      'symbolic arrangement with meaning',
    ],
    split_emotion: [
      'warm-to-cool gradient left-to-right',
      'cool-to-warm gradient top-to-bottom',
      'soft dual-tone atmospheric',
      'subtle emotional color shift',
      'gentle tonal transition',
    ],
  };

  const pool = MICRO_VARIATIONS[tipo] || MICRO_VARIATIONS.center_focus;

  for (let i = 0; i < totalSlides; i++) {
    variacoes.push({
      ...composicaoBase,
      slideIndex: i,
      micro_variation: pool[i % pool.length],
    });
  }

  return variacoes;
}

// ── VALIDADOR DE COMPOSIÇÃO ──────────────────────────────────────────────────
// Valida se a composição escolhida é coerente com o contexto.

/**
 * Valida a composição contra as regras de negócio.
 *
 * @param {Object} composicao — resultado de escolherComposicao()
 * @param {Object} context — { objetivo, emocao, tipoPost }
 * @returns {Object} — { isValid, warnings }
 */
export function validarComposicao(composicao, context = {}) {
  const warnings = [];

  // Validação 1: CTA deve usar composição com texto visível
  if (context.tipoPost === 'convite' || context.tipoPost === 'dor_solucao') {
    if (composicao.tipo === 'side_weight') {
      warnings.push('CTA/convite funciona melhor com center_focus ou negative_space');
    }
  }

  // Validação 2: Checklist/mini_guia deve ter espaço para texto
  if (context.tipoPost === 'checklist' || context.tipoPost === 'mini_guia') {
    if (composicao.tipo !== 'negative_space' && composicao.tipo !== 'symbolic_scene') {
      warnings.push('Checklist/guia funciona melhor com negative_space ou symbolic_scene');
    }
  }

  // Validação 3: Não usar symbolic_scene para conversão direta
  if (context.objetivo === 'conversao' && composicao.tipo === 'symbolic_scene') {
    warnings.push('Conversão direta funciona melhor com presença humana (center_focus)');
  }

  if (warnings.length > 0) {
    console.log(`   ⚠️ Validação de composição:`);
    warnings.forEach(w => console.log(`      → ${w}`));
  }

  return {
    isValid: true, // Warnings não bloqueiam, apenas informam
    warnings,
  };
}

// ── EXPORTS ──────────────────────────────────────────────────────────────────

export {
  COMPOSITION_TYPES,
  COMPOSITION_WEIGHTS,
  FORBIDDEN_COMPOSITION_BLOCK,
  SAFE_ZONES,
};

export default escolherComposicao;
