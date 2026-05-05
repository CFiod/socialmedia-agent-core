/**
 * ============================================================
 * 🧾 CAPTION ENGINE (v1.0) — Motor de Legenda + CTA
 * ============================================================
 * Gera legendas inteligentes com base no objetivo do post.
 *
 * Cada objetivo tem um banco de captions e CTAs calibrados
 * para maximizar a métrica alvo:
 *   engajamento      → perguntas, convites a comentar
 *   salvamento       → "salva isso", conteúdo de valor
 *   compartilhamento → "manda pra alguém", viralização
 *   autoridade       → posicionamento de especialista
 *   conversao        → WhatsApp direto, CTA forte
 * ============================================================
 */

import { randomPick } from './growth_engine.js';

// ── BANCO DE CAPTIONS POR OBJETIVO ──────────────────────────────────────────

const CAPTIONS = {

  engajamento: [
    {
      texto: "Isso fez sentido pra você?\n\nComenta aqui. 👇",
      cta: "comentar",
    },
    {
      texto: "Se você se identificou, deixa um ❤️ que eu sei que chegou em você.",
      cta: "reagir",
    },
    {
      texto: "Marca alguém que precisa ler isso hoje.\n\nÀs vezes a gente não sabe que precisa ouvir certas coisas.",
      cta: "marcar",
    },
    {
      texto: "Já sentiu isso?\n\nMe conta nos comentários. Eu leio cada um. 💬",
      cta: "comentar",
    },
    {
      texto: "Escreve 'EU' nos comentários se isso te tocou.\n\nVocê não está sozinha. 🤍",
      cta: "comentar",
    },
    {
      texto: "O que isso te fez sentir?\n\nComenta com uma palavra. Só uma. 👇",
      cta: "comentar",
    },
  ],

  salvamento: [
    {
      texto: "Salva isso pra lembrar depois.\n\nNem tudo que você precisa ouvir vai aparecer de novo no feed. 🔖",
      cta: "salvar",
    },
    {
      texto: "Esse conteúdo não é pra curtir e passar.\n\nÉ pra salvar, reler e deixar fazer efeito. 📌",
      cta: "salvar",
    },
    {
      texto: "Salva esse post.\n\nQuando o dia pesar, volta aqui e relê com calma. 🤍",
      cta: "salvar",
    },
    {
      texto: "Conteúdo que vale mais relido do que curtido.\n\nSalva pra quando precisar. 🔖",
      cta: "salvar",
    },
    {
      texto: "Guarda isso com carinho.\n\nVocê vai precisar reler num dia difícil. 📌",
      cta: "salvar",
    },
  ],

  compartilhamento: [
    {
      texto: "Alguém precisa ler isso hoje.\n\nManda esse post pra quem veio na sua mente agora. 💌",
      cta: "compartilhar",
    },
    {
      texto: "Se isso te tocou, imagina quem tá passando por isso agora sem entender.\n\nCompartilha. 🤍",
      cta: "compartilhar",
    },
    {
      texto: "Manda pra aquela pessoa que sempre diz 'tô bem' mas você sabe que não tá.\n\nÀs vezes o cuidado chega assim. 💬",
      cta: "compartilhar",
    },
    {
      texto: "Não guarda só pra você.\n\nAlguém no seu círculo precisa ler exatamente isso. Compartilha. 🫶",
      cta: "compartilhar",
    },
  ],

  autoridade: [
    {
      texto: "Psicanálise não é teoria.\n\nÉ ferramenta de transformação real.\n\nSe esse conteúdo te abriu os olhos, segue pra mais. 🧠",
      cta: "seguir",
    },
    {
      texto: "Entender a mente é o primeiro passo.\n\nAqui você encontra conteúdo que te ajuda a se decifrar.\n\nSegue pra não perder. 🔔",
      cta: "seguir",
    },
    {
      texto: "Conhecimento que liberta.\n\nNão é autoajuda — é ciência da mente aplicada à vida real.\n\nSegue e ativa o 🔔.",
      cta: "seguir",
    },
    {
      texto: "Aqui eu traduzo psicanálise pra linguagem humana.\n\nSem textão acadêmico. Só verdade que faz sentido.\n\nSegue e acompanha. 🧠",
      cta: "seguir",
    },
  ],

  conversao: [
    {
      texto: "Me chama no WhatsApp com a palavra LIBERDADE.\n\nEu vou te explicar o que está por trás do que você sente — sem julgamento, sem pressa. 💬",
      cta: "whatsapp",
    },
    {
      texto: "Esse padrão tem solução.\n\nClica no WhatsApp e vamos começar a desmontar isso hoje. ✊",
      cta: "whatsapp",
    },
    {
      texto: "Você não precisa continuar assim.\n\nDá pra mudar. O primeiro passo é me chamar no WhatsApp agora. 📲",
      cta: "whatsapp",
    },
    {
      texto: "Continuar repetindo essa dor é uma escolha.\n\nClica no WhatsApp, eu te ajudo a sair disso. 🤍",
      cta: "whatsapp",
    },
    {
      texto: "A solução começa quando você entende a raiz.\n\nClica no botão do WhatsApp e comece agora. ✨",
      cta: "whatsapp",
    },
  ],
};

