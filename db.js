// db.js
const { Pool } = require('pg'); // Importa o Pool de conexões do PostgreSQL

// Criação do Pool de Conexões
const pool = new Pool({
    user: process.env.DB_USER,         // Nome do usuário do banco de dados (definido no arquivo .env)
    host: process.env.DB_HOST,         // Endereço do servidor do banco de dados (exemplo: localhost ou IP)
    database: process.env.DB_DATABASE, // Nome do banco de dados
    password: process.env.DB_PASSWORD, // Senha do banco de dados
    port: process.env.DB_PORT || 5432, // Porta (5432 é a padrão do PostgreSQL)
});

// Exporta o pool de conexões para ser usado em outros arquivos (como o server.js)
module.exports = pool;
