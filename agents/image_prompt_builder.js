// ── REGISTROS DE ESTILO (Instagram 2025–2026) ────────────────────────────────

// Cada estilo pertence a uma CATEGORIA que define regras visuais e Environment.
// Categorias: "clean" (minimal), "rich" (cenário rico), "painterly" (textura artística)
// COMPOSIÇÃO é controlada separadamente pelo composition_engine.js

import { FORBIDDEN_COMPOSITION_BLOCK } from './composition_engine.js';

const STYLE_REGISTRY = {
  // ── ESTILOS CLEAN (fundo limpo, editorial) ──────────────────────────────────

  editorial_minimalist: {
    category: 'clean',
    prompt: `editorial minimalist illustration, soft beige background, clean composition, bright lighting, instagram premium aesthetic, soft neutral color palette, magazine quality`,
    lighting: `bright soft lighting, even exposure, soft window light, no harsh shadows, high-key editorial lighting`,
    mood: `reflective, calm, introspective`,
  },

  symbolic_minimal: {
    category: 'clean',
    prompt: `symbolic minimalist illustration, single subject, metaphorical object, clean background, soft neutral palette, editorial composition, conceptual art, premium magazine aesthetic`,
    lighting: `soft diffused studio light, bright even exposure, no harsh shadows, clean luminosity, high-key minimalist lighting`,
    mood: `contemplative, profound, sophisticated, psychologically rich`,
  },

  soft_3d_editorial: {
    category: 'clean',
    prompt: `soft 3D illustration, pastel color palette, minimal background, instagram editorial style, soft lighting, high clarity, modern digital render, smooth ambient occlusion, clean geometric forms`,
    lighting: `soft studio lighting, even diffused light, pastel tones, no shadows, bright and airy, subtle rim light`,
    mood: `modern, approachable, clean, optimistic`,
  },

  modern_flat_editorial: {
    category: 'clean',
    prompt: `modern flat editorial illustration, soft pastel palette, clean instagram layout, minimal background, contemporary design, smooth vector aesthetic, premium quality, single unified scene`,
    lighting: `flat even lighting, no shadows, bright uniform illumination, soft gradients, clean tonal transitions`,
    mood: `contemporary, friendly, vibrant, accessible`,
  },

  // ── ESTILOS RICH (cenário contextual, fotorealista/cinematográfico) ─────────

  cinematic_soft: {
    category: 'rich',
    prompt: `cinematic photography, shallow depth of field, emotional narrative, natural color grading, professional cinema aesthetic, 35mm film look, location shooting`,
    lighting: `cinematic natural lighting, motivated practical light sources, warm key light with cool fill, balanced exposure, atmospheric depth`,
    mood: `thoughtful, emotionally layered, quietly powerful`,
  },

  photoreal_editorial: {
    category: 'rich',
    prompt: `photorealistic editorial photo, professional portrait photography, natural environment, shallow depth of field, authentic emotion, high-end magazine quality`,
    lighting: `soft natural window light, bright studio fill, high-key photography, balanced highlights, visible detail everywhere`,
    mood: `authentic, present, grounded`,
  },

  photoreal_soft: {
    category: 'rich',
    prompt: `photorealistic intimate portrait, soft window lighting, natural skin tones, contextual environment, editorial composition, authentic emotion, magazine quality`,
    lighting: `soft natural window light, warm diffused fill, gentle highlights on skin, natural color temperature, intimate room lighting`,
    mood: `authentic, vulnerable, human, emotionally present`,
  },

  cinematic_narrative: {
    category: 'rich',
    prompt: `cinematic narrative photography, photorealistic, emotional storytelling, contextual real-world environment, professional cinematography, shallow depth of field, 35mm anamorphic lens look, motivated lighting, motion blur on background elements`,
    lighting: `practical motivated lighting (lamps, windows, street lights), cinematic color grading per emotional arc, warm-cool contrast, natural atmospheric light`,
    mood: `deeply narrative, emotionally progressive, cinematically immersive`,
  },

  grain_film_editorial: {
    category: 'rich',
    prompt: `editorial film photography style, soft grain texture, cinematic lighting, contextual environment, instagram aesthetic, magazine editorial quality, analog film look, warm neutral tones, Kodak Portra 400 feel`,
    lighting: `cinematic lighting, soft diffused key light, warm fill, subtle film grain overlay, slightly lifted blacks, balanced Kodak-like exposure`,
    mood: `premium, nostalgic, timeless, editorially refined`,
  },

  // ── ESTILOS PAINTERLY (textura artística, galeria) ──────────────────────────

  painterly_golden: {
    category: 'painterly',
    prompt: `digital oil painting, visible brushstrokes, rich painterly texture, warm golden ambient palette, museum gallery quality, emotionally narrative composition, psychoanalytic symbolism, intimate scene with symbolic objects, Vermeer-inspired warm lighting, fine art aesthetic`,
    lighting: `warm golden hour light, soft candlelight glow, intimate window light, warm amber shadows, rich tonal depth, luminous highlights on skin, Rembrandt lighting with warm bias`,
    mood: `deeply introspective, psychologically rich, poetic, emotionally layered, intimate yet profound`,
  },

  dreamlike_pastel: {
    category: 'painterly',
    prompt: `dreamlike surrealist illustration, bright pastel color palette, symbolic floating elements, soft ethereal atmosphere, clean composition, instagram editorial aesthetic, inspired by Magritte and Remedios Varo, metaphorical imagery, subconscious visual narrative`,
    lighting: `bright ethereal glow, soft diffused ambient light, luminous pastel atmosphere, no dark shadows, high-key dreamy lighting, gentle bloom effect`,
    mood: `dreamlike, introspective, mysterious yet calm, subconscious depth, poetic`,
  },

  watercolor_soft: {
    category: 'painterly',
    prompt: `soft watercolor illustration, fluid organic brushstrokes, gentle emotional expression, relaxing pastel color palette, delicate paper texture, editorial art quality, handcrafted feel, instagram premium aesthetic, single unified scene`,
    lighting: `soft watercolor wash lighting, bright translucent layers, no harsh edges, gentle color bleeding, luminous white spaces, natural paper glow`,
    mood: `nurturing, tender, gentle, emotionally safe, warmly introspective`,
  },
};

