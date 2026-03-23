let allWords = [], unlearnedWords = [], mistakeWords = [];
let favoriteIds = JSON.parse(localStorage.getItem('fav_ids')) || [];
let historyStack = [];
// 追加：戻った時に「次に出るはずだった単語」を保持するスタック
let forwardStack = [];

const wordDisplay = document.getElementById('word-display');
const meaningDisplay = document.getElementById('meaning-display');
const favCountDisplay = document.getElementById('fav-count-display');
const wordListContainer = document.getElementById('word-list-container');
const resultScreen = document.getElementById('result-screen');
const modal = document.getElementById('help-modal');
const cardInner = document.getElementById('card-inner');
const mainCard = document.getElementById('main-card');
const buttonContainer = document.querySelector('.button-container');

// タブ制御
document.getElementById('tab-study').onclick = () => {
    document.getElementById('tab-study').classList.add('active'); document.getElementById('tab-list').classList.remove('active');
    document.getElementById('view-study').classList.remove('hidden'); document.getElementById('view-list').classList.add('hidden');
};
document.getElementById('tab-list').onclick = () => {
    document.getElementById('tab-list').classList.add('active'); document.getElementById('tab-study').classList.remove('active');
    document.getElementById('view-list').classList.remove('hidden'); document.getElementById('view-study').classList.add('hidden');
    renderWordList();
};

// --- 進行状況の保存・復元 ---
function saveProgress() {
    if (!window.currentWord) return;
    const data = {
        unlearnedWords: unlearnedWords,
        mistakeWords: mistakeWords,
        historyStack: historyStack,
        forwardStack: forwardStack, // 追加
        correctCount: document.getElementById('correct-count').textContent,
        incorrectCount: document.getElementById('incorrect-count').textContent,
        currentWord: window.currentWord,
        startRange: document.getElementById('start-range').value,
        endRange: document.getElementById('end-range').value
    };
    localStorage.setItem('study_progress', JSON.stringify(data));
}

function loadProgress() {
    const saved = localStorage.getItem('study_progress');
    if (!saved) return false;
    const data = JSON.parse(saved);
    unlearnedWords = data.unlearnedWords || [];
    mistakeWords = data.mistakeWords || [];
    historyStack = data.historyStack || [];
    forwardStack = data.forwardStack || []; // 追加
    document.getElementById('correct-count').textContent = data.correctCount || 0;
    document.getElementById('incorrect-count').textContent = data.incorrectCount || 0;
    document.getElementById('remaining-count').textContent = unlearnedWords.length;
    document.getElementById('start-range').value = data.startRange || 1;
    document.getElementById('end-range').value = data.endRange || 30;
    if (unlearnedWords.length === 0 && !data.currentWord) {
        showResult();
    } else {
        displayWord(data.currentWord || unlearnedWords[0]);
    }
    updateUndoButton();
    return true;
}

