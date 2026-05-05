/**
 * ============================================================
 * 👤 PERSONA BANK (v1.0) — Banco Rotativo de Personas
 * ============================================================
 * Elimina a repetição de "same woman 30s" em todos os posts.
 * 
 * LÓGICA DE USO POR CATEGORIA:
 *   autor     → NUNCA usar persona humana
 *   growth    → 30% chance de persona
 *   post      → 50% chance de persona
 *   carrossel → SEMPRE usar (com consistência entre slides)
 *
 * ROTAÇÃO:
 *   - Nunca repetir persona 2x seguidas (exceto carrossel)
 *   - Banco com 7+ opções diversas
 *   - Suporte a "no person" (objetos, silhuetas, metáforas)
 * ============================================================
 */

import { getRecentPersonas, savePersonaUsed } from '../services/memoryService.js';

// ── BANCO DE PERSONAS ────────────────────────────────────────────────────────

const PERSONA_REGISTRY = [
  {
    id: 'woman_30_latina',
    prompt: 'woman in her early 30s, brown shoulder-length hair, warm skin tone, soft facial features',
    genero: 'woman',
    idade_aparente: 32,
    cabelo: 'brown shoulder-length hair',
    clothing: {
      clean: 'neutral linen blouse',
      rich: 'soft cream linen dress',
      painterly: 'flowing neutral vintage dress',
    },
    tags: ['feminino', 'universal'],
  },
  {
    id: 'woman_25_moderna',
    prompt: 'young woman in her mid 20s, dark wavy hair, light brown skin, expressive eyes',
    genero: 'woman',
    idade_aparente: 25,
    cabelo: 'dark wavy hair',
    clothing: {
      clean: 'minimalist white t-shirt',
      rich: 'casual earth-tone sweater',
      painterly: 'soft draped fabric',
    },
    tags: ['feminino', 'jovem'],
  },
  {
    id: 'man_40_thoughtful',
    prompt: 'man in his early 40s, short dark hair with grey at temples, light stubble, warm eyes',
    genero: 'man',
    idade_aparente: 42,
    cabelo: 'short dark hair with grey at temples',
    clothing: {
      clean: 'neutral henley shirt',
      rich: 'olive-green utility jacket over grey shirt',
      painterly: 'vintage earth-tone clothing',
    },
    tags: ['masculino', 'maduro'],
  },
  {
    id: 'man_30_jovem',
    prompt: 'young man in his late 20s, short brown tousled hair, clean shaven, kind expression',
    genero: 'man',
    idade_aparente: 28,
    cabelo: 'short brown tousled hair',
    clothing: {
      clean: 'simple white cotton shirt',
      rich: 'casual navy sweater',
      painterly: 'linen shirt',
    },
    tags: ['masculino', 'jovem'],
  },
  {
    id: 'woman_35_profissional',
    prompt: 'woman in her mid 30s, dark hair pulled back loosely, confident but soft expression',
    genero: 'woman',
    idade_aparente: 35,
    cabelo: 'dark hair pulled back loosely',
    clothing: {
      clean: 'cream blazer over simple top',
      rich: 'professional casual outfit in neutral tones',
      painterly: 'elegant muted-tone clothing',
    },
    tags: ['feminino', 'autoridade'],
  },
  // ── PERSONAS SEM ROSTO HUMANO ──────────────────────────────────────────────
  {
    id: 'silhouette_human',
    prompt: 'silhouette of a person, backlit, no visible face, atmospheric',
    clothing: { clean: '', rich: '', painterly: '' },
    tags: ['neutro', 'abstrato'],
    isAbstract: true,
  },
  {
    id: 'hands_only',
    prompt: 'close-up of hands in expressive gesture, no face visible, warm skin tone',
    clothing: { clean: '', rich: '', painterly: '' },
    tags: ['neutro', 'detalhe'],
    isAbstract: true,
  },
  {
    id: 'no_person',
    prompt: 'No human faces or figures in this image. Focus on symbolic objects, metaphors, or environments',
    clothing: { clean: '', rich: '', painterly: '' },
    tags: ['neutro', 'conceitual'],
    isAbstract: true,
    isNoPerson: true,
  },
  {
    id: 'object_metaphor',
    prompt: 'No people. Scene built around a single powerful metaphorical object in a clean, editorial environment',
    clothing: { clean: '', rich: '', painterly: '' },
    tags: ['neutro', 'conceitual'],
    isAbstract: true,
    isNoPerson: true,
  },
];