// Fallback: if someone passes an old style name, remap it
const STYLE_ALIASES = {
  cinematic: 'cinematic_soft',
  oil_painting: 'painterly_golden',
  minimalist: 'editorial_minimalist',
  surreal: 'dreamlike_pastel',
  analog: 'grain_film_editorial',
  'dark moody cinematic photography': 'cinematic_narrative',
  // Backward compat
  soft_3d: 'soft_3d_editorial',
  flat_editorial: 'modern_flat_editorial',
  watercolor: 'watercolor_soft',
  aquarela: 'watercolor_soft',
  dreamlike: 'dreamlike_pastel',
  onirico: 'dreamlike_pastel',
  painterly: 'painterly_golden',
  narrativo: 'cinematic_narrative',
};

function resolveStyle(estilo) {
  if (STYLE_REGISTRY[estilo]) return STYLE_REGISTRY[estilo];
  const alias = STYLE_ALIASES[estilo?.toLowerCase?.()];
  if (alias && STYLE_REGISTRY[alias]) return STYLE_REGISTRY[alias];
  return STYLE_REGISTRY.editorial_minimalist; // safe default
}

// ── PERSONAGEM CONSISTENTE (V2 — Persona Bank) ──────────────────────────────

/**
 * Gera o bloco de personagem para o prompt.
 * V2: Aceita persona do banco rotativo. Fallback para descrição genérica.
 *
 * @param {string} gender — gênero do público
 * @param {string} category — clean | rich | painterly
 * @param {Object} [personaData] — persona do banco (opcional)
 * @returns {string} — bloco de personagem para o prompt
 */
