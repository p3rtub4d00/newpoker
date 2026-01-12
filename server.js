const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Eventos do Socket (Básico para comunicação)
io.on('connection', (socket) => {
    console.log('Um jogador conectou:', socket.id);

    socket.on('disconnect', () => {
        console.log('Jogador desconectou:', socket.id);
    });

    // Aqui podemos expandir para comunicar ações para outros jogadores reais no futuro
    socket.on('playerAction', (data) => {
        // Por enquanto, apenas retransmite para fins de teste
        socket.broadcast.emit('updateTable', data);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
