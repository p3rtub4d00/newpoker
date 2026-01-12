const socket = io();

// UI Elements
const loginOverlay = document.getElementById('login-overlay');
const lobbyOverlay = document.getElementById('lobby-overlay');
const shopOverlay = document.getElementById('shop-overlay');
const gameContainer = document.getElementById('game-container');
const usernameInput = document.getElementById('username-input');
const displayName = document.getElementById('display-name');
const displayChips = document.getElementById('display-chips');
const bonusMsg = document.getElementById('daily-bonus-msg');
const potDisplay = document.getElementById('pot-amount');
const gameMessage = document.getElementById('game-message');
const tableInfoDisplay = document.getElementById('table-info-display');

const btnStart = document.getElementById('btn-start');
const gameControls = document.getElementById('game-controls');

// Game State
let currentUser = { username: '', chips: 1000, lastBonus: null };
let currentPot = 0;
let currentBlind = 0; // Valor da mesa atual
let gameStage = 0; 
let currentRoundBet = 0;

// Lista de Nomes de Mãos para Exibir na Vitória
const handNames = ["Par", "Dois Pares", "Trinca", "Sequência", "Flush", "Full House", "Quadra", "Straight Flush"];

// Bots Configuration (Adicionado 'isFolded')
const bots = [
    { id: 'bot1', name: 'Bot Mike', chips: 5000, elementStatus: 'bot1-status', betElement: 'bot1-bet', isFolded: false },
    { id: 'bot2', name: 'Bot Sarah', chips: 8500, elementStatus: 'bot2-status', betElement: 'bot2-bet', isFolded: false }
];

// --- 1. LOGIN ---
function login() {
    const user = usernameInput.value.trim();
    if (!user) return alert("Digite um nome!");

    const savedData = localStorage.getItem('newpoker_user_' + user);
    if (savedData) {
        currentUser = JSON.parse(savedData);
    } else {
        currentUser.username = user;
        currentUser.chips = 1000;
    }

    checkDailyBonus();
    saveUserData();
    
    // Ir para o Lobby em vez do Jogo direto
    loginOverlay.classList.remove('active');
    loginOverlay.classList.add('hidden');
    
    // Mostrar Lobby
    lobbyOverlay.classList.remove('hidden');
    lobbyOverlay.classList.add('active');
}

// --- 2. LOBBY DE MESAS ---
function selectTable(blindValue) {
    if(currentUser.chips < blindValue * 5) {
        return alert(`Você precisa de pelo menos R$ ${blindValue * 5} para entrar nesta mesa!`);
    }

    currentBlind = blindValue;
    
    // Esconde Lobby e mostra Jogo
    lobbyOverlay.classList.remove('active');
    lobbyOverlay.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    
    // Atualiza info da mesa
    tableInfoDisplay.innerText = `| BLIND: R$ ${blindValue}`;
    btnStart.innerText = `INICIAR RODADA (R$ ${blindValue})`;
    
    updateUI();
    clearTable();
}

function backToLobby() {
    gameContainer.classList.add('hidden');
    lobbyOverlay.classList.remove('hidden');
    lobbyOverlay.classList.add('active');
}

// --- 3. JOGO ---

function startGame() {
    if (currentUser.chips < currentBlind) return alert("Saldo insuficiente! Compre mais fichas.");

    clearTable();
    
    // Resetar Status dos Bots (CORREÇÃO DO BUG)
    bots.forEach(bot => bot.isFolded = false);
    
    // Blinds
    currentUser.chips -= currentBlind;
    currentPot = currentBlind * 3; // Jogador + 2 Bots
    
    // Mostrar Apostas Iniciais (CORREÇÃO VISUAL)
    showBetChips('my-bet', currentBlind);
    showBetChips('bot1-bet', currentBlind);
    showBetChips('bot2-bet', currentBlind);

    gameStage = 0;
    currentRoundBet = currentBlind;
    updateUI();
    saveUserData();

    btnStart.style.display = 'none';
    gameControls.classList.remove('hidden');

    dealUserCards();
    setStatus("Sua vez...");
}

