const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.static('public')); // Servirá o frontend

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Estado do Jogo (Simplificado em memória)
let gameState = {
    players: {}, // { socketId: { id, nome, chips, hand: [] } }
    deck: [],
    communityCards: [],
    pot: 0,
    turn: null, // ID do jogador da vez
    gameActive: false
};

// Funções Auxiliares de Poker
const suits = ['♥', '♦', '♣', '♠'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function createDeck() {
    let deck = [];
    for (let suit of suits) {
        for (let value of values) {
            deck.push({ suit, value });
        }
    }
    // Embaralhamento (Shuffle)
    return deck.sort(() => Math.random() - 0.5); 
}

io.on('connection', (socket) => {
    console.log('Jogador conectado:', socket.id);

    // Jogador entra na mesa
    socket.on('join_table', (nome) => {
        if (Object.keys(gameState.players).length < 6) { // Max 6 jogadores
            gameState.players[socket.id] = {
                id: socket.id,
                nome: nome,
                chips: 1000, // Buy-in inicial
                hand: [],
                bet: 0,
                folded: false
            };
            io.emit('update_state', gameState);
        } else {
            socket.emit('error', 'Mesa cheia');
        }
    });

    // Iniciar Jogo (Simples)
    socket.on('start_game', () => {
        if (Object.keys(gameState.players).length >= 2 && !gameState.gameActive) {
            gameState.gameActive = true;
            gameState.deck = createDeck();
            gameState.communityCards = [];
            gameState.pot = 0;

            // Dar 2 cartas para cada jogador
            for (let id in gameState.players) {
                gameState.players[id].hand = [gameState.deck.pop(), gameState.deck.pop()];
                gameState.players[id].folded = false;
            }

            io.emit('update_state', gameState);
            
            // Simulação de Flop, Turn, River automático para teste
            setTimeout(() => { dealCommunityCards(3); }, 3000); // Flop
            setTimeout(() => { dealCommunityCards(1); }, 6000); // Turn
            setTimeout(() => { dealCommunityCards(1); }, 9000); // River
        }
    });

    // Jogador faz uma ação (Apostar/Check/Fold)
    socket.on('player_action', (data) => {
        // Aqui entraria a lógica complexa de turnos e apostas
        const player = gameState.players[socket.id];
        if(player) {
            if(data.action === 'bet') {
                player.chips -= data.amount;
                player.bet += data.amount;
                gameState.pot += data.amount;
            }
            if(data.action === 'fold') {
                player.folded = true;
            }
            io.emit('update_state', gameState);
        }
    });

    socket.on('disconnect', () => {
        delete gameState.players[socket.id];
        io.emit('update_state', gameState);
    });
});

function dealCommunityCards(count) {
    for(let i=0; i<count; i++) {
        gameState.communityCards.push(gameState.deck.pop());
    }
    io.emit('update_state', gameState);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
