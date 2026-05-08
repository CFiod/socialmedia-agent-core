/**
 * ============================================================
 * 🖼️ IMAGE INTENTION ENGINE — Camada de Decisão Visual
 * ============================================================
 * Instrucao.txt: Item 1 (🥇 IMAGE INTENTION LAYER)
 *
 * RESPONSABILIDADE:
 *   Decidir ANTES de gerar o prompt:
 *   - usar humano ou não (com probabilidade adaptativa)
 *   - tipo de imagem (metafórica, abstrata, ambiental, simbólica)
 *   - foco composicional
 *   - nível de narrativa visual
 *   - densidade visual (baixa / media / alta)
 *
 * PROBLEMA QUE RESOLVE:
 *   Sem esta camada, o modelo cai em:
 *   "mulher bonita emocional + fundo genérico"
 *   porque nenhuma INTENÇÃO EXPLÍCITA é declarada antes do prompt.
 * ============================================================
 */

// ── MAPEAMENTO: tipo de cena → tipo de imagem ────────────────────────────────

const SCENE_TO_IMAGE_TYPE = {
  humano:    'narrativa_humana',
  silhueta:  'silhueta_atmosferica',
  objeto:    'objeto_simbolico',
  ambiente:  'ambiente_emocional',
  simbolico: 'composicao_metaforica',
  abstrato:  'abstrato_editorial',
  tipografia:'fundo_editorial',
};

// ── MAPEAMENTO: emoção → densidade visual recomendada ───────────────────────

const EMOTION_DENSITY = {
  ansiedade:    'alta',
  tensao:       'alta',
  culpa:        'media',
  vazio:        'baixa',
  curiosidade:  'media',
  insight:      'media',
  alivio:       'baixa',
  acao:         'alta',
  confianca:    'media',
  identificacao:'media',
};

// ── MAPEAMENTO: objetivo → probabilidade de uso de humano ────────────────────

const OBJETIVO_HUMAN_PROB = {
  engajamento:     0.40,
  salvamento:      0.25,
  compartilhamento:0.45,
  autoridade:      0.35,
  conversao:       0.50,
};

// ── ENGINE PRINCIPAL ─────────────────────────────────────────────────────────

/**
 * Decide a intenção visual da imagem ANTES de construir o prompt.
 *
 * @param {Object} params
 * @param {Object} params.scene       — output do decideScene (scene_engine)
 * @param {Object} params.composition — output do composition_engine
 * @param {Object} params.copyResult  — output do copy_intent_engine
 * @param {string} params.objetivo    — objetivo de marketing
 * @param {string} params.emotionId   — emoção do post
 * @param {number} [params.recentHumanCount] — quantos posts humanos nos últimos 5
 * @returns {Object} — imageIntention
 */
export function imageIntentionEngine({
  scene,
  composition,
  copyResult,
  objetivo = 'engajamento',
  emotionId = 'curiosidade',
  recentHumanCount = 0,
} = {}) {

  // ── 1. Decisão: usar humano? ──────────────────────────────────────────────
  // Combina: tipo de cena + probabilidade base do objetivo + anti-fadiga humana
  let humanBaseProbability = OBJETIVO_HUMAN_PROB[objetivo] || 0.40;

  // Anti-fadiga: se muitos posts com humano recentes → reduzir drasticamente
  if (recentHumanCount >= 3) humanBaseProbability = 0.10;
  else if (recentHumanCount >= 2) humanBaseProbability *= 0.40;

  // Override pela decisão do scene engine (já validada com anti-repetição)
  const usar_humano = scene.requer_personagem
    ? Math.random() < humanBaseProbability
    : false;

  // ── 2. Tipo de imagem ─────────────────────────────────────────────────────
  const tipo_imagem = SCENE_TO_IMAGE_TYPE[scene.tipo] || 'composicao_metaforica';

  // ── 3. Foco composicional (do composition engine) ─────────────────────────
  const foco = composition?.tipo || 'center_focus';

  // ── 4. Narrativa visual obrigatória ──────────────────────────────────────
  // A imagem DEVE contar uma história, não apenas mostrar um rosto
  const narrativa = true;

  // ── 5. Densidade visual ───────────────────────────────────────────────────
  const densidade = EMOTION_DENSITY[emotionId] || 'media';

  // ── 6. Alinhamento copy → visual ─────────────────────────────────────────
  // Derivar tema visual da copy para garantir coerência semântica
  const angulo_copy = copyResult?.anguloRotativo || copyResult?.meta?.anguloRotativo || 'insight_inesperado';
  const tema_visual = deriveVisualTheme(angulo_copy, emotionId);

  // ── LOG ──────────────────────────────────────────────────────────────────
  console.log(`   🖼️  [ImageIntention] Tipo: ${tipo_imagem} | Humano: ${usar_humano} | Densidade: ${densidade}`);
  console.log(`   🔗 [ImageIntention] Tema visual: "${tema_visual}" (ângulo: ${angulo_copy})`);

  return {
    usar_humano,
    tipo_imagem,
    foco,
    narrativa,
    densidade,
    tema_visual,
    angulo_copy,
    // Bloco de direção para o prompt builder
    directive: buildDirectiveBlock({ usar_humano, tipo_imagem, tema_visual, densidade }),
  };
}

// ── DERIVAR TEMA VISUAL A PARTIR DO ÂNGULO DE COPY ──────────────────────────

function deriveVisualTheme(angulo, emotionId) {
  const ANGULO_VISUAL = {
    confronto_direto:       `environment that feels confrontational, tension in space, shadow play`,
    insight_inesperado:     `revealing light breaking through darkness, unexpected perspective, visual aha moment`,
    quebra_de_crenca_forte: `cracked surface, contrast between facade and interior, visual duality`,
    narrativa_curta:        `sequential story implied in single frame, character in decisive moment`,
    pergunta_desconfortavel:`empty space filled with weight, visual question mark, unresolved composition`,
  };

  const EMOTION_VISUAL = {
    ansiedade:   `claustrophobic space, tight framing, overwhelming environment`,
    tensao:      `dramatic contrast, sharp angles, high stakes atmosphere`,
    curiosidade: `inviting depth, partially revealed, leading lines into mystery`,
    alivio:      `expansive open space, breathing room, warm light`,
    insight:     `single illuminated element against dark, clarity emerging`,
    culpa:       `small subject in large environment, weight of space`,
  };

  return ANGULO_VISUAL[angulo] || EMOTION_VISUAL[emotionId] || `emotional environment aligned with ${emotionId}`;
}

// ── CONSTRUIR BLOCO DE DIRETIVA PARA O PROMPT ───────────────────────────────

function buildDirectiveBlock({ usar_humano, tipo_imagem, tema_visual, densidade }) {
  const humanDirective = usar_humano
    ? `Human subject: present but not dominant — integrated into environment, max 40% of frame`
    : `Human subject: FORBIDDEN — purely environmental/symbolic/abstract composition`;

  const densityMap = {
    alta:  `Rich visual complexity, multiple symbolic elements, layered depth`,
    media: `Balanced composition, 2-3 key visual elements, breathing space`,
    baixa: `Extreme minimalism, vast negative space, single focal element`,
  };

  return `
IMAGE INTENTION DIRECTIVE (NON-NEGOTIABLE):
Type: ${tipo_imagem}
${humanDirective}
Visual theme: ${tema_visual}
Density: ${densityMap[densidade] || densityMap.media}
Narrative requirement: The image MUST tell a story — not just show a subject
Composition focus: Every visual element must serve the emotional narrative`;
}

export default imageIntentionEngine;
