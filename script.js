let allWords = [], unlearnedWords = [], retryQueue = [], mistakeWords = [];
let favoriteIds = JSON.parse(localStorage.getItem('fav_ids')) || [];

// 要素
const wordDisplay = document.getElementById('word-display');
const meaningDisplay = document.getElementById('meaning-display');
const favCountDisplay = document.getElementById('fav-count-display');
const wordListContainer = document.getElementById('word-list-container');

// タブ制御
document.getElementById('tab-study').onclick = function() {
    this.classList.add('active'); document.getElementById('tab-list').classList.remove('active');
    document.getElementById('view-study').classList.remove('hidden'); document.getElementById('view-list').classList.add('hidden');
};
document.getElementById('tab-list').onclick = function() {
    this.classList.add('active'); document.getElementById('tab-study').classList.remove('active');
    document.getElementById('view-list').classList.remove('hidden'); document.getElementById('view-study').classList.add('hidden');
    renderWordList();
};

// CSV読み込み
async function loadCSV() {
    try {
        const res = await fetch('words.csv?t=' + Date.now());
        const txt = await res.text();
        allWords = txt.trim().split(/\r?\n/).map(line => {
            const p = line.split(/[,\t]/);
            if (p.length >= 2) {
                return { id: parseInt(p[0]), word: p[1].trim(), meaning: p.slice(2).join(',').replace(/"/g, '').trim() };
            }
            return null;
        }).filter(w => w && !isNaN(w.id));
        updateFavCount();
        updateRange();
    } catch (e) { wordDisplay.textContent = "CSV読み込みエラー"; }
}

function updateFavCount() { favCountDisplay.textContent = favoriteIds.length; }

// 学習ロジック
function startSession(list) {
    unlearnedWords = [...list]; retryQueue = []; mistakeWords = [];
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('correct-count').textContent = 0;
    document.getElementById('incorrect-count').textContent = 0;
    nextWord();
}

function nextWord() {
    if (unlearnedWords.length === 0) {
        document.getElementById('result-screen').classList.remove('hidden');
        document.getElementById('final-stats').textContent = `正解: ${document.getElementById('correct-count').textContent} / 不正解: ${document.getElementById('incorrect-count').textContent}`;
        return;
    }
    const idx = Math.floor(Math.random() * unlearnedWords.length);
    window.currentWord = unlearnedWords[idx];
    window.currentIdx = idx;

    document.getElementById('id-badge').textContent = `ID: ${window.currentWord.id}`;
    wordDisplay.textContent = window.currentWord.word;
    meaningDisplay.textContent = window.currentWord.meaning;
    meaningDisplay.classList.add('invisible');
    document.getElementById('action-btn').classList.remove('hidden');
    document.getElementById('judgment-btns').classList.add('hidden');
    document.getElementById('fav-toggle-btn').classList.toggle('active', favoriteIds.includes(window.currentWord.id));
    document.getElementById('remaining-count').textContent = unlearnedWords.length;
}

// 判定
document.getElementById('action-btn').onclick = () => {
    meaningDisplay.classList.remove('invisible');
    document.getElementById('action-btn').classList.add('hidden');
    document.getElementById('judgment-btns').classList.remove('hidden');
};

function judge(isCorrect) {
    if (isCorrect) {
        document.getElementById('correct-count').textContent = parseInt(document.getElementById('correct-count').textContent) + 1;
    } else {
        document.getElementById('incorrect-count').textContent = parseInt(document.getElementById('incorrect-count').textContent) + 1;
        mistakeWords.push(window.currentWord);
    }
    unlearnedWords.splice(window.currentIdx, 1);
    nextWord();
}

document.getElementById('correct-btn').onclick = () => judge(true);
document.getElementById('incorrect-btn').onclick = () => judge(false);
document.getElementById('set-range-btn').onclick = updateRange;

function updateRange() {
    const s = parseInt(document.getElementById('start-range').value);
    const e = parseInt(document.getElementById('end-range').value);
    startSession(allWords.filter(w => w.id >= s && w.id <= e));
}

// 単語一覧
function renderWordList() {
    const search = document.getElementById('list-search').value.toLowerCase();
    const filterFav = document.getElementById('filter-fav').classList.contains('active');
    wordListContainer.innerHTML = '';
    
    allWords.filter(w => {
        const matchSearch = w.word.toLowerCase().includes(search) || w.id.toString().includes(search);
        const matchFav = filterFav ? favoriteIds.includes(w.id) : true;
        return matchSearch && matchFav;
    }).forEach(w => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `<span class="list-id">${w.id}</span><div class="list-info"><span class="list-word">${w.word}</span><span class="list-meaning">${w.meaning}</span></div>`;
        wordListContainer.appendChild(div);
    });
}
document.getElementById('list-search').oninput = renderWordList;
document.getElementById('filter-all').onclick = function() { this.classList.add('active'); document.getElementById('filter-fav').classList.remove('active'); renderWordList(); };
document.getElementById('filter-fav').onclick = function() { this.classList.add('active'); document.getElementById('filter-all').classList.remove('active'); renderWordList(); };

// お気に入り
document.getElementById('fav-toggle-btn').onclick = () => {
    const id = window.currentWord.id;
    if (favoriteIds.includes(id)) favoriteIds = favoriteIds.filter(i => i !== id);
    else favoriteIds.push(id);
    localStorage.setItem('fav_ids', JSON.stringify(favoriteIds));
    updateFavCount();
    document.getElementById('fav-toggle-btn').classList.toggle('active');
};

// モーダル
const modal = document.getElementById('help-modal');
document.getElementById('help-open-btn').onclick = () => modal.classList.add('active');
const hideModal = () => modal.classList.remove('active');
document.getElementById('help-close-btn').onclick = hideModal;
document.getElementById('help-close-icon').onclick = hideModal;
window.onclick = (e) => { if(e.target == modal) hideModal(); };

loadCSV();
