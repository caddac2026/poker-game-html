// Game State
const gameState = {
    players: [],
    communityCards: [],
    deck: [],
    pot: 0,
    currentBet: 0,
    currentPlayerIndex: 0,
    gamePhase: 'preflop', // preflop, flop, turn, river, showdown
    round: 0,
    dealerIndex: 0
};

// Card Ranks and Suits
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUES = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };

// Player Class
class Player {
    constructor(name, chips, isHuman = false) {
        this.name = name;
        this.chips = chips;
        this.hand = [];
        this.isHuman = isHuman;
        this.folded = false;
        this.allIn = false;
        this.currentBet = 0;
        this.personality = isHuman ? 'human' : ['aggressive', 'conservative', 'balanced'][Math.floor(Math.random() * 3)];
    }

    reset() {
        this.hand = [];
        this.folded = false;
        this.allIn = false;
        this.currentBet = 0;
    }
}

// Initialize Game
function initGame() {
    gameState.players = [
        new Player('You', 1000, true),
        new Player('Bot - Aggressive', 500),
        new Player('Bot - Conservative', 500),
        new Player('Bot - Balanced', 500)
    ];
    
    gameState.pot = 0;
    gameState.round = 0;
    gameState.dealerIndex = 0;
}

// Create Deck
function createDeck() {
    gameState.deck = [];
    for (let suit of SUITS) {
        for (let rank of RANKS) {
            gameState.deck.push({ rank, suit });
        }
    }
    // Shuffle
    for (let i = gameState.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gameState.deck[i], gameState.deck[j]] = [gameState.deck[j], gameState.deck[i]];
    }
}

// Deal Hand
function dealHand() {
    if (gameState.players.some(p => p.chips === 0 && !p.isHuman)) return;

    gameState.round++;
    gameState.communityCards = [];
    gameState.pot = 0;
    gameState.gamePhase = 'preflop';
    gameState.currentBet = 0;
    
    // Reset players
    gameState.players.forEach(p => p.reset());

    // Create and shuffle deck
    createDeck();

    // Deal 2 cards to each player
    for (let i = 0; i < 2; i++) {
        gameState.players.forEach(p => {
            p.hand.push(gameState.deck.pop());
        });
    }

    updateUI();
    addLog(`Round ${gameState.round} started!`);
    
    // Post blinds
    const smallBlindIndex = (gameState.dealerIndex + 1) % gameState.players.length;
    const bigBlindIndex = (gameState.dealerIndex + 2) % gameState.players.length;

    gameState.players[smallBlindIndex].chips -= 10;
    gameState.players[smallBlindIndex].currentBet = 10;
    gameState.pot += 10;

    gameState.players[bigBlindIndex].chips -= 20;
    gameState.players[bigBlindIndex].currentBet = 20;
    gameState.pot += 20;

    gameState.currentBet = 20;
    gameState.currentPlayerIndex = (bigBlindIndex + 1) % gameState.players.length;

    addLog(`${gameState.players[smallBlindIndex].name} posts small blind (10)`);
    addLog(`${gameState.players[bigBlindIndex].name} posts big blind (20)`);

    if (gameState.players[gameState.currentPlayerIndex].isHuman) {
        showPlayerActions();
    } else {
        setTimeout(botAction, 1000);
    }

    updateUI();
}

// Player Actions
function playerFold() {
    const player = gameState.players[gameState.currentPlayerIndex];
    player.folded = true;
    addLog(`${player.name} folds.`);
    nextAction();
}

function playerCheck() {
    addLog(`${gameState.players[gameState.currentPlayerIndex].name} checks.`);
    nextAction();
}

function playerCall() {
    const player = gameState.players[gameState.currentPlayerIndex];
    const callAmount = Math.min(gameState.currentBet - player.currentBet, player.chips);
    player.chips -= callAmount;
    player.currentBet += callAmount;
    gameState.pot += callAmount;
    addLog(`${player.name} calls ${callAmount}.`);
    nextAction();
}

