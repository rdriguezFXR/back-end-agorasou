require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose'); // Adicionado para conectar ao MongoDB
const twilio = require('twilio');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Conectar ao MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Conectado ao MongoDB!');
    } catch (err) {
        console.error('Erro ao conectar ao MongoDB:', err.message);
        process.exit(1);
    }
};
connectDB();

// Modelo para salvar os dados dos usuários no MongoDB
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    date: { type: Date, default: Date.now },
});
const User = mongoose.model('User', userSchema);

// Credenciais da Twilio obtidas do arquivo .env
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const client = twilio(accountSid, authToken);

app.use(cors()); // Middleware para habilitar CORS
app.use(bodyParser.json());

// Endpoint para envio de notificações e cadastro no banco de dados
app.post('/send-notification', async (req, res) => {
    const { name, phone } = req.body;

    if (!name || !phone) {
        return res.status(400).send({ success: false, error: 'Nome e telefone são obrigatórios.' });
    }

    try {
        // Salvar o usuário no banco de dados
        const user = new User({ name, phone });
        await user.save();

        // Enviar mensagem pelo Twilio
        const message = await client.messages.create({
            body: `Seja Bem-vindo(a), ${name}! Obrigado por se cadastrar na AgoraSou!`,
            from: twilioPhoneNumber,
            to: phone,
        });

        res.status(200).send({ success: true, messageId: message.sid });
    } catch (error) {
        console.error('Erro ao processar requisição:', error.message);
        res.status(500).send({ success: false, error: error.message });
    }
});

// Endpoint para envio de mensagens em massa
app.post('/send-bulk-messages', async (req, res) => {
    try {
        const users = await User.find(); // Buscar todos os usuários cadastrados

        const messagePromises = users.map(user => {
            return client.messages.create({
                body: `Olá ${user.name}, temos novidades para você!`,
                from: twilioPhoneNumber,
                to: user.phone,
            });
        });

        await Promise.all(messagePromises); // Aguarda o envio de todas as mensagens

        res.status(200).send({ success: true, message: 'Mensagens enviadas com sucesso!' });
    } catch (error) {
        console.error('Erro ao enviar mensagens em massa:', error.message);
        res.status(500).send({ success: false, error: error.message });
    }
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
