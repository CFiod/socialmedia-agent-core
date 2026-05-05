import { buildScene } from './scene/sceneEngine.js';

export function buildPersona(globalState) {
  const p = globalState?.visual_identity || {};
  return `same woman, ${p.idade_aparente || 30}-year-old latina, ${p.pele || 'light brown skin'}, ${p.cabelo || 'dark wavy shoulder-length hair'}, wearing ${p.roupa_base || 'neutral beige clothing'}`;
}

export function buildStyle(globalState) {
  const styleStr = globalState?.estilo_visual?.base || 'dark_luxury';
  let modifiers = '';
  if (styleStr.includes('dark_luxury')) {
    modifiers = 'low-key lighting, deep shadows, high contrast, cinematic, sophisticated dark palette, subtle rim light, moody';
  } else if (styleStr.includes('editorial_minimalist')) {
    modifiers = 'high-end editorial photography, minimal clean, bright soft lighting, instagram aesthetic';
  } else if (styleStr.includes('cinematic_soft')) {
    modifiers = 'cinematic soft, natural diffused lighting, filmic grain, low contrast, warm intimate mood, shallow depth of field';
  } else if (styleStr.includes('ugc_raw')) {
    modifiers = 'natural imperfect lighting, medium contrast, authentic raw texture, organic feel, real-world, unposed casual';
  } else {
    modifiers = 'high-end editorial photography, cinematic lighting';
  }
  return modifiers;
}

export function buildNegative(globalState) {
  return 'different person, inconsistent face, stock photo look, text, watermark, text over face';
}

export function buildPrompt({ slide, globalState = {}, index = 0, total = 1 }) {
  const scene = slide._scene || buildScene(slide, globalState, index, total);
  
  const persona = globalState?.persona_locked ? buildPersona(globalState) : 'symbolic object, no human faces';
  const style = buildStyle(globalState);
  const negative = buildNegative(globalState);

  let prompt = `
${persona},

${scene.base_description || "emotional scene"},

${scene.camera}, ${scene.density} composition,

lighting: ${scene.lighting},
pose: ${scene.pose},
environment: ${scene.environment},

${scene.conflict_visual ? scene.conflict_visual + ',' : ""}

elements: ${scene.elements && scene.elements.length > 0 ? scene.elements.join(", ") : "subtle details"},

composition: ${scene.composition}, ensure vast negative space for text overlays, DO NOT place text over the subject's face, keep face clear,

style: ${style},

high detail, cinematic realism, emotional storytelling,

--no ${negative}
`;

  return prompt.trim();
}

/**
 * V3 Prompt Builder — Layout Aware
 * Injeta diretivas de composição rigorosas baseadas na safe zone V3
 * para forçar o gerador de imagem a deixar espaço onde o texto vai entrar.
 */
export function buildPromptV3({ slide, globalState = {}, index = 0, total = 1, layoutIntent = null, strictProtagonist = null }) {
  const scene = slide._scene || buildScene(slide, globalState, index, total);
  
  let persona = 'symbolic object, no human faces';
  let isCarouselLocked = false;

  // V3: Priorizar character sheet travada do carrossel
  if (strictProtagonist) {
      persona = strictProtagonist;
      isCarouselLocked = strictProtagonist.includes('CONSISTENCY LOCK') || (total > 1 && globalState?._lockedCharacterSheet);
  } else if (globalState?._lockedCharacterSheet) {
      persona = globalState._lockedCharacterSheet;
      isCarouselLocked = true;
  } else if (globalState?.persona_locked) {
      persona = buildPersona(globalState);
  }
  
  const style = buildStyle(globalState);
  const negative = buildNegative(globalState);

  // ── Adaptação Composicional V3 ──
  let compositionGuidance = scene.composition;
  if (layoutIntent && layoutIntent._v3Zone && layoutIntent._v3Zone.name) {
      const zoneName = layoutIntent._v3Zone.name;
      compositionGuidance = `Subject strictly off-center (${zoneName} area MUST be empty). Leave vast negative space on the ${zoneName} of the image. Avoid placing face in the center. Clear visual breathing room in the ${zoneName}.`;
  }

  // V3: Carousel slide reference (helps DALL-E understand sequencing)
  const slideRef = total > 1 ? `\n[CAROUSEL SLIDE ${index + 1} OF ${total}]` : '';
  const consistencyBlock = isCarouselLocked
    ? `\n\n🔒 MANDATORY: This character is the EXACT SAME person from slides 1-${total}. Do NOT create a different person. Same face, same hair, same skin, same clothes. Only pose and angle change.\n`
    : '';

  let prompt = `
${slideRef}
${persona},
${consistencyBlock}
${scene.base_description || "emotional scene"},

${scene.camera}, ${scene.density} composition,

lighting: ${scene.lighting}, soft gradients for text readability,
pose: ${scene.pose},
environment: ${scene.environment},

${scene.conflict_visual ? scene.conflict_visual + ',' : ""}

elements: ${scene.elements && scene.elements.length > 0 ? scene.elements.join(", ") : "subtle details"},

composition rules:
- ${compositionGuidance}
- no clutter in safe zones

style: ${style},

high detail, cinematic realism, emotional storytelling,

--no ${negative}${isCarouselLocked ? ', different person, inconsistent appearance, changed clothing, different hairstyle, different skin tone' : ''}
`;

  return prompt.trim();
}

export function attachGenerationMetadata(slide, prompt, modelName = "dall-e") {
  slide._generation = {
    prompt: prompt,
    image_prompt_full: prompt,
    timestamp: new Date().toISOString(),
    model: modelName
  };
  return slide;
}