function playerRaise() {
    const raiseAmount = parseInt(document.getElementById('raiseAmount').value);
    const player = gameState.players[gameState.currentPlayerIndex];
    
    if (isNaN(raiseAmount) || raiseAmount <= 0) {
        alert('Please enter a valid amount');
        return;
    }

    const totalBet = player.currentBet + raiseAmount;
    if (totalBet > player.chips + player.currentBet) {
        alert('Insufficient chips!');
        return;
    }

    const amountToAdd = raiseAmount;
    player.chips -= amountToAdd;
    player.currentBet += amountToAdd;
    gameState.pot += amountToAdd;
    gameState.currentBet = player.currentBet;

    addLog(`${player.name} raises to ${player.currentBet}.`);
    closeRaiseModal();
    nextAction();
}

function playerAllIn() {
    const player = gameState.players[gameState.currentPlayerIndex];
    const amountToAdd = player.chips;
    player.chips = 0;
    player.currentBet += amountToAdd;
    gameState.pot += amountToAdd;
    gameState.currentBet = Math.max(gameState.currentBet, player.currentBet);
    player.allIn = true;
    addLog(`${player.name} goes ALL IN with ${amountToAdd + player.currentBet}!`);
    nextAction();
}

// Bot Action
function botAction() {
    const player = gameState.players[gameState.currentPlayerIndex];
    if (player.folded) {
        nextAction();
        return;
    }

    const callAmount = gameState.currentBet - player.currentBet;
    let action;

    if (player.personality === 'aggressive') {
        action = Math.random() > 0.4 ? 'raise' : (Math.random() > 0.5 ? 'call' : 'fold');
    } else if (player.personality === 'conservative') {
        action = Math.random() > 0.6 ? 'fold' : (Math.random() > 0.5 ? 'call' : 'check');
    } else {
        action = Math.random() > 0.5 ? 'call' : (Math.random() > 0.5 ? 'check' : 'fold');
    }

    if (callAmount === 0 && action !== 'raise') {
        action = 'check';
    }

    if (action === 'fold') {
        player.folded = true;
        addLog(`${player.name} folds.`);
    } else if (action === 'check') {
        addLog(`${player.name} checks.`);
    } else if (action === 'call') {
        const bet = Math.min(callAmount, player.chips);
        player.chips -= bet;
        player.currentBet += bet;
        gameState.pot += bet;
        addLog(`${player.name} calls ${bet}.`);
    } else if (action === 'raise') {
        const raiseAmount = Math.min(Math.floor(player.chips * 0.5), 100);
        if (raiseAmount > 0) {
            player.chips -= raiseAmount;
            player.currentBet += raiseAmount;
            gameState.pot += raiseAmount;
            gameState.currentBet = player.currentBet;
            addLog(`${player.name} raises to ${player.currentBet}.`);
        } else {
            addLog(`${player.name} checks.`);
        }
    }

    nextAction();
}

// Next Action
function nextAction() {
    hidePlayerActions();
    
    const activePlayers = gameState.players.filter(p => !p.folded);
    if (activePlayers.length === 1) {
        endRound();
        return;
    }

    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;

    // Check if all active players have matched bet
    const allMatched = gameState.players.every(p => 
        p.folded || p.allIn || p.currentBet === gameState.currentBet
    );

    if (allMatched && gameState.players.every(p => p.folded || p.currentBet > 0)) {
        advancePhase();
    } else if (gameState.players[gameState.currentPlayerIndex].folded) {
        nextAction();
    } else {
        updateUI();
        if (gameState.players[gameState.currentPlayerIndex].isHuman) {
            showPlayerActions();
        } else {
            setTimeout(botAction, 1000);
        }
    }
}

