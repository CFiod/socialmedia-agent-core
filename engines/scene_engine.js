/**
 * ============================================================
 * 🎬 SCENE ENGINE V3 — Acquisition-Grade Scene Director
 * ============================================================
 * Motor de decisão de cena orientado a PERFORMANCE de aquisição.
 *
 * RESPONSABILIDADES:
 *   1. Tipo de cena (humano, objeto, abstrato, ambiente, simbólico)
 *   2. Presença ou ausência de pessoa
 *   3. Tipo de personagem (homem, mulher, neutro, nenhum)
 *   4. Nível emocional da cena
 *   5. Tipo de ambiente (interior, exterior, estúdio, natureza)
 *   6. Câmera e lente (cinematográfico)
 *
 * REGRAS MANDATÓRIAS:
 *   - NÃO usar humano em todos os posts
 *   - Alternar: humano → simbólico → ambiente → abstrato
 *   - Limitar repetição de gênero (não gerar só "woman")
 *   - Após 2 posts com "woman" → bloquear temporariamente
 *   - Respeitar arco emocional do conteúdo
 * ============================================================
 */

import { loadHistory, getLastN } from './anti_repetition.js';

// ── TIPOS DE CENA ────────────────────────────────────────────────────────────

export const SCENE_TYPES = {
  humano: {
    id: 'humano',
    label: 'Personagem Humano',
    descricao: 'Pessoa como protagonista, rosto visível, expressão emocional',
    requer_personagem: true,
    prompt_block: 'A single person as main subject, emotional expression, environmental context, editorial composition',
    weight_base: 0.25,
  },
  silhueta: {
    id: 'silhueta',
    label: 'Silhueta Humana',
    descricao: 'Figura humana em contraluz, desfocada ou parcial',
    requer_personagem: true,
    prompt_block: 'Silhouette of a person, backlit, no visible facial features, atmospheric depth, moody editorial lighting',
    weight_base: 0.15,
  },
  objeto: {
    id: 'objeto',
    label: 'Objeto Emocional',
    descricao: 'Close de objeto cotidiano com peso emocional e simbolismo',
    requer_personagem: false,
    prompt_block: 'Close-up of a symbolic everyday object, shallow depth of field, rich texture, intimate composition, soft natural lighting, emotional weight',
    weight_base: 0.15,
  },
  ambiente: {
    id: 'ambiente',
    label: 'Cenário Atmosférico',
    descricao: 'Paisagem ou ambiente como protagonista, sem pessoas',
    requer_personagem: false,
    prompt_block: 'Atmospheric environment as the main subject, no people visible, emotional landscape, cinematic wide shot, rich depth, editorial mood',
    weight_base: 0.15,
  },
  simbolico: {
    id: 'simbolico',
    label: 'Cena Simbólica',
    descricao: 'Composição metafórica com objetos simbólicos',
    requer_personagem: false,
    prompt_block: 'Symbolic metaphorical scene, conceptual objects arranged with visual poetry, no human faces, editorial fine art composition, clean background with intentional elements',
    weight_base: 0.15,
  },
  abstrato: {
    id: 'abstrato',
    label: 'Composição Abstrata',
    descricao: 'Formas, texturas, gradientes — puro impacto visual',
    requer_personagem: false,
    prompt_block: 'Abstract composition, organic textures and gradients, no identifiable subjects, editorial art direction, vast negative space for text, gallery-quality aesthetic',
    weight_base: 0.10,
  },
  tipografia: {
    id: 'tipografia',
    label: 'Fundo Editorial',
    descricao: 'Fundo limpo editorial para texto dominante',
    requer_personagem: false,
    prompt_block: 'Clean editorial background, soft neutral gradient, vast empty space for bold typography, no subject, minimal texture, premium magazine aesthetic',
    weight_base: 0.05,
  },
};

// ── AMBIENTES CINEMATOGRÁFICOS ───────────────────────────────────────────────