function clearTable() {
    currentPot = 0;
    currentRoundBet = 0;
    gameMessage.classList.add('hidden');
    gameMessage.innerText = '';
    
    document.getElementById('my-cards').innerHTML = '';
    document.querySelectorAll('.card-slot').forEach(slot => slot.innerHTML = '');
    
    // Limpa UI dos Bots
    bots.forEach(bot => {
        document.getElementById(bot.elementStatus).style.opacity = '0';
        document.getElementById(bot.betElement).classList.add('hidden');
        document.getElementById(bot.betElement).innerText = '';
    });
    
    // Limpa UI do Jogador
    document.getElementById('my-status').style.opacity = '0';
    document.getElementById('my-bet').classList.add('hidden');
    document.getElementById('my-bet').innerText = '';
    
    updateUI();
}

function playerAction(action) {
    let betAmount = 0;

    if (action === 'fold') {
        setStatus("VOCÊ: DESISTIU");
        endHand(false, "Desistência");
        return;
    }

    if (action === 'check') {
        setStatus("VOCÊ: MESA");
        betAmount = 0; 
    }
    else if (action === 'min_raise') {
        betAmount = currentBlind * 2;
    }
    else if (action === 'half') {
        betAmount = Math.floor(currentPot / 2);
    } 
    else if (action === 'pot') {
        betAmount = currentPot;
    } 
    else if (action === 'allin') {
        betAmount = currentUser.chips;
    }

    // Processar Aposta
    if (betAmount > 0) {
        if (currentUser.chips >= betAmount) {
            currentUser.chips -= betAmount;
            currentPot += betAmount;
            currentRoundBet = betAmount;
            
            setStatus(action === 'allin' ? "VOCÊ: ALL-IN!" : `VOCÊ: APOSTOU ${betAmount}`);
            showBetChips('my-bet', betAmount);
            updateUI();
        } else {
            return alert("Fichas insuficientes!");
        }
    }

    // Turno dos Bots
    setTimeout(() => {
        handleBotsTurn(betAmount);
    }, 1000);
}

function handleBotsTurn(playerBet) {
    bots.forEach(bot => {
        // Se o bot já desistiu, não faz nada (CORREÇÃO DO BUG)
        if(bot.isFolded) return;

        const botEl = document.getElementById(bot.elementStatus);
        botEl.style.opacity = '1';
        
        // IA Simples
        const decision = Math.random();
        
        // Se o jogador deu All-in ou aposta alta, bot tem chance de Fold
        if (playerBet > currentBlind * 5 && decision < 0.4) {
            bot.isFolded = true;
            botEl.innerText = "DESISTIU";
            botEl.style.color = '#c0392b';
            document.getElementById(bot.betElement).classList.add('hidden');
        } else {
            botEl.innerText = "PAGOU";
            botEl.style.color = '#2ecc71';
            
            // Bot coloca fichas
            const callAmount = (playerBet > 0) ? playerBet : currentBlind; 
            currentPot += callAmount;
            showBetChips(bot.betElement, callAmount);
        }
    });
    
    updateUI();
    
    // Verifica se todos desistiram
    const activeBots = bots.filter(b => !b.isFolded).length;
    if (activeBots === 0) {
        setTimeout(() => endHand(true, "Bots Desistiram"), 1000);
    } else {
        setTimeout(nextStreet, 1500);
    }
}

function nextStreet() {
    gameStage++;
    
    // Limpar visualmente as apostas da rodada anterior (Opcional, mas limpo)
    // document.getElementById('my-bet').classList.add('hidden');
    // bots.forEach(b => document.getElementById(b.betElement).classList.add('hidden'));

    const slots = document.querySelectorAll('.card-slot');
    const c1 = generateRandomCard();
    const c2 = generateRandomCard();
    const c3 = generateRandomCard();

    if (gameStage === 1) { // FLOP
        slots[0].innerHTML = renderCard(c1);
        slots[1].innerHTML = renderCard(c2);
        slots[2].innerHTML = renderCard(c3);
    } else if (gameStage === 2) { // TURN
        slots[3].innerHTML = renderCard(c1);
    } else if (gameStage === 3) { // RIVER
        slots[4].innerHTML = renderCard(c1);
    } else {
        determineWinner();
        return;
    }
    
    setStatus("Sua vez...");
}

