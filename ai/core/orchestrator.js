import { classifyIntent } from './intent.js';
import { createPlan } from './planner.js';
import { callModel } from '../utils/callModel.js';
import { rankResponses } from './ranker.js';
import { refine } from './refiner.js';
import { saveInteraction } from './memory.js';

async function runParallel(models, prompt, systemPrompt) {
  console.log(`🚀 [Executor Paralelo] Iniciando modelos: ${models.join(', ')}`);
  
  const promises = models.map(async (model) => {
    try {
      return await callModel(model, prompt, systemPrompt);
    } catch (err) {
      console.warn(`⚠️ Erro no modelo ${model}:`, err.message);
      return null;
    }
  });

  const results = await Promise.all(promises);
  return results.filter(r => r !== null && r !== '');
}

export async function runAI(prompt, systemPrompt = '') {
  console.log('\n🧠 [AI Orchestrator] Processando request...');
  
  // 1. Classifica a Intenção
  const intent = await classifyIntent(prompt);
  console.log(`🎯 [Intent AI] Intenção detectada: ${intent}`);

  // 2. Cria o Plano de Execução
  const plan = createPlan(intent);
  console.log(`📋 [Planner] Estratégia: ${plan.strategy} | Modelos: ${plan.models.join(', ')}`);

  let responses;
  const start = Date.now();

  // 3. Executa Modelos
  if (plan.strategy.includes('parallel')) {
    responses = await runParallel(plan.models, prompt, systemPrompt);
  } else {
    try {
      const response = await callModel(plan.models[0], prompt, systemPrompt);
      responses = [response];
    } catch (err) {
      // Fallback
      console.log(`🔄 Fallback para outro modelo...`);
      const fallback = await callModel('openai/gpt-4o-mini', prompt, systemPrompt);
      responses = [fallback];
    }
  }

  if (!responses || responses.length === 0) {
    throw new Error('Todos os modelos falharam na execução.');
  }

  // 4. Rankeia as Respostas
  let bestResponse;
  if (responses.length > 1 && plan.strategy.includes('rank')) {
    bestResponse = await rankResponses(responses, prompt);
  } else {
    bestResponse = responses[0];
  }

  // 5. Refina (se necessário)
  let finalResponse = bestResponse;
  if (plan.strategy.includes('refine')) {
    finalResponse = await refine(bestResponse, prompt);
  }

  const duration = Date.now() - start;
  
  // 6. Salva na Memória
  saveInteraction(prompt, finalResponse, {
    intent,
    strategy: plan.strategy,
    durationMs: duration,
    models: plan.models
  });

  console.log(`✅ [AI Orchestrator] Concluído em ${duration}ms.\n`);
  return finalResponse;
}
