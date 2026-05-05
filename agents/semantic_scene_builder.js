/**
 * ============================================================
 * 🧠 SEMANTIC SCENE BUILDER — Copy → Visual Scene
 * ============================================================
 * PRINCÍPIO: A imagem NASCE da copy, não do tema.
 *
 * PIPELINE:
 *   copy.texto → analyzeCopy() → mapToScene() → buildScenePrompt()
 *
 * Cada card gera sua própria cena visual coerente com o significado
 * do texto, a emoção, e o conflito interno descrito.
 *
 * NUNCA: tema → imagem genérica → texto por cima ❌
 * SEMPRE: copy → intenção → cena → imagem ✅
 * ============================================================
 */

// ── 1. COPY ANALYZER — Extração Semântica ────────────────────────────────────
// Detecta tipo, sujeito, ação, conflito a partir do texto do card.

/**
 * Analisa semanticamente o texto de um card.
 * @param {string} texto — texto principal do card
 * @param {string} [subtexto] — subtexto complementar
 * @returns {Object} — { tipo, sujeito, acao, conflito, palavrasChave }
 */
export function analyzeCopy(texto, subtexto = '') {
  const full = `${texto} ${subtexto}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  return {
    tipo: detectType(full),
    sujeito: detectSubject(full),
    acao: detectAction(full),
    conflito: detectConflict(full),
    palavrasChave: extractKeywords(full),
  };
}

// ── DETECTION: Tipo do card ──────────────────────────────────────────────────

function detectType(text) {
  // Quebra de crença
  if (text.match(/nao e\b.*\b(e|significa|quer dizer)/i)) return 'quebra_de_crenca';
  if (text.match(/nao esta\b.*\besta\b/i)) return 'quebra_de_crenca';
  if (text.match(/nao (e|eh)\b/i) && text.match(/\b(e|eh)\b.*\./)) return 'quebra_de_crenca';
  
  // Pergunta retórica
  if (text.includes('?')) return 'pergunta_retorica';
  if (text.match(/quando foi|voce ja|alguma vez|quantas vezes/i)) return 'pergunta_retorica';
  
  // Verdade dura / confronto
  if (text.match(/voce (se |)abandon|voce confund|voce nao (e|eh) forte/i)) return 'verdade_dura';
  if (text.match(/a verdade|na real|o problema/i)) return 'verdade_dura';
  
  // Validação / acolhimento
  if (text.match(/ta tudo bem|nao precisa|permita-se|voce merece|respira/i)) return 'validacao';
  if (text.match(/descans|curar|alivio/i)) return 'validacao';
  
  // Insight / revelação
  if (text.match(/por isso|e por isso|a raiz|o motivo|a explicacao/i)) return 'insight';
  if (text.match(/padrao|repete|ciclo|compulsao/i)) return 'insight';
  
  // CTA / ação
  if (text.match(/me chama|whatsapp|clica|link|siga|ativa/i)) return 'cta';
  
  // Observação / reflexão
  if (text.match(/nem (tudo|toda|todo)|as vezes|quem sempre/i)) return 'observacao';
  
  // Checklist / lista
  if (text.match(/\d+\s*(sinais|formas|passos|padroes|dicas)/i)) return 'checklist';
  
  return 'reflexao';
}

// ── DETECTION: Sujeito ───────────────────────────────────────────────────────

function detectSubject(text) {
  if (text.match(/voce|sua|seu|te |ti /i)) return 'pessoa_comum';
  if (text.match(/quem |a pessoa|alguem/i)) return 'terceira_pessoa';
  if (text.match(/corpo|mente|coracao|alma/i)) return 'corpo_mente';
  if (text.match(/ansiedade|culpa|medo|raiva|tristeza/i)) return 'emocao_personificada';
  if (text.match(/crianca|infancia|passado/i)) return 'crianca_interior';
  return 'pessoa_comum';
}

// ── DETECTION: Ação ──────────────────────────────────────────────────────────

function detectAction(text) {
  if (text.match(/procrastin|adi|evita|fug/i)) return 'evitando_agir';
  if (text.match(/carrega|segura|aguenta|suporta/i)) return 'carregando_peso';
  if (text.match(/repete|ciclo|loop|de novo/i)) return 'repetindo_padrao';
  if (text.match(/controla|perfeccion|cobra|exig/i)) return 'controlando_tudo';
  if (text.match(/esconde|mascara|finge|disfarc/i)) return 'escondendo_dor';
  if (text.match(/busca|procura|quer|precisa/i)) return 'buscando_algo';
  if (text.match(/para|descansa|respira|solta/i)) return 'parando';
  if (text.match(/entend|perceb|compreend|enxerg/i)) return 'compreendendo';
  if (text.match(/cuida|proteg|salva|ajuda/i)) return 'cuidando_dos_outros';
  if (text.match(/abandon|larg|deix|perd/i)) return 'sendo_abandonado';
  return 'existindo';
}

// ── DETECTION: Conflito ──────────────────────────────────────────────────────

function detectConflict(text) {
  if (text.match(/nao.*por.*pregui/i)) return 'culpa_vs_incapacidade';
  if (text.match(/forte|fraq/i) && text.match(/nao|nem/i)) return 'forca_vs_vulnerabilidade';
  if (text.match(/cansa|esgot|sobrecarg/i)) return 'resistencia_vs_exaustao';
  if (text.match(/sozinha|solidao|abandon/i)) return 'conexao_vs_isolamento';
  if (text.match(/culpa|responsabilidade/i)) return 'culpa_vs_inocencia';
  if (text.match(/control|perde|soltar/i)) return 'controle_vs_entrega';
  if (text.match(/medo|corag|enfrent/i)) return 'medo_vs_coragem';
  if (text.match(/repet|mudan|transform/i)) return 'padrao_vs_mudanca';
  if (text.match(/parece|e |real/i)) return 'aparencia_vs_essencia';
  return 'tensao_interna';
}

// ── EXTRACTION: Keywords ─────────────────────────────────────────────────────

function extractKeywords(text) {
  const stopwords = new Set(['voce', 'nao', 'que', 'com', 'por', 'para', 'uma', 'esse', 'essa', 'mas', 'como', 'mais', 'sua', 'seu', 'esta', 'isso', 'isto', 'tem', 'ter', 'ser', 'foi', 'sao', 'nos', 'nas', 'dos', 'das', 'sem', 'nem', 'quando', 'onde', 'quem']);
  
  return text
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopwords.has(w))
    .slice(0, 8);
}

// ── 2. SCENE MAPPER — Análise → Cena Visual ─────────────────────────────────
// Mapeia a análise semântica + emoção para uma cena visual específica.

/**
 * Mapeia análise da copy + emoção para uma cena visual concreta.
 * @param {Object} analysis — resultado de analyzeCopy()
 * @param {string} emotion — emoção do card (ansiedade, culpa, etc.)
 * @returns {Object} — { scene, visualElements, framing, mood, environment }
 */
export function mapToScene(analysis, emotion = '') {
  const emotionLower = (emotion || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // ── Scene por TIPO do card ──
  const sceneByType = {
    quebra_de_crenca: {
      scene: 'person frozen in place, looking at something unfinished, environment showing signs of incomplete tasks, internal conflict visible in body language',
      framing: 'medium shot, slightly from the side',
      mood: 'tense, introspective, moment of realization',
    },
    pergunta_retorica: {
      scene: 'person in a reflective moment, paused mid-action, surrounded by everyday life that feels heavy, gaze distant and unfocused',
      framing: 'medium shot, subject off-center',
      mood: 'contemplative, searching, emotionally loaded',
    },
    verdade_dura: {
      scene: 'person sitting alone, posture closed or defensive, harsh lighting creating strong shadows, environment stripped bare',
      framing: 'medium-close, slightly low angle',
      mood: 'confrontational, raw, uncomfortable truth',
    },
    validacao: {
      scene: 'person in a moment of quiet acceptance, softer environment, warmer light, gentle posture, sense of breathing room',
      framing: 'medium shot, centered, warm composition',
      mood: 'gentle, warm, reassuring, safe',
    },
    insight: {
      scene: 'person near a window or light source, moment of clarity, environment transitioning from cluttered to clearer, symbolic shift in lighting',
      framing: 'medium-wide, light leading the eye',
      mood: 'revelatory, clear, turning point',
    },
    cta: {
      scene: 'open path or doorway ahead, warm golden light, sense of forward motion, expansive view, invitation to move',
      framing: 'wide shot, path leading forward, subject walking',
      mood: 'hopeful, directional, empowering',
    },
    observacao: {
      scene: 'quiet everyday scene observed from slight distance, person existing in routine, weight visible but not dramatic',
      framing: 'medium-wide, observational angle',
      mood: 'subtle, grounded, quietly heavy',
    },
    checklist: {
      scene: 'clean editorial space with subtle environmental cues, minimal background, emphasis on typography and clarity',
      framing: 'medium shot, clean composition',
      mood: 'organized, clear, educational',
    },
    reflexao: {
      scene: 'person in a contemplative posture, intimate indoor space, natural light, moment of pause in daily life',
      framing: 'medium shot, natural framing',
      mood: 'reflective, quiet, introspective',
    },
  };

  // ── Scene modifiers por AÇÃO ──
  const actionModifiers = {
    evitando_agir: 'body language showing hesitation, hands idle, tasks visible but untouched',
    carregando_peso: 'slightly hunched posture, metaphorical heaviness in the scene, weighed down',
    repetindo_padrao: 'environment with circular or repeating elements, sense of déjà vu',
    controlando_tudo: 'overly organized space that feels suffocating, rigid posture',
    escondendo_dor: 'forced composure, mask-like expression, private space behind public face',
    buscando_algo: 'searching gaze, reaching gesture, something just out of reach',
    parando: 'complete stillness, deliberate pause, environment continuing around a frozen figure',
    compreendendo: 'eyes widening subtly, light falling on face, moment of understanding',
    cuidando_dos_outros: 'surrounded by others needs, own space diminished, nurturing but depleted',
    sendo_abandonado: 'empty space where someone used to be, remnants of presence, void',
    existindo: 'simply present in the space, weight of daily existence visible',
  };

  // ── Scene modifiers por EMOÇÃO ──
  const emotionModifiers = {
    ansiedade: 'multiple stimuli in frame, claustrophobic framing, body tension, restless energy, tight environment',
    culpa: 'downward gaze, retracted posture, soft lateral light, weight on shoulders, muted colors',
    medo: 'shadows encroaching, uncertain path, doorway or threshold, edge of something',
    raiva: 'clenched gestures, hard light, sharp contrasts, confined explosive energy',
    tristeza: 'muted tones, empty spaces, rain or grey light, solitary figure, stillness',
    melancolia: 'golden fading light, nostalgic objects, bittersweet atmosphere, passing time',
    solidao: 'vast empty space around subject, single light source, absence of others, echo',
    sobrecarga: 'multiple overlapping tasks, screen glow, scattered objects, mental overload visible',
    exaustao: 'heavy body language, end of day light, depleted energy, minimal movement',
    esperanca: 'warm light breaking through, open window, horizon visible, subtle warmth',
    curiosidade: 'leaning forward, something catching attention, discovery moment, door opening',
    identificacao: 'mirror or reflection, recognition in another face, relatable everyday scene',
    tensao: 'compressed composition, building pressure, tight space, held breath',
    alivio: 'releasing breath, shoulders dropping, warm expanding light, opening up',
    acao: 'forward motion, decisive step, open road ahead, golden directional light',
    confianca: 'upright posture, steady gaze, grounded stance, clear bright environment',
  };

  // ── Conflict modifiers (enriquece o cenário) ──
  const conflictModifiers = {
    culpa_vs_incapacidade: 'undone tasks surrounding a frozen figure, gap between intent and action',
    forca_vs_vulnerabilidade: 'cracks in seemingly strong surfaces, armor with gaps',
    resistencia_vs_exaustao: 'standing but barely, leaning against something for support',
    conexao_vs_isolamento: 'crowd far away, glass barrier, reaching but not touching',
    culpa_vs_inocencia: 'child elements mixed with adult weight, inherited burden visible',
    controle_vs_entrega: 'hands gripping vs letting go, rigid vs flowing elements',
    medo_vs_coragem: 'threshold between dark and light, one foot forward',
    padrao_vs_mudanca: 'circular path with one exit visible, loop breaking point',
    aparencia_vs_essencia: 'surface vs depth, mirror showing different reflection',
    tensao_interna: 'inner conflict visible in environment, two opposing elements',
  };

  // ── BUILD THE SCENE ──
  const baseScene = sceneByType[analysis.tipo] || sceneByType.reflexao;
  const actionMod = actionModifiers[analysis.acao] || '';
  const conflictMod = conflictModifiers[analysis.conflito] || '';

  // Find emotion modifier
  let emotionMod = '';
  for (const [key, mod] of Object.entries(emotionModifiers)) {
    if (emotionLower.includes(key)) {
      emotionMod = mod;
      break;
    }
  }

  // ── Visual elements extraction ──
  const visualElements = buildVisualElements(analysis, emotionLower);

  return {
    scene: baseScene.scene,
    actionDetail: actionMod,
    emotionDetail: emotionMod,
    conflictDetail: conflictMod,
    visualElements,
    framing: baseScene.framing,
    mood: baseScene.mood,
  };
}

// ── Visual Elements Builder ──────────────────────────────────────────────────

function buildVisualElements(analysis, emotion) {
  const elements = [];

  // Elementos por ação
  const actionElements = {
    evitando_agir: ['laptop or notebook open but untouched', 'to-do list', 'idle hands'],
    carregando_peso: ['metaphorical weight', 'heavy objects nearby', 'stooped shoulders'],
    repetindo_padrao: ['circular mirror', 'clock', 'looping path', 'corridor'],
    controlando_tudo: ['organized desk', 'lists', 'rigid arrangement', 'tight grip'],
    escondendo_dor: ['mask nearby', 'smile that does not reach eyes', 'private vs public space'],
    buscando_algo: ['reaching hand', 'distant horizon', 'scattered search'],
    parando: ['frozen moment', 'cup mid-air', 'world moving around stillness'],
    compreendendo: ['light on face', 'book open to page', 'puzzle piece fitting'],
    cuidando_dos_outros: ['others belongings', 'nurturing hands', 'empty self-care items'],
    sendo_abandonado: ['empty chair', 'abandoned items', 'door left open'],
    existindo: ['everyday objects', 'routine scene', 'simple present moment'],
  };

  // Elementos por emoção
  const emotionElements = {
    ansiedade: ['scattered papers', 'multiple notifications', 'tight space'],
    culpa: ['heavy shadow', 'weight on shoulders', 'downward lighting'],
    solidao: ['empty room', 'single cup', 'window with rain'],
    sobrecarga: ['stacked tasks', 'multiple screens', 'overlapping demands'],
    tristeza: ['grey palette', 'wilted flower', 'empty space'],
    esperanca: ['sunrise', 'growing plant', 'opening door'],
  };

  if (actionElements[analysis.acao]) {
    elements.push(...actionElements[analysis.acao].slice(0, 2));
  }

  for (const [key, els] of Object.entries(emotionElements)) {
    if (emotion.includes(key)) {
      elements.push(...els.slice(0, 2));
      break;
    }
  }

  return elements;
}

// ── 3. SCENE PROMPT BUILDER — Cena → Prompt DALL-E ───────────────────────────
// Constrói o prompt final de imagem baseado na cena derivada da copy.

/**
 * Constrói um prompt de imagem que NASCE da copy, não do tema.
 *
 * @param {Object} params
 * @param {string} params.texto — texto principal do card
 * @param {string} params.subtexto — subtexto do card
 * @param {string} params.emocao — emoção do card
 * @param {string} params.tema — tema (usado apenas para enriquecimento, NÃO como base)
 * @param {string} params.estilo — estilo Instagram-nativo (cinematic_soft, etc.)
 * @returns {Object} — { scenePrompt, analysis, sceneData }
 */
export function buildSceneFromCopy({ texto, subtexto = '', emocao = '', tema = '', estilo = '' }) {
  // ── STEP 1: Analyze the copy ──
  const analysis = analyzeCopy(texto, subtexto);

  // ── STEP 2: Map to visual scene ──
  const sceneData = mapToScene(analysis, emocao);

  // ── STEP 3: Build the visual prompt ──
  const styleHints = getStyleHints(estilo);

  const scenePrompt = `Instagram high-performance social media image, realistic scene representing the meaning of the text.

${sceneData.scene}.
${sceneData.actionDetail ? `\n${sceneData.actionDetail}.` : ''}
${sceneData.emotionDetail ? `\n${sceneData.emotionDetail}.` : ''}
${sceneData.conflictDetail ? `\n${sceneData.conflictDetail}.` : ''}

Emotion: ${emocao || analysis.conflito || 'introspection'}.

Visual elements in the scene: ${sceneData.visualElements.length > 0 ? sceneData.visualElements.join(', ') : 'subtle environmental cues that reflect the emotional meaning'}.

Framing: ${sceneData.framing}.
Mood: ${sceneData.mood}.
${styleHints}

The environment should reflect the meaning of the text indirectly — not illustrate it literally, but EVOKE the same feeling.

Composition: subject off-center when present, negative space reserved for text overlay, not symmetrical, organic Instagram layout, natural imperfections.

Avoid:
- generic stock photo look
- artificial perfect faces
- perfect symmetry
- exaggerated emotions
- literal text illustration
- posed smiling portraits
- centralized boring composition`;

  console.log(`   🧠 [SemanticScene] Copy → Tipo: ${analysis.tipo} | Ação: ${analysis.acao} | Conflito: ${analysis.conflito}`);

  return {
    scenePrompt,
    analysis,
    sceneData,
  };
}

// ── Style hints mapping ──────────────────────────────────────────────────────

function getStyleHints(estilo) {
  const hints = {
    cinematic_soft: 'Style: cinematic soft, natural diffused lighting, filmic grain, low contrast, warm intimate mood, shallow depth of field.',
    brutalist_psycho: 'Style: hard dramatic lighting, heavy film grain, high contrast, psychological tension, stark shadows, gritty.',
    minimal_clean: 'Style: flat even lighting, clean minimal aesthetic, generous negative space, muted neutral palette, premium editorial.',
    dark_luxury: 'Style: low-key lighting, deep shadows, cinematic, sophisticated dark palette, subtle rim light, moody.',
    ugc_raw: 'Style: natural imperfect lighting, medium contrast, authentic raw texture, organic feel, real-world, unposed casual.',
  };
  return hints[estilo] || 'Style: cinematic, natural lighting, editorial quality, Instagram premium aesthetic.';
}

// ── 4. CAROUSEL SCENE BUILDER ────────────────────────────────────────────────
// Cada card do carrossel gera sua própria cena, criando narrativa visual.

/**
 * Gera cenas visuais para todos os cards de um carrossel.
 * Cada card tem sua própria cena derivada da copy, garantindo
 * narrativa visual progressiva.
 *
 * @param {Array} cards — [{ texto, subtexto, emocao, tipo }]
 * @param {string} tema — tema geral
 * @param {string} estilo — estilo visual
 * @returns {Array} — array de { scenePrompt, analysis, sceneData }
 */
export function buildCarouselScenes(cards, tema = '', estilo = '') {
  console.log(`   🎬 [SemanticScene] Gerando ${cards.length} cenas visuais para carrossel...`);

  const scenes = cards.map((card, i) => {
    const result = buildSceneFromCopy({
      texto: card.texto_principal || card.texto || '',
      subtexto: card.texto_secundario || card.subtexto || '',
      emocao: card.emocao || card._emotion?.label || '',
      tema,
      estilo,
    });

    console.log(`   📸 Card ${i + 1}: [${result.analysis.tipo}] → "${result.sceneData.mood}"`);

    return result;
  });

  return scenes;
}

// ── EXPORTS ──────────────────────────────────────────────────────────────────

export default buildSceneFromCopy;
