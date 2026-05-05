/**
 * ============================================================
 * 📐 LAYOUT ENGINE V3 — Vision-Aware & Probabilistic System
 * ============================================================
 * - Layouts probabilísticos (não engessados)
 * - AUTOR_LAYOUT fixo (nunca randomizado)
 * - Variação progressiva para carrosséis
 * - 6 layouts distintos com pesos
 * - Integração com Attention & Safe Zones (V3)
 * ============================================================
 */
import { simulateAttentionMap } from '../engines/attention/attentionEngine.js';
import { generateSafeZonesV3, resolveLayoutV3 } from '../engines/attention/safeZoneEngine.js';


// ── 6 LAYOUT TYPES COM PESOS PROBABILÍSTICOS ────────────────────────────────

export const LAYOUT_WEIGHTS = {
  center_text:  0.25,   // Texto centralizado verticalmente
  bottom_text:  0.20,   // Texto na zona inferior
  top_text:     0.15,   // Texto na zona superior
  split_left:   0.15,   // Texto alinhado à esquerda
  split_right:  0.15,   // Texto alinhado à direita
  overlay_soft: 0.10,   // Texto sobre gradiente suave (mais sutil)
};

// ── LAYOUT DEFINITIONS ──────────────────────────────────────────────────────
// Cada layout define posicionamento de headline, subtitle e CTA.

const LAYOUT_DEFS = {
  center_text: {
    id: "center_text",
    label: "Centro (Vertical)",
    headline: { yPercent: 0.55, align: "center", maxWidthPercent: 0.85 },
    subtitle: { yPercent: 0.65, align: "center", maxWidthPercent: 0.80 },
    cta:      { yPercent: 0.82, align: "center", maxWidthPercent: 0.75 },
  },

  bottom_text: {
    id: "bottom_text",
    label: "Texto na Base",
    headline: { yPercent: 0.60, align: "center", maxWidthPercent: 0.85 },
    subtitle: { yPercent: 0.70, align: "center", maxWidthPercent: 0.80 },
    cta:      { yPercent: 0.82, align: "center", maxWidthPercent: 0.75 },
  },

  top_text: {
    id: "top_text",
    label: "Texto no Topo",
    headline: { yPercent: 0.08, align: "center", maxWidthPercent: 0.85 },
    subtitle: { yPercent: 0.22, align: "center", maxWidthPercent: 0.80 },
    cta:      { yPercent: 0.82, align: "center", maxWidthPercent: 0.75 },
  },

  split_left: {
    id: "split_left",
    label: "Split Esquerdo",
    headline: { yPercent: 0.55, align: "left", maxWidthPercent: 0.55, xOffsetPercent: 0.08 },
    subtitle: { yPercent: 0.65, align: "left", maxWidthPercent: 0.55, xOffsetPercent: 0.08 },
    cta:      { yPercent: 0.82, align: "center", maxWidthPercent: 0.75 },
  },

  split_right: {
    id: "split_right",
    label: "Split Direito",
    headline: { yPercent: 0.55, align: "right", maxWidthPercent: 0.55, xOffsetPercent: 0.92 },
    subtitle: { yPercent: 0.65, align: "right", maxWidthPercent: 0.55, xOffsetPercent: 0.92 },
    cta:      { yPercent: 0.82, align: "center", maxWidthPercent: 0.75 },
  },

  overlay_soft: {
    id: "overlay_soft",
    label: "Overlay Suave",
    headline: { yPercent: 0.60, align: "center", maxWidthPercent: 0.75 },
    subtitle: { yPercent: 0.70, align: "center", maxWidthPercent: 0.70 },
    cta:      { yPercent: 0.82, align: "center", maxWidthPercent: 0.70 },
    overlayGradient: true,   // Sinaliza para o overlay engine aplicar gradiente extra
  },
};

// ── AUTOR LAYOUT (FIXO — NUNCA RANDOMIZADO) ──────────────────────────────────
// Regra V5: imagem top-center → texto centralizado → assinatura bottom-center

