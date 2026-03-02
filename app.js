// 🌟 1. 偵測手機裝置，自動切換至原生高清 UI 🌟
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
if (isMobile) {
    document.body.classList.add('mobile-device');
}

const gameState = {
    settings: { music: false, volume: 0.5, pervertMode: false, showHistory: false, playerCount: 4, passRule: 'round', lastRule: 'single_card', aiSpeed: 1500 },
    deck: [], hands: [[], [], [], []], savedCards: [], playedCardsHistory: [], 
    currentTurn: 0, lastPlayed: null, passCount: 0,
    availableCombos: { single: [], pair: [], straight: [], fullHouse: [], fourOfAKind: [], straightFlush: [] },
    comboIndexes: { single: 0, pair: 0, straight: 0, fullHouse: 0, fourOfAKind: 0, straightFlush: 0 },
    currentRound: 1, scores: [0, 0, 0, 0]
};

const suitWeights = { '♣': 1, '♦': 2, '♥': 3, '♠': 4 };
const valueWeights = { '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15 };
const faceValues = { 'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13 };
const suits = ['♣', '♦', '♥', '♠'];
const trackerValues = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
const typeNames = { single: '單張', pair: '對子', straight: '順子', fullHouse: '葫蘆', fourOfAKind: '鐵支', straightFlush: '同花順' };

const dom = {
    mainMenu: document.getElementById('main-menu'), gameScreen: document.getElementById('game-screen'),
    startGameBtn: document.getElementById('startGameBtn'), modals: document.querySelectorAll('.modal'),
    bgm: document.getElementById('bgm'), centerTable: document.getElementById('center-table'),
    myCards: document.getElementById('my-cards'), savedCards: document.getElementById('saved-cards'),
    historyPanel: document.getElementById('history-panel'), historyList: document.getElementById('history-list'),
    trackerPanel: document.getElementById('tracker-panel'), 
    trackerGrid: document.getElementById('tracker-grid'),
    playBtn: document.getElementById('playBtn'), passBtn: document.getElementById('passBtn'), saveComboBtn: document.getElementById('saveComboBtn'),
    turnIndicator: document.getElementById('turn-indicator'),
    volumeSlider: document.getElementById('setting-volume')
};

function initTracker() {
    dom.trackerGrid.innerHTML = '';
    suits.forEach(suit => {
        trackerValues.forEach(val => {
            let cell = document.createElement('div');
            cell.className = 'tracker-cell';
            cell.id = `track-${suit}-${val}`;
            cell.style.color = (suit === '♥' || suit === '♦') ? '#e57373' : '#9e9e9e';
            cell.innerHTML = `<span>${val}</span><span style="font-size:10px">${suit}</span>`;
            dom.trackerGrid.appendChild(cell);
        });
    });
}

function updateTracker(playedCards) {
    playedCards.forEach(c => {
        let cell = document.getElementById(`track-${c.suit}-${c.value}`);
        if(cell) cell.classList.add('played');
    });
}

function updateScoreUI() {
    for(let i=0; i<4; i++) {
        let el = document.getElementById(`score-${i}`);
        if (el) el.innerText = `${gameState.scores[i] > 0 ? '+' : ''}${gameState.scores[i]}分`;
    }
    let rNum = document.getElementById('round-num');
    if(rNum) rNum.innerText = gameState.currentRound;
}

document.getElementById('menuSettingsBtn').addEventListener('click', () => document.getElementById('settingsModal').style.display = 'block');
document.getElementById('gameSettingsBtn').addEventListener('click', () => document.getElementById('settingsModal').style.display = 'block');

dom.volumeSlider.addEventListener('input', (e) => {
    gameState.settings.volume = parseFloat(e.target.value);
    dom.bgm.volume = gameState.settings.volume;
});

// 🌟 2. 遊戲中途切換人數的警告防呆 🌟
document.getElementById('closeSettingsBtn').addEventListener('click', () => {
    let newPlayerCount = parseInt(document.getElementById('setting-player-count').value);
    let applyCountChange = false;

    if (newPlayerCount !== gameState.settings.playerCount) {
        if (dom.gameScreen.style.display !== 'none') {
            let confirmSwitch = confirm("如果遊戲中切換人數，會喪失所有紀錄並開啟新一輪牌局。請問是否繼續？");
            if (confirmSwitch) {
                applyCountChange = true;
            } else {
                document.getElementById('setting-player-count').value = gameState.settings.playerCount;
                newPlayerCount = gameState.settings.playerCount;
            }
        } else {
            applyCountChange = true;
        }
    }

    gameState.settings.music = document.getElementById('setting-music').checked;
    gameState.settings.volume = parseFloat(dom.volumeSlider.value);
    gameState.settings.pervertMode = document.getElementById('setting-pervert').checked;
    gameState.settings.showHistory = document.getElementById('setting-history').checked;
    gameState.settings.playerCount = newPlayerCount;
    gameState.settings.aiSpeed = parseInt(document.getElementById('setting-ai-speed').value);
    
    dom.bgm.volume = gameState.settings.volume;
    if (gameState.settings.music && dom.gameScreen.style.display !== 'none') dom.bgm.play().catch(()=>{}); 
    else dom.bgm.pause();
    
    dom.historyPanel.style.display = gameState.settings.showHistory ? 'block' : 'none';
    dom.trackerPanel.style.display = gameState.settings.showHistory ? 'flex' : 'none';
    
    document.getElementById('player-right').style.display = (gameState.settings.playerCount === 3) ? 'none' : 'block';
    document.getElementById('settingsModal').style.display = 'none';

    if (applyCountChange && dom.gameScreen.style.display !== 'none') {
        gameState.currentRound = 1; 
        gameState.scores = [0, 0, 0, 0]; 
        updateScoreUI();
        dealCards();
    }
});

dom.startGameBtn.addEventListener('click', () => {
    dom.mainMenu.style.display = 'none'; dom.gameScreen.style.display = 'block';
    dom.bgm.volume = gameState.settings.volume;
    if (gameState.settings.music) { dom.bgm.play().catch(e => { console.error("音樂播放失敗", e); }); }
    gameState.currentRound = 1; gameState.scores = [0, 0, 0, 0]; updateScoreUI();
    dealCards();
});

document.getElementById('nextRoundBtn').addEventListener('click', () => { 
    document.getElementById('gameOverModal').style.display = 'none'; 
    gameState.currentRound++; updateScoreUI(); dealCards(); 
});
document.getElementById('playAgainBtn').addEventListener('click', () => { 
    document.getElementById('gameOverModal').style.display = 'none'; 
    gameState.currentRound = 1; gameState.scores = [0, 0, 0, 0]; updateScoreUI(); dealCards(); 
});
document.getElementById('returnMenuBtn').addEventListener('click', () => {
    document.getElementById('gameOverModal').style.display = 'none'; dom.gameScreen.style.display = 'none';
    dom.mainMenu.style.display = 'flex'; dom.bgm.pause();
});

function generatePips(card) {
    let s = card.suit;
    if (card.value === 'A') return `<div class="pips"><div class="pip pip-A">${s}</div></div>`;
    if (['J', 'Q', 'K'].includes(card.value)) {
        let icon = card.value === 'K' ? '♚' : card.value === 'Q' ? '♛' : '♝';
        return `<div class="face-card"><div class="face-icon">${icon}</div></div>`;
    }
    let html = `<div class="pips">`;
    let v = parseInt(card.value);
    if(v===2) html += `<div class="pip ptm">${s}</div><div class="pip pbm">${s}</div>`;
    if(v===3) html += `<div class="pip ptm">${s}</div><div class="pip pmm">${s}</div><div class="pip pbm">${s}</div>`;
    if(v===4) html += `<div class="pip ptl">${s}</div><div class="pip ptr">${s}</div><div class="pip pbl">${s}</div><div class="pip pbr">${s}</div>`;
    if(v===5) html += `<div class="pip ptl">${s}</div><div class="pip ptr">${s}</div><div class="pip pmm">${s}</div><div class="pip pbl">${s}</div><div class="pip pbr">${s}</div>`;
    if(v===6) html += `<div class="pip ptl">${s}</div><div class="pip ptr">${s}</div><div class="pip pml">${s}</div><div class="pip pmr">${s}</div><div class="pip pbl">${s}</div><div class="pip pbr">${s}</div>`;
    if(v===7) html += `<div class="pip ptl">${s}</div><div class="pip ptr">${s}</div><div class="pip pum">${s}</div><div class="pip pml">${s}</div><div class="pip pmr">${s}</div><div class="pip pbl">${s}</div><div class="pip pbr">${s}</div>`;
    if(v===8) html += `<div class="pip ptl">${s}</div><div class="pip ptr">${s}</div><div class="pip pum">${s}</div><div class="pip pml">${s}</div><div class="pip pmr">${s}</div><div class="pip plm">${s}</div><div class="pip pbl">${s}</div><div class="pip pbr">${s}</div>`;
    if(v===9) html += `<div class="pip ptl">${s}</div><div class="pip ptr">${s}</div><div class="pip puml">${s}</div><div class="pip pumr">${s}</div><div class="pip pmm">${s}</div><div class="pip plml">${s}</div><div class="pip plmr">${s}</div><div class="pip pbl">${s}</div><div class="pip pbr">${s}</div>`;
    if(v===10) html += `<div class="pip ptl">${s}</div><div class="pip ptr">${s}</div><div class="pip puml">${s}</div><div class="pip pumr">${s}</div><div class="pip pum">${s}</div><div class="pip plm">${s}</div><div class="pip plml">${s}</div><div class="pip plmr">${s}</div><div class="pip pbl">${s}</div><div class="pip pbr">${s}</div>`;
    return html + `</div>`;
}

function createCardDOM(card, sourceArray, targetContainer, isMini = false) {
    let cardDiv = document.createElement('div');
    cardDiv.className = 'card' + (isMini ? ' mini' : '');
    cardDiv.style.color = (card.suit === '♥' || card.suit === '♦') ? '#d32f2f' : '#212121';
    cardDiv.setAttribute('data-suit', card.suit);
    
    if (card.selected && !isMini) cardDiv.classList.add('selected');

    cardDiv.innerHTML = `<div class="card-corner top-left"><span>${card.value}</span><span>${card.suit}</span></div>${generatePips(card)}<div class="card-corner bottom-right"><span>${card.value}</span><span>${card.suit}</span></div>`;
    
    if (sourceArray && !isMini) { 
        if (card.selected === undefined) card.selected = false;
        cardDiv.addEventListener('click', () => {
            card.selected = !card.selected;
            if (card.selected) cardDiv.classList.add('selected'); else cardDiv.classList.remove('selected');
        });
    }
    targetContainer.appendChild(cardDiv);
}

const delay = ms => new Promise(res => setTimeout(res, ms));

function updateOpponentCardCount(players) {
    for(let i=1; i<players; i++) {
        let nameEl = document.querySelector(`#player-${i===1?'left':i===2?'top':'right'} .ai-name`);
        if (nameEl) nameEl.innerHTML = `AI ${i} <span class="score-badge" id="score-${i}">${gameState.scores[i] >= 0 ? '+' : ''}${gameState.scores[i]}分</span><br>(${gameState.hands[i].length}張)`;
    }
}

async function dealCards() {
    let rawDeck = [];
    for (let suit of suits) for (let value of trackerValues) rawDeck.push({ suit, value, weight: valueWeights[value] * 10 + suitWeights[suit], faceValue: faceValues[value] });
    for (let i = rawDeck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rawDeck[i], rawDeck[j]] = [rawDeck[j], rawDeck[i]]; }
    
    gameState.deck = rawDeck; gameState.hands = [[], [], [], []]; gameState.savedCards = [];
    gameState.playedCardsHistory = []; gameState.lastPlayed = null; gameState.passCount = 0;
    dom.historyList.innerHTML = ''; dom.myCards.innerHTML = ''; dom.savedCards.innerHTML = '';
    for(let i=1; i<=3; i++) document.getElementById(`ai${i}-cards`).innerHTML = '';
    dom.saveComboBtn.innerText = "保存組合 >>";
    
    dom.turnIndicator.style.visibility = 'hidden';
    initTracker(); 
    
    let players = gameState.settings.playerCount;
    let startIndex = 0;
    let bottomCard = null;
    let cardsToDeal = 0;

    if (players === 3) {
        bottomCard = gameState.deck.pop();
        dom.centerTable.innerHTML = `<div class="table-msg">抽底牌決定順序...<br>底牌點數: ${bottomCard.faceValue}</div><div id="deck-origin" class="card-back" style="position:relative; margin-top:10px;"></div>`;
        startIndex = (bottomCard.faceValue - 1) % players;
        cardsToDeal = 51;
    } else {
        let randomFace = Math.floor(Math.random() * 13) + 1;
        dom.centerTable.innerHTML = `<div class="table-msg">系統隨機抽點決定順序...<br>點數: ${randomFace}</div><div id="deck-origin" class="card-back" style="position:relative; margin-top:10px;"></div>`;
        startIndex = (randomFace - 1) % players;
        cardsToDeal = 52;
    }
    
    let originRect = document.getElementById('deck-origin').getBoundingClientRect();
    await delay(800);
    
    let animationPromises = [];
    for (let i = 0; i < cardsToDeal; i++) {
        let targetPlayer = (startIndex + i) % players;
        gameState.hands[targetPlayer].push(gameState.deck[i]);
        
        let p = new Promise(resolve => {
            let flying = document.createElement('div');
            flying.className = 'card-back flying-card';
            flying.style.left = `${originRect.left}px`; flying.style.top = `${originRect.top}px`;
            flying.style.transition = 'transform 0.1s ease-out';
            document.body.appendChild(flying);
            
            let targetContainer = targetPlayer === 0 ? dom.myCards : document.getElementById(`ai${targetPlayer}-cards`);
            let targetRect = targetContainer.getBoundingClientRect();
            
            void flying.offsetWidth; 
            flying.style.transform = `translate(${targetRect.left + 20 - originRect.left}px, ${targetRect.top + 20 - originRect.top}px)`;
            
            setTimeout(() => {
                flying.remove();
                let staticBack = document.createElement('div'); staticBack.className = 'card-back';
                targetContainer.appendChild(staticBack);
                updateOpponentCardCount(players);
                resolve();
            }, 100);
        });
        animationPromises.push(p);
        await delay(20); 
    }
    
    await Promise.all(animationPromises); 
    await delay(200); 
    
    let club3Owner = -1;
    for (let i = 0; i < players; i++) {
        if (gameState.hands[i].find(c => c.suit === '♣' && c.value === '3')) { club3Owner = i; break; }
    }
    
    if (players === 3) {
        if (club3Owner === -1) club3Owner = startIndex; 
        gameState.hands[club3Owner].push(bottomCard);
        if (club3Owner === 0) {
            gameState.hands[0].sort((a, b) => a.weight - b.weight);
            renderMyCards();
        } else {
            let staticBack = document.createElement('div'); staticBack.className = 'card-back';
            document.getElementById(`ai${club3Owner}-cards`).appendChild(staticBack);
        }
        updateOpponentCardCount(players);
    }
    
    gameState.currentTurn = club3Owner;
    gameState.hands.forEach(hand => hand.sort((a, b) => a.weight - b.weight));
    
    renderMyCards(); 
    analyzeHandCombos();
    
    if (players === 3 && bottomCard) {
        dom.centerTable.innerHTML = `<div class="table-msg">${club3Owner === 0 ? '你' : 'AI '+club3Owner} 獲得底牌，請先手出牌</div>`;
        let tableDeck = document.createElement('div'); tableDeck.className = 'cards-container single-row'; tableDeck.style.paddingTop = '0';
        createCardDOM(bottomCard, null, tableDeck, true);
        dom.centerTable.appendChild(tableDeck);
    } else {
        dom.centerTable.innerHTML = `<div class="table-msg">${club3Owner === 0 ? '你' : 'AI '+club3Owner} 擁有梅花3，請先手出牌</div>`;
    }
    
    checkTurn();
}

function renderMyCards() {
    dom.myCards.innerHTML = ''; dom.savedCards.innerHTML = '';
    gameState.hands[0].forEach(card => createCardDOM(card, gameState.hands[0], dom.myCards));
    gameState.savedCards.forEach(card => createCardDOM(card, gameState.savedCards, dom.savedCards));
}

const cartesianProduct = (arr) => arr.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())), [[]]);
function getCombinations(arr, k) {
    if (k === 1) return arr.map(a => [a]);
    let combos = [];
    for (let i = 0; i <= arr.length - k; i++) {
        let head = arr.slice(i, i + 1);
        let tailCombos = getCombinations(arr.slice(i + 1), k - 1);
        tailCombos.forEach(tc => combos.push(head.concat(tc)));
    }
    return combos;
}

