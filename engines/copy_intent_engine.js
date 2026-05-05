/**
 * 🧠 COPY INTENT ENGINE — Strategic Copy Classification & Generation
 * Classifies every post by psychological strategy and hook pattern.
 *
 * HOOK PATTERNS:
 *   quebra_crenca    — Breaks an assumption ("A ansiedade não é fraqueza")
 *   identificacao    — Makes reader feel seen ("Você sente isso e não sabe explicar")
 *   dor_oculta       — Names a hidden pain ("A culpa que você sente não é sua")
 *   verdade_desconfortavel — Confronts with truth ("Você se abandona pra não ser abandonada")
 *
 * COPY STRUCTURES:
 *   impacto_curto    — Short punch (headline only, max 8 words)
 *   expansao_emocional — Headline + emotional subtexto
 *   cta_forte        — Headline + directive CTA
 *
 * INTENTS:
 *   atrair   — Stop the scroll, generate curiosity
 *   engajar  — Trigger identification, comments, saves
 *   converter — Drive action (WhatsApp, follow, etc.)
 *   educar   — Provide value, build authority
 */

import { randomPick } from '../agents/growth_engine.js';

// ── HOOK PATTERNS ────────────────────────────────────────────────────────────

export const HOOK_PATTERNS = {
  quebra_crenca: {
    id: 'quebra_crenca',
    label: 'Quebra de Crença',
    descricao: 'Desafia uma crença comum, inverte expectativa',
    psychology: 'Cognitive dissonance — forces re-evaluation',
    best_for: ['compartilhamento', 'engajamento'],
    templates: [
      { headline: 'A ansiedade não é o problema', subtexto: 'É o sintoma de algo que você evita olhar.' },
      { headline: 'Controlar tudo não é força', subtexto: 'É a forma mais elegante de entrar em colapso.' },
      { headline: 'Seu perfeccionismo não é qualidade', subtexto: 'É medo de rejeição travestido de disciplina.' },
      { headline: 'Você não precisa de motivação', subtexto: 'Precisa de luto. Pelo que já foi e não volta.' },
      { headline: 'Estar sempre ocupada', subtexto: 'Não é produtividade. É fuga de si mesma.' },
      { headline: 'A procrastinação não é preguiça', subtexto: 'É o grito do que você evita sentir.' },
    ],
    weight: 0.25,
  },

  identificacao: {
    id: 'identificacao',
    label: 'Identificação',
    descricao: 'Faz o leitor se sentir visto e compreendido',
    psychology: 'Mirror neurons — reader sees themselves',
    best_for: ['engajamento', 'salvamento'],
    templates: [
      { headline: 'Você sente isso e não sabe explicar', subtexto: 'Mas quando alguém descreve, parece que fala de você.' },
      { headline: 'Você carrega um peso que ninguém vê', subtexto: 'E ainda assim sorri como se tudo estivesse bem.' },
      { headline: 'Você cuida de todo mundo', subtexto: 'Mas quem cuida de você?' },
      { headline: 'Quantas vezes você disse "tô bem"', subtexto: 'Sabendo que não estava?' },
      { headline: 'A pessoa mais forte da sala', subtexto: 'Quase sempre é a mais cansada.' },
      { headline: 'Você não está exagerando', subtexto: 'O peso é real. A dor é real.' },
    ],
    weight: 0.30,
  },

  dor_oculta: {
    id: 'dor_oculta',
    label: 'Dor Oculta',
    descricao: 'Nomeia uma dor que o leitor não sabia que tinha',
    psychology: 'Unconscious recognition — names the unnamed',
    best_for: ['salvamento', 'compartilhamento'],
    templates: [
      { headline: 'A culpa que você sente', subtexto: 'Não é sua. Foi ensinada.' },
      { headline: 'Esse cansaço que não passa', subtexto: 'Não é do corpo. É da alma pedindo trégua.' },
      { headline: 'Você não quebrou', subtexto: 'Só carregou demais. Por tempo demais. Sozinha.' },
      { headline: 'O vazio que você sente', subtexto: 'Não é falta de algo. É presença de tudo que você reprimiu.' },
      { headline: 'Sua insônia não é aleatória', subtexto: 'É sua mente processando o que você evita durante o dia.' },
      { headline: 'A exaustão emocional é silenciosa', subtexto: 'Mas nunca invisível pra quem sabe olhar.' },
    ],
    weight: 0.25,
  },

  verdade_desconfortavel: {
    id: 'verdade_desconfortavel',
    label: 'Verdade Desconfortável',
    descricao: 'Confronta com uma verdade que o leitor resiste a ver',
    psychology: 'Provocative truth — bypasses defense mechanisms',
    best_for: ['compartilhamento', 'engajamento'],
    templates: [
      { headline: 'Você se abandona', subtexto: 'Para não ser abandonada por quem nunca vai ficar.' },
      { headline: 'A maioria das suas decisões', subtexto: 'É baseada em medo, não em desejo.' },
      { headline: 'Você não é forte', subtexto: 'Você aprendeu a engolir o choro.' },
      { headline: 'Ser independente demais', subtexto: 'É uma forma de não precisar pedir ajuda.' },
      { headline: 'Você confunde amor', subtexto: 'Com necessidade de aprovação.' },
      { headline: 'Você não escolheu ser assim', subtexto: 'Mas pode escolher parar.' },
    ],
    weight: 0.20,
  },
};

