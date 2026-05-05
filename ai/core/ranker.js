import { callModel } from '../utils/callModel.js';

export async function rankResponses(responses, prompt) {
  if (responses.length === 1) return responses[0];
  
  const systemPrompt = `Você é um avaliador de IA crítico e experiente.
Seu trabalho é escolher a MELHOR resposta para o prompt do usuário, focando no objetivo principal.

Responda APENAS com o número da melhor resposta (ex: 0, 1, 2).`;

  const userPrompt = `Objetivo do Usuário:
${prompt}

Respostas:
${responses.map((r, i) => `[OPÇÃO ${i}]\n${r}`).join('\n\n')}

Qual a melhor opção? Responda só com o número.`;

  try {
    const result = await callModel('deepseek-chat', userPrompt, systemPrompt);
    const num = parseInt(result.trim().replace(/\D/g, ''), 10);
    
    if (!isNaN(num) && num >= 0 && num < responses.length) {
      console.log(`🏆 [Ranker] Opção ${num} selecionada como a melhor.`);
      return responses[num];
    }
    return responses[0]; // fallback
  } catch (err) {
    console.warn('⚠️ Falha no Ranker, usando fallback:', err.message);
    return responses[0];
  }
}