function findAllCombos(handCards) {
    let combos = { single: [], pair: [], straight: [], fullHouse: [], fourOfAKind: [], straightFlush: [] };
    let hand = [...handCards].sort((a,b) => a.weight - b.weight);
    
    hand.forEach(c => combos.single.push([c]));
    for (let i = 0; i < hand.length - 1; i++) for (let j = i + 1; j < hand.length; j++) if (hand[i].value === hand[j].value) combos.pair.push([hand[i], hand[j]]);
    
    let valGroups = {}; hand.forEach(c => { valGroups[c.value] = valGroups[c.value] || []; valGroups[c.value].push(c); });
    let triples = [], pairs = [], fours = [];
    for (let val in valGroups) {
        if (valGroups[val].length === 4) fours.push(valGroups[val]);
        if (valGroups[val].length >= 3) triples.push(valGroups[val]);
        if (valGroups[val].length >= 2) pairs.push(valGroups[val]);
    }

    fours.forEach(f => {
        hand.forEach(c => { if (c.value !== f[0].value) combos.fourOfAKind.push([...f, c]); });
    });
    
    triples.forEach(t => { 
        let tCombs = getCombinations(t, 3);
        pairs.forEach(p => { 
            if (t[0].value !== p[0].value) {
                let pCombs = getCombinations(p, 2);
                tCombs.forEach(tc => pCombs.forEach(pc => combos.fullHouse.push([...tc, ...pc])));
            }
        }); 
    });

    const straightSeqs = [['A','2','3','4','5'], ['2','3','4','5','6'], ['3','4','5','6','7'], ['4','5','6','7','8'], ['5','6','7','8','9'], ['6','7','8','9','10'], ['7','8','9','10','J'], ['8','9','10','J','Q'], ['9','10','J','Q','K'], ['10','J','Q','K','A']];
    straightSeqs.forEach(seq => {
        let possibleGroups = seq.map(v => valGroups[v]);
        if(possibleGroups.every(group => group && group.length > 0)) {
            let allCombinations = cartesianProduct(possibleGroups);
            allCombinations.forEach(sCombo => {
                if(new Set(sCombo.map(c=>c.suit)).size === 1) combos.straightFlush.push(sCombo); 
                else combos.straight.push(sCombo);
            });
        }
    });

    for (let type in combos) combos[type].sort((a, b) => getHandPower(a).power - getHandPower(b).power);
    return combos;
}