export const ENVIRONMENTS = {
  interior_intimo: {
    id: 'interior_intimo',
    prompt: 'intimate indoor space, warm ambient light from single window, soft curtains, minimal furniture, personal objects',
    mood: 'vulnerabilidade, introspecção',
  },
  interior_moderno: {
    id: 'interior_moderno',
    prompt: 'modern minimalist interior, clean lines, neutral palette, natural light, architectural details',
    mood: 'clareza, contemporâneo',
  },
  exterior_urbano: {
    id: 'exterior_urbano',
    prompt: 'urban street scene, city textures, concrete and glass, diffused overcast light, urban poetry',
    mood: 'solidão urbana, rotina',
  },
  exterior_natureza: {
    id: 'exterior_natureza',
    prompt: 'natural landscape, open sky, organic textures, golden hour light, expansive horizon',
    mood: 'liberdade, esperança',
  },
  estudio_editorial: {
    id: 'estudio_editorial',
    prompt: 'editorial studio setting, seamless background, controlled professional lighting, premium magazine feel',
    mood: 'autoridade, profissionalismo',
  },
  transicional: {
    id: 'transicional',
    prompt: 'transitional space — doorway, hallway, staircase, threshold between two areas, liminal atmosphere',
    mood: 'mudança, passagem, decisão',
  },
  noturno_poetico: {
    id: 'noturno_poetico',
    prompt: 'nighttime scene, soft artificial lights, warm glow against dark, intimate night atmosphere, quiet streets or room lit by single lamp',
    mood: 'reflexão profunda, solidão',
  },
  cafe_livraria: {
    id: 'cafe_livraria',
    prompt: 'cozy café or bookshop interior, warm wood tones, bookshelves, soft pendant lights, intellectual warmth',
    mood: 'acolhimento, sabedoria',
  },
};

// ── CÂMERAS E LENTES ─────────────────────────────────────────────────────────

export const CAMERA_CONFIGS = {
  retrato_85mm: {
    lens: '85mm f/1.4',
    prompt: 'shot on 85mm f/1.4 lens, beautiful bokeh, shallow depth of field, subject separation from background',
    uso: ['humano', 'silhueta'],
  },
  wide_35mm: {
    lens: '35mm f/2.0',
    prompt: 'shot on 35mm f/2.0 lens, environmental context visible, natural perspective, storytelling composition',
    uso: ['ambiente', 'humano'],
  },
  macro_objeto: {
    lens: '100mm macro f/2.8',
    prompt: 'shot on 100mm macro lens, extreme detail, shallow focus, intimate close-up, texture revealed',
    uso: ['objeto', 'simbolico'],
  },
  cinematic_50mm: {
    lens: '50mm f/1.8',
    prompt: 'shot on 50mm f/1.8 lens, natural human perspective, cinematic depth, balanced composition',
    uso: ['humano', 'silhueta', 'ambiente'],
  },
  ultra_wide_24mm: {
    lens: '24mm f/2.8',
    prompt: 'shot on 24mm wide angle lens, expansive view, environmental immersion, dramatic perspective',
    uso: ['ambiente', 'abstrato'],
  },
  top_down: {
    lens: 'overhead perspective',
    prompt: 'flat lay overhead perspective, editorial arrangement, organized composition, clean background surface',
    uso: ['objeto', 'simbolico'],
  },
};

// ── ILUMINAÇÃO EMOCIONAL ─────────────────────────────────────────────────────

export const LIGHTING_MOODS = {
  esperanca: {
    prompt: 'warm golden hour lighting, soft rim light, hopeful atmosphere, gentle lens flare, warm color temperature 5500K',
    intensidade: 'alta',
  },
  introspecao: {
    prompt: 'soft diffused window light, neutral tones, contemplative mood, even exposure, natural indoor light',
    intensidade: 'média',
  },
  tensao: {
    prompt: 'dramatic side lighting, strong shadows, high contrast, cool blue tones, motivated light from single source',
    intensidade: 'alta',
  },
  vulnerabilidade: {
    prompt: 'very soft backlighting, gentle haze, slightly overexposed highlights, ethereal glow, pastel warmth',
    intensidade: 'baixa',
  },
  autoridade: {
    prompt: 'clean bright studio lighting, high-key, minimal shadows, professional editorial, even exposure',
    intensidade: 'alta',
  },
  misterio: {
    prompt: 'moody chiaroscuro lighting, deep shadows with warm highlights, single practical light source, film noir influence',
    intensidade: 'média',
  },
  acolhimento: {
    prompt: 'warm soft ambient light, candlelight or lamp glow, cozy atmosphere, warm shadows, honey-toned',
    intensidade: 'baixa',
  },
};

// ── PESOS POR OBJETIVO DE MARKETING ──────────────────────────────────────────