function getCharacterPrompt(gender = 'feminino', category = 'clean', personaData = null) {
  // V2: Se temos persona do banco, usar ela
  if (personaData && personaData.fullPrompt) {
    return personaData.fullPrompt;
  }
  if (personaData && personaData.isNoPerson) {
    return 'No human faces or figures in this image. Focus on symbolic objects, metaphors, or environments.';
  }
  if (personaData && personaData.isAbstract) {
    return personaData.prompt;
  }

  // Fallback: descrição genérica por gênero
  const isMale = gender.toLowerCase().includes('masc') || gender.toLowerCase().includes('homem');

  const clothing = {
    clean: 'wearing neutral vintage clothing',
    rich: isMale
      ? 'wearing olive-green utility jacket over grey shirt, dark jeans, casual real-world clothing'
      : 'wearing soft cream linen dress, casual everyday clothing',
    painterly: isMale
      ? 'wearing vintage earth-tone clothing, classical aesthetic'
      : 'wearing flowing neutral vintage dress, classical aesthetic',
  };

  const clothes = clothing[category] || clothing.clean;

  if (isMale) {
    return `Same character across all slides:
man in his 30s, short brown tousled hair, light stubble,
light skin tone, expressive facial features,
${clothes},
same face, same hair, same age, same clothing style,
consistent identity, no character variation.`;
  }

  return `Same character across all slides:
woman in her 30s, brown shoulder-length hair,
light skin tone, soft facial features,
${clothes},
same face, same hair, same age, same clothing style,
consistent identity, no character variation.`;
}

// ── ARCO DE ILUMINAÇÃO NARRATIVA ─────────────────────────────────────────────
// A iluminação evolui com o arco emocional do carrossel.
// Slide com emoção negativa → tons frios. Slide com esperança → tons quentes.

const LIGHTING_ARC = {
  // Slide tipo → temperatura de cor e ambiente
  hook_impacto:            { temp: 'cool',    env: 'urban street at dusk, blurred crowd walking past' },
  curiosidade:             { temp: 'neutral',  env: 'everyday familiar indoor setting' },
  comportamento:           { temp: 'cool',    env: 'home environment, routine moment' },
  tentativa_controle:      { temp: 'warm-low', env: 'desk with scattered papers, single lamp light' },
  sintoma_sobrecarga:      { temp: 'cool',    env: 'cluttered intimate space, overwhelming elements' },
  frustracao:              { temp: 'cold',    env: 'bedroom, sitting on bed, cold light from window' },
  raiz_passado:            { temp: 'cold',    env: 'dimly lit room, nostalgic elements' },
  contraste:               { temp: 'neutral',  env: 'transitional space, doorway or hallway' },
  sintoma:                 { temp: 'cold',    env: 'isolated intimate space' },
  padrao_repeticao:        { temp: 'cool',    env: 'cyclical environment, mirror or corridor' },
  repeticao:               { temp: 'cool',    env: 'same cyclical environment' },
  quebra:                  { temp: 'neutral',  env: 'stark minimal space, single light source' },
  consciencia_revelacao:   { temp: 'warm-mid', env: 'near large window, sunset light entering' },
  consciencia:             { temp: 'warm-mid', env: 'near large window, golden light' },
  insight:                 { temp: 'warm-mid', env: 'bright room, moment of clarity' },
  explicacao_minima:       { temp: 'neutral',  env: 'clean bright space' },
  nomeacao:                { temp: 'warm-mid', env: 'soft lit space, personal objects' },
  validacao:               { temp: 'warm',    env: 'gentle interior, warm tones' },
  reframe:                 { temp: 'warm',    env: 'open bright window, city view at golden hour' },
  solucao_possibilidade:   { temp: 'warm',    env: 'open space, horizon visible, warm light' },
  possibilidade:           { temp: 'warm',    env: 'expansive view, nature or cityscape' },
  alivio:                  { temp: 'warm',    env: 'comfortable quiet space, soft blankets or nature' },
  direcionamento:          { temp: 'golden',  env: 'open path, field or road at golden hour' },
  cta:                     { temp: 'golden',  env: 'expansive outdoor scene, golden hour, walking forward with purpose' },
  cta_conversao:           { temp: 'golden',  env: 'bright hopeful environment, forward motion' },
  espelho:                 { temp: 'neutral',  env: 'familiar everyday scene' },
  ampliacao:               { temp: 'cool',    env: 'intensified version of the previous scene' },
  intensificacao:          { temp: 'cold',    env: 'visually heavier version, smaller space' },
  tensao:                  { temp: 'cool',    env: 'compressed or confined setting' },
  identificacao:           { temp: 'neutral',  env: 'everyday relatable setting' },
  expansao:                { temp: 'warm-mid', env: 'slightly more open, light entering' },
  provocacao:              { temp: 'cool',    env: 'stark direct environment' },
};

