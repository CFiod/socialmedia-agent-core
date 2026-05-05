/**
 * 🎬 IMAGE PROMPT ENGINE V3 — Cinematic Copy-Driven Prompt Builder
 * Builds image prompts from: composition + scene + emotion + camera + style.
 * Eliminates generic portraits and empty backgrounds.
 */

// ── CINEMATIC DEPTH LAYERS ──────────────────────────────────────────────────

const DEPTH_LAYERS = {
  foreground: [
    'subtle foreground blur element (plant, fabric edge, glass)',
    'foreground bokeh particles or texture',
    'out-of-focus foreground frame element',
    'shallow depth foreground element adding dimension',
  ],
  midground: [
    'subject positioned in midground with breathing room',
    'main subject at natural focal plane',
    'subject at comfortable distance, environmental context visible',
  ],
  background: [
    'rich out-of-focus background with contextual depth',
    'atmospheric background with soft bokeh and color',
    'environmental storytelling in blurred background layer',
    'distant background providing scale and atmosphere',
  ],
};

// ── STYLE MODIFIERS BY EMOTIONAL LEVEL ──────────────────────────────────────

const EMOTION_STYLE_MODS = {
  sutil: 'gentle, understated, quiet atmosphere, soft pastel undertones, minimal drama',
  moderado: 'balanced emotional presence, visible mood, natural color grading, moderate contrast',
  intenso: 'strong emotional atmosphere, dramatic color grading, palpable tension, high contrast areas',
  maximo: 'raw visceral emotion, extreme atmospheric conditions, powerful color saturation, cinematic drama',
};

// ── ANTI-GENERIC RULES ──────────────────────────────────────────────────────

const ANTI_GENERIC_BLOCK = `
ABSOLUTE RULES (NON-NEGOTIABLE):
- NO generic stock photo look
- NO plain white or plain black background without intention
- NO centered passport-style portrait
- NO close-up face filling the entire frame
- NO empty meaningless background
- NO multiple panels, grids, or collage
- NO text, watermarks, or UI elements in image
- EVERY background element must serve the narrative
- Subject max 40% of frame, min 60% environment/space
- Single cohesive scene filling entire canvas`;

// ── ENGINE PRINCIPAL ────────────────────────────────────────────────────────

/**
 * Builds a cinematic, copy-driven image prompt.
 *
 * @param {Object} params
 * @param {Object} params.scene — from scene_engine (tipo, camera, ambiente, iluminacao, gender)
 * @param {Object} params.composition — from composition_engine (prompt_block, forbidden_block)
 * @param {Object} params.copyResult — from copy_intent_engine (copy, hookPattern, intent)
 * @param {Object} params.typography — from typography_engine (pair info)
 * @param {string} params.estilo — style ID (editorial_minimalist, cinematic_soft, etc.)
 * @param {Object} [params.persona] — persona data if human scene
 * @param {Object} [params.semanticScene] — semantic scene from existing builder
 * @returns {string} — complete image generation prompt
 */
