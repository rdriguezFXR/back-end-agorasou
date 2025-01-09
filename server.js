require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const cors = require('cors');
const { parsePhoneNumber } = require('libphonenumber-js');

const app = express();
const port = process.env.PORT || 3000;

// Credenciais da Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = 'whatsapp:+14155238886';
const client = twilio(accountSid, authToken);

app.use(cors());
app.use(bodyParser.json());

// Validação de número de telefone
const validatePhoneNumber = (phone) => {
    try {
        const phoneNumber = parsePhoneNumber(phone, 'BR');
        return phoneNumber && phoneNumber.isValid() ? phoneNumber.number : null;
    } catch {
        return null;
    }
};

// Endpoint para enviar notificação
app.post('/send-notification', async (req, res) => {
    const { name, phone } = req.body;

    if (!name || !phone) {
        return res.status(400).json({ success: false, error: 'Nome e telefone são obrigatórios.' });
    }

    const formattedPhone = validatePhoneNumber(phone);
    if (!formattedPhone) {
        return res.status(400).json({ success: false, error: 'Número de telefone inválido.' });
    }

    try {
        const message = await client.messages.create({
            body: `Seja bem-vindo(a), ${name}! Obrigado por se cadastrar na AgoraSou!`,
            from: twilioPhoneNumber,
            to: `whatsapp:${formattedPhone}`,
        });

        res.status(200).json({ success: true, messageId: message.sid, status: message.status });
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error.message);

        let errorMessage = 'Erro ao enviar a mensagem.';
        if (error.message.includes('not a valid phone number')) {
            errorMessage = 'Número não registrado no Sandbox da Twilio.';
        } else if (error.message.includes('Authenticate')) {
            errorMessage = 'Credenciais inválidas. Verifique o arquivo .env.';
        }

        res.status(500).json({ success: false, error: errorMessage });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