const SCENE_WEIGHTS_BY_OBJETIVO = {
  engajamento: {
    humano: 0.20, silhueta: 0.15, objeto: 0.20, ambiente: 0.15, simbolico: 0.20, abstrato: 0.05, tipografia: 0.05,
  },
  salvamento: {
    humano: 0.15, silhueta: 0.10, objeto: 0.20, ambiente: 0.15, simbolico: 0.20, abstrato: 0.10, tipografia: 0.10,
  },
  compartilhamento: {
    humano: 0.25, silhueta: 0.15, objeto: 0.15, ambiente: 0.15, simbolico: 0.20, abstrato: 0.05, tipografia: 0.05,
  },
  autoridade: {
    humano: 0.20, silhueta: 0.10, objeto: 0.15, ambiente: 0.10, simbolico: 0.15, abstrato: 0.10, tipografia: 0.20,
  },
  conversao: {
    humano: 0.35, silhueta: 0.15, objeto: 0.10, ambiente: 0.10, simbolico: 0.10, abstrato: 0.05, tipografia: 0.15,
  },
};

// ── MAPEAMENTO EMOÇÃO → ILUMINAÇÃO ───────────────────────────────────────────

const EMOTION_LIGHTING_MAP = {
  curiosidade: 'introspecao',
  identificacao: 'acolhimento',
  ansiedade: 'tensao',
  tensao: 'tensao',
  insight: 'autoridade',
  alivio: 'esperanca',
  acao: 'autoridade',
  culpa: 'vulnerabilidade',
  confianca: 'esperanca',
};

// ── MAPEAMENTO EMOÇÃO → AMBIENTE ─────────────────────────────────────────────

const EMOTION_ENVIRONMENT_MAP = {
  curiosidade: ['interior_moderno', 'cafe_livraria', 'transicional'],
  identificacao: ['interior_intimo', 'cafe_livraria'],
  ansiedade: ['interior_intimo', 'exterior_urbano', 'noturno_poetico'],
  tensao: ['transicional', 'exterior_urbano', 'noturno_poetico'],
  insight: ['interior_moderno', 'estudio_editorial', 'cafe_livraria'],
  alivio: ['exterior_natureza', 'interior_intimo', 'cafe_livraria'],
  acao: ['exterior_urbano', 'exterior_natureza', 'estudio_editorial'],
  culpa: ['interior_intimo', 'noturno_poetico', 'transicional'],
  confianca: ['exterior_natureza', 'estudio_editorial', 'interior_moderno'],
};

// ── SELEÇÃO DE CÂMERA POR TIPO DE CENA ───────────────────────────────────────

function selecionarCamera(tipoCena) {
  const cameras = Object.values(CAMERA_CONFIGS).filter(c => c.uso.includes(tipoCena));
  if (cameras.length === 0) return CAMERA_CONFIGS.cinematic_50mm;
  return cameras[Math.floor(Math.random() * cameras.length)];
}

// ── SELEÇÃO DE AMBIENTE ──────────────────────────────────────────────────────

function selecionarAmbiente(emotionId) {
  const opcoes = EMOTION_ENVIRONMENT_MAP[emotionId] || Object.keys(ENVIRONMENTS);
  const escolhido = opcoes[Math.floor(Math.random() * opcoes.length)];
  return ENVIRONMENTS[escolhido] || ENVIRONMENTS.interior_intimo;
}

// ── SELEÇÃO DE ILUMINAÇÃO ────────────────────────────────────────────────────

function selecionarIluminacao(emotionId) {
  const lightingKey = EMOTION_LIGHTING_MAP[emotionId] || 'introspecao';
  return LIGHTING_MOODS[lightingKey] || LIGHTING_MOODS.introspecao;
}

// ── WEIGHTED RANDOM (local) ──────────────────────────────────────────────────

function weightedRandom(weights) {
  const entries = Object.entries(weights);
  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
  if (totalWeight === 0) return entries[0]?.[0] || 'simbolico';
  let roll = Math.random() * totalWeight;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return key;
  }
  return entries[0][0];
}

// ── ENGINE PRINCIPAL V3 ──────────────────────────────────────────────────────

/**
 * Decide a cena completa para um post.
 *
 * @param {Object} params
 * @param {string} params.objetivo — objetivo de marketing
 * @param {string} params.emotionId — ID da emoção (curiosidade, tensao, etc.)
 * @param {string} params.tipoPost — tipo de post do growth engine
 * @param {string} params.modo — cotidiano | estrategico
 * @param {Object} [params.history] — histórico de anti-repetição
 * @returns {Object} — decisão de cena completa
 */
