/**
 * ============================================================
 * 🔥 GROWTH ENGINE (v1.0) — Core de Crescimento Orgânico
 * ============================================================
 * Simula decisões de um social media + gestor de tráfego.
 * Decide AUTOMATICAMENTE:
 *   - Modo (cotidiano vs estratégico)
 *   - Objetivo de crescimento
 *   - Formato de distribuição
 *   - Tipo de post (célula de crescimento)
 * ============================================================
 */

// ── UTILIDADES ───────────────────────────────────────────────────────────────

/**
 * Seleção por roleta ponderada (weighted random).
 * @param {Object} weights — { chave: peso, ... }
 * @returns {string} — chave selecionada
 */
function weightedRandom(weights) {
  const entries = Object.entries(weights);
  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * totalWeight;

  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return key;
  }

  // Fallback (não deve chegar aqui)
  return entries[0][0];
}

/**
 * Escolha aleatória simples de um array.
 */
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── DECISÃO DE MODO ──────────────────────────────────────────────────────────
// Cotidiano (70%): conteúdo leve, diário, acessível, scroll-stopper casual.
// Estratégico (30%): conteúdo profundo, autoridade, conversão, arcos completos.

function decidirModo() {
  return Math.random() < 0.7 ? "cotidiano" : "estrategico";
}

// ── DECISÃO DE OBJETIVO ──────────────────────────────────────────────────────
// Pesos calibrados para crescimento orgânico real:
//   engajamento (30%)     — comentários, reações, salvamentos leves
//   salvamento (25%)      — conteúdo de alto valor percebido
//   compartilhamento (20%) — viralização orgânica
//   autoridade (15%)      — posicionamento de especialista
//   conversao (10%)       — chamada direta para ação (WhatsApp, etc)

function decidirObjetivo() {
  return weightedRandom({
    engajamento:      0.30,
    salvamento:       0.25,
    compartilhamento: 0.20,
    autoridade:       0.15,
    conversao:        0.10,
  });
}

// ── DECISÃO DE FORMATO ───────────────────────────────────────────────────────
// Feed (1080x1440): Formato único — 3:4 padrão Instagram.
// A imagem base do DALL-E é 1024x1024 e só renderiza bem nesta proporção.

function decidirFormato() {
  return "feed";
}

// ── TIPOS DE POST (CÉLULAS DE CRESCIMENTO) ───────────────────────────────────
// Cada objetivo tem tipos de post especializados que maximizam a métrica alvo.

const MAPA_TIPO_POST = {
  engajamento: [
    "pergunta",         // Ex: "Você está cansada... ou só sobrecarregada?"
    "frase_curta",      // Ex: "Você não está atrasada. Está se curando."
    "observacao",       // Ex: "Nem tudo que parece preguiça é falta de força."
  ],

  salvamento: [
    "insight",          // Ex: "A ansiedade não é o problema. É o sintoma."
    "checklist",        // Ex: "3 sinais de que você está se sabotando"
    "mini_guia",        // Ex: "Como parar de se cobrar tanto: guia rápido"
  ],

  compartilhamento: [
    "verdade_dura",     // Ex: "Você se abandona para não ser abandonada."
    "quebra_padrao",    // Ex: "A ansiedade não é fraqueza. É sua mente tentando te proteger."
  ],

  autoridade: [
    "explicacao",       // Ex: "O que ninguém te conta sobre o Complexo de Édipo"
    "educacional",      // Ex: "Psicanálise na prática: por que você repete padrões"
  ],

  conversao: [
    "dor_solucao",      // Ex: "Esse padrão tem um nome. E tem solução."
    "convite",          // Ex: "Me chama no WhatsApp com a palavra LIBERDADE."
  ],
};

function decidirTipoPost(objetivo) {
  const opcoes = MAPA_TIPO_POST[objetivo] || MAPA_TIPO_POST.engajamento;
  return randomPick(opcoes);
}

// ── GROWTH ENGINE (CORE) ─────────────────────────────────────────────────────

/**
 * Decide automaticamente a estratégia de crescimento para o próximo post.
 * @param {Object} context — contexto de entrada (tema, autor, etc.)
 * @returns {Object} — { modo, objetivo, formato, tipoPost }
 */
export function growthEngine(context = {}) {
  const modo     = decidirModo();
  const objetivo = decidirObjetivo();
  const formato  = decidirFormato();
  const tipoPost = decidirTipoPost(objetivo);

  console.log(`\n🚀 [GrowthEngine] Decisão de Crescimento:`);
  console.log(`   📌 Modo       : ${modo.toUpperCase()}`);
  console.log(`   🎯 Objetivo   : ${objetivo}`);
  console.log(`   📐 Formato    : ${formato}`);
  console.log(`   📝 Tipo Post  : ${tipoPost}`);

  return {
    modo,
    objetivo,
    formato,
    tipoPost,
  };
}

// ── EXPORTS ──────────────────────────────────────────────────────────────────

export {
  weightedRandom,
  randomPick,
  decidirModo,
  decidirObjetivo,
  decidirFormato,
  decidirTipoPost,
  MAPA_TIPO_POST,
};

export default growthEngine;
