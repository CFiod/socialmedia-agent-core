/**
 * ============================================================
 * 🎨 STYLE ENGINE V2 — Instagram-Native Aesthetic System
 * ============================================================
 * Replaces generic AI styles with 5 curated Instagram-native
 * aesthetics based on real creator patterns.
 *
 * Decision: goal + emotion → style
 * Each style carries visual DNA for prompt generation.
 * ============================================================
 */

// ── INSTAGRAM-NATIVE STYLES ─────────────────────────────────────────────────
// Cada estilo define a "linguagem visual" completa para a imagem final.

export const INSTAGRAM_STYLES = {
  cinematic_soft: {
    id: "cinematic_soft",
    luz: "natural difusa",
    contraste: "baixo",
    textura: "filmic",
    vibe: "emocional, íntimo",
    prompt_modifiers: "soft diffused natural light, filmic grain, low contrast, warm intimate mood, shallow depth of field, golden hour tones",
    negative: "harsh shadows, overexposed, clinical lighting, flat colors",
    typography: "light",
    overlay_opacity: 0.55,
  },

  brutalist_psycho: {
    id: "brutalist_psycho",
    luz: "dura",
    contraste: "alto",
    textura: "grão pesado",
    vibe: "impacto psicológico",
    prompt_modifiers: "hard dramatic lighting, heavy film grain, high contrast, psychological tension, stark shadows, gritty texture, noir aesthetic",
    negative: "soft light, pastel colors, cheerful, clean",
    typography: "bold",
    overlay_opacity: 0.70,
  },

  minimal_clean: {
    id: "minimal_clean",
    luz: "flat",
    contraste: "baixo",
    textura: "limpa",
    vibe: "premium, editorial",
    prompt_modifiers: "flat even lighting, clean minimal aesthetic, editorial composition, generous negative space, muted neutral palette, premium feel",
    negative: "cluttered, busy background, heavy shadows, saturated colors",
    typography: "bold",
    overlay_opacity: 0.45,
  },

  dark_luxury: {
    id: "dark_luxury",
    luz: "low key",
    contraste: "alto",
    textura: "cinematográfica",
    vibe: "sofisticado, profundo",
    prompt_modifiers: "low-key lighting, deep rich shadows, cinematic composition, sophisticated dark palette, subtle rim light, moody atmosphere",
    negative: "bright, cheerful, flat lighting, overexposed",
    typography: "mixed",
    overlay_opacity: 0.60,
  },

  ugc_raw: {
    id: "ugc_raw",
    luz: "natural imperfeita",
    contraste: "médio",
    textura: "real",
    vibe: "conteúdo orgânico (UGC)",
    prompt_modifiers: "natural imperfect lighting, medium contrast, authentic raw texture, organic feel, real-world setting, unposed casual, slight lens imperfection",
    negative: "studio lighting, perfect composition, overly polished, artificial",
    typography: "bold",
    overlay_opacity: 0.50,
  },
};

// ── AUTO-DECISION: goal + emotion → style ───────────────────────────────────

/**
 * Decide automaticamente o estilo visual baseado no objetivo de crescimento
 * e na emoção principal do conteúdo.
 *
 * @param {Object} params
 * @param {string} params.goal — objetivo: "conversao", "engajamento", "salvamento", "compartilhamento", "autoridade"
 * @param {string} params.emotion — emoção dominante do conteúdo
 * @param {string} [params.forceStyle] — forçar estilo específico (override)
 * @returns {Object} — { grupo, base, style } com metadata completa do estilo
 */