export const AUTOR_LAYOUT = {
  id: "autor_fixed",
  label: "Autor (Fixo)",
  // V5.1: [TEXTO topo] → [ASSINATURA] → [IMAGEM DO AUTOR inferior]
  imagePosition: "bottom-center",
  headline: { yPercent: 0.08, align: "center", maxWidthPercent: 0.80 },
  subtitle: { yPercent: 0.28, align: "center", maxWidthPercent: 0.75 },
  signature: { yPercent: 0.45, align: "center" },
  cta:       { yPercent: 0.82, align: "center", maxWidthPercent: 0.75 },
  padding: "balanced",
  rules: {
    maxLines: 3,
    centerText: true,
    dominantTypography: true,
    disableRandomLayout: true,
  },
};

// ── FORMAT DIMENSIONS ────────────────────────────────────────────────────────

const FORMATS = {
  feed: { size: "1080x1440", width: 1080, height: 1440 },
  story: { size: "1080x1920", width: 1080, height: 1920 },
  reels: { size: "1080x1920", width: 1080, height: 1920 },
};

// ── SAFE ZONES ───────────────────────────────────────────────────────────────

const SAFE_ZONES = {
  feed:  { top: 100, bottom: 120, left: 60, right: 60 },
  story: { top: 140, bottom: 200, left: 60, right: 60 },
  reels: { top: 160, bottom: 250, left: 60, right: 60 },
};

// ── WEIGHTED RANDOM PICK ─────────────────────────────────────────────────────

function weightedRandomPick(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return key;
  }
  return entries[0][0];
}

// ── ANTI-REPETITION FOR CAROUSEL ─────────────────────────────────────────────

/**
 * Para carrosséis, garante variação progressiva:
 * - Nunca 2 slides consecutivos com o mesmo layout
 * - Favorece diversidade no conjunto
 */
function pickLayoutWithVariation(previousLayout = null) {
  let layoutId;
  let attempts = 0;

  do {
    layoutId = weightedRandomPick(LAYOUT_WEIGHTS);
    attempts++;
  } while (layoutId === previousLayout && attempts < 5);

  return layoutId;
}

// ── FONT SIZE ADAPTATION ─────────────────────────────────────────────────────

function adaptFontSize(text, baseSize) {
  if (!text) return baseSize;
  const len = text.length;
  if (len > 80) return Math.round(baseSize * 0.72);
  if (len > 50) return Math.round(baseSize * 0.82);
  if (len > 30) return Math.round(baseSize * 0.90);
  return baseSize;
}

// ── ENGINE PRINCIPAL V3 ─────────────────────────────────────────────────────

/**
 * Gera as especificações de layout com base no formato, modo, contexto visual e safe zones.
 *
 * @param {string} formato — "feed", "story", ou "reels"
 * @param {string} tipoCena — tipo de cena do scene_decision_engine
 * @param {Object} copy — { headline, subtexto }
 * @param {Object} [composicao] — composição do composition_engine
 * @param {Object} [layoutOptions] — { isAutor, slideIndex, previousLayout, emotion }
 * @param {Object} [visionData] — { faces, safeZone, imgW, imgH, sceneMetadata }
 * @returns {Object} — layout completo com posicionamento adaptado
 */
