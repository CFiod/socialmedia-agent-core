import { callModel } from '../utils/callModel.js';

// ── Pré-classificação por keywords (evita chamada de API em casos óbvios) ────
const KEYWORD_MAP = {
  COPY: [
    'carrossel', 'carousel', 'slide', 'copy', 'headline', 'gancho',
    'hook', 'cta', 'persuasão', 'persuasivo', 'vendas', 'conversão',
    'instagram', 'post', 'legenda', 'caption', 'texto_principal',
    'texto_secundario', 'gatilho', 'emocional', 'marketing', 'ads',
    'campanha', 'criativo', 'anúncio', 'psicanálise', 'psicanalise',
    'conteúdo', 'conteudo',
  ],
  ANALYSIS: ['analise', 'análise', 'score', 'pontuação', 'avaliar', 'ranking', 'comparar', 'métricas'],
  STRUCTURE: ['json', 'estrutura', 'schema', 'classificar', 'categorizar', 'mapear'],
};

function preClassify(prompt) {
  const lower = prompt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let bestMatch = null;
  let bestScore = 0;

  for (const [intent, keywords] of Object.entries(KEYWORD_MAP)) {
    const score = keywords.filter(kw => lower.includes(kw.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = intent;
    }
  }

  // Se 2+ keywords bateram, confiamos na pré-classificação
  if (bestScore >= 2) return bestMatch;
  return null; // incerto → manda pro LLM
}

// ── Classificação via LLM (para casos ambíguos) ─────────────────────────────
export async function classifyIntent(prompt) {
  // 1. Tenta pré-classificar sem gastar API
  const preResult = preClassify(prompt);
  if (preResult) {
    console.log(`   🏷️ [Intent AI] Pré-classificado por keywords: ${preResult}`);
    return preResult;
  }

  // 2. Classificação via LLM para casos ambíguos
  const systemPrompt = `Você é um classificador de intenção de prompts. Classifique o prompt em UMA das categorias abaixo.

CATEGORIAS:
- COPY → Criação de textos persuasivos, carrosséis, posts, legendas, headlines, gatilhos emocionais, conteúdo para redes sociais, marketing, campanhas, anúncios.
  Exemplos: "Crie um carrossel sobre ansiedade", "Escreva uma copy para Instagram", "Gere 5 slides sobre autoconhecimento"
- ANALYSIS → Análise de dados, scoring, avaliação crítica, comparação de resultados, métricas.
  Exemplos: "Analise a performance desse post", "Qual copy teve mais engajamento?"
- STRUCTURE → Geração de JSON estruturado, classificação categórica, mapeamento de dados sem copy criativa.
  Exemplos: "Classifique esse conteúdo em categorias", "Gere o schema JSON para..."
- FAST → Perguntas simples, respostas curtas, tarefas triviais que não envolvem criação nem análise.
  Exemplos: "Qual a capital da França?", "Resuma isso em 1 frase"

REGRA: Se o prompt pede CRIAÇÃO DE CONTEÚDO de qualquer tipo, a resposta é COPY.

Responda APENAS com o tipo em MAIÚSCULAS. Nada mais.`;

  try {
    const result = await callModel('deepseek-chat', prompt, systemPrompt);
    const intent = result.trim().toUpperCase().replace(/[^A-Z]/g, '');
    if (['COPY', 'ANALYSIS', 'STRUCTURE', 'FAST'].includes(intent)) {
      return intent;
    }
    return 'COPY'; // default conservador para criação de conteúdo
  } catch (err) {
    console.warn('⚠️ Falha no Intent AI, usando fallback COPY:', err.message);
    return 'COPY';
  }
}