function analyzeHandCombos() {
    let allCombos = findAllCombos([...gameState.hands[0], ...gameState.savedCards]);
    gameState.comboIndexes = { single: 0, pair: 0, straight: 0, fullHouse: 0, fourOfAKind: 0, straightFlush: 0 };
    gameState.availableCombos = allCombos;

    document.querySelectorAll('.combo-btn').forEach(btn => {
        let type = btn.getAttribute('data-type');
        if (allCombos[type].length > 0) { btn.classList.remove('dim'); btn.classList.add('active'); }
        else { btn.classList.add('dim'); btn.classList.remove('active'); }
    });
}

document.querySelectorAll('.combo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        let type = btn.getAttribute('data-type');
        let combos = gameState.availableCombos[type];
        if (combos.length === 0) return; 
        gameState.hands[0].forEach(c => c.selected = false);
        gameState.savedCards.forEach(c => c.selected = false);
        combos[gameState.comboIndexes[type]].forEach(comboCard => {
            let found = gameState.hands[0].find(c => c === comboCard) || gameState.savedCards.find(c => c === comboCard);
            if (found) found.selected = true; 
        });
        gameState.comboIndexes[type] = (gameState.comboIndexes[type] + 1) % combos.length;
        renderMyCards();
    });
});

dom.saveComboBtn.addEventListener('click', () => {
    if (gameState.savedCards.length > 0) {
        gameState.hands[0].push(...gameState.savedCards);
        gameState.hands[0].sort((a,b)=>a.weight - b.weight);
        gameState.savedCards = [];
        dom.saveComboBtn.innerText = "保存組合 >>";
        renderMyCards(); analyzeHandCombos();
        return;
    }
    let selected = gameState.hands[0].filter(c => c.selected);
    if (selected.length === 0) return alert("請先選擇要保存的牌！");
    let playData = getHandPower(selected);
    if (!playData) return alert("這不是合法的牌型！");
    let newHand = [];
    gameState.hands[0].forEach(card => {
        if (card.selected) { card.selected = false; gameState.savedCards.push(card); } else { newHand.push(card); }
    });
    gameState.hands[0] = newHand;
    gameState.savedCards.sort((a, b) => a.weight - b.weight);
    dom.saveComboBtn.innerText = "<< 取消保存";
    renderMyCards(); analyzeHandCombos(); 
});

