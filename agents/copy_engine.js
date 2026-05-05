/**
 * ============================================================
 * ✍️ COPY ENGINE V2 — Emotion-Driven Text Generator
 * ============================================================
 * Upgrade do copy_engine:
 * - Copy baseada no estado emocional (Scene Engine V2)
 * - Emotion-specific tone e vocabulário
 * - Templates organizados por emoção + tipo de post
 * - Fallback para V1 quando sem estado emocional
 * ============================================================
 */

import { randomPick } from './growth_engine.js';

// ── EMOTION-DRIVEN COPY TEMPLATES ────────────────────────────────────────────
// Copy adaptada à emoção específica do slide (Scene Engine V2)

const COPY_POR_EMOCAO = {
  curiosidade: [
    { headline: "Você já parou pra pensar nisso?", subtexto: "Talvez a resposta te surpreenda." },
    { headline: "Por que isso acontece com você?", subtexto: "A explicação não é a que você imagina." },
    { headline: "Algo que ninguém te contou", subtexto: "E que muda tudo quando você descobre." },
    { headline: "Tem algo que você precisa saber", subtexto: "E vai mudar sua perspectiva sobre si mesma." },
    { headline: "Isso não é coincidência", subtexto: "É um padrão. E tem nome." },
  ],

  identificacao: [
    { headline: "Você sente isso e não sabe explicar", subtexto: "Mas quando alguém descreve, parece que estão falando de você." },
    { headline: "Você não está sozinha nisso", subtexto: "Mais gente sente isso do que você imagina." },
    { headline: "Se você se reconhece aqui", subtexto: "É porque essa dor é mais comum do que parece." },
    { headline: "Eu sei como é", subtexto: "Carregar algo que ninguém vê. Mas eu vejo." },
    { headline: "Você já se sentiu assim?", subtexto: "Presente no corpo, ausente na vida." },
  ],

  ansiedade: [
    { headline: "Você sente isso e não sabe explicar...", subtexto: "Aquele aperto no peito que vem sem aviso." },
    { headline: "Quando a mente não para", subtexto: "E o corpo pede trégua, mas ninguém escuta." },
    { headline: "É mais do que estresse", subtexto: "É seu corpo gritando o que a mente cala." },
    { headline: "Aquela sensação constante", subtexto: "De que algo vai dar errado — mesmo quando tudo está 'bem'." },
    { headline: "A ansiedade não é fraqueza", subtexto: "É sua mente tentando te proteger... do jeito errado." },
  ],

  tensao: [
    { headline: "Chegou a hora de encarar", subtexto: "O que você evita olhar é o que mais precisa ser visto." },
    { headline: "Não dá mais pra ignorar", subtexto: "O peso que você carrega tem um nome." },
    { headline: "A verdade é essa", subtexto: "E vai doer antes de aliviar." },
    { headline: "Você sabe o que precisa fazer", subtexto: "Só tem medo do que vai encontrar." },
    { headline: "Isso não vai embora sozinho", subtexto: "E você já sabe disso." },
  ],

  culpa: [
    { headline: "Talvez o problema não seja você...", subtexto: "A culpa que você sente foi ensinada, não merecida." },
    { headline: "Você carrega uma culpa", subtexto: "Que nunca foi sua. Foi herdada." },
    { headline: "Pare de se punir", subtexto: "Por algo que aconteceu quando você não tinha escolha." },
    { headline: "A culpa que te paralisa", subtexto: "É a voz de alguém que não deveria ter te julgado." },
  ],

  confianca: [
    { headline: "Agora você entende o que fazer", subtexto: "E isso muda tudo." },
    { headline: "Você está mais perto do que imagina", subtexto: "Do lugar onde a dor vira força." },
    { headline: "Não é sobre ser forte", subtexto: "É sobre saber que você pode escolher." },
    { headline: "Você já deu o primeiro passo", subtexto: "E isso é mais do que a maioria consegue." },
  ],

  insight: [
    { headline: "É por isso que você repete", subtexto: "Não é destino. É um padrão que se instalou." },
    { headline: "A resposta estava aqui o tempo todo", subtexto: "Você só precisava de alguém pra apontar." },
    { headline: "Quando você entende a raiz", subtexto: "O ciclo começa a quebrar naturalmente." },
    { headline: "Isso explica tudo", subtexto: "E agora nada mais vai parecer acidental." },
    { headline: "Não é sobre o que aconteceu", subtexto: "É sobre o que você aprendeu a acreditar por causa disso." },
  ],

  alivio: [
    { headline: "Respira", subtexto: "O pior já passou. Agora começa a reconstrução." },
    { headline: "Você não precisa resolver tudo hoje", subtexto: "Só precisa parar de se punir por não ter resolvido antes." },
    { headline: "Tá tudo bem não estar bem", subtexto: "O importante é não fingir que está." },
    { headline: "Descansar não é desistir", subtexto: "É sobreviver para continuar." },
  ],

  acao: [
    { headline: "Agora é a sua vez", subtexto: "A mudança começa quando você decide." },
    { headline: "Saia desse ciclo", subtexto: "Eu posso te mostrar o caminho." },
    { headline: "Me chama no WhatsApp", subtexto: "Vamos conversar sobre isso — sem julgamento." },
    { headline: "Quer sair desse padrão?", subtexto: "Clica no link e vamos trabalhar isso juntos." },
  ],
};

