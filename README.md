# SocialMedia Agent 🎬

> Pipeline de geração automática de conteúdo editorial para Instagram — carrosséis, Reels e Stories com IA.

---

## Visão Geral

O **SocialMedia Agent** é um sistema de produção de conteúdo social media orientado a narrativa cinematográfica. Ele combina:

- **LLM Cascade Router** — seleciona automaticamente o melhor modelo de texto disponível (Claude → Gemini → Groq → DeepSeek → GPT-4o)
- **Scene Engine** — mapeia emoções e conflitos em diretrizes visuais concretas por slide
- **Prompt Builder V3** — gera prompts de imagem com composição layout-aware (safe zones, face detection)
- **Cloudinary Upload** — converte paths locais em URLs públicas para a Meta API
- **Scoring & Memory** — avalia e memoriza os melhores resultados para iteração contínua

---

## Pré-requisitos

- **Node.js** ≥ 18
- Pelo menos **uma** chave de API de LLM (veja `.env.example`)

---

## Instalação

```bash
git clone https://github.com/seu-usuario/SocialMedia_Agent.git
cd SocialMedia_Agent
npm install
cp .env.example .env
# Preencha as chaves no .env
```

---

## Uso

### Execução Principal (CLI)

```bash
node index.js
```

### Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm start` | Executa o pipeline completo |
| `npm run dev` | Executa com logs detalhados |
| `npm run lint` | Verifica estilo de código |
| `npm test` | Executa testes unitários |

---

## Estrutura do Projeto

```
SocialMedia_Agent/
│
├── index.js                    ← Ponto de entrada principal (CLI)
│
├── engines/                    ← Motores de geração
│   ├── prompt/
│   │   ├── buildPrompt.js      ← Prompt Builder V3 (layout-aware)
│   │   └── scene/
│   │       ├── sceneEngine.js  ← Motor de cenas cinematográficas
│   │       ├── emotionMap.js
│   │       └── intentResolver.js
│   └── attention/
│       └── renderEngine.js     ← Renderização tipográfica (canvas)
│
├── services/                   ← Serviços de integração
│   ├── contentService.js       ← Orquestrador de conteúdo
│   ├── imageService.js         ← Geração de imagens (Flux / DALL-E)
│   ├── cloudinary.js           ← Upload para URL pública
│   ├── generationService.js    ← Serviço de geração
│   └── memoryService.js        ← Persistência e aprendizado
│
├── core/                       ← Núcleo do sistema
│   ├── orchestrator.js         ← Orquestrador principal
│   ├── pipeline.js             ← Pipeline de execução
│   └── scoringEngine.js        ← Avaliação de qualidade
│
├── ai/                         ← Configuração de IA
│   ├── config/models.js        ← Mapa de modelos e roles
│   └── core/                   ← Agentes de IA
│
├── src/                        ← Camada SaaS (novos pontos de entrada)
│   ├── core/sceneEngine.js     ← Re-export do motor de cenas
│   ├── services/promptBuilder.js ← Re-export do prompt builder
│   └── pipeline/llmRouter.js  ← Router de LLM com cascata
│
├── assets/                     ← Logos, fontes e recursos visuais
├── output/                     ← Imagens e JSONs gerados
├── memory/                     ← Histórico persistido
│
├── .env.example                ← Template de variáveis de ambiente
└── package.json
```

---

## Configuração de Modelos

O sistema usa cascata automática por role. Edite `ai/config/models.js` para personalizar:

| Role | Padrão | Uso |
|---|---|---|
| `COPY` | Claude Sonnet 4.5 | Geração de copy emocional |
| `ANALYSIS` | DeepSeek Chat | Análise semântica |
| `STRUCTURE` | GPT-4o-mini | Estruturação de JSON |
| `FAST` | Groq Llama 3 | Respostas rápidas |
| `VISION` | Gemini Flash | Análise de imagens |
| `IMAGE` | Flux | Geração de imagens |

---

## Variáveis de Ambiente

Veja o arquivo [`.env.example`](.env.example) para a lista completa. As principais:

```bash
OPENROUTER_API_KEY=   # Acesso multi-modelo
GOOGLE_API_KEY=       # Gemini
GROQ_API_KEY=         # Groq Llama (rápido)
OPENAI_API_KEY=       # GPT + DALL-E
MODEL_TEXT=anthropic/claude-sonnet-4-5
MODEL_IMAGE=flux
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
LLM_MODE=balanced     # cheap | balanced | premium
```

> ⚠️ **Nunca** suba o arquivo `.env` para o repositório. Ele já está no `.gitignore`.

---

## Fluxo de Geração

```
node index.js
     │
     ▼
orchestrator.js  ──►  contentService.js  (estratégia + copy)
     │                      │
     │                 llmRouter.js  (seleciona modelo)
     │
     ▼
imageService.js  ──►  buildPromptV3()  ──►  sceneEngine.js
     │
     ▼
renderEngine.js  (tipografia + layout canvas)
     │
     ▼
cloudinary.js    (upload → URL pública)
     │
     ▼
data.json / output/
```

---

## Contribuindo

1. Fork o repositório
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Commit: `git commit -m 'feat: minha feature'`
4. Push: `git push origin feature/minha-feature`
5. Abra um Pull Request

---

## Licença

MIT © 2026