function determineWinner() {
    // Escolhe aleatoriamente quem ganhou
    const winner = Math.random();
    let handName = handNames[Math.floor(Math.random() * handNames.length)];
    
    if (winner > 0.6) {
        endHand(true, handName); // Jogador ganha
    } else {
        // Escolhe qual bot ganhou
        const winnerBot = bots.find(b => !b.isFolded) || bots[0];
        endHand(false, handName, winnerBot.name);
    }
}

function endHand(userWins, handName, winnerName = "Bot") {
    btnStart.style.display = 'block';
    gameControls.classList.add('hidden');
    
    const messageEl = document.getElementById('game-message');

    if (userWins) {
        currentUser.chips += currentPot;
        messageEl.innerHTML = `VOCÊ VENCEU!<br><span style="font-size:0.6em; color:#fff">Mão: ${handName}</span><br>+$${currentPot}`;
        messageEl.style.color = '#d4af37';
        messageEl.style.borderColor = '#d4af37';
    } else {
        messageEl.innerHTML = `${winnerName} VENCEU!<br><span style="font-size:0.6em; color:#fff">Mão: ${handName}</span>`;
        messageEl.style.color = '#c0392b';
        messageEl.style.borderColor = '#c0392b';
    }

    messageEl.classList.remove('hidden');
    saveUserData();
    updateUI();
}

// --- UTILS ---
function showBetChips(elementId, amount) {
    const el = document.getElementById(elementId);
    if(amount > 0) {
        el.innerText = `🪙 ${amount}`;
        el.classList.remove('hidden');
        // Forçar visibilidade caso CSS esteja falhando
        el.style.display = 'block'; 
        el.style.opacity = '1';
    } else {
        el.classList.add('hidden');
    }
}

function checkDailyBonus() {
    const today = new Date().toDateString();
    if (currentUser.lastBonus !== today) {
        currentUser.chips += 500;
        currentUser.lastBonus = today;
        bonusMsg.classList.remove('hidden');
        setTimeout(() => bonusMsg.classList.add('hidden'), 3000);
    }
}

function saveUserData() {
    localStorage.setItem('newpoker_user_' + currentUser.username, JSON.stringify(currentUser));
}

function updateUI() {
    displayName.innerText = currentUser.username;
    displayChips.innerText = currentUser.chips.toLocaleString('pt-BR');
    potDisplay.innerText = "R$ " + currentPot;
    document.getElementById('table-player-name').innerText = currentUser.username;
}

function toggleShop() {
    if (shopOverlay.classList.contains('hidden')) {
        shopOverlay.classList.remove('hidden');
        shopOverlay.classList.add('active');
    } else {
        shopOverlay.classList.remove('active');
        shopOverlay.classList.add('hidden');
    }
}

function buyChips(amount, cost) {
    if (confirm(`Comprar ${amount} fichas por R$ ${cost}?`)) {
        currentUser.chips += amount;
        saveUserData();
        updateUI();
        alert("Compra realizada!");
        toggleShop();
    }
}

function setStatus(msg) {
    const el = document.getElementById('my-status');
    el.innerText = msg;
    el.style.opacity = 1;
}

function generateRandomCard() {
    const suits = ['♥', '♦', '♣', '♠'];
    const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7'];
    const s = suits[Math.floor(Math.random() * suits.length)];
    const r = ranks[Math.floor(Math.random() * ranks.length)];
    const color = (s === '♥' || s === '♦') ? 'red' : 'black';
    return { suit: s, rank: r, color: color };
}

function renderCard(card) {
    return `<div class="card ${card.color}" style="width:100%; height:100%">${card.rank}${card.suit}</div>`;
}

function dealUserCards() {
    const c1 = generateRandomCard();
    const c2 = generateRandomCard();
    document.getElementById('my-cards').innerHTML = `
        <div class="card ${c1.color}">${c1.rank}${c1.suit}</div>
        <div class="card ${c2.color}">${c2.rank}${c2.suit}</div>
    `;
}
