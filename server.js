require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');

const app = express();
const port = process.env.PORT || 3000;

// Credenciais da Twilio obtidas do arquivo .env
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

app.use(bodyParser.json());

// Endpoint para envio de notificações
app.post('/send-notification', (req, res) => {
    const { name, phone } = req.body;

    // Validações básicas
    if (!name || !phone) {
        return res.status(400).send({ success: false, error: 'Nome e telefone são obrigatórios.' });
    }

    client.messages
        .create({
            body: `Olá, ${name}! Obrigado por se cadastrar na AgoraSou!`,
            from: twilioPhoneNumber,
            to: phone,
        })
        .then((message) => {
            res.status(200).send({ success: true, messageId: message.sid });
        })
        .catch((error) => {
            console.error('Erro ao enviar mensagem:', error);
            res.status(500).send({ success: false, error: error.message });
        });
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