export function buildCinematicPrompt({
  scene,
  composition = null,
  copyResult = null,
  typography = null,
  estilo = 'editorial_minimalist',
  persona = null,
  semanticScene = null,
} = {}) {

  const blocks = [];

  // ── 1. SCENE HEADER ────────────────────────────────────────────────────────
  blocks.push(`Instagram high-performance social media image.`);
  blocks.push(`Scene type: ${scene.tipo} — ${scene.descricao || scene.label}`);

  // ── 2. SUBJECT / CHARACTER ─────────────────────────────────────────────────
  if (scene.requer_personagem && scene.tipo !== 'silhueta') {
    if (persona && persona.fullPrompt) {
      blocks.push(`\nCHARACTER:\n${persona.fullPrompt}`);
    } else if (scene.gender) {
      const g = scene.gender;
      const genderWord = g.gender === 'woman' ? 'woman' : g.gender === 'man' ? 'man' : 'person';
      blocks.push(`\nCHARACTER:\n${genderWord}, ${g.ageRange || 'adult'}, ${g.ethnicity || 'diverse features'}, ${g.context || 'alone, introspective'}, authentic expression, natural pose, NOT looking at camera`);
    } else {
      blocks.push(`\nCHARACTER:\nperson, authentic expression, natural candid pose, editorial quality`);
    }
  } else if (scene.tipo === 'silhueta') {
    blocks.push(`\nSUBJECT:\nSilhouette of a person, backlit, no visible facial features, atmospheric anonymous figure, strong emotional presence through body language only`);
  } else {
    blocks.push(`\nSUBJECT:\nNo human faces or figures. Focus on: ${scene.prompt_block}`);
  }

  // ── 3. SEMANTIC SCENE (copy-driven) ────────────────────────────────────────
  if (semanticScene) {
    blocks.push(`\nNARRATIVE SCENE:\n${semanticScene}`);
  } else if (copyResult) {
    // Derive visual narrative from copy intent
    const hookNarrative = getVisualNarrativeFromHook(copyResult.hookPattern, copyResult.copy?.headline);
    if (hookNarrative) blocks.push(`\nVISUAL NARRATIVE:\n${hookNarrative}`);
  }

  // ── 4. COMPOSITION ─────────────────────────────────────────────────────────
  if (composition && composition.prompt_block) {
    blocks.push(`\n${composition.prompt_block}`);
    if (composition.micro_variation) {
      blocks.push(`Micro-variation: ${composition.micro_variation}`);
    }
  }

  // ── 5. CAMERA & LENS ──────────────────────────────────────────────────────
  if (scene.camera) {
    blocks.push(`\nCAMERA:\n${scene.camera.prompt}`);
  }

  // ── 6. DEPTH LAYERS ───────────────────────────────────────────────────────
  const fg = DEPTH_LAYERS.foreground[Math.floor(Math.random() * DEPTH_LAYERS.foreground.length)];
  const mg = DEPTH_LAYERS.midground[Math.floor(Math.random() * DEPTH_LAYERS.midground.length)];
  const bg = DEPTH_LAYERS.background[Math.floor(Math.random() * DEPTH_LAYERS.background.length)];
  blocks.push(`\nDEPTH:\nForeground: ${fg}\nMidground: ${mg}\nBackground: ${bg}`);

  // ── 7. ENVIRONMENT ────────────────────────────────────────────────────────
  if (scene.ambiente) {
    blocks.push(`\nENVIRONMENT:\n${scene.ambiente.prompt}\nMood: ${scene.ambiente.mood}`);
  }

  // ── 8. LIGHTING ───────────────────────────────────────────────────────────
  if (scene.iluminacao) {
    blocks.push(`\nLIGHTING:\n${scene.iluminacao.prompt}`);
  }

  // ── 9. EMOTIONAL LEVEL ────────────────────────────────────────────────────
  if (scene.emotionalLevel) {
    const emotionMod = EMOTION_STYLE_MODS[scene.emotionalLevel.label] || EMOTION_STYLE_MODS.moderado;
    blocks.push(`\nEMOTIONAL ATMOSPHERE:\n${scene.emotionalLevel.prompt_hint}\n${emotionMod}`);
  }

  // ── 10. TYPOGRAPHY SPACE ──────────────────────────────────────────────────
  blocks.push(`\nTEXT SPACE REQUIREMENTS:\n- Keep top 15% and bottom 15% of image clean and low-detail for text overlay\n- Leave clear negative space areas for bold typography placement\n- Ensure high contrast zones exist for text readability\n- No visual clutter in text-designated areas`);

  // ── 11. ANTI-GENERIC RULES ────────────────────────────────────────────────
  blocks.push(ANTI_GENERIC_BLOCK);

  // ── 12. COMPOSITION FORBIDDEN BLOCK ───────────────────────────────────────
  if (composition && composition.forbidden_block) {
    blocks.push(composition.forbidden_block);
  }

  // ── 13. PERSONA SCALE LIMIT ───────────────────────────────────────────────
  if (scene.requer_personagem) {
    blocks.push(`\n🚫 PERSONA SCALE LIMIT:\n- Subject max 40% of image area\n- Min 60% environment/composition/negative space\n- FORBIDDEN: full-frame face, extreme close-up filling image`);
  }

  const prompt = blocks.join('\n').trim();

  console.log(`   🎬 [ImagePrompt V3] Prompt: ${prompt.length} chars | Scene: ${scene.tipo} | Depth: 3 layers`);

  return prompt;
}

// ── VISUAL NARRATIVE FROM HOOK ──────────────────────────────────────────────

function getVisualNarrativeFromHook(hookPattern, headline = '') {
  const narratives = {
    quebra_crenca: [
      'Visual metaphor of something breaking or transforming — a mask being removed, a wall crumbling to reveal light, a mirror showing a different reflection',
      'Unexpected juxtaposition — familiar object in unfamiliar context, visual paradox that makes the viewer stop and think',
      'Visual of transition or revelation — curtain being pulled back, fog clearing, light breaking through clouds',
    ],
    identificacao: [
      'Intimate relatable moment — person in everyday setting experiencing a quiet emotional moment, unguarded and authentic',
      'Universal human experience captured — waiting, looking out a window, sitting alone with thoughts, a quiet pause in daily routine',
      'Scene of quiet recognition — someone seeing themselves honestly, a moment of self-awareness in familiar surroundings',
    ],
    dor_oculta: [
      'Hidden weight made visible — invisible burden visualized through metaphor, heavy object balanced on something fragile',
      'Beautiful surface with depth beneath — calm water with turbulence below, perfect exterior with cracks showing',
      'Emotional archaeology — layers being peeled back, depth revealed, what lies beneath the surface',
    ],
    verdade_desconfortavel: [
      'Confrontational visual — direct gaze, stark lighting, nowhere to hide, raw honest composition',
      'Mirror or reflection showing truth — distorted mirror, shadow telling a different story, reflection not matching the pose',
      'Stark minimalism with single powerful element — isolated figure, single object with maximum emotional weight',
    ],
  };

  const options = narratives[hookPattern] || narratives.identificacao;
  return options[Math.floor(Math.random() * options.length)];
}

// ── EXPORTS ─────────────────────────────────────────────────────────────────

export default buildCinematicPrompt;