function getHandPower(cards) {
    if (cards.length === 1) return { type: 'single', power: cards[0].weight, cards: cards };
    if (cards.length === 2 && cards[0].value === cards[1].value) return { type: 'pair', power: Math.max(cards[0].weight, cards[1].weight), cards: cards };
    if (cards.length === 4 && new Set(cards.map(c=>c.value)).size === 1) return { type: 'fourOfAKind', power: cards[0].weight * 100, cards: cards };
    
    if (cards.length === 5) {
        let counts = {}; cards.forEach(c => counts[c.value] = (counts[c.value] || 0) + 1);
        let vals = Object.values(counts);
        
        if (vals.includes(4)) {
            let quadVal = Object.keys(counts).find(k => counts[k] === 4);
            return { type: 'fourOfAKind', power: valueWeights[quadVal] * 100, cards: cards };
        }
        if (vals.includes(3) && vals.includes(2)) {
            let tripleVal = Object.keys(counts).find(k => counts[k] === 3);
            return { type: 'fullHouse', power: valueWeights[tripleVal] * 100, cards: cards };
        }
        
        let isFlush = new Set(cards.map(c=>c.suit)).size === 1;
        let sortedWeights = cards.map(c => c.weight).sort((a,b)=>a-b);
        let valSet = new Set(cards.map(c=>c.value));
        
        let isStraight = false;
        let straightPower = 0;

        if(valSet.has('2') && valSet.has('3') && valSet.has('4') && valSet.has('5')) {
            if(valSet.has('6')) { straightPower = cards.find(c=>c.value === '2').weight + 1000; isStraight = true; }
            else if(valSet.has('A')) { straightPower = cards.find(c=>c.value === '5').weight - 1000; isStraight = true; }
        } else {
            let wVals = Array.from(valSet).map(v => valueWeights[v]).sort((a,b)=>a-b);
            if (wVals.length === 5 && wVals[4] - wVals[0] === 4) {
                straightPower = sortedWeights[4]; 
                isStraight = true;
            }
        }

        if (isStraight) {
            if (isFlush) return { type: 'straightFlush', power: straightPower * 1000, cards: cards };
            return { type: 'straight', power: straightPower, cards: cards };
        }
    }
    return null;
}