// --- 基本機能 ---
async function loadCSV() {
    try {
        const res = await fetch('words.csv?t=' + Date.now());
        const txt = await res.text();
        allWords = txt.trim().split(/\r?\n/).map(line => {
            const p = line.split(/[,\t]/);
            if (p.length >= 2) return { id: parseInt(p[0]), word: p[1].trim(), meaning: p.slice(2).join(',').replace(/"/g, '').trim() };
            return null;
        }).filter(w => w && !isNaN(w.id));
        updateFavCount();
        if (!loadProgress()) updateRange();
    } catch (e) { wordDisplay.textContent = "CSVエラー"; }
}

function updateFavCount() { favCountDisplay.textContent = favoriteIds.length; }
function getStar(id) { return favoriteIds.includes(id) ? '★' : '☆'; }

function startSession(list) {
    unlearnedWords = [...list]; mistakeWords = []; historyStack = []; forwardStack = [];
    localStorage.removeItem('study_progress');
    document.getElementById('correct-count').textContent = 0;
    document.getElementById('incorrect-count').textContent = 0;
    document.getElementById('remaining-count').textContent = unlearnedWords.length;
    resultScreen.classList.add('hidden');
    buttonContainer.classList.remove('hidden');
    updateUndoButton();
    nextWord();
}

function displayWord(wordObj) {
    if (!wordObj) return;
    window.currentWord = wordObj;
    document.getElementById('id-badge-front').textContent = `ID: ${wordObj.id}`;
    document.getElementById('id-badge-back').textContent = `ID: ${wordObj.id}`;
    wordDisplay.textContent = wordObj.word;
    meaningDisplay.textContent = wordObj.meaning;
    if (wordObj.word.length > 12) wordDisplay.style.fontSize = "2.2rem";
    else if (wordObj.word.length > 8) wordDisplay.style.fontSize = "2.8rem";
    else wordDisplay.style.fontSize = "3.5rem";
    const favBtn = document.getElementById('fav-toggle-btn');
    favBtn.textContent = getStar(wordObj.id);
    favBtn.classList.toggle('active', favoriteIds.includes(wordObj.id));
    cardInner.classList.remove('is-flipped');
    document.getElementById('action-btn').textContent = "意味を表示";
}

function nextWord() {
    if (unlearnedWords.length === 0 && forwardStack.length === 0) { showResult(); return; }
    mainCard.classList.add('animate-next');
    setTimeout(() => {
        if (forwardStack.length > 0) {
            // 【修正】戻るから訂正した後は、退避させていた単語を表示
            displayWord(forwardStack.pop());
        } else {
            // 通常時はランダム
            const idx = Math.floor(Math.random() * unlearnedWords.length);
            displayWord(unlearnedWords[idx]);
        }
        saveProgress();
    }, 120);
    setTimeout(() => mainCard.classList.remove('animate-next'), 300);
}

function showResult() {
    resultScreen.classList.remove('hidden');
    buttonContainer.classList.add('hidden');
    localStorage.removeItem('study_progress');
}

function toggleMeaning() {
    if (!resultScreen.classList.contains('hidden')) return;
    const isFlipped = cardInner.classList.contains('is-flipped');
    cardInner.classList.toggle('is-flipped');
    document.getElementById('action-btn').textContent = isFlipped ? "意味を表示" : "意味を隠す";
}

cardInner.onclick = toggleMeaning;
document.getElementById('action-btn').onclick = toggleMeaning;

function judge(isCorrect) {
    if (!resultScreen.classList.contains('hidden') || !window.currentWord) return;
    historyStack.push({
        word: window.currentWord,
        wasCorrect: isCorrect,
        correctCount: document.getElementById('correct-count').textContent,
        incorrectCount: document.getElementById('incorrect-count').textContent
    });
    if (isCorrect) {
        document.getElementById('correct-count').textContent = parseInt(document.getElementById('correct-count').textContent) + 1;
    } else {
        document.getElementById('incorrect-count').textContent = parseInt(document.getElementById('incorrect-count').textContent) + 1;
        mistakeWords.push(window.currentWord);
    }
    unlearnedWords = unlearnedWords.filter(w => w.id !== window.currentWord.id);
    document.getElementById('remaining-count').textContent = unlearnedWords.length;
    updateUndoButton();
    nextWord();
}

function undo() {
    if (historyStack.length === 0) return;
    // 【修正】現在の単語（間違えて判定したものなど）を forwardStack に退避
    forwardStack.push(window.currentWord);
    
    const last = historyStack.pop();
    document.getElementById('correct-count').textContent = last.correctCount;
    document.getElementById('incorrect-count').textContent = last.incorrectCount;
    if (!unlearnedWords.find(w => w.id === last.word.id)) {
        unlearnedWords.push(last.word);
    }
    if (!last.wasCorrect) mistakeWords.pop();
    document.getElementById('remaining-count').textContent = unlearnedWords.length;
    displayWord(last.word);
    updateUndoButton();
    saveProgress();
}

function updateUndoButton() {
    const btn = document.getElementById('undo-btn');
    if (btn) btn.disabled = (historyStack.length === 0);
}

document.getElementById('correct-btn').onclick = () => judge(true);
document.getElementById('incorrect-btn').onclick = () => judge(false);
document.getElementById('undo-btn').onclick = undo;
document.getElementById('set-range-btn').onclick = updateRange;
document.getElementById('restart-btn').onclick = () => updateRange();
document.getElementById('retry-mistakes-btn').onclick = () => startSession(mistakeWords);

function updateRange() {
    const s = parseInt(document.getElementById('start-range').value);
    const e = parseInt(document.getElementById('end-range').value);
    startSession(allWords.filter(w => w.id >= s && w.id <= e));
}

window.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT' || !resultScreen.classList.contains('hidden')) return;
    if (e.code === 'Space') { e.preventDefault(); toggleMeaning(); } 
    else if (e.code === 'Enter') { judge(true); }
});