export function decideScene({
  objetivo = 'engajamento',
  emotionId = 'curiosidade',
  tipoPost = 'frase_curta',
  modo = 'cotidiano',
  history = null,
} = {}) {

  // ── 1. Carregar histórico ──────────────────────────────────────────────────
  const hist = history || loadHistory();
  const lastScenes = getLastN(hist, 'scene_type', 5);
  const lastGenders = getLastN(hist, 'gender', 5);
  const lastEnvironments = getLastN(hist, 'environment', 3);

  // ── 2. Calcular pesos base por objetivo ────────────────────────────────────
  const weights = { ...(SCENE_WEIGHTS_BY_OBJETIVO[objetivo] || SCENE_WEIGHTS_BY_OBJETIVO.engajamento) };

  // ── 3. REGRA: Nunca repetir tipo de cena 2x seguidas ──────────────────────
  const lastScene = lastScenes[lastScenes.length - 1];
  if (lastScene && weights[lastScene] !== undefined) {
    weights[lastScene] = 0;
    console.log(`   🔄 [SceneEngine] Anti-repetição: bloqueando "${lastScene}"`);
  }

  // ── 4. REGRA: Após 3+ cenas humanas → forçar não-humano ───────────────────
  const recentHumanCount = lastScenes.filter(s => s === 'humano' || s === 'silhueta').length;
  if (recentHumanCount >= 3) {
    weights.humano = 0;
    weights.silhueta = 0;
    console.log(`   🎭 [SceneEngine] Anti-fadiga humana: ${recentHumanCount} cenas humanas recentes → bloqueando`);
  }

  // ── 5. REGRA: Penalizar cenas repetidas nos últimos 5 ──────────────────────
  lastScenes.forEach(scene => {
    if (weights[scene] !== undefined) {
      weights[scene] *= 0.3;
    }
  });

  // ── 6. Tipo de post override ───────────────────────────────────────────────
  const OVERRIDES = {
    checklist: 'tipografia',
    mini_guia: 'tipografia',
    convite: 'humano',
    dor_solucao: 'humano',
  };

  let tipoCena;
  if (OVERRIDES[tipoPost] && weights[OVERRIDES[tipoPost]] !== 0) {
    tipoCena = OVERRIDES[tipoPost];
    console.log(`   📌 [SceneEngine] Override por tipoPost "${tipoPost}" → ${tipoCena}`);
  } else {
    // Normalizar
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    if (totalWeight === 0) {
      Object.keys(weights).forEach(k => { weights[k] = SCENE_TYPES[k]?.weight_base || 0.1; });
    }
    tipoCena = weightedRandom(weights);
  }

  const sceneType = SCENE_TYPES[tipoCena] || SCENE_TYPES.simbolico;

  // ── 7. Decidir gênero do personagem (se humano) ────────────────────────────
  let genderDecision = null;
  if (sceneType.requer_personagem && tipoCena !== 'silhueta') {
    genderDecision = decideGender(lastGenders);
  }

  // ── 8. Ambiente ────────────────────────────────────────────────────────────
  let ambiente = selecionarAmbiente(emotionId);
  // Anti-repetição de ambiente
  if (lastEnvironments.includes(ambiente.id)) {
    const allEnvs = Object.values(ENVIRONMENTS).filter(e => !lastEnvironments.includes(e.id));
    if (allEnvs.length > 0) {
      ambiente = allEnvs[Math.floor(Math.random() * allEnvs.length)];
    }
  }

  // ── 9. Câmera ──────────────────────────────────────────────────────────────
  const camera = selecionarCamera(tipoCena);

  // ── 10. Iluminação ─────────────────────────────────────────────────────────
  const iluminacao = selecionarIluminacao(emotionId);

  // ── 11. Nível emocional ────────────────────────────────────────────────────
  const emotionalLevel = calculateEmotionalLevel(emotionId, objetivo);

  // ── LOG ─────────────────────────────────────────────────────────────────────
  console.log(`   🎬 [SceneEngine V3] Cena: ${tipoCena} (${sceneType.label})`);
  console.log(`   📸 Câmera: ${camera.lens} | 🏠 Ambiente: ${ambiente.id} | 💡 Luz: ${iluminacao.intensidade}`);
  if (genderDecision) {
    console.log(`   👤 Gênero: ${genderDecision.gender} (${genderDecision.reason})`);
  }

  return {
    // Tipo de cena
    tipo: tipoCena,
    label: sceneType.label,
    descricao: sceneType.descricao,
    requer_personagem: sceneType.requer_personagem,
    prompt_block: sceneType.prompt_block,

    // Personagem
    gender: genderDecision,

    // Técnico-cinematográfico
    camera: {
      lens: camera.lens,
      prompt: camera.prompt,
    },
    ambiente: {
      id: ambiente.id,
      prompt: ambiente.prompt,
      mood: ambiente.mood,
    },
    iluminacao: {
      prompt: iluminacao.prompt,
      intensidade: iluminacao.intensidade,
    },

    // Emocional
    emotionalLevel,

    // Metadata para anti-repetição
    _meta: {
      tipoCena,
      genderUsed: genderDecision?.gender || null,
      ambienteUsed: ambiente.id,
      cameraUsed: camera.lens,
      emotionId,
      objetivo,
    },
  };
}

