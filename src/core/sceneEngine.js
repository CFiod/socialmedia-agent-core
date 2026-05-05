/**
 * src/core/sceneEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Façade SaaS — re-exporta o motor de cenas real que já existe em:
 *   engines/prompt/scene/sceneEngine.js
 *
 * REGRA: NÃO altera nenhuma lógica existente.
 * Este arquivo serve como ponto de entrada padronizado para a camada /src.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export {
  EMOTION_MAP,
  CONFLICT_MAP,
  PROGRESSION_MAP,
  resolveEmotion,
  resolveConflict,
  applyProgression,
  buildScene,
  processScenes
} from '../../engines/prompt/scene/sceneEngine.js';