// ── COPY STRUCTURES ──────────────────────────────────────────────────────────

export const COPY_STRUCTURES = {
  impacto_curto: {
    id: 'impacto_curto',
    label: 'Impacto Curto',
    max_headline_words: 8,
    has_subtexto: false,
    has_cta: false,
    best_for: ['engajamento', 'compartilhamento'],
  },
  expansao_emocional: {
    id: 'expansao_emocional',
    label: 'Expansão Emocional',
    max_headline_words: 12,
    has_subtexto: true,
    has_cta: false,
    best_for: ['salvamento', 'engajamento'],
  },
  cta_forte: {
    id: 'cta_forte',
    label: 'CTA Forte',
    max_headline_words: 10,
    has_subtexto: true,
    has_cta: true,
    best_for: ['conversao', 'autoridade'],
  },
};

// ── INTENT MAPPING ───────────────────────────────────────────────────────────

const OBJETIVO_TO_INTENT = {
  engajamento: 'engajar',
  salvamento: 'educar',
  compartilhamento: 'atrair',
  autoridade: 'educar',
  conversao: 'converter',
};

const INTENT_TO_STRUCTURE = {
  atrair: ['impacto_curto', 'expansao_emocional'],
  engajar: ['expansao_emocional', 'impacto_curto'],
  converter: ['cta_forte', 'expansao_emocional'],
  educar: ['expansao_emocional', 'cta_forte'],
};

const INTENT_TO_HOOK = {
  atrair: ['quebra_crenca', 'verdade_desconfortavel'],
  engajar: ['identificacao', 'dor_oculta'],
  converter: ['dor_oculta', 'identificacao'],
  educar: ['quebra_crenca', 'identificacao'],
};

// ── ENGINE PRINCIPAL ─────────────────────────────────────────────────────────

/**
 * Classifica e gera copy com intenção estratégica.
 *
 * @param {Object} params
 * @param {string} params.objetivo — objetivo de marketing
 * @param {string} params.tipoPost — tipo de post
 * @param {string} params.emotionId — emoção do post
 * @param {string[]} [params.lastHookPatterns] — últimos hooks usados
 * @param {string[]} [params.lastStructures] — últimas estruturas usadas
 * @returns {Object} — copy completa com classificação estratégica
 */
export function generateStrategicCopy({
  objetivo = 'engajamento',
  tipoPost = 'frase_curta',
  emotionId = 'curiosidade',
  lastHookPatterns = [],
  lastStructures = [],
} = {}) {

  // 1. Determinar intent
  const intent = OBJETIVO_TO_INTENT[objetivo] || 'engajar';

  // 2. Selecionar hook pattern
  const hookPattern = selectHookPattern(intent, lastHookPatterns);

  // 3. Selecionar estrutura
  const structure = selectStructure(intent, lastStructures);

  // 4. Gerar copy do template do hook
  const templates = HOOK_PATTERNS[hookPattern].templates;
  const copy = randomPick(templates);

  // 5. Log
  console.log(`   🧠 [CopyIntent] Intent: ${intent} | Hook: ${hookPattern} | Estrutura: ${structure}`);
  console.log(`   ✍️  "${copy.headline}"`);

  return {
    intent,
    hookPattern,
    structure,
    copy: {
      headline: copy.headline,
      subtexto: copy.subtexto || '',
    },
    psychology: HOOK_PATTERNS[hookPattern].psychology,
    meta: {
      intent,
      hookPattern,
      structure,
      emotionId,
      objetivo,
      tipoPost,
    },
  };
}

function selectHookPattern(intent, lastPatterns = []) {
  const preferred = INTENT_TO_HOOK[intent] || Object.keys(HOOK_PATTERNS);
  // Build weights, penalizing recent
  const weights = {};
  for (const [id, pattern] of Object.entries(HOOK_PATTERNS)) {
    let w = pattern.weight;
    if (preferred.includes(id)) w *= 1.5;
    // Anti-repetição
    const recentCount = lastPatterns.filter(p => p === id).length;
    if (recentCount >= 2) w = 0;
    else if (recentCount >= 1) w *= 0.3;
    // Last used = zero
    if (lastPatterns.length > 0 && lastPatterns[lastPatterns.length - 1] === id) w = 0;
    weights[id] = Math.max(w, 0);
  }
  // Normalize
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (total === 0) return randomPick(Object.keys(HOOK_PATTERNS));
  // Weighted selection
  let roll = Math.random() * total;
  for (const [key, w] of Object.entries(weights)) {
    roll -= w;
    if (roll <= 0) return key;
  }
  return Object.keys(weights)[0];
}

function selectStructure(intent, lastStructures = []) {
  const preferred = INTENT_TO_STRUCTURE[intent] || ['expansao_emocional'];
  // Avoid last used
  const last = lastStructures[lastStructures.length - 1];
  const filtered = preferred.filter(s => s !== last);
  return filtered.length > 0 ? randomPick(filtered) : randomPick(preferred);
}

export default generateStrategicCopy;