dom.playBtn.addEventListener('click', () => {
    if (gameState.currentTurn !== 0) return alert("還沒輪到你！");
    let selected = [...gameState.hands[0].filter(c=>c.selected), ...gameState.savedCards.filter(c=>c.selected)];
    if (selected.length === 0) return alert("請先選擇要出的牌！");
    if (gameState.playedCardsHistory.length === 0 && !selected.find(c=>c.suit === '♣' && c.value === '3')) return alert("首局第一手必須包含梅花3！");

    let playData = getHandPower(selected);
    if (!playData) return alert("這不是合法的牌型！");

    if (gameState.lastPlayed && gameState.lastPlayed.player !== 0) {
        let lp = gameState.lastPlayed;
        if (playData.type === 'fourOfAKind' && lp.type !== 'fourOfAKind' && lp.type !== 'straightFlush') { }
        else if (playData.type === 'straightFlush' && lp.type !== 'straightFlush') { }
        else if (playData.type !== lp.type || selected.length !== lp.cards.length) return alert("必須出與上一手相同的牌型和張數！");
        else if (playData.power <= lp.power) return alert("你的牌沒有大過上一家！");
    }
    executePlay(0, selected, playData);
});

dom.passBtn.addEventListener('click', () => {
    if (gameState.currentTurn !== 0) return alert("還沒輪到你！");
    if (!gameState.lastPlayed || gameState.lastPlayed.player === 0) return alert("現在檯面最大是你，不能 Pass！");
    
    let cardsContainer = dom.centerTable.querySelector('.cards-container');
    let cardsHtml = cardsContainer ? cardsContainer.outerHTML : '';
    dom.centerTable.innerHTML = `<div class="table-msg" style="color:#aaa;">你 選擇 Pass</div>${cardsHtml}`;
    
    logHistory(`玩家 Pass`);
    gameState.passCount++; nextTurn();
});

