import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// 🔐 Token que você define no .env
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "meu_token_secreto_123";

// ─────────────────────────────────────────────
// 🔎 ROTA DE VERIFICAÇÃO (Meta Webhook)
// ─────────────────────────────────────────────
app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    console.log("🔍 Verificação recebida:");
    console.log("MODE:", mode);
    console.log("TOKEN RECEBIDO:", token);
    console.log("TOKEN ESPERADO:", VERIFY_TOKEN);
    console.log("CHALLENGE:", challenge);

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("✅ Webhook verificado com sucesso!");
        return res.status(200).send(challenge);
    } else {
        console.log("❌ Token inválido!");
        return res.sendStatus(403);
    }
});

// ─────────────────────────────────────────────
// 📩 RECEBIMENTO DE EVENTOS (POST)
// ─────────────────────────────────────────────
app.post("/webhook", (req, res) => {
    console.log("📩 Evento recebido da Meta:");
    console.dir(req.body, { depth: null });

    // Sempre responder 200 para a Meta
    res.sendStatus(200);
});

// ─────────────────────────────────────────────
// 🏠 ROTA TESTE
// ─────────────────────────────────────────────
app.get("/", (req, res) => {
    res.send("Servidor rodando 🚀");
});

// ─────────────────────────────────────────────
// 🚀 START
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});