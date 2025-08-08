const fs = require('fs');
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3333;

app.use(cors());
app.use(bodyParser.json());

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "recupera_senha" }),
    puppeteer: {
        browserWSEndpoint: 'ws://localhost:3000', // Conecta ao Chrome Headless do Docker browserless/chrome
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

let whatsappReady = false;

client.on('qr', (qr) => {
    console.log('\n--- Escaneie este QR code no WhatsApp ---\n');
    qrcode.generate(qr, { small: true });
    console.log('\nOu copie o QR para outro gerador online.\n');
});

client.on('ready', () => {
    console.log('WhatsApp conectado e pronto para enviar mensagens!');
    whatsappReady = true;
});

client.on('authenticated', () => {
    console.log('WhatsApp autenticado.');
});

client.on('auth_failure', msg => {
    console.error('Falha na autenticação:', msg);
});

client.on('disconnected', (reason) => {
    console.warn('Desconectado:', reason);
    whatsappReady = false;
});

client.initialize();

app.get('/status', (req, res) => {
    res.json({ status: whatsappReady ? "online" : "offline" });
});

app.post('/send', async (req, res) => {
    if (!whatsappReady) {
        return res.status(503).json({ status: "error", message: "WhatsApp não está conectado. Autentique via QR code." });
    }

    const { numero, mensagem } = req.body;

    if (!numero || !mensagem) {
        return res.status(400).json({ status: "error", message: "Parâmetros obrigatórios: numero, mensagem" });
    }

    let formattedNumber = numero;
    if (!formattedNumber.includes('@c.us')) {
        formattedNumber = numero.replace(/[^\d]/g, '') + "@c.us";
    }

    try {
        await client.sendMessage(formattedNumber, mensagem);
        res.json({ status: "success", message: "Mensagem enviada com sucesso." });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Falha ao enviar mensagem.", detail: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Microserviço WhatsApp rodando em http://localhost:${PORT}`);
});