function calculatePenalty(hand, winnerPlayData) {
    let count = hand.length;
    if (count === 0) return { penalty: 0, text: '' };
    
    let penalty = count; 
    let reasons = [`剩 ${count} 張 (-${count})`];

    if (count >= 10) {
        penalty *= 2; 
        reasons.push(`牌數≥10 (x2)`);
    }
    
    let twosCount = hand.filter(c => c.value === '2').length;
    for(let i=0; i<twosCount; i++) {
        penalty *= 2; 
        reasons.push(`未出老二 (x2)`);
    }

    let valGroups = {}; hand.forEach(c => { valGroups[c.value] = valGroups[c.value] || []; valGroups[c.value].push(c); });
    let bombsCount = 0;
    for (let v in valGroups) if (valGroups[v].length >= 4) bombsCount++;
    
    let allCombos = findAllCombos(hand);
    let sfCount = allCombos.straightFlush.length > 0 ? 1 : 0; 
    let monstersCount = bombsCount + sfCount;
    for(let i=0; i<monstersCount; i++) {
        penalty *= 2; 
        reasons.push(`未出怪物 (x2)`);
    }
    
    if (winnerPlayData.type === 'fourOfAKind' || winnerPlayData.type === 'straightFlush') {
        penalty *= 2;
        reasons.push(`被怪物尾刀 (x2)`);
    } else if ((winnerPlayData.type === 'single' || winnerPlayData.type === 'pair') && winnerPlayData.cards[0].value === '2') {
        penalty *= 2;
        reasons.push(`被老二尾刀 (x2)`);
    }
    
    return { penalty: penalty, text: reasons.join(' ➔ ') };
}

// 🌟 3. 防彈裝甲：保證 HTML 結算面板就算寫錯也不會當機 🌟
function executePlay(playerIndex, cards, playData) {
    gameState.hands[playerIndex] = gameState.hands[playerIndex].filter(c => !cards.includes(c));
    if(playerIndex === 0) gameState.savedCards = gameState.savedCards.filter(c => !cards.includes(c));
    if(playerIndex === 0 && gameState.savedCards.length === 0) dom.saveComboBtn.innerText = "保存組合 >>"; 
    
    gameState.lastPlayed = { player: playerIndex, type: playData.type, cards: cards, power: playData.power };
    gameState.passCount = 0; 
    
    let playerName = playerIndex === 0 ? '你' : 'AI ' + playerIndex;
    let typeStr = typeNames[playData.type] || '未知';
    let cardsDetail = cards.map(c => c.suit + c.value).join(' '); 
    
    dom.centerTable.innerHTML = `<div class="table-msg">${playerName} 出牌：${typeStr}<br><span style="font-size:13px; color:#aaa">${cardsDetail}</span></div><div class="cards-container single-row" style="min-height: auto; padding-top:0;"></div>`;
    let tableContainer = dom.centerTable.querySelector('.cards-container');
    cards.forEach(c => createCardDOM(c, null, tableContainer, true));
    
    logHistory(`${playerName}：${typeStr} (${cardsDetail})`);
    updateTracker(cards); 
    
    renderMyCards(); 
    if(playerIndex !== 0) {
        let aiContainer = document.getElementById(`ai${playerIndex}-cards`);
        for(let i=0; i<cards.length; i++) if(aiContainer.lastChild) aiContainer.removeChild(aiContainer.lastChild);
        updateOpponentCardCount(gameState.settings.playerCount);
    }
    analyzeHandCombos();
    
    let remainingCards = playerIndex === 0 ? (gameState.hands[0].length + gameState.savedCards.length) : gameState.hands[playerIndex].length;
    
    if (remainingCards === 0) {
        try {
            let roundScores = [0, 0, 0, 0];
            let totalPenalty = 0;
            let detailsHtml = `<div style="max-height: 250px; overflow-y: auto;">`; 

            for (let i = 0; i < gameState.settings.playerCount; i++) {
                if (i === playerIndex) continue;
                let hand = i === 0 ? [...gameState.hands[0], ...gameState.savedCards] : gameState.hands[i];
                
                let pData = calculatePenalty(hand, playData);
                let p = pData.penalty;
                roundScores[i] = -p;
                totalPenalty += p;
                
                let name = i === 0 ? '你' : `AI ${i}`;
                detailsHtml += `
                <div style="margin-bottom: 8px; background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px;">
                    <div style="font-weight: bold; margin-bottom: 3px; font-size: 15px;">${name} <span style="color:#ef5350; float:right;">-${p} 分</span></div>
                    <div style="font-size: 12px; color: #aaa; line-height: 1.3;">[明細] ${pData.text}</div>
                </div>`;
            }
            
            roundScores[playerIndex] = totalPenalty;
            for(let i=0; i<gameState.settings.playerCount; i++) gameState.scores[i] += roundScores[i];
            
            let winnerName = playerIndex === 0 ? '你' : `AI ${playerIndex}`;
            detailsHtml += `<hr style="border:0; border-top:1px dashed #555; margin: 10px 0;"><div style="color:#fbc02d; font-size:18px; text-align:center; font-weight:bold;">🏆 贏家 ${winnerName} 獲得 +${totalPenalty} 分！</div></div>`;
            
            updateScoreUI();

            document.getElementById('winner-msg').innerText = playerIndex === 0 ? "🎉 恭喜你，你贏了！" : `💀 遊戲結束，${winnerName} 贏了！`;
            
            let roundSummaryEl = document.getElementById('round-summary');
            if (roundSummaryEl) roundSummaryEl.innerHTML = detailsHtml;
            
            let modalEl = document.getElementById('gameOverModal');
            if (modalEl) modalEl.style.display = 'block';
            else alert("遊戲結束！" + winnerName + "贏了！(請更新 HTML 檔案以顯示計分板)");

        } catch (e) {
            console.error("結算錯誤:", e);
            alert("結算時發生錯誤，請確認已更新最新版 HTML！");
        }
        return; 
    }
    nextTurn();
}

