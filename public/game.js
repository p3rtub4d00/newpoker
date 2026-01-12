const socket = io();

// Elementos do DOM
const loginOverlay = document.getElementById('login-overlay');
const gameContainer = document.getElementById('game-container');
const usernameInput = document.getElementById('username-input');
const displayName = document.getElementById('display-name');
const displayChips = document.getElementById('display-chips');
const bonusMsg = document.getElementById('daily-bonus-msg');
const potDisplay = document.getElementById('pot-amount');

// Estado do Jogo (Local)
let currentUser = {
    username: '',
    chips: 1000,
    lastBonus: null
};

// Configuração dos Bots
const bots = [
    { id: 'bot1', name: 'Bot Mike', chips: 5000, elementStatus: 'bot1-status' },
    { id: 'bot2', name: 'Bot Sarah', chips: 8500, elementStatus: 'bot2-status' }
];

let currentPot = 0;

// --- FUNÇÕES DE LOGIN E DADOS ---

function login() {
    const user = usernameInput.value.trim();
    if (!user) return alert("Digite um nome!");

    // Recupera dados do localStorage
    const savedData = localStorage.getItem('poker_user_' + user);
    
    if (savedData) {
        currentUser = JSON.parse(savedData);
    } else {
        // Novo Usuário
        currentUser.username = user;
        currentUser.chips = 1000;
        currentUser.lastBonus = null;
    }

    // Verifica Bônus Diário
    checkDailyBonus();

    // Salva e Atualiza UI
    saveUserData();
    updateUI();

    // Troca de Tela
    loginOverlay.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    
    // Animação leve de entrada
    setTimeout(() => {
        loginOverlay.style.display = 'none';
        gameContainer.classList.remove('hidden');
    }, 500);
}

function checkDailyBonus() {
    const today = new Date().toDateString();
    
    if (currentUser.lastBonus !== today) {
        // Dá o bônus
        currentUser.chips += 500;
        currentUser.lastBonus = today;
        
        // Mostra mensagem
        bonusMsg.classList.remove('hidden');
        setTimeout(() => {
            bonusMsg.classList.add('hidden');
        }, 3000);
    }
}

function saveUserData() {
    localStorage.setItem('poker_user_' + currentUser.username, JSON.stringify(currentUser));
}

function updateUI() {
    displayName.innerText = currentUser.username;
    displayChips.innerText = currentUser.chips.toLocaleString('pt-BR');
    potDisplay.innerText = "R$ " + currentPot;
    
    // Atualiza nome na mesa
    document.getElementById('table-player-name').innerText = currentUser.username;
}


// --- LÓGICA DO JOGO (SIMPLES PARA UI) ---

function startGame() {
    // 1. Limpar Mesa
    clearTable();
    
    // 2. Aposta Inicial (Blind)
    const blind = 50;
    if (currentUser.chips < blind) return alert("Saldo insuficiente!");
    
    currentUser.chips -= blind;
    currentPot += blind * 3; // Jogador + 2 Bots
    updateUI();

    // 3. Dar Cartas (Visualmente)
    dealUserCards();
    
    // 4. Iniciar Turno dos Bots
    setTimeout(() => {
        handleBotTurn(0); // Bot 1
    }, 1500);
}

function clearTable() {
    currentPot = 0;
    document.getElementById('my-cards').innerHTML = '';
    const slots = document.querySelectorAll('.card-slot');
    slots.forEach(slot => slot.innerHTML = '');
    
    // Reseta status dos bots
    bots.forEach(bot => {
        document.getElementById(bot.elementStatus).style.opacity = '0';
    });
    
    updateUI();
}

function dealUserCards() {
    const hand = generateRandomHand();
    const handDiv = document.getElementById('my-cards');
    
    handDiv.innerHTML = `
        <div class="card ${hand[0].suitColor}">${hand[0].rank}${hand[0].suit}</div>
        <div class="card ${hand[1].suitColor}">${hand[1].rank}${hand[1].suit}</div>
    `;
}

function generateRandomHand() {
    const suits = ['♥', '♦', '♣', '♠'];
    const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8'];
    
    let cards = [];
    for(let i=0; i<2; i++) {
        let s = suits[Math.floor(Math.random() * suits.length)];
        let r = ranks[Math.floor(Math.random() * ranks.length)];
        let color = (s === '♥' || s === '♦') ? 'red' : 'black';
        cards.push({ suit: s, rank: r, suitColor: color });
    }
    return cards;
}

// --- INTELIGÊNCIA ARTIFICIAL (BOTS) ---

function handleBotTurn(botIndex) {
    if (botIndex >= bots.length) {
        // Vez do Jogador Real
        showMessage("Sua vez!");
        return;
    }

    const bot = bots[botIndex];
    const statusEl = document.getElementById(bot.elementStatus);
    
    // Mostra que está "pensando"
    statusEl.innerText = "Pensando...";
    statusEl.style.opacity = '1';
    statusEl.style.color = '#f1c40f';

    // Simula tempo de raciocínio (1 a 3 segundos)
    const thinkingTime = Math.floor(Math.random() * 2000) + 1000;

    setTimeout(() => {
        // Decide ação aleatória
        const action = Math.random();
        let actionText = "";

        if (action < 0.2) {
            actionText = "FOLD";
            statusEl.style.color = "#c0392b";
        } else if (action < 0.7) {
            actionText = "CHECK";
            statusEl.style.color = "#2980b9";
        } else {
            actionText = "RAISE 50";
            statusEl.style.color = "#27ae60";
            currentPot += 50;
            updateUI();
        }

        statusEl.innerText = actionText;

        // Passa para o próximo bot
        handleBotTurn(botIndex + 1);

    }, thinkingTime);
}

function playerAction(action) {
    if (action === 'fold') {
        alert("Você desistiu desta mão.");
        clearTable();
    } else if (action === 'raise') {
        if (currentUser.chips >= 100) {
            currentUser.chips -= 100;
            currentPot += 100;
            saveUserData();
            updateUI();
            
            // Bots reagem ao seu raise
            setTimeout(() => { showMessage("Bots pagaram sua aposta!"); currentPot += 200; updateUI(); }, 1000);
            
            // Coloca cartas na mesa (Flop)
            setTimeout(dealFlop, 1500);
        }
    } else {
        // Check
        setTimeout(dealFlop, 500);
    }
}

function dealFlop() {
    const slots = document.querySelectorAll('.card-slot');
    const hand = generateRandomHand(); // Reutilizando logica para gerar cartas random
    const hand2 = generateRandomHand();
    const hand3 = generateRandomHand(); // Apenas para pegar cartas aleatórias
    
    // Preenche 3 cartas comunitárias
    slots[0].innerHTML = `<div class="card ${hand[0].suitColor}" style="width:100%; height:100%">${hand[0].rank}${hand[0].suit}</div>`;
    slots[1].innerHTML = `<div class="card ${hand[1].suitColor}" style="width:100%; height:100%">${hand[1].rank}${hand[1].suit}</div>`;
    slots[2].innerHTML = `<div class="card ${hand2[0].suitColor}" style="width:100%; height:100%">${hand2[0].rank}${hand2[0].suit}</div>`;
}

function showMessage(msg) {
    // Função utilitária para logs futuros
    console.log(msg);
}