// ── HASHTAGS POR OBJETIVO ────────────────────────────────────────────────────

const HASHTAGS = {
  engajamento: [
    "#saudemental", "#autoconhecimento", "#bemestar", "#mente",
    "#ansiedade", "#emocional", "#psicanalise", "#terapia",
    "#cansaçoemocional", "#equilibrioemocional",
  ],

  salvamento: [
    "#psicanalise", "#saudemental", "#autoconhecimento",
    "#dicasdeterapia", "#bemestaremocional", "#mindset",
    "#terapiaemocional", "#crescimentopessoal",
  ],

  compartilhamento: [
    "#saudemental", "#ansiedade", "#bemestar", "#emocional",
    "#forçamental", "#vocenaoestasozinh", "#terapia",
    "#compartilhe", "#ajudemocional",
  ],

  autoridade: [
    "#psicanalise", "#psicanaliseclinica", "#psicologia",
    "#terapia", "#saudemental", "#inconsciente",
    "#autoconhecimento", "#mente", "#cienciadamente",
  ],

  conversao: [
    "#psicanalise", "#terapiaonline", "#terapia",
    "#saudemental", "#autoconhecimento", "#psicologia",
    "#mudançadevida", "#transformação",
  ],
};

// ── ENGINE PRINCIPAL ─────────────────────────────────────────────────────────

/**
 * Gera a legenda completa (texto + hashtags) com base no objetivo.
 * @param {Object} params — { objetivo, tipoPost, headline }
 * @returns {Object} — { texto, hashtags, cta }
 */
export function gerarCaption({ objetivo, tipoPost, headline }) {
  const banco = CAPTIONS[objetivo] || CAPTIONS.engajamento;
  const captionObj = randomPick(banco);

  const hashtags = HASHTAGS[objetivo] || HASHTAGS.engajamento;
  // Selecionar 8-12 hashtags aleatórias do banco
  const hashtagsSelecionadas = [...hashtags]
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.floor(Math.random() * 5) + 8);

  const resultado = {
    texto: captionObj.texto,
    hashtags: hashtagsSelecionadas,
    cta: captionObj.cta,
    textoCompleto: `${captionObj.texto}\n\n.\n.\n.\n\n${hashtagsSelecionadas.join(" ")}`,
  };

  console.log(`   🧾 Caption    : objetivo=${objetivo} → CTA: ${captionObj.cta}`);

  return resultado;
}

// ── EXPORTS ──────────────────────────────────────────────────────────────────

export { CAPTIONS, HASHTAGS };
export default gerarCaption;
