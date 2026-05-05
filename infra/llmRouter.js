/**
 * ═══════════════════════════════════════════════════════════
 *  LLM ROUTER — Roteador de Modelos com Fallback Automático
 * ═══════════════════════════════════════════════════════════
 *
 * PRINCÍPIO: Substitui chamadas diretas à API por uma cadeia
 * de fallback inteligente. Reduz custo e aumenta resiliência.
 *
 * Hierarquia de modelos por tipo de tarefa:
 *   análise/classificação → modelo barato (Groq / DeepSeek)
 *   copy / cenas          → modelo médio (OpenRouter default)
 *   refinamento final     → modelo premium (Claude / GPT-4o)
 *
 * INTEGRAÇÃO: Os engines existentes NÃO são alterados.
 * Apenas substitua "runAI()" por "generateWithLLM()" quando
 * quiser roteamento automático por tipo de tarefa.
 */

import dotenv from 'dotenv';
import { logStep } from '../utils/logger.js';

dotenv.config();

// ── Configuração de Provedores ────────────────────────────────────────────────

const PROVIDERS = {
  openrouter: {
    name: 'OpenRouter',
    url: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions',
    key: process.env.OPENROUTER_API_KEY,
    model: process.env.MODEL_TEXT || 'anthropic/claude-sonnet-4-5',
  },
  groq: {
    name: 'Groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    key: process.env.GROQ_API_KEY,
    model: 'llama3-8b-8192',
  },
  deepseek: {
    name: 'DeepSeek',
    url: 'https://api.deepseek.com/v1/chat/completions',
    key: process.env.DEEPSEEK_API_KEY,
    model: 'deepseek-chat',
  },
};

// ── Mapeamento de Tipo de Tarefa → Provedor ───────────────────────────────────

const TASK_ROUTING = {
  analysis:    ['groq', 'deepseek', 'openrouter'],   // barato → fallback caro
  copy:        ['openrouter', 'groq'],                // médio → fallback barato
  refinement:  ['openrouter'],                        // sempre premium
  image_prompt:['openrouter', 'groq'],               // médio
  default:     ['openrouter', 'groq', 'deepseek'],   // cadeia completa
};

// ── Chamada genérica a um provedor ───────────────────────────────────────────

async function callProvider(provider, prompt, systemPrompt = '') {
  const cfg = PROVIDERS[provider];
  if (!cfg || !cfg.key) {
    throw new Error(`[LLMRouter] Provedor "${provider}" não configurado ou sem API key.`);
  }

  const body = {
    model: cfg.model,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
  };

  const response = await fetch(cfg.url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`[LLMRouter] ${cfg.name} retornou ${response.status}: ${err.substring(0, 200)}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── Função principal exportada ────────────────────────────────────────────────

/**
 * generateWithLLM
 *
 * Executa o prompt com fallback automático entre provedores.
 *
 * @param {object} options
 * @param {string} options.prompt       - Prompt do usuário
 * @param {string} [options.systemPrompt] - System prompt opcional
 * @param {string} [options.type]       - Tipo de tarefa: 'analysis' | 'copy' | 'refinement' | 'image_prompt' | 'default'
 * @returns {Promise<string>}           - Resposta em texto do modelo
 */
export async function generateWithLLM({ prompt, systemPrompt = '', type = 'default' }) {
  const chain = TASK_ROUTING[type] || TASK_ROUTING.default;
  let lastError = null;

  for (const provider of chain) {
    try {
      const startTime = Date.now();
      const result = await callProvider(provider, prompt, systemPrompt);
      const elapsed = Date.now() - startTime;

      logStep('llmRouter', {
        provider,
        type,
        elapsed_ms: elapsed,
        tokens_approx: Math.round(prompt.length / 4),
        status: 'success',
      });

      return result;

    } catch (err) {
      lastError = err;
      console.warn(`[LLMRouter] ⚠️  Fallback: ${PROVIDERS[provider]?.name || provider} falhou → ${err.message.substring(0, 100)}`);

      logStep('llmRouter_fallback', {
        provider,
        type,
        error: err.message.substring(0, 200),
      });
    }
  }

  throw new Error(`[LLMRouter] Todos os provedores falharam para tipo "${type}". Último erro: ${lastError?.message}`);
}

/**
 * Retorna o nome do modelo ativo para um dado tipo de tarefa.
 * Útil para logs e auditoria.
 */
export function getActiveModel(type = 'default') {
  const chain = TASK_ROUTING[type] || TASK_ROUTING.default;
  const primary = chain[0];
  return PROVIDERS[primary]?.model || 'unknown';
}

export default generateWithLLM;