// Advance Game Phase
function advancePhase() {
    if (gameState.gamePhase === 'preflop') {
        gameState.gamePhase = 'flop';
        // Deal 3 community cards
        for (let i = 0; i < 3; i++) {
            gameState.communityCards.push(gameState.deck.pop());
        }
        addLog('Flop revealed!');
    } else if (gameState.gamePhase === 'flop') {
        gameState.gamePhase = 'turn';
        gameState.communityCards.push(gameState.deck.pop());
        addLog('Turn revealed!');
    } else if (gameState.gamePhase === 'turn') {
        gameState.gamePhase = 'river';
        gameState.communityCards.push(gameState.deck.pop());
        addLog('River revealed!');
    } else if (gameState.gamePhase === 'river') {
        gameState.gamePhase = 'showdown';
        endRound();
        return;
    }

    // Reset betting for new phase
    gameState.players.forEach(p => p.currentBet = 0);
    gameState.currentBet = 0;

    // Find first active player
    let startIndex = (gameState.dealerIndex + 1) % gameState.players.length;
    while (gameState.players[startIndex].folded && gameState.players.some(p => !p.folded)) {
        startIndex = (startIndex + 1) % gameState.players.length;
    }
    gameState.currentPlayerIndex = startIndex;

    updateUI();

    if (gameState.players[gameState.currentPlayerIndex].isHuman) {
        showPlayerActions();
    } else {
        setTimeout(botAction, 1000);
    }
}

// End Round
function endRound() {
    const activePlayers = gameState.players.filter(p => !p.folded);
    
    if (activePlayers.length === 1) {
        const winner = activePlayers[0];
        winner.chips += gameState.pot;
        addLog(`${winner.name} wins the pot of ${gameState.pot}!`);
    } else {
        // Showdown - evaluate hands
        const hands = activePlayers.map(p => ({
            player: p,
            handRank: evaluateHand([...p.hand, ...gameState.communityCards])
        }));
        
        hands.sort((a, b) => b.handRank.score - a.handRank.score);
        const winner = hands[0].player;
        
        winner.chips += gameState.pot;
        addLog(`${winner.name} wins with ${hands[0].handRank.name}!`);
    }

    // Check for eliminated players
    gameState.players.forEach(p => {
        if (p.chips === 0) {
            addLog(`${p.name} is out of the game!`);
        }
    });

    gameState.dealerIndex = (gameState.dealerIndex + 1) % gameState.players.length;
    
    hidePlayerActions();
    document.getElementById('dealBtn').style.display = 'inline-block';
    updateUI();
}

// Evaluate Hand
function evaluateHand(cards) {
    // Simple hand evaluation (not full poker logic, simplified)
    const sorted = cards.sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
    
    // Check for pairs, three of a kind, etc.
    const ranks = cards.map(c => c.rank);
    const rankCounts = {};
    ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);

    const counts = Object.values(rankCounts).sort((a, b) => b - a);

    let score = 0;
    let name = 'High Card';

    if (counts[0] === 4) {
        score = 100;
        name = 'Four of a Kind';
    } else if (counts[0] === 3 && counts[1] === 2) {
        score = 90;
        name = 'Full House';
    } else if (counts[0] === 3) {
        score = 80;
        name = 'Three of a Kind';
    } else if (counts[0] === 2 && counts[1] === 2) {
        score = 70;
        name = 'Two Pair';
    } else if (counts[0] === 2) {
        score = 60;
        name = 'Pair';
    } else {
        score = sorted[0] ? RANK_VALUES[sorted[0].rank] : 0;
    }

    return { score, name };
}