function logHistory(msg) {
    let li = document.createElement('li'); li.innerText = msg;
    dom.historyList.appendChild(li); gameState.playedCardsHistory.push(msg);
    dom.historyPanel.scrollTop = dom.historyPanel.scrollHeight;
}

function nextTurn() {
    gameState.currentTurn = (gameState.currentTurn + 1) % gameState.settings.playerCount;
    if (gameState.passCount >= gameState.settings.playerCount - 1) {
        gameState.lastPlayed = null; gameState.passCount = 0;
        dom.centerTable.innerHTML = `<div class="table-msg">大家都 Pass<br>由 ${gameState.currentTurn === 0 ? '你' : 'AI '+gameState.currentTurn} 重新出牌</div>`;
    }
    checkTurn();
}

function checkTurn() {
    if (gameState.currentTurn === 0) {
        dom.playBtn.classList.remove('dim');
        dom.turnIndicator.style.visibility = 'visible'; 
    } else {
        dom.playBtn.classList.add('dim');
        dom.turnIndicator.style.visibility = 'hidden'; 
        setTimeout(() => simulateAI(gameState.currentTurn), gameState.settings.aiSpeed);
    }
}

function getGreedyDecomposition(handCards) {
    let tempHand = [...handCards];
    let combosPlayed = [];
    let turns = 0;
    while (tempHand.length > 0 && turns < 20) {
        let curCombos = findAllCombos(tempHand);
        let toRemove = [];
        if (curCombos.straightFlush.length > 0) { toRemove = curCombos.straightFlush[0]; }
        else if (curCombos.fourOfAKind.length > 0) { toRemove = curCombos.fourOfAKind[0]; }
        else if (curCombos.straight.length > 0) { toRemove = curCombos.straight[0]; }
        else if (curCombos.fullHouse.length > 0) { toRemove = curCombos.fullHouse[0]; }
        else if (curCombos.pair.length > 0) { toRemove = curCombos.pair[0]; }
        else { toRemove = [tempHand[0]]; } 
        
        combosPlayed.push(toRemove);
        tempHand = tempHand.filter(c => !toRemove.includes(c));
        turns++;
    }
    return combosPlayed;
}

function evaluateHandState(handCards) {
    if (handCards.length === 0) return 99999; 
    let score = 0;
    handCards.forEach(c => {
        if (c.value === '2') score += 50;
        if (c.value === 'A') score += 20;
    });

    let decomp = getGreedyDecomposition(handCards);
    score -= (decomp.length * 30);
    
    decomp.forEach(combo => {
        let p = getHandPower(combo);
        if (p && p.type === 'straightFlush') score += 100;
        if (p && p.type === 'fourOfAKind') score += 80;
    });

    return score;
}