export function escolherEstilo({ marketing, estrategia, forceStyle } = {}) {
  // ── Override manual (CLI --estilo) ──
  if (forceStyle && INSTAGRAM_STYLES[forceStyle]) {
    const style = INSTAGRAM_STYLES[forceStyle];
    console.log(`🎨 [StyleEngine V2] OVERRIDE: ${forceStyle}`);
    return { grupo: "manual", base: forceStyle, style };
  }

  const goal = marketing?.objetivo || "engajamento";
  const emotion = estrategia?.emocao_principal || estrategia?.emocao || "";

  let styleId = chooseStyle(goal, emotion);
  const style = INSTAGRAM_STYLES[styleId];

  console.log(`🎨 [StyleEngine V2] Goal: ${goal} + Emoção: "${emotion}" → Estilo: ${styleId} (${style.vibe})`);

  return {
    grupo: goal,
    base: styleId,
    style,
  };
}

// ── CORE DECISION LOGIC ─────────────────────────────────────────────────────

function chooseStyle(goal, emotion) {
  const emotionLower = (emotion || "").toLowerCase();

  // ── Goal-based primary decision ──
  if (goal === "conversao") return "brutalist_psycho";
  if (goal === "engajamento") {
    // Engajamento varia por emoção
    if (emotionLower.includes("dor") || emotionLower.includes("ansiedade")) return "cinematic_soft";
    if (emotionLower.includes("orgulho") || emotionLower.includes("empoderamento")) return "ugc_raw";
    return pickWeighted({ ugc_raw: 0.35, cinematic_soft: 0.30, minimal_clean: 0.20, dark_luxury: 0.15 });
  }
  if (goal === "compartilhamento") return "brutalist_psycho";
  if (goal === "salvamento") return "minimal_clean";
  if (goal === "autoridade") return "dark_luxury";

  // ── Emotion-based fallback ──
  if (emotionLower.includes("melanc") || emotionLower.includes("triste") || emotionLower.includes("saudade")) return "cinematic_soft";
  if (emotionLower.includes("confian") || emotionLower.includes("calma") || emotionLower.includes("clareza")) return "minimal_clean";
  if (emotionLower.includes("raiva") || emotionLower.includes("indignação") || emotionLower.includes("culpa")) return "brutalist_psycho";
  if (emotionLower.includes("mistério") || emotionLower.includes("profund")) return "dark_luxury";

  // ── Default: cinematic_soft (mais versátil) ──
  return "cinematic_soft";
}

// ── WEIGHTED RANDOM PICK ─────────────────────────────────────────────────────

function pickWeighted(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return key;
  }
  return entries[0][0];
}

// ── STYLE VARIATION PER SLIDE (anti-repetição) ──────────────────────────────

/**
 * Gera variação controlada do estilo para slides consecutivos.
 * Mantém a estética base mas varia parâmetros sutis.
 */
export function variarEstilo(baseStyleId, slideIndex) {
  const style = INSTAGRAM_STYLES[baseStyleId] || INSTAGRAM_STYLES.cinematic_soft;

  const variacoes = [
    "slightly wider framing",
    "tighter intimate framing",
    "subtle color temperature shift warm",
    "subtle color temperature shift cool",
    "minimal camera angle variation",
  ];

  const variacao = variacoes[slideIndex % variacoes.length];
  return `${style.prompt_modifiers}, ${variacao}`;
}

// ── ANTI-REPETITION: Prevent same style in sequence ─────────────────────────

const _recentStyles = [];

export function getStyleWithAntiRepetition(params) {
  const result = escolherEstilo(params);

  // Se o estilo foi usado nos últimos 2 posts, tenta outro
  if (_recentStyles.length >= 2 && _recentStyles.slice(-2).every(s => s === result.base)) {
    const alternatives = Object.keys(INSTAGRAM_STYLES).filter(s => s !== result.base);
    const alt = alternatives[Math.floor(Math.random() * alternatives.length)];
    result.base = alt;
    result.style = INSTAGRAM_STYLES[alt];
    console.log(`   🔄 [StyleEngine V2] Anti-repetição ativada: ${alt}`);
  }

  _recentStyles.push(result.base);
  if (_recentStyles.length > 5) _recentStyles.shift();

  return result;
}

// ── EXPORTS ──────────────────────────────────────────────────────────────────

export default escolherEstilo;