// UI Updates
function updateUI() {
    // Update community cards
    const communityDiv = document.getElementById('communityCards');
    communityDiv.innerHTML = '';
    
    for (let i = 0; i < 5; i++) {
        const card = document.createElement('div');
        card.className = 'card';
        
        if (i < gameState.communityCards.length) {
            const c = gameState.communityCards[i];
            card.textContent = c.rank + c.suit;
            card.classList.add(c.suit === '♥' || c.suit === '♦' ? 'red' : 'black');
        } else {
            card.classList.add('empty');
        }
        
        communityDiv.appendChild(card);
    }

    // Update player UI
    gameState.players.forEach((player, idx) => {
        const playerDiv = document.getElementById(`player${idx}`);
        const chipsSpan = playerDiv.querySelector('.player-chips');
        const actionDiv = playerDiv.querySelector('.player-action');
        const cardsDiv = playerDiv.querySelector('.player-cards');

        chipsSpan.textContent = player.chips;

        // Update cards
        if (player.isHuman) {
            const cards = cardsDiv.querySelectorAll('.card');
            player.hand.forEach((c, i) => {
                if (cards[i]) {
                    cards[i].textContent = c.rank + c.suit;
                    cards[i].classList.add(c.suit === '♥' || c.suit === '♦' ? 'red' : 'black');
                }
            });
        }

        // Update action indicator
        if (gameState.currentPlayerIndex === idx && !player.folded) {
            playerDiv.classList.add('active');
            actionDiv.textContent = 'Acting...';
        } else {
            playerDiv.classList.remove('active');
            actionDiv.textContent = player.folded ? 'Folded' : '';
        }

        // Update player info
        playerDiv.querySelector('.player-name').textContent = player.name;
    });

    // Update pot and phase
    document.getElementById('pot').textContent = gameState.pot;
    document.getElementById('playerChips').textContent = gameState.players[0].chips;
    document.getElementById('myChips').textContent = gameState.players[0].chips;

    // Update status
    const status = `Phase: ${gameState.gamePhase.toUpperCase()} | Pot: ${gameState.pot} | Current Bet: ${gameState.currentBet}`;
    document.getElementById('gameStatus').textContent = status;

    // Update hand display
    if (gameState.players[0].hand.length > 0) {
        const handText = gameState.players[0].hand.map(c => c.rank + c.suit).join(' ');
        document.getElementById('handDisplay').textContent = `Your Hand: ${handText}`;
    }

    // Update dealer button
    const dealerBtn = document.getElementById('dealerButton');
    dealerBtn.style.left = ['50%', '20px', '50%', 'auto'][gameState.dealerIndex];
    dealerBtn.style.top = ['auto', '50px', '-80px', '50px'][gameState.dealerIndex];
}

function showPlayerActions() {
    const player = gameState.players[0];
    const callAmount = gameState.currentBet - player.currentBet;

    document.getElementById('foldBtn').style.display = 'inline-block';
    document.getElementById('callBtn').style.display = callAmount > 0 ? 'inline-block' : 'none';
    document.getElementById('checkBtn').style.display = callAmount === 0 ? 'inline-block' : 'none';
    document.getElementById('raiseBtn').style.display = 'inline-block';
    document.getElementById('allInBtn').style.display = player.chips > 0 ? 'inline-block' : 'none';
    document.getElementById('dealBtn').style.display = 'none';

    if (callAmount > 0) {
        document.getElementById('callBtn').textContent = `Call ${callAmount}`;
    }
}

function hidePlayerActions() {
    document.getElementById('foldBtn').style.display = 'none';
    document.getElementById('checkBtn').style.display = 'none';
    document.getElementById('callBtn').style.display = 'none';
    document.getElementById('raiseBtn').style.display = 'none';
    document.getElementById('allInBtn').style.display = 'none';
}

function showRaiseModal() {
    document.getElementById('raiseModal').style.display = 'flex';
    document.getElementById('raiseAmount').focus();
}

function closeRaiseModal() {
    document.getElementById('raiseModal').style.display = 'none';
    document.getElementById('raiseAmount').value = '';
}

function addLog(message) {
    const log = document.getElementById('gameLog');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = message;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

function newGame() {
    initGame();
    gameState.pot = 0;
    gameState.round = 0;
    document.getElementById('gameLog').innerHTML = '';
    addLog('New game started!');
    updateUI();
    document.getElementById('dealBtn').style.display = 'inline-block';
}

function resetGame() {
    location.reload();
}

// Initialize on load
window.addEventListener('load', () => {
    initGame();
    updateUI();
    addLog('Welcome to Poker! Click "Deal Hand" to start.');
});