// ── BANCO DE COPY POR TIPO (V1 — mantido como fallback) ─────────────────────

const TEMPLATES_CURTA = {
  pergunta: [
    { headline: "Você está cansada", subtexto: "...ou só sobrecarregada?" },
    { headline: "Quando foi a última vez", subtexto: "que alguém te perguntou como você está de verdade?" },
    { headline: "Você dá conta de tudo", subtexto: "Mas quem cuida de você?" },
    { headline: "Essa ansiedade que você sente", subtexto: "Já parou pra pensar se não é só medo disfarçado?" },
    { headline: "Você cuida de todo mundo", subtexto: "Mas quem cuida de você?" },
    { headline: "Quantas vezes você disse 'tô bem'", subtexto: "Sabendo que não estava?" },
    { headline: "Você está vivendo", subtexto: "...ou só sobrevivendo?" },
    { headline: "Solidão e abandono", subtexto: "Você sabe a diferença?" },
  ],
  frase_curta: [
    { headline: "Você não está atrasada", subtexto: "Está se curando." },
    { headline: "Nem toda força é visível", subtexto: "Nem toda dor é fraqueza." },
    { headline: "Às vezes, parar", subtexto: "É o ato mais corajoso que existe." },
    { headline: "Você não precisa ser forte", subtexto: "O tempo todo." },
    { headline: "Esse cansaço que você sente", subtexto: "Não é preguiça. É sobrecarga." },
    { headline: "Sua culpa não é sua", subtexto: "Foi ensinada." },
    { headline: "Você não quebrou", subtexto: "Só carregou demais." },
    { headline: "Descansar não é desistir", subtexto: "É sobreviver." },
  ],
  observacao: [
    { headline: "Nem tudo que parece preguiça", subtexto: "É falta de força." },
    { headline: "A pessoa mais forte da sala", subtexto: "Quase sempre é a mais cansada." },
    { headline: "Quem sempre resolve tudo", subtexto: "Raramente é resolvido por alguém." },
    { headline: "Você não está exagerando", subtexto: "O peso é real." },
    { headline: "Às vezes a ansiedade", subtexto: "Não é doença. É informação." },
    { headline: "O corpo avisa", subtexto: "Antes da mente aceitar." },
    { headline: "A exaustão emocional é silenciosa", subtexto: "Mas nunca invisível." },
    { headline: "Ser funcional e ser bem", subtexto: "São coisas diferentes." },
  ],
  verdade_dura: [
    { headline: "Você se abandona", subtexto: "Para não ser abandonada." },
    { headline: "Você não tem medo de ficar sozinha", subtexto: "Tem medo de ser descartada." },
    { headline: "A maioria das suas decisões", subtexto: "É baseada em medo, não em desejo." },
    { headline: "Você não é forte", subtexto: "Você aprendeu a engolir o choro." },
    { headline: "Ser independente demais", subtexto: "É uma forma de não precisar pedir ajuda." },
    { headline: "Você confunde amor", subtexto: "Com necessidade de aprovação." },
    { headline: "Sua 'resiliência'", subtexto: "É apenas desespero disfarçado de coragem." },
    { headline: "Você não escolheu ser assim", subtexto: "Mas pode escolher parar." },
  ],
  quebra_padrao: [
    { headline: "A ansiedade não é o problema", subtexto: "É o sintoma." },
    { headline: "Você não precisa de motivação", subtexto: "Precisa de luto." },
    { headline: "Controlar tudo", subtexto: "É a forma mais elegante de entrar em colapso." },
    { headline: "A culpa que você sente", subtexto: "Não é sua — foi herdada." },
    { headline: "Seu perfeccionismo não é qualidade", subtexto: "É medo de rejeição." },
    { headline: "Você não está se sabotando", subtexto: "Está se protegendo do jeito errado." },
    { headline: "A procrastinação", subtexto: "É o grito do que você evita sentir." },
    { headline: "Estar sempre ocupada", subtexto: "É uma forma de fugir de si mesma." },
  ],
};