function getLightingArc(slideTipo, category) {
  const arc = LIGHTING_ARC[slideTipo] || { temp: 'neutral', env: 'clean bright interior' };

  // Para estilos "clean", não usar arco narrativo pesado — manter bright
  if (category === 'clean') {
    return { temp: 'neutral', env: 'clean minimal setting' };
  }

  return arc;
}

const TEMP_DESCRIPTIONS = {
  'golden':  'warm golden sunset light, rich amber tones, backlit warmth, hope and resolution',
  'warm':    'warm natural light, soft golden tones, gentle warmth, comfort and safety',
  'warm-mid':'warm-neutral light, late afternoon warmth entering through windows, turning point',
  'warm-low':'warm single light source, desk lamp or candle, intimate focused light, warm shadows',
  'neutral': 'balanced natural light, neutral color temperature, everyday realism',
  'cool':    'cool blue-grey tones, overcast or fluorescent light, emotional distance, uneasy calm',
  'cold':    'cold blue dominant light, early morning or night window light, emotional weight, isolation',
};

// ── BANCO DE OBJETOS SIMBÓLICOS PSICANALÍTICOS ───────────────────────────────

const SYMBOLIC_OBJECTS = {
  // Mapeamento tema → objetos que reforçam o conceito
  memoria:        ['antique clock', 'open diary', 'faded photographs', 'burning candle'],
  passado:        ['old letters', 'vintage frames', 'dusty books', 'wilted flowers'],
  autoconhecimento: ['ornate mirror', 'reflected self', 'journal and pen', 'magnifying glass'],
  trauma:         ['cracked glass', 'broken mirror', 'scattered puzzle pieces', 'frayed rope'],
  libertacao:     ['floating feathers', 'open window with breeze', 'butterfly', 'broken chains'],
  inconsciente:   ['melting clock (Dalí-style)', 'floating staircase', 'half-open door', 'fog'],
  solidao:        ['empty chair', 'abandoned cup', 'single candle', 'rain on window'],
  ansiedade:      ['tangled threads', 'multiple clocks', 'spinning compass', 'maze'],
  culpa:          ['heavy stone', 'shadow figure', 'weight on shoulders', 'dark mirror reflection'],
  medo:           ['mask being held', 'door ajar with light', 'edge of cliff', 'shadowed path'],
  repeticao:      ['infinite mirrors', 'circular staircase', 'clock hands spinning', 'loop path'],
  validacao:      ['mirror with different reflection', 'applause shadows', 'spotlight', 'social media icons fading'],
  cura:           ['sunrise through window', 'growing plant', 'golden thread', 'warm embrace'],
};

function getSymbolicObjects(tema) {
  if (!tema) return '';
  const temaLow = tema.toLowerCase();
  for (const [key, objects] of Object.entries(SYMBOLIC_OBJECTS)) {
    if (temaLow.includes(key)) {
      const picked = objects[Math.floor(Math.random() * objects.length)];
      return `symbolic element: ${picked}`;
    }
  }
  return '';
}

// ── SANITIZAÇÃO DE DESCRIÇÃO VISUAL ──────────────────────────────────────────

function sanitizeVisualDescription(description) {
  if (!description) return '';
  let clean = description;

  // Remove old style tags that leak from the LLM output
  const removeTerms = [
    /,?\s*oil_painting/gi,
    /,?\s*cinematic photography/gi,
    /,?\s*dark moody cinematic photography/gi,
    /,?\s*pitch.?black/gi,
    /,?\s*psychological breakdown/gi,
    /,?\s*emotional collapse/gi,
    /,?\s*dramatic emotional/gi,
  ];

  removeTerms.forEach(regex => {
    clean = clean.replace(regex, '');
  });

  // Clean up trailing/leading commas and extra spaces
  clean = clean.replace(/,\s*,/g, ',').replace(/^\s*,|,\s*$/g, '').trim();

  return clean;
}

