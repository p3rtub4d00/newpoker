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
let gameStage = 0; 
let currentRoundBet = 0; // Quanto o usuário apostou nesta rodada

// Bots
const bots = [
    { id: 'bot1', name: 'Bot Mike', chips: 5000, elementStatus: 'bot1-status', betElement: 'bot1-bet' },
    { id: 'bot2', name: 'Bot Sarah', chips: 8500, elementStatus: 'bot2-status', betElement: 'bot2-bet' }
];

// --- LOGIN ---
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
    gameMessage.classList.add('hidden');
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

// --- LOJA ---
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

// --- VISUAL DE APOSTAS ---
function showBetChips(elementId, amount) {
    const el = document.getElementById(elementId);
    if(amount > 0) {
        el.innerText = `🪙 ${amount}`;
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
    }
}

// --- LÓGICA DO JOGO ---

function startGame() {
    if (currentUser.chips < 50) return alert("Saldo insuficiente! Visite a loja.");

    clearTable();
    
    // Blinds (Apostas Iniciais)
    const blind = 50;
    currentUser.chips -= blind;
    currentPot = blind * 3; // Jogador + 2 Bots
    
    // Mostra fichas iniciais
    showBetChips('my-bet', blind);
    showBetChips('bot1-bet', blind);
    showBetChips('bot2-bet', blind);

    gameStage = 0;
    currentRoundBet = blind;
    updateUI();
    saveUserData();

    btnStart.style.display = 'none';
    gameControls.classList.remove('hidden');

    dealUserCards();
    setStatus("Sua vez de apostar...");
}

function clearTable() {
    currentPot = 0;
    currentRoundBet = 0;
    gameMessage.classList.add('hidden');
    gameMessage.innerText = '';
    
    document.getElementById('my-cards').innerHTML = '';
    document.querySelectorAll('.card-slot').forEach(slot => slot.innerHTML = '');
    
    // Limpa Bots
    bots.forEach(bot => {
        document.getElementById(bot.elementStatus).style.opacity = '0';
        document.getElementById(bot.betElement).classList.add('hidden');
    });
    
    // Limpa Jogador
    document.getElementById('my-status').style.opacity = '0';
    document.getElementById('my-bet').classList.add('hidden');
    
    updateUI();
}

function playerAction(action, value = 0) {
    let betAmount = 0;

    if (action === 'fold') {
        setStatus("VOCÊ: DESISTIU");
        endHand(false);
        return;
    }

    if (action === 'check') {
        // Se já apostou, é Mesa. Se não, é Pagar (simplificado)
        setStatus("VOCÊ: MESA");
        betAmount = 0; 
    }
    
    // Lógica de Apostas
    else if (action === 'bet') {
        betAmount = value; // Aposta fixa (100)
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

    // Processar aposta
    if (betAmount > 0) {
        if (currentUser.chips >= betAmount) {
            currentUser.chips -= betAmount;
            currentPot += betAmount;
            currentRoundBet += betAmount;
            
            // Atualiza visual
            setStatus(action === 'allin' ? "VOCÊ: ALL-IN!" : `VOCÊ: APOSTOU ${betAmount}`);
            showBetChips('my-bet', currentRoundBet);
            updateUI();
        } else {
            return alert("Fichas insuficientes!");
        }
    }

    // Turno dos Bots
    setTimeout(() => {
        bots.forEach(bot => {
            const botEl = document.getElementById(bot.elementStatus);
            botEl.style.opacity = '1';
            
            // Bot Simples: Se você deu All-in, ele pode foldar ou pagar
            if(action === 'allin' && Math.random() > 0.5) {
                botEl.innerText = "DESISTIU";
                botEl.style.color = '#c0392b';
            } else {
                botEl.innerText = "PAGOU";
                botEl.style.color = '#2ecc71';
                
                // Bot coloca fichas também (Visual)
                const botCall = (betAmount > 0) ? betAmount : 50; 
                currentPot += botCall;
                showBetChips(bot.betElement, botCall);
            }
        });
        updateUI();
        
        setTimeout(nextStreet, 1500);
    }, 1000);
}

function nextStreet() {
    gameStage++;
    
    // Limpa apostas da mesa para a próxima rodada visualmente (opcional, mas comum no poker)
    // showBetChips('my-bet', 0);
    
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
    // 50% de chance para teste
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

    gameMessage.classList.remove('hidden');
    saveUserData();
    updateUI();
}

// --- UTILITÁRIOS ---
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