function toggleFav(id) {
    if (favoriteIds.includes(id)) favoriteIds = favoriteIds.filter(i => i !== id);
    else favoriteIds.push(id);
    localStorage.setItem('fav_ids', JSON.stringify(favoriteIds));
    updateFavCount();
}

document.getElementById('fav-toggle-btn').onclick = (e) => {
    e.stopPropagation();
    toggleFav(window.currentWord.id);
    displayWord(window.currentWord);
};

document.getElementById('load-favorites-btn').onclick = () => {
    const favs = allWords.filter(w => favoriteIds.includes(w.id));
    if (favs.length > 0) startSession(favs);
    else alert("お気に入り登録がありません。");
};

function renderWordList() {
    const term = document.getElementById('list-search').value.toLowerCase().trim();
    const onlyFav = document.getElementById('filter-fav').classList.contains('active');
    wordListContainer.innerHTML = '';
    allWords.filter(w => {
        const m = w.word.toLowerCase().includes(term) || w.meaning.toLowerCase().includes(term) || w.id.toString().includes(term);
        return onlyFav ? (m && favoriteIds.includes(w.id)) : m;
    }).forEach(w => {
        const isFav = favoriteIds.includes(w.id);
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `<button class="list-fav-btn ${isFav?'active':''}" onclick="handleListFav(${w.id}, this)">${isFav?'★':'☆'}</button>
            <span class="list-id">${w.id}</span>
            <div class="list-info"><span class="list-word">${w.word}</span><span class="list-meaning">${w.meaning}</span></div>`;
        wordListContainer.appendChild(div);
    });
}

document.getElementById('list-search').oninput = renderWordList;
document.getElementById('filter-all').onclick = function() { this.classList.add('active'); document.getElementById('filter-fav').classList.remove('active'); renderWordList(); };
document.getElementById('filter-fav').onclick = function() { this.classList.add('active'); document.getElementById('filter-all').classList.remove('active'); renderWordList(); };
window.handleListFav = (id, btn) => { toggleFav(id); btn.textContent = getStar(id); btn.classList.toggle('active'); if (document.getElementById('filter-fav').classList.contains('active')) renderWordList(); };

document.getElementById('help-open-btn').onclick = () => modal.classList.add('active');
const hideM = () => { modal.classList.remove('active'); document.getElementById('help-tab-guide').click(); };
document.getElementById('help-close-btn').onclick = hideM;
document.getElementById('help-close-icon').onclick = hideM;
window.onclick = (e) => { if(e.target == modal) hideM(); };

const tG = document.getElementById('help-tab-guide'), tU = document.getElementById('help-tab-update');
const cG = document.getElementById('help-guide-content'), cU = document.getElementById('help-update-content');
if (tG) {
    tG.onclick = () => { tG.classList.add('active'); tU.classList.remove('active'); cG.classList.remove('hidden'); cU.classList.add('hidden'); };
    tU.onclick = () => { tU.classList.add('active'); tG.classList.remove('active'); cU.classList.remove('hidden'); cG.classList.add('hidden'); };
}
const darkToggle = document.getElementById('dark-mode-toggle');

// 保存されたモードを読み込む
if (localStorage.getItem('dark_mode') === 'enabled') {
    document.body.classList.add('dark-mode');
    if (darkToggle) darkToggle.textContent = '☀️ ライトモード';
}

darkToggle.onclick = () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    
    // 状態を保存
    localStorage.setItem('dark_mode', isDark ? 'enabled' : 'disabled');
    
    // ボタンのテキスト切り替え
    darkToggle.textContent = isDark ? '☀️ ライトモード' : '🌙 ダークモード';
};
loadCSV();