// ── COMPOSIÇÃO (DELEGADA AO COMPOSITION ENGINE) ─────────────────────────────
// Quando composicao é fornecida, usamos o prompt_block do composition_engine.
// Fallback: composição por categoria (para retrocompatibilidade).

function getCompositionBlock(category, composicao = null) {
  // ── REGRA GLOBAL V2: Persona max 40%, mínimo 60% ambiente ─────────────
  const PERSONA_LIMIT_BLOCK = `\n\n🚫 PERSONA SCALE LIMIT (MANDATORY):
- Subject/persona must occupy MAX 40% of the image area
- Minimum 60% must be environment/composition/negative space
- FORBIDDEN: full-frame face, extreme close-up of face filling image
- Subject should be framed using rule of thirds or center composition
- Always leave vast empty breathing room around the subject
- Prioritize minimalism and clean backgrounds`;

  // ── NOVO: Composição do Composition Engine tem prioridade ─────────────
  if (composicao && composicao.prompt_block) {
    const microVar = composicao.micro_variation ? `\nMicro-variation: ${composicao.micro_variation}` : '';
    return `${composicao.prompt_block}${microVar}${PERSONA_LIMIT_BLOCK}`;
  }

  // ── FALLBACK: Composição por categoria (retrocompatibilidade) ─────────
  if (category === 'clean') {
    return `Composition:
medium shot,
subject centered or slightly offset,
subject occupying 45% of frame,
clean negative space for text overlay,
minimal background,
foreground + subject + background layers,
consistent framing across all slides.${PERSONA_LIMIT_BLOCK}`;
  }

  if (category === 'rich') {
    return `Composition:
medium to medium-wide shot,
subject occupying 50-65% of frame,
rich contextual environment visible,
shallow depth of field on background,
foreground + subject + detailed background layers,
environmental storytelling through setting,
cinematic framing across all slides.${PERSONA_LIMIT_BLOCK}`;
  }

  // painterly
  return `Composition:
medium shot with atmospheric depth,
subject occupying 55-70% of frame,
symbolic elements integrated into scene,
painterly layers with depth,
foreground objects + subject + rich background,
gallery-quality framing,
consistent artistic style across all slides.${PERSONA_LIMIT_BLOCK}`;
}

// ── ENVIRONMENT POR CATEGORIA ────────────────────────────────────────────────

function getEnvironmentBlock(category, arcEnv) {
  if (category === 'clean') {
    return `Environment:
minimal symbolic background,
soft beige or neutral tones,
clean composition,
no cluttered scenes.`;
  }

  if (category === 'rich') {
    return `Environment:
${arcEnv},
rich contextual details that tell the story,
practical light sources visible (lamps, windows, street lights),
real-world textures and surfaces,
depth through atmospheric perspective.`;
  }

  // painterly
  return `Environment:
${arcEnv},
symbolic objects integrated naturally into the scene,
rich painterly textures and surfaces,
warm golden ambient atmosphere,
museum-quality detail and depth.`;
}

// ── NEGATIVE PROMPTS POR CATEGORIA ───────────────────────────────────────────

function getNegativeBlock(category, composicao = null) {
  // Rules shared across ALL categories
  const shared = `do not change character between slides,
do not alter identity between slides,
no different clothing per slide,
no different age per slide,
no different hair per slide,
no text or letters in the image,
single unified scene only.`;

  // ── ANTI-GRID REFORÇADO (do Composition Engine) ───────────────────────
  const forbiddenBlock = (composicao && composicao.forbidden_block)
    ? composicao.forbidden_block
    : FORBIDDEN_COMPOSITION_BLOCK;

  if (category === 'clean') {
    return `Negative prompt / Restrictions:
do not create dark scenes,
do not use heavy shadows,
no black backgrounds,
no dramatic contrast,
no close-up faces,
${shared}
${forbiddenBlock}`;
  }

  if (category === 'rich') {
    return `Negative prompt / Restrictions:
no pitch black darkness (some moody shadows are OK),
no horror or gore imagery,
no extreme close-up faces,
${shared}
${forbiddenBlock}`;
  }

  // painterly
  return `Negative prompt / Restrictions:
no photographic realism (maintain painterly texture),
no flat digital look,
no horror or disturbing imagery,
${shared}
${forbiddenBlock}`;
}

