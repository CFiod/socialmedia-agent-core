export const EMOTION_MAP = {
  abandono: {
    light: "low-key, soft shadows, cold tone",
    pose: "slightly closed posture, distant gaze",
    environment: "empty space, minimal elements",
    symbol: "isolation, distance"
  },
  culpa: {
    light: "top-down light, subtle shadow on face",
    pose: "head slightly down, introspective",
    environment: "closed space, subtle pressure",
    symbol: "weight, internal tension"
  },
  dor: {
    light: "soft diffused, low contrast",
    pose: "fragile posture",
    environment: "minimal, empty",
    symbol: "emotional vulnerability"
  },
  ansiedade: {
    light: "harsh light, high contrast",
    pose: "tense body, erratic gesture",
    environment: "cluttered space",
    symbol: "overload"
  },
  exaustao: {
    light: "fading light, heavy shadows",
    pose: "slumped posture",
    environment: "messy room",
    symbol: "depletion"
  }
};

export const CONFLICT_MAP = {
  "aparencia_vs_essencia": {
    visual: "mirror reflection slightly distorted",
    elements: ["mirror", "reflection contrast"]
  },
  "controle_vs_entrega": {
    visual: "hands gripping objects tightly",
    elements: ["papers", "phone", "objects out of place"]
  },
  "conexao_vs_isolamento": {
    visual: "subject surrounded but visually isolated",
    elements: ["blurred people in background"]
  },
  "culpa_vs_inocencia": {
    visual: "light vs shadow split across subject",
    elements: ["half-lit face"]
  },
  "resistencia_vs_exaustao": {
    visual: "leaning heavily for support",
    elements: ["heavy shadows", "disorganized space"]
  }
};

export const PROGRESSION_MAP = [
  { camera: "wide shot", density: "low", energy: "intro" },
  { camera: "medium-wide", density: "low", energy: "build" },
  { camera: "medium", density: "medium", energy: "tension" },
  { camera: "medium-close", density: "high", energy: "break" },
  { camera: "medium", density: "medium", energy: "relief" },
  { camera: "wide with light source", density: "medium", energy: "opening" },
  { camera: "medium-close", density: "focused", energy: "action" }
];

export function resolveEmotion(emotion) {
  if (!emotion) return EMOTION_MAP["dor"];
  
  const emotionLower = emotion.toLowerCase();
  for (const key of Object.keys(EMOTION_MAP)) {
    if (emotionLower.includes(key)) {
      return EMOTION_MAP[key];
    }
  }
  return EMOTION_MAP["dor"];
}

export function resolveConflict(conflict) {
  if (!conflict) return null;
  for (const key of Object.keys(CONFLICT_MAP)) {
    if (conflict.includes(key)) {
      return CONFLICT_MAP[key];
    }
  }
  return null;
}

export function applyProgression(index, total = 7) {
  const safeTotal = Math.max(1, total - 1);
  const mappedIndex = Math.floor((index / safeTotal) * (PROGRESSION_MAP.length - 1));
  return PROGRESSION_MAP[mappedIndex] || PROGRESSION_MAP[0];
}

export function buildScene(slide, globalState, index, total = 7) {
  const emotionText = globalState?.estrategia?.emocao_principal || 'dor';
  const emotion = resolveEmotion(emotionText);
  const conflict = resolveConflict(slide._semanticAnalysis?.conflito);
  const progression = applyProgression(index, total);

  return {
    camera: progression.camera,
    density: progression.density,
    energy: progression.energy,

    lighting: emotion.light,
    pose: emotion.pose,
    environment: emotion.environment,

    conflict_visual: conflict?.visual,
    elements: [
      ...(emotion.symbol ? [emotion.symbol] : []),
      ...(conflict?.elements || [])
    ],

    base_description: slide.descricao_base,
    composition: slide.artDirection?.composition_guidance || "negative space for text overlay, keep face away from top and bottom zones"
  };
}

export function processScenes(slides, globalState) {
  return slides.map((slide, index) => {
    const scene = buildScene(slide, globalState, index, slides.length);
    return {
      ...slide,
      _scene: scene
    };
  });
}