// ── GENDER DIVERSITY SYSTEM ──────────────────────────────────────────────────

/**
 * Decide o gênero do personagem com regras de diversidade.
 * REGRA CRÍTICA: Após 2 posts com "woman" → bloquear temporariamente.
 *
 * @param {string[]} lastGenders — últimos gêneros usados
 * @returns {Object} — { gender, reason, ageRange, ethnicity, context }
 */
function decideGender(lastGenders = []) {
  const recentWomanCount = lastGenders.filter(g => g === 'woman' || g === 'feminino').length;
  const recentManCount = lastGenders.filter(g => g === 'man' || g === 'masculino').length;
  const lastGender = lastGenders[lastGenders.length - 1];

  let gender;
  let reason;

  // ── REGRA 1: Após 2+ "woman" → bloquear ────────────────────────────────────
  if (recentWomanCount >= 2) {
    const opcoes = ['man', 'neutral'];
    gender = opcoes[Math.floor(Math.random() * opcoes.length)];
    reason = `Bloqueio de gênero: ${recentWomanCount}x "woman" recentes`;
    console.log(`   ⚠️ [GenderDiversity] ${reason} → "${gender}"`);
  }
  // ── REGRA 2: Após 2+ "man" → bloquear ──────────────────────────────────────
  else if (recentManCount >= 2) {
    const opcoes = ['woman', 'neutral'];
    gender = opcoes[Math.floor(Math.random() * opcoes.length)];
    reason = `Bloqueio de gênero: ${recentManCount}x "man" recentes`;
  }
  // ── REGRA 3: Não repetir gênero 2x seguidas ────────────────────────────────
  else if (lastGender) {
    const pool = ['woman', 'man', 'neutral'].filter(g => g !== lastGender);
    gender = pool[Math.floor(Math.random() * pool.length)];
    reason = `Alternância de gênero (último: ${lastGender})`;
  }
  // ── DEFAULT: Distribuição balanceada ────────────────────────────────────────
  else {
    gender = weightedRandom({ woman: 0.35, man: 0.35, neutral: 0.30 });
    reason = 'Distribuição inicial balanceada';
  }

  // Decidir idade
  const ageRange = weightedRandom({
    'jovem (25-30)': 0.35,
    'adulto (30-40)': 0.40,
    'maduro (40-55)': 0.20,
    'idoso (55+)': 0.05,
  });

  // Decidir etnia (variada)
  const ethnicity = weightedRandom({
    'light skin, European features': 0.20,
    'warm brown skin, Latin American features': 0.25,
    'dark brown skin, African features': 0.20,
    'olive skin, Mediterranean features': 0.15,
    'light skin, East Asian features': 0.10,
    'brown skin, South Asian features': 0.10,
  });

  // Decidir contexto
  const context = weightedRandom({
    'alone, introspective': 0.50,
    'silhouette, anonymous': 0.20,
    'from behind, not showing face': 0.15,
    'in a group, social context': 0.10,
    'partial view, hands or torso only': 0.05,
  });

  return { gender, reason, ageRange, ethnicity, context };
}

// ── NÍVEL EMOCIONAL ──────────────────────────────────────────────────────────

function calculateEmotionalLevel(emotionId, objetivo) {
  const INTENSITY_MAP = {
    curiosidade: 3,
    identificacao: 5,
    ansiedade: 7,
    tensao: 9,
    insight: 6,
    alivio: 4,
    acao: 8,
    culpa: 8,
    confianca: 5,
  };

  const base = INTENSITY_MAP[emotionId] || 5;

  // Objetivo modula
  const OBJECTIVE_MOD = {
    engajamento: 0,
    salvamento: -1,
    compartilhamento: +1,
    autoridade: -1,
    conversao: +2,
  };

  const mod = OBJECTIVE_MOD[objetivo] || 0;
  const level = Math.max(1, Math.min(10, base + mod));

  return {
    value: level,
    label: level <= 3 ? 'sutil' : level <= 6 ? 'moderado' : level <= 8 ? 'intenso' : 'máximo',
    prompt_hint: level <= 3
      ? 'subtle, calm, quiet emotional undertone'
      : level <= 6
        ? 'moderate emotional presence, visible but not overwhelming'
        : level <= 8
          ? 'intense emotional atmosphere, palpable tension or feeling'
          : 'maximum emotional impact, raw and visceral',
  };
}

// ── EXPORTS ──────────────────────────────────────────────────────────────────

export default decideScene;
