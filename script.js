let allWords = [], unlearnedWords = [], mistakeWords = [];
let favoriteIds = JSON.parse(localStorage.getItem('fav_ids')) || [];

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
        updateRange();
    } catch (e) { wordDisplay.textContent = "CSVエラー"; }
}

function updateFavCount() { favCountDisplay.textContent = favoriteIds.length; }
function getStar(id) { return favoriteIds.includes(id) ? '★' : '☆'; }

function startSession(list) {
    unlearnedWords = [...list]; mistakeWords = [];
    resultScreen.classList.add('hidden');
    buttonContainer.classList.remove('hidden');
    document.getElementById('correct-count').textContent = 0;
    document.getElementById('incorrect-count').textContent = 0;
    document.getElementById('remaining-count').textContent = unlearnedWords.length;
    nextWord();
}

function adjustFontSize(text) {
    if (text.length > 12) wordDisplay.style.fontSize = "2.2rem";
    else if (text.length > 8) wordDisplay.style.fontSize = "2.8rem";
    else wordDisplay.style.fontSize = "3.5rem";
}

function nextWord() {
    if (unlearnedWords.length === 0) {
        showResult();
        return;
    }

    cardInner.classList.remove('is-flipped');
    mainCard.classList.add('animate-next');

    setTimeout(() => {
        const idx = Math.floor(Math.random() * unlearnedWords.length);
        window.currentWord = unlearnedWords[idx];
        window.currentIdx = idx;

        const idText = `ID: ${window.currentWord.id}`;
        document.getElementById('id-badge-front').textContent = idText;
        document.getElementById('id-badge-back').textContent = idText;

        wordDisplay.textContent = window.currentWord.word;
        meaningDisplay.textContent = window.currentWord.meaning;
        adjustFontSize(window.currentWord.word);
        
        // 状態リセット
        const actionBtn = document.getElementById('action-btn');
        actionBtn.textContent = "意味を表示";
        actionBtn.classList.remove('hidden');

        const favBtn = document.getElementById('fav-toggle-btn');
        favBtn.textContent = getStar(window.currentWord.id);
        favBtn.classList.toggle('active', favoriteIds.includes(window.currentWord.id));
    }, 120);

    setTimeout(() => mainCard.classList.remove('animate-next'), 300);
}

function showResult() {
    resultScreen.classList.remove('hidden');
    buttonContainer.classList.add('hidden');
    wordDisplay.textContent = "";
    document.getElementById('id-badge-front').textContent = "";
    document.getElementById('final-stats').textContent = `正答: ${document.getElementById('correct-count').textContent} / 誤答: ${document.getElementById('incorrect-count').textContent}`;
    document.getElementById('retry-mistakes-btn').classList.toggle('hidden', mistakeWords.length === 0);
}

function toggleMeaning() {
    if (!resultScreen.classList.contains('hidden')) return;
    const isFlipped = cardInner.classList.contains('is-flipped');
    const actionBtn = document.getElementById('action-btn');

    if (!isFlipped) {
        cardInner.classList.add('is-flipped');
        actionBtn.textContent = "意味を隠す";
    } else {
        cardInner.classList.remove('is-flipped');
        actionBtn.textContent = "意味を表示";
    }
}

cardInner.onclick = toggleMeaning;
document.getElementById('action-btn').onclick = toggleMeaning;

function judge(isCorrect) {
    if (!resultScreen.classList.contains('hidden')) return;
    if (unlearnedWords.length === 0) return;

    const cEl = document.getElementById('correct-count');
    const iEl = document.getElementById('incorrect-count');
    if (isCorrect) { cEl.textContent = parseInt(cEl.textContent) + 1; } 
    else { iEl.textContent = parseInt(iEl.textContent) + 1; mistakeWords.push(window.currentWord); }
    
    unlearnedWords.splice(window.currentIdx, 1);
    document.getElementById('remaining-count').textContent = unlearnedWords.length;
    nextWord();
}

document.getElementById('correct-btn').onclick = () => judge(true);
document.getElementById('incorrect-btn').onclick = () => judge(false);
document.getElementById('set-range-btn').onclick = updateRange;
document.getElementById('restart-btn').onclick = () => updateRange();
document.getElementById('retry-mistakes-btn').onclick = () => startSession(mistakeWords);

function updateRange() {
    const s = parseInt(document.getElementById('start-range').value);
    const e = parseInt(document.getElementById('end-range').value);
    startSession(allWords.filter(w => w.id >= s && w.id <= e));
}

window.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT') return;
    if (!resultScreen.classList.contains('hidden')) return;
    if (e.code === 'Space') { e.preventDefault(); toggleMeaning(); } 
    else if (e.code === 'Enter') { judge(true); }
});

function toggleFav(id) {
    if (favoriteIds.includes(id)) favoriteIds = favoriteIds.filter(i => i !== id);
    else favoriteIds.push(id);
    localStorage.setItem('fav_ids', JSON.stringify(favoriteIds));
    updateFavCount();
}

document.getElementById('fav-toggle-btn').onclick = function(e) {
    e.stopPropagation();
    toggleFav(window.currentWord.id);
    this.textContent = getStar(window.currentWord.id);
    this.classList.toggle('active');
};

document.getElementById('load-favorites-btn').onclick = () => {
    const favs = allWords.filter(w => favoriteIds.includes(w.id));
    if (favs.length > 0) startSession(favs);
    else alert("お気に入り登録がありません。");
};

function renderWordList() {
    const term = document.getElementById('list-search').value.toLowerCase();
    const onlyFav = document.getElementById('filter-fav').classList.contains('active');
    wordListContainer.innerHTML = '';
    let filtered = allWords.filter(w => {
        const m = w.word.toLowerCase().includes(term) || w.meaning.toLowerCase().includes(term) || w.id.toString().includes(term);
        return onlyFav ? (m && favoriteIds.includes(w.id)) : m;
    });
    filtered.forEach(w => {
        const isFav = favoriteIds.includes(w.id);
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <button class="list-fav-btn ${isFav ? 'active' : ''}" onclick="handleListFav(${w.id}, this)">${isFav ? '★' : '☆'}</button>
            <span class="list-id">${w.id}</span>
            <div class="list-info"><span class="list-word">${w.word}</span><span class="list-meaning">${w.meaning}</span></div>
        `;
        wordListContainer.appendChild(div);
    });
}

window.handleListFav = (id, btn) => {
    toggleFav(id); btn.textContent = getStar(id); btn.classList.toggle('active');
};

document.getElementById('help-open-btn').onclick = () => modal.classList.add('active');
const hideM = () => modal.classList.remove('active');
document.getElementById('help-close-btn').onclick = hideM;
document.getElementById('help-close-icon').onclick = hideM;
window.onclick = (e) => { if(e.target == modal) hideM(); };

loadCSV();
