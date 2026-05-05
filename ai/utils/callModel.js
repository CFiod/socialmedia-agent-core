import { config } from '../../config/config.js';

// ── Helper: extrai texto de respostas OpenAI-like ────────────────────────────
function extractOpenAIText(data, modelId) {
  if (data.error) {
    throw new Error(`API Error (${modelId}): ${data.error.message || JSON.stringify(data.error)}`);
  }
  if (!data.choices || !data.choices[0]) {
    throw new Error(`Resposta vazia de ${modelId}: ${JSON.stringify(data).substring(0, 200)}`);
  }
  return data.choices[0].message?.content || '';
}

// ── Helper: detecta qual provider usar baseado no modelId ────────────────────
function resolveProvider(modelId) {
  // Gemini direto (prioridade sobre OpenRouter para economizar créditos)
  if (modelId.includes('gemini')) return 'google';
  // Groq direto
  if (modelId.includes('llama') || modelId.includes('groq/')) return 'groq';
  // OpenRouter models (providers externos via OpenRouter)
  if (modelId.includes('anthropic/') || modelId.includes('openai/') || modelId.includes('meta/')) {
    return 'openrouter';
  }
  if (modelId === 'deepseek-chat' || modelId.includes('deepseek')) return 'deepseek';
  if (modelId.includes('gpt-')) return 'openai';
  return 'openrouter'; // default: tenta via OpenRouter
}

export async function callModel(modelId, prompt, systemPrompt = '') {
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const provider = resolveProvider(modelId);

  try {
    let data;

    switch (provider) {
      case 'openrouter': {
        if (!config.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY não configurada');
        const res = await fetch(config.OPENROUTER_BASE_URL + '/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + config.OPENROUTER_API_KEY,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://socialmedia-agent.local',
            'X-Title': 'SocialMedia Agent',
          },
          body: JSON.stringify({ model: modelId, messages, temperature: 0.7 }),
        });
        data = await res.json();
        return extractOpenAIText(data, modelId);
      }

      case 'google': {
        if (!config.GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY não configurada');
        const fullPrompt = (systemPrompt ? systemPrompt + '\n\n' : '') + prompt;
        const res = await fetch(
          'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=' + config.GOOGLE_API_KEY,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] }),
          }
        );
        data = await res.json();
        if (data.error) throw new Error(`Google API Error: ${data.error.message}`);
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!text) throw new Error('Resposta vazia do Gemini');
        return text;
      }

      case 'groq': {
        if (!config.GROQ_API_KEY) throw new Error('GROQ_API_KEY não configurada');
        const groqModel = modelId.replace('groq/', '');
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + config.GROQ_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: groqModel.includes('llama') ? 'llama-3.3-70b-versatile' : groqModel, messages }),
        });
        data = await res.json();
        return extractOpenAIText(data, modelId);
      }

      case 'deepseek': {
        if (!config.DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY não configurada');
        const res = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + config.DEEPSEEK_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'deepseek-chat', messages }),
        });
        data = await res.json();
        return extractOpenAIText(data, modelId);
      }

      case 'openai': {
        if (!config.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY não configurada');
        const oaiModel = modelId.replace('openai/', '');
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + config.OPENAI_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: oaiModel, messages }),
        });
        data = await res.json();
        return extractOpenAIText(data, modelId);
      }

      default:
        throw new Error('Provider não suportado para modelo: ' + modelId);
    }
  } catch (error) {
    console.warn(`⚠️ callModel(${modelId}) falhou:`, error.message);
    throw error;
  }
}