export function layoutEngine(formato, tipoCena = "humano", copy = {}, composicao = null, layoutOptions = {}, visionData = null) {
  const dims = FORMATS[formato] || FORMATS.feed;
  const safeZone = SAFE_ZONES[formato] || SAFE_ZONES.feed;

  // ── MODO AUTOR: Layout fixo, nunca randomizado ──
  if (layoutOptions.isAutor) {
    console.log(`   📐 Layout     : ${dims.size} (${formato}) → AUTOR (fixo, centralizado)`);
    return {
      ...dims,
      layoutId: AUTOR_LAYOUT.id,
      layoutDef: AUTOR_LAYOUT,
      safeZone,
      formato,
      tipoCena,
      isAutor: true,
      headline: {
        ...AUTOR_LAYOUT.headline,
        fontSize: adaptFontSize(copy.headline, 52),
        fontWeight: "bold",
        lineHeight: 1.25,
      },
      subtitle: {
        ...AUTOR_LAYOUT.subtitle,
        fontSize: adaptFontSize(copy.subtexto, 28),
        fontWeight: "normal",
        lineHeight: 1.4,
      },
      logo: { bottom: "5%", right: "5%", maxHeight: 40 },
    };
  }

  let layoutId, layoutDef;

  // ── INTEGRAÇÃO V3: VISION-AWARE LAYOUT ──────────────────────────────────────
  if (visionData) {
      console.log(`   🧠 [LayoutEngine] Resolvendo layout com base em Vision Data...`);
      const { faces, safeZone: vSafeZone, imgW = dims.width, imgH = dims.height, sceneMetadata = {} } = visionData;
      
      const attentionMap = simulateAttentionMap(sceneMetadata, { faces, safeZone: vSafeZone }, imgW, imgH);
      const safeZones = generateSafeZonesV3(imgW, imgH, attentionMap);
      const v3Decision = resolveLayoutV3(safeZones);
      
      layoutId = v3Decision.layoutId;
      layoutDef = LAYOUT_DEFS[layoutId] || LAYOUT_DEFS.center_text;
      
      // Anexamos a estratégia de renderização V3 ao layoutDef (scrim/gradient)
      layoutDef = { ...layoutDef, _v3Strategy: v3Decision.strategy, _v3Zone: v3Decision.zone };
  } else {
      // ── FALLBACK V2: PICK LAYOUT PROBABILÍSTICO ──
      const previousLayout = layoutOptions.previousLayout || null;
      layoutId = pickLayoutWithVariation(previousLayout);
      layoutDef = LAYOUT_DEFS[layoutId];
  }

  // ── Font sizing dinâmico ──
  const baseHeadlineSize = formato === "story" ? 56 : 48;
  const baseSubSize = formato === "story" ? 32 : 28;

  const headline = {
    ...layoutDef.headline,
    fontSize: adaptFontSize(copy.headline, baseHeadlineSize),
    fontWeight: "bold",
    lineHeight: 1.25,
  };

  const subtitle = {
    ...layoutDef.subtitle,
    fontSize: adaptFontSize(copy.subtexto, baseSubSize),
    fontWeight: "normal",
    lineHeight: 1.4,
  };

  // ── Adaptation via Composition Engine (if available) ──
  if (composicao?.copy_adaptation?.text_is_dominant) {
    headline.fontSize = Math.round(headline.fontSize * 1.15);
  }

  const layout = {
    ...dims,
    layoutId,
    layoutDef,
    safeZone,
    headline,
    subtitle,
    cta: layoutDef.cta || null,
    overlayGradient: layoutDef.overlayGradient || false,
    formato,
    tipoCena,
    isAutor: false,
    logo: { bottom: "5%", right: "5%", maxHeight: 40 },
  };

  console.log(`   📐 Layout     : ${dims.size} (${formato}) → ${layoutId} (${layoutDef.label}) | cena: ${tipoCena}`);

  return layout;
}

// ── BATCH LAYOUT FOR CAROUSEL ────────────────────────────────────────────────

/**
 * Gera layouts para todos os slides de um carrossel com variação progressiva.
 *
 * @param {number} slideCount — número de slides
 * @param {string} formato — formato base
 * @param {Array} copies — array de { headline, subtexto } por slide
 * @param {Array} visionDataArray — array de dados de visão (opcional, para multi-pass)
 * @returns {Array} — array de layouts, um por slide
 */
export function generateCarouselLayouts(slideCount, formato, copies = [], visionDataArray = []) {
  const layouts = [];
  let previousLayout = null;

  for (let i = 0; i < slideCount; i++) {
    const copy = copies[i] || {};
    const vData = visionDataArray[i] || null;
    
    const layout = layoutEngine(formato, "humano", copy, null, {
      slideIndex: i,
      previousLayout,
    }, vData);
    
    layouts.push(layout);
    previousLayout = layout.layoutId;
  }

  console.log(`   📐 Carrossel Layouts: ${layouts.map(l => l.layoutId).join(' → ')}`);
  return layouts;
}

// ── EXPORTS ──────────────────────────────────────────────────────────────────

export { LAYOUT_DEFS, FORMATS, SAFE_ZONES, adaptFontSize };
export default layoutEngine;
