import { callModel } from '../utils/callModel.js';
import { AGENTS } from '../config/models.js';

export async function refine(bestResponse, prompt) {
  console.log('✨ [Refiner] Lapidando a resposta final...');
  const systemPrompt = `Você é um editor sênior. 
Pegue a resposta abaixo e melhore: deixe-a mais persuasiva, clara e com impacto, mas preserve o formato original (JSON, se aplicável).`;

  const userPrompt = `Objetivo Original:
${prompt}

Resposta Atual:
${bestResponse}`;

  try {
    return await callModel(AGENTS.COPY.primary, userPrompt, systemPrompt);
  } catch (err) {
    console.warn('⚠️ Falha no Refiner, usando original:', err.message);
    return bestResponse;
  }
}
