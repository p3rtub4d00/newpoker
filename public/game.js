const socket = io();

// UI Elements
const loginOverlay = document.getElementById('login-overlay');
const shopOverlay = document.getElementById('shop-overlay');
const gameContainer = document.getElementById('game-container');
const usernameInput = document.getElementById('username-input');
const displayName = document.getElementById('display-name');
const displayChips = document.getElementById('display-chips');
const bonusMsg = document.getElementById('daily-bonus-msg');
const potDisplay = document.getElementById('pot-amount');
const gameMessage = document.getElementById('game-message');

const btnStart = document.getElementById('btn-start');
const gameControls = document.getElementById('game-controls');

// Game State
let currentUser = { username: '', chips: 1000, lastBonus: null };
let currentPot = 0;
let gameStage = 0; // 0=Pre, 1=Flop, 2=Turn, 3=River

// Bots Configuration
const bots = [
    { id: 'bot1', name: 'Bot Mike', chips: 5000, elementStatus: 'bot1-status' },
    { id: 'bot2', name: 'Bot Sarah', chips: 8500, elementStatus: 'bot2-status' }
];

// --- LOGIN SYSTEM ---
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
    updateUI();

    loginOverlay.classList.remove('active');
    loginOverlay.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    
    // Força limpeza da mensagem ao entrar
    gameMessage.classList.add('hidden');
    gameMessage.innerText = '';
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

// --- SHOP SYSTEM ---
function toggleShop() {
    if (shopOverlay.classList.contains('hidden')) {
        shopOverlay.classList.remove('hidden');
    } else {
        shopOverlay.classList.add('hidden');
    }
}

function buyChips(amount, cost) {
    if (confirm(`Comprar ${amount} fichas por R$ ${cost}?`)) {
        currentUser.chips += amount;
        saveUserData();
        updateUI();
        alert("Compra realizada com sucesso! Fichas adicionadas.");
        toggleShop();
    }
}

// --- GAMEPLAY LOGIC ---

function startGame() {
    if (currentUser.chips < 50) return alert("Saldo insuficiente! Visite a loja.");

    // Reset Table
    clearTable();
    
    // Blinds
    currentUser.chips -= 50;
    currentPot = 150; // 50 User + 50 Bot1 + 50 Bot2
    gameStage = 0; // Pre-flop
    updateUI();
    saveUserData();

    // Toggle Buttons
    btnStart.style.display = 'none';
    gameControls.classList.remove('hidden');

    // Deal Cards
    dealUserCards();
    setStatus("Sua vez...");
}

function clearTable() {
    currentPot = 0;
    gameMessage.classList.add('hidden'); // Esconde mensagem de vitoria
    gameMessage.innerText = ''; // Limpa texto
    document.getElementById('my-cards').innerHTML = '';
    document.querySelectorAll('.card-slot').forEach(slot => slot.innerHTML = '');
    bots.forEach(bot => {
        document.getElementById(bot.elementStatus).style.opacity = '0';
        document.getElementById(bot.elementStatus).innerText = '';
    });
    document.getElementById('my-status').style.opacity = '0';
    updateUI();
}

function playerAction(action) {
    setStatus(`Você: ${action.toUpperCase()}`);

    if (action === 'fold') {
        endHand(false); // Perdeu
        return;
    }

    if (action === 'raise') {
        if (currentUser.chips >= 100) {
            currentUser.chips -= 100;
            currentPot += 300; // 100 User + 100 Bot1 + 100 Bot2 (Calls)
            updateUI();
        } else {
            return alert("Fichas insuficientes para Raise!");
        }
    }

    // Bots Action Simulation
    setTimeout(() => {
        bots.forEach(bot => {
            const botEl = document.getElementById(bot.elementStatus);
            botEl.style.opacity = '1';
            botEl.innerText = action === 'raise' ? 'CALL' : 'CHECK';
            botEl.style.color = '#2ecc71';
        });
        
        // Advance Game Stage
        setTimeout(nextStreet, 1000);
    }, 800);
}

function nextStreet() {
    gameStage++;
    const slots = document.querySelectorAll('.card-slot');
    const c1 = generateRandomCard();
    const c2 = generateRandomCard();
    const c3 = generateRandomCard();

    if (gameStage === 1) { // FLOP (3 Cartas)
        slots[0].innerHTML = renderCard(c1);
        slots[1].innerHTML = renderCard(c2);
        slots[2].innerHTML = renderCard(c3);
    } else if (gameStage === 2) { // TURN (1 Carta)
        slots[3].innerHTML = renderCard(c1);
    } else if (gameStage === 3) { // RIVER (1 Carta)
        slots[4].innerHTML = renderCard(c1);
    } else {
        // Showdown
        determineWinner();
        return;
    }
    
    // Se não acabou, volta status para user
    setStatus("Sua vez...");
}

function determineWinner() {
    // Simulação simples de vencedor (50% chance de ganhar para teste)
    const userWins = Math.random() > 0.5;
    endHand(userWins);
}

function endHand(userWins) {
    btnStart.style.display = 'block';
    gameControls.classList.add('hidden');

    if (userWins) {
        currentUser.chips += currentPot;
        gameMessage.innerText = `VOCÊ VENCEU! +$${currentPot}`;
        gameMessage.style.color = '#d4af37';
        gameMessage.style.borderColor = '#d4af37';
    } else {
        gameMessage.innerText = "VOCÊ PERDEU!";
        gameMessage.style.color = '#c0392b';
        gameMessage.style.borderColor = '#c0392b';
    }

    gameMessage.classList.remove('hidden'); // Só aqui mostramos a mensagem
    saveUserData();
    updateUI();
}

// --- UTILS ---
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