const TEMPLATES_PROFUNDA = {
  insight: [
    { headline: "A ansiedade não é o seu inimigo", subtexto: "É o alarme de uma dor que você tentou ignorar. Quando você para de lutar contra ela e escuta o que ela quer dizer, o ciclo começa a quebrar." },
    { headline: "Você não está tendo crises de ansiedade", subtexto: "Você está tendo crises de verdade. A ansiedade é só o formato que a verdade encontrou pra sair." },
    { headline: "Repetição não é destino", subtexto: "É um padrão que se instalou antes de você ter escolha. Agora você tem." },
    { headline: "Você não tem problema de autoestima", subtexto: "Tem um histórico de pessoas que te fizeram duvidar de si mesma." },
  ],
  checklist: [
    { headline: "3 sinais de que você está se sabotando", subtexto: "1. Você começa coisas e nunca termina.\n2. Sente culpa quando algo dá certo.\n3. Se afasta quando a relação fica boa demais." },
    { headline: "5 formas que o esgotamento se disfarça", subtexto: "1. Irritabilidade constante\n2. Esquecimento\n3. Isolamento\n4. Comer/dormir demais\n5. Perder interesse em tudo" },
    { headline: "4 padrões de quem cresceu sem validação", subtexto: "1. Perfeccionismo extremo\n2. Dificuldade de dizer não\n3. Medo de ser 'demais'\n4. Busca eterna por aprovação" },
  ],
  mini_guia: [
    { headline: "Como parar de se cobrar tanto", subtexto: "Passo 1: Identifique a voz que cobra — ela é sua ou foi ensinada?\nPasso 2: Separe expectativa de realidade.\nPasso 3: Permita-se ser suficiente hoje." },
    { headline: "O que fazer quando a ansiedade bate", subtexto: "Não tente controlá-la. Nomeie o que está sentindo. Respire em ciclos de 4-7-8. E lembre: isso vai passar." },
  ],
  explicacao: [
    { headline: "Por que você repete os mesmos padrões", subtexto: "Na psicanálise, existe um conceito chamado compulsão à repetição. Você não repete por querer — repete para tentar resolver o que ficou em aberto no passado." },
    { headline: "O que ninguém te conta sobre autoconhecimento", subtexto: "Não é sobre se sentir bem. É sobre conseguir olhar pra si sem fugir. E isso dói antes de aliviar." },
  ],
  educacional: [
    { headline: "Psicanálise na prática", subtexto: "Não é deitar no divã e falar do passado. É entender por que você faz hoje o que não quer mais fazer — e encontrar a raiz disso." },
    { headline: "O inconsciente não esquece", subtexto: "Tudo o que você reprimiu encontra um caminho pra sair. Ansiedade, insônia, dor no corpo. Seu corpo fala o que a mente cala." },
  ],
  dor_solucao: [
    { headline: "Esse padrão tem um nome", subtexto: "E tem solução. Não é motivação. É direção. Se quiser entender o que está por trás, me chama no WhatsApp." },
    { headline: "Você não precisa continuar carregando isso sozinha", subtexto: "Existe um caminho. E ele começa quando alguém te ajuda a olhar pra onde você evita." },
  ],
  convite: [
    { headline: "Me chama no WhatsApp com a palavra LIBERDADE", subtexto: "Eu vou te explicar o que está por trás do que você sente — sem julgamento, sem pressa." },
    { headline: "Quer sair desse ciclo?", subtexto: "Clica no WhatsApp. A conversa é gratuita, discreta e pode mudar a forma como você se vê." },
  ],
};

// ── GERADOR PRINCIPAL V2 ─────────────────────────────────────────────────────

/**
 * Gera copy baseada no estado emocional (V2) ou modo/tipoPost (V1 fallback).
 *
 * @param {Object} params
 * @param {string} params.modo — "cotidiano" ou "estrategico"
 * @param {string} params.tipoPost — tipo de post
 * @param {Object} [params.emotion] — estado emocional do Scene Engine V2
 * @returns {Object} — { headline, subtexto }
 */
export function gerarCopy({ modo, tipoPost, emotion }) {
  // ── V2: Emotion-driven copy ──
  if (emotion && COPY_POR_EMOCAO[emotion.id]) {
    const templates = COPY_POR_EMOCAO[emotion.id];
    const escolhido = randomPick(templates);
    console.log(`   ✍️  [CopyEngine V2] Emoção: ${emotion.label} → "${escolhido.headline}"`);
    return { headline: escolhido.headline, subtexto: escolhido.subtexto };
  }

  // ── V1 Fallback: modo/tipoPost ──
  if (modo === "cotidiano") {
    return gerarCopyCurta(tipoPost);
  }
  return gerarCopyProfunda(tipoPost);
}

/**
 * Gera copy curta (headline + subtexto complementar) para modo cotidiano.
 */
function gerarCopyCurta(tipo) {
  const templates = TEMPLATES_CURTA[tipo];
  if (!templates || templates.length === 0) {
    const fallback = randomPick(TEMPLATES_CURTA.frase_curta);
    return { headline: fallback.headline, subtexto: fallback.subtexto };
  }
  const escolhido = randomPick(templates);
  return { headline: escolhido.headline, subtexto: escolhido.subtexto };
}

/**
 * Gera copy profunda (headline + subtexto denso) para modo estratégico.
 */
function gerarCopyProfunda(tipo) {
  const templates = TEMPLATES_PROFUNDA[tipo];
  if (!templates || templates.length === 0) {
    const fallback = randomPick(TEMPLATES_PROFUNDA.insight);
    return { headline: fallback.headline, subtexto: fallback.subtexto };
  }
  const escolhido = randomPick(templates);
  return { headline: escolhido.headline, subtexto: escolhido.subtexto };
}

// ── EXPORTS ──────────────────────────────────────────────────────────────────

export {
  gerarCopyCurta,
  gerarCopyProfunda,
  TEMPLATES_CURTA,
  TEMPLATES_PROFUNDA,
  COPY_POR_EMOCAO,
};

export default gerarCopy;