function simulateAI(aiIndex) {
    let aiHand = gameState.hands[aiIndex];
    let aiCombos = findAllCombos(aiHand);
    let validPlays = [];
    
    let isSuppression = false;
    for (let i = 0; i < gameState.settings.playerCount; i++) {
        if (i !== aiIndex && gameState.hands[i].length <= 3) {
            isSuppression = true; break;
        }
    }
    
    function getPlayScore(play, isLeading) {
        let remainHand = aiHand.filter(c => !play.cards.includes(c));
        let score = evaluateHandState(remainHand);
        
        if (isLeading) {
            score += (play.cards.length * 2);
            let nextPlayer = (aiIndex + 1) % gameState.settings.playerCount;
            let nextPlayerCards = gameState.hands[nextPlayer].length;
            if (nextPlayerCards === 1 && play.data.type === 'single') {
                if (!['2', 'A'].includes(play.data.cards[0].value)) score -= 2000; 
            }
            if (nextPlayerCards === 2 && play.data.type === 'pair') {
                if (!['2', 'A'].includes(play.data.cards[0].value)) score -= 2000; 
            }
        }

        if (gameState.settings.pervertMode) {
            let playerHand = [...gameState.hands[0], ...gameState.savedCards];
            let pCombos = findAllCombos(playerHand);
            
            let playerCanBeat = false;
            if (pCombos[play.data.type] && pCombos[play.data.type].length > 0) {
                playerCanBeat = pCombos[play.data.type].some(c => getHandPower(c).power > play.data.power);
            }
            if (!playerCanBeat && play.data.type !== 'fourOfAKind' && play.data.type !== 'straightFlush') {
                if (pCombos.fourOfAKind.length > 0 || pCombos.straightFlush.length > 0) playerCanBeat = true;
            } else if (!playerCanBeat && play.data.type === 'fourOfAKind' && pCombos.straightFlush.length > 0) {
                playerCanBeat = true;
            }

            if (!playerCanBeat) {
                // 🌟 修正變態模式過度活躍：起手時絕對不要無腦加分丟大牌 🌟
                if (!isLeading) score += 400; 
            } else {
                let isPlayerNext = ((aiIndex + 1) % gameState.settings.playerCount) === 0;
                if (isPlayerNext && playerHand.length <= 4) score -= 600; 
            }
            
            if (isLeading && playerHand.length <= 6) {
                if (pCombos[play.data.type].length === 0) score += 150; 
                else score -= 50; 
            }
        }
        return score;
    }

    let currentScore = evaluateHandState(aiHand);

    if (!gameState.lastPlayed) {
        let hasClub3 = aiHand.find(c => c.suit === '♣' && c.value === '3');
        if (gameState.playedCardsHistory.length === 0 && hasClub3) {
            ['single', 'pair', 'straight', 'fullHouse', 'fourOfAKind', 'straightFlush'].forEach(type => {
                aiCombos[type].forEach(combo => {
                    if (combo.includes(hasClub3)) validPlays.push({ cards: combo, data: getHandPower(combo) });
                });
            });
            validPlays.sort((a, b) => getPlayScore(b, true) - getPlayScore(a, true));
            if (validPlays.length > 0) {
                executePlay(aiIndex, validPlays[0].cards, validPlays[0].data);
                return;
            }
        }

        let decomp = getGreedyDecomposition(aiHand);
        if (decomp.length === 2 && gameState.playedCardsHistory.length > 0) {
            let p0 = getHandPower(decomp[0]); let p1 = getHandPower(decomp[1]);
            let isP0Nuts = p0 && (p0.type === 'fourOfAKind' || p0.type === 'straightFlush' || (p0.type === 'single' && p0.cards[0].value === '2') || (p0.type === 'pair' && p0.cards[0].value === '2'));
            let isP1Nuts = p1 && (p1.type === 'fourOfAKind' || p1.type === 'straightFlush' || (p1.type === 'single' && p1.cards[0].value === '2') || (p1.type === 'pair' && p1.cards[0].value === '2'));

            if (isP0Nuts && !isP1Nuts) { executePlay(aiIndex, decomp[0], p0); return; } 
            else if (isP1Nuts && !isP0Nuts) { executePlay(aiIndex, decomp[1], p1); return; }
        }

        ['single', 'pair', 'straight', 'fullHouse', 'fourOfAKind', 'straightFlush'].forEach(type => {
            aiCombos[type].forEach(combo => validPlays.push({ cards: combo, data: getHandPower(combo) }));
        });

        validPlays.sort((a, b) => getPlayScore(b, true) - getPlayScore(a, true));

        if (validPlays.length > 0) {
            executePlay(aiIndex, validPlays[0].cards, validPlays[0].data);
            return;
        }
    } else {
        let targetType = gameState.lastPlayed.type;
        let targetPower = gameState.lastPlayed.power;

        aiCombos[targetType].filter(c => getHandPower(c).power > targetPower).forEach(combo => {
            validPlays.push({ cards: combo, data: getHandPower(combo) });
        });

        if (targetType !== 'fourOfAKind' && targetType !== 'straightFlush') {
            aiCombos.fourOfAKind.forEach(c => validPlays.push({ cards: c, data: getHandPower(c) }));
            aiCombos.straightFlush.forEach(c => validPlays.push({ cards: c, data: getHandPower(c) }));
        } else if (targetType === 'fourOfAKind') {
            aiCombos.straightFlush.forEach(c => validPlays.push({ cards: c, data: getHandPower(c) }));
        }

        if (validPlays.length > 0) {
            if (isSuppression) {
                if (gameState.settings.pervertMode) {
                    validPlays.sort((a, b) => getPlayScore(b, false) - getPlayScore(a, false));
                } else {
                    validPlays.sort((a, b) => b.data.power - a.data.power); 
                }
                executePlay(aiIndex, validPlays[0].cards, validPlays[0].data);
                return;
            } else {
                validPlays = validPlays.filter(play => {
                    let rHand = aiHand.filter(c => !play.cards.includes(c));
                    if (gameState.settings.pervertMode) {
                        let pScore = getPlayScore(play, false);
                        if (pScore > currentScore + 100) return true; 
                    }
                    return evaluateHandState(rHand) >= currentScore - 40; 
                });

                if (validPlays.length > 0) {
                    validPlays.sort((a, b) => getPlayScore(b, false) - getPlayScore(a, false));
                    executePlay(aiIndex, validPlays[0].cards, validPlays[0].data);
                    return;
                }
            }
        }
    }

    let cardsContainer = dom.centerTable.querySelector('.cards-container');
    let cardsHtml = cardsContainer ? cardsContainer.outerHTML : '';
    dom.centerTable.innerHTML = `<div class="table-msg" style="color:#aaa;">AI ${aiIndex} 選擇 Pass</div>${cardsHtml}`;
    
    logHistory(`AI ${aiIndex} Pass`);
    gameState.passCount++;
    nextTurn();
}