// ── PROMPT BUILDER PRINCIPAL ─────────────────────────────────────────────────

/**
 * Constrói o prompt final para geração de imagem.
 * V5.1: SEMANTIC SCENE tem prioridade sobre descrição visual genérica.
 *
 * PIPELINE: copy → semanticScene → prompt (NÃO: tema → imagem genérica)
 *
 * @param {Object} params
 * @param {Object} params.slide — dados do slide (tipo, descricao_visual, etc.)
 * @param {string} params.estilo — nome do estilo visual
 * @param {string} params.tipoCena — tipo de cena (humano, simbolico, etc.)
 * @param {string} params.gender — gênero do público (feminino/masculino)
 * @param {string} params.tema — tema psicanalítico
 * @param {Object} [params.composicao] — composição do composition_engine
 * @param {string} [params.semanticScene] — 🔥 NOVO: cena semântica derivada da COPY
 * @param {string} [params.styleModifiers] — modificadores de estilo V2
 * @param {string} [params.styleNegative] — negativos do estilo V2
 * @returns {string} — prompt final para DALL-E / Pollinations
 */
export function buildImagePrompt({ slide, estilo, tipoCena, gender, tema, composicao = null, semanticScene = null, styleModifiers = '', styleNegative = '' }) {
  const style = resolveStyle(estilo);
  const category = style.category || 'clean';

  // ── V5.1: SEMANTIC SCENE tem prioridade absoluta ──────────────────────────
  // Se a cena semântica veio do Semantic Scene Builder (copy-driven),
  // ela SUBSTITUI a descrição visual genérica do tema.
  let sceneBlock;
  if (semanticScene) {
    // A cena nasce da copy — é o prompt completo do semantic_scene_builder
    sceneBlock = semanticScene;
    console.log(`   🧠 [PromptBuilder] Usando SEMANTIC SCENE (copy-driven)`);
  } else {
    // Fallback: descrição visual genérica (modo V4 legado)
    const rawVisuals = slide.descricao_visual || slide.descricao_visual_pt || slide.texto_principal || "";
    const cleanedVisuals = sanitizeVisualDescription(rawVisuals);
    sceneBlock = buildLegacyPrompt(slide, style, category, cleanedVisuals, gender, tema, composicao, styleModifiers, styleNegative);
    console.log(`   📝 [PromptBuilder] Usando descrição visual LEGADA (tema-based)`);
  }

  return sceneBlock;
}

/**
 * Prompt builder legado (V4) — usado como fallback quando não há semantic scene.
 */
