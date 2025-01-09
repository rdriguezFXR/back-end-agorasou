require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const cors = require('cors');
const { parsePhoneNumber } = require('libphonenumber-js');
const sqlite3 = require('sqlite3').verbose(); // Banco de dados SQLite

const app = express();
const port = process.env.PORT || 3000;

// Credenciais da Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = '+17753106291'; // Número fornecido pela Twilio
const client = twilio(accountSid, authToken);

app.use(cors());
app.use(bodyParser.json());

// Configuração do banco de dados SQLite
const db = new sqlite3.Database(':memory:'); // Substitua ':memory:' por um caminho de arquivo para persistência
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL UNIQUE
        )
    `);
});

// Validação de número de telefone
const validatePhoneNumber = (phone) => {
    try {
        const phoneNumber = parsePhoneNumber(phone, 'BR');
        return phoneNumber && phoneNumber.isValid() ? phoneNumber.number : null;
    } catch {
        return null;
    }
};

// Endpoint para cadastrar usuário e enviar notificação
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
        // Armazenar usuário no banco de dados
        db.run(
            'INSERT INTO users (name, phone) VALUES (?, ?)',
            [name, formattedPhone],
            (err) => {
                if (err) {
                    if (err.code === 'SQLITE_CONSTRAINT') {
                        return res.status(400).json({ success: false, error: 'Número já cadastrado.' });
                    }
                    console.error('Erro ao salvar no banco de dados:', err);
                    return res.status(500).json({ success: false, error: 'Erro interno no servidor.' });
                }
            }
        );

        // Enviar mensagem de boas-vindas
        const message = await client.messages.create({
            body: `Seja bem-vindo(a), ${name}! Obrigado por se cadastrar na AgoraSou!`,
            from: twilioPhoneNumber,
            to: formattedPhone,
        });

        res.status(200).json({ success: true, messageId: message.sid, status: message.status });
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error.message);
        res.status(500).json({ success: false, error: 'Erro ao enviar a mensagem.' });
    }
});

// Endpoint para enviar mensagens em massa
app.post('/send-bulk', async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ success: false, error: 'Mensagem é obrigatória.' });
    }

    try {
        // Recuperar todos os usuários do banco de dados
        db.all('SELECT name, phone FROM users', async (err, rows) => {
            if (err) {
                console.error('Erro ao recuperar usuários:', err);
                return res.status(500).json({ success: false, error: 'Erro interno no servidor.' });
            }

            // Enviar mensagens em massa
            const sendPromises = rows.map((user) =>
                client.messages.create({
                    body: `${message}\n\n[Enviado para: ${user.name}]`,
                    from: twilioPhoneNumber,
                    to: user.phone,
                })
            );

            await Promise.all(sendPromises);

            res.status(200).json({ success: true, message: 'Mensagens enviadas com sucesso.' });
        });
    } catch (error) {
        console.error('Erro ao enviar mensagens em massa:', error.message);
        res.status(500).json({ success: false, error: 'Erro ao enviar as mensagens.' });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