// ── DECISÃO: USAR PERSONA OU NÃO ────────────────────────────────────────────

/**
 * Decide se o post deve ter persona humana com base na categoria de conteúdo.
 *
 * @param {string} categoria — carrossel | post | growth | autor
 * @returns {boolean}
 */
export function deveUsarPersona(categoria) {
  switch (categoria) {
    case 'autor':
      return false; // NUNCA

    case 'growth': {
      const roll = Math.random();
      const usar = roll < 0.30; // 30% chance
      console.log(`   👤 [PersonaBank] Growth → ${usar ? 'COM' : 'SEM'} persona (roll: ${(roll * 100).toFixed(0)}%)`);
      return usar;
    }

    case 'post': {
      const roll = Math.random();
      const usar = roll < 0.50; // 50% chance
      console.log(`   👤 [PersonaBank] Post → ${usar ? 'COM' : 'SEM'} persona (roll: ${(roll * 100).toFixed(0)}%)`);
      return usar;
    }

    case 'carrossel':
      return true; // SEMPRE (com consistência)

    default:
      return true;
  }
}

// ── SELEÇÃO DE PERSONA ───────────────────────────────────────────────────────

/**
 * Seleciona a persona ideal para o post.
 * Respeita rotação (nunca repete 2x seguida, exceto carrossel).
 *
 * @param {Object} params
 * @param {string} params.categoria — carrossel | post | growth | autor
 * @param {string} params.genero — feminino | masculino | universal
 * @param {string} params.styleCategory — clean | rich | painterly
 * @param {string[]} params.ultimasPersonas — IDs das últimas personas usadas
 * @returns {Object} — persona selecionada com prompt e clothing
 */
export function selecionarPersona({ categoria, genero = 'feminino', styleCategory = 'clean', ultimasPersonas = [] }) {
  // AUTOR: sempre retorna "no_person"
  if (categoria === 'autor') {
    const noPerson = PERSONA_REGISTRY.find(p => p.id === 'no_person');
    return formatPersona(noPerson, styleCategory);
  }

  // Decidir se usa persona
  const usarPersona = categoria === 'carrossel' ? true : deveUsarPersona(categoria);

  if (!usarPersona) {
    // Escolher entre no_person, object_metaphor, silhouette, hands
    const abstratas = PERSONA_REGISTRY.filter(p => p.isAbstract);
    const escolha = abstratas[Math.floor(Math.random() * abstratas.length)];
    return formatPersona(escolha, styleCategory);
  }

  // Filtrar por gênero
  const generoFiltro = genero.toLowerCase().includes('masc') || genero.toLowerCase().includes('homem')
    ? 'masculino'
    : genero.toLowerCase().includes('universal')
      ? null
      : 'feminino';

  let candidatas = PERSONA_REGISTRY.filter(p => {
    if (p.isAbstract) return false;
    if (!generoFiltro) return true;
    return p.tags.includes(generoFiltro);
  });

  // Anti-repetição: remover última persona usada (exceto carrossel)
  if (categoria !== 'carrossel' && ultimasPersonas.length > 0) {
    const lastUsed = ultimasPersonas[ultimasPersonas.length - 1];
    const filtradas = candidatas.filter(p => p.id !== lastUsed);
    if (filtradas.length > 0) {
      candidatas = filtradas;
      console.log(`   🔄 [PersonaBank] Anti-repetição: bloqueando "${lastUsed}"`);
    }
  }

  // Seleção aleatória
  const escolhida = candidatas[Math.floor(Math.random() * candidatas.length)];
  return formatPersona(escolhida, styleCategory);
}

/**
 * Formata a persona para uso no prompt.
 */
function formatPersona(persona, styleCategory) {
  const clothes = persona.clothing?.[styleCategory] || persona.clothing?.clean || '';
  return {
    id: persona.id,
    isAbstract: !!persona.isAbstract,
    isNoPerson: !!persona.isNoPerson,
    prompt: persona.prompt,
    clothing: clothes,
    genero: persona.genero,
    idade_aparente: persona.idade_aparente,
    cabelo: persona.cabelo,
    roupa_base: clothes,
    fullPrompt: clothes
      ? `Same character across all slides:\n${persona.prompt},\nwearing ${clothes},\nsame face, same hair, same age, same clothing style,\nconsistent identity, no character variation.`
      : persona.prompt,
  };
}

// ── EXPORTS ──────────────────────────────────────────────────────────────────

export { PERSONA_REGISTRY };
export default selecionarPersona;