function buildLegacyPrompt(slide, style, category, cleanedVisuals, gender, tema, composicao, styleModifiers, styleNegative) {
  // Arco narrativo de iluminação
  const slideTipo = slide.tipo || 'espelho';
  const arc = getLightingArc(slideTipo, category);
  const tempDesc = TEMP_DESCRIPTIONS[arc.temp] || TEMP_DESCRIPTIONS.neutral;

  // Objetos simbólicos (para painterly/rich ou symbolic_scene)
  const isSymbolicComposition = composicao && composicao.tipo === 'symbolic_scene';
  const symbolicHint = (category !== 'clean' || isSymbolicComposition) ? getSymbolicObjects(tema) : '';

  // Label da cena
  let sceneHeader;
  if (composicao) {
    sceneHeader = `Instagram high-performance social media image. Composition type: ${composicao.tipo}.`;
  } else {
    sceneHeader = category === 'clean'
      ? 'Instagram carousel editorial illustration.'
      : category === 'rich'
        ? 'Instagram carousel cinematic photography.'
        : 'Instagram carousel fine art illustration.';
  }

  // Personagem: respeitar a decisão da composição + persona do banco
  const needsCharacter = composicao ? composicao.requer_personagem : true;
  const personaData = composicao?._persona || null;
  const characterBlock = needsCharacter
    ? getCharacterPrompt(gender, category, personaData)
    : 'No human faces or figures in this image. Focus on objects, symbols, or environments.';

  // Safe zone do formato
  const safeZoneHint = composicao?.safe_zone?.prompt_hint || '';

  // V2 style modifiers injection
  const styleModBlock = styleModifiers ? `\nInstagram Style Modifiers: ${styleModifiers}` : '';
  const styleNegBlock = styleNegative ? `\nStyle-specific avoid: ${styleNegative}` : '';

  return `${sceneHeader}

${characterBlock}

Scene: ${cleanedVisuals}.
${symbolicHint ? `\nSymbolic element: ${symbolicHint}.\n` : ''}
${getCompositionBlock(category, composicao)}
${safeZoneHint ? `\n📱 SAFE ZONES: ${safeZoneHint}\n` : ''}
Lighting:
${style.lighting}
Color temperature: ${tempDesc}

Style:
${style.prompt}
${styleModBlock}

Mood: ${style.mood}

${getEnvironmentBlock(category, arc.env)}

${getNegativeBlock(category, composicao)}
${styleNegBlock}
${slide.artDirection?.composition_guidance ? '\nArt Direction Guidance: ' + slide.artDirection.composition_guidance : ''}
${slide.artDirection?.negative_constraints && slide.artDirection.negative_constraints.length > 0 ? '\nAdditional explicitly forbidden elements:\n- ' + slide.artDirection.negative_constraints.join('\n- ') : ''}`;
}

// ── MAPEAMENTO DE TIPO DE CENA ───────────────────────────────────────────────

/**
 * Define o tipo de cena visual para o slide.
 * Agora respeita a composição do Composition Engine:
 * - Se a composição NÃO requer personagem → usa tipo simbólico/ambiente
 * - Se a composição REQUER personagem → usa humano/silhueta
 *
 * @param {string} slideTipo — tipo semântico do slide
 * @param {Object} [composicao] — composição do composition_engine
 * @returns {string} — tipo de cena (humano, simbolico, ambiente, silhueta)
 */
export function definirTipoCena(slideTipo, composicao = null) {
  // Se temos composição do engine, ela decide se precisa de personagem
  if (composicao) {
    if (!composicao.requer_personagem) {
      // Composições sem pessoa: escolhe entre simbólico e ambiente
      const semPessoa = {
        espelho: "simbolico",
        ampliacao: "ambiente",
        intensificacao: "simbolico",
        nomeacao: "simbolico",
        raiz_passado: "simbolico",
        padrao_repeticao: "simbolico",
        consciencia_revelacao: "simbolico",
        consciencia: "simbolico",
        quebra: "simbolico",
        cta: "ambiente",
        cta_conversao: "ambiente",
      };
      return semPessoa[slideTipo] || "simbolico";
    }

    // Composições com pessoa: varia entre humano e silhueta
    if (composicao.tipo === 'split_emotion') {
      return "silhueta";
    }
  }

  // Default: humano (mantém consistência do personagem)
  const mapa = {
    espelho: "humano",
    ampliacao: "humano",
    intensificacao: "humano",
    nomeacao: "humano",
    validacao: "humano",
    direcionamento: "humano",
    cta: "humano",
    hook_impacto: "humano",
    sintoma_sobrecarga: "humano",
    raiz_passado: "humano",
    padrao_repeticao: "humano",
    consciencia_revelacao: "humano",
    solucao_possibilidade: "humano",
    cta_conversao: "humano",
    comportamento: "humano",
    tentativa_controle: "humano",
    frustracao: "humano",
    repeticao: "humano",
    consciencia: "humano",
    possibilidade: "humano",
  };

  return mapa[slideTipo] || "humano";
}
