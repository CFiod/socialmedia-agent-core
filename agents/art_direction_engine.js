import { callModel } from '../ai/utils/callModel.js';
import { config } from '../config/config.js';

/**
 * ============================================================
 * 🎬 ART DIRECTION ENGINE (ADE) — Visual Strategy Agent
 * ============================================================
 * Transforma a psicologia/copy em uma direção de arte visual estruturada.
 * Implementa STAGE 1 a STAGE 3 descritos na Instrucao.txt.
 * Retorna um JSON determinístico para guiar a geração de prompts.
 * ============================================================
 */

export async function artDirectionEngine({ copy, estrategia, modo, category }) {
  const headline = copy?.headline || copy?.texto_principal || copy || '';
  const subtexto = copy?.subtexto || copy?.descricao || '';
  
  const systemPrompt = `Você é um Diretor de Arte de elite para conteúdo premium de Instagram.
Sua missão não é "ilustrar" literalmente o texto, mas sim criar uma IMAGEM QUE CAUSE A MESMA EMOÇÃO DO TEXTO (Metáfora Visual e Narrativa Visual).

REGRAS DA DIREÇÃO VISUAL:
1. NUNCA gere uma cena genérica ("mulher olhando para o nada" ou "rosto em close").
2. A emoção dita a cena. (ex: ansiedade -> múltiplas sombras, caos; solidão -> grandes espaços vazios; procrastinação -> relógio derretendo).
3. O ambiente DEVE contar a história. A pessoa (se houver) é apenas parte do cenário e NUNCA deve dominar o frame.
4. Fuja de clichés (selfies, "beautiful woman", sorrisos falsos, close-ups de rosto, banco de imagem).
5. Crie tensões visuais, uso estratégico de luz/sombra e profundidade (cinematografia).
6. ⚠️ CRITICAL: The values for 'ambiente' and 'symbol_mapping' MUST be written 100% in ENGLISH! They are sent to an Image AI. No Portuguese words allowed in these two fields.

Sua saída DEVE SER APENAS um JSON válido e estrito com a seguinte estrutura, sem formatação markdown extra:
{
  "visual_intent": {
    "emocao": "A emoção central do texto",
    "representacao": "Como isso se traduz visualmente (ex: perda de controle, peso, confinamento)",
    "energia": "caótica | densa | calma | opressiva | libertadora"
  },
  "scene_construction": {
    "tipo_cena": "cinematografica | minimalista | ambiente_vazio | objeto_simbolico | metafora",
    "ambiente": "Descrição hiper-detalhada do local da cena",
    "elementos": ["elemento focal", "detalhe do ambiente 1", "detalhe do ambiente 2"]
  },
  "symbol_mapping": "Metáfora visual exata que traduz a emoção (ex: homem afundando em areia, cadeira vazia sob luz fria)",
  "composition_guidance": "Wide shot, off-center, negative space dominant, etc",
  "negative_constraints": ["close-up face", "portrait", "generic woman", "selfie", "centralized subject", "plain background", "stock photo"]
}`;

  const userPrompt = `Analise a seguinte cópia e estratégia e crie a direção de arte estruturada:

[COPY]
Headline/Texto Principal: "${headline}"
Subtexto: "${subtexto}"

[ESTRATÉGIA]
Emoção Principal: ${estrategia?.emocao_principal || estrategia?.emocao || 'Introspecção'}
Dor/Problema: ${estrategia?.dor || 'Desconhecida'}
Categoria/Modo: ${category || modo || 'post'}

Gere o JSON de Direção de Arte Visual agora:`;

  try {
    console.log(`   🧠 [ArtDirectionEngine] Analisando direção visual para: "${headline.substring(0, 40)}..."`);
    // Usa o modelo configurado no projeto (ex: claude-sonnet-4-5)
    const modelId = config.MODEL_TEXT || 'gemini-2.0-flash'; 
    const rawOutput = await callModel(modelId, userPrompt, systemPrompt);
    
    // Limpeza rigorosa do JSON
    const cleanJsonStr = rawOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
    const artDirection = JSON.parse(cleanJsonStr);
    
    // Adiciona restrições negativas obrigatórias caso o modelo tenha esquecido
    const mandatoryNegatives = ["close-up face", "portrait", "generic woman", "selfie", "centralized subject"];
    if (!artDirection.negative_constraints) artDirection.negative_constraints = [];
    mandatoryNegatives.forEach(neg => {
      if (!artDirection.negative_constraints.includes(neg)) {
        artDirection.negative_constraints.push(neg);
      }
    });

    console.log(`   🎬 [ArtDirectionEngine] Direção definida: Cena ${artDirection.scene_construction.tipo_cena} | Metáfora: ${artDirection.symbol_mapping}`);
    return artDirection;
  } catch (error) {
    console.error("   ⚠️ [ArtDirectionEngine] Falha ao gerar direção com LLM, usando fallback.", error.message);
    // Fallback estruturado de alta qualidade para não quebrar o pipeline
    return {
      visual_intent: {
        emocao: estrategia?.emocao_principal || "reflexão",
        representacao: "cena editorial neutra",
        energia: "calma"
      },
      scene_construction: {
        tipo_cena: "minimalista",
        ambiente: "wide editorial space, clean background, minimal aesthetic",
        elementos: ["soft window light", "expansive negative space"]
      },
      symbol_mapping: "soft lighting representing clarity",
      composition_guidance: "Wide shot, off-center, negative space dominant",
      negative_constraints: ["close-up face", "portrait", "generic woman", "selfie", "centralized subject", "plain background", "stock photo"]
    };
  }
}

export default artDirectionEngine;
