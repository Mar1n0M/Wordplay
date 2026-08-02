class WordPlayGame {
    static DIFF = {
        easy: { weightPower: 1, extraDistractors: 4, shuffleStrength: 0.5, minWeight: 0.2 },
        normal: { weightPower: 2, extraDistractors: 6, shuffleStrength: 1, minWeight: 0.1 },
        hard: { weightPower: 3, extraDistractors: 8, shuffleStrength: 1.5, minWeight: 0.05 }
    };
    static CORRECT_POINTS = 20;
    static WRONG_PENALTY = 10;
    constructor() {
        this.sentences = [];
        this.lastSentenceIndex = null;
        this.currentSentence = null;
        this.score = 0;
        this.answerWords = [];
        this.totalCorrect = 0;
        this.totalIncorrect = 0;
        this.streak = 0;
        this.bestStreak = 0;
        this.hasBeenCorrectlyAnsweredThisAttempt = false;
        this.hasBeenPenalized = false;
        this.hasAttemptedThisSentence = false;
        this.sentenceSolvedCorrectly = false;
        this.milestones = { 100: false, 500: false, 1000: false };
        this.currentDiffKey = 'normal';
        this.currentDiff = WordPlayGame.DIFF[this.currentDiffKey];
        this.skipWarningDisabled = false;
        this.hintCount = 0;
        this.sourceSentenceElm = null;
        this.wordBankElm = null;
        this.answerAreaElm = null;
        this.feedbackElm = null;
        this.scoreElm = null;
        this.inputSentence = null;
        this.inputTranslation = null;
        this.inputDistractor = null;
        this.addBtn = null;
        this.checkBtn = null;
        this.hintBtn = null;
        this.resetBtn = null;
        this.nextBtn = null;
        this.skipModal = null;
        this.skipDontShow = null;
        this.skipCancelBtn = null;
        this.skipConfirmBtn = null;
        this.sessionModal = null;
        this.infoModal = null;
        this.init = this.init.bind(this);
    }
    stripPositionMarkers(word) {
        return word.replace(/\(\d+(?:,\d+)*\)$/, '');
    }
    init() {
        this.loadState();
        this.sourceSentenceElm = document.getElementById('source-sentence');
        this.wordBankElm = document.getElementById('word-bank');
        this.answerAreaElm = document.getElementById('answer-area');
        this.feedbackElm = document.getElementById('feedback');
        this.scoreElm = document.getElementById('score');
        this.inputSentence = document.getElementById('sentence-input');
        this.inputTranslation = document.getElementById('translation-input');
        this.inputDistractor = document.getElementById('distractor-input');
        this.addBtn = document.getElementById('add-btn');
        this.checkBtn = document.getElementById('check-btn');
        this.hintBtn = document.getElementById('hint-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.nextBtn = document.getElementById('next-btn');
        const clearBtn = document.getElementById('clear-sentences-btn');
        const exportBtn = document.getElementById('export-btn');
        const importBtn = document.getElementById('import-btn');
        const importFile = document.getElementById('import-file');
        const endSessionBtn = document.getElementById('end-session-btn');
        const diffSelect = document.getElementById('select-difficulty');
        const darkToggle = document.getElementById('dark-mode-toggle');
        this.scoreElm.textContent = this.score;
        diffSelect.value = this.currentDiffKey;
        this.updateSentenceCountDisplay();
        this.updateStreak();
        this.renderInitial();
        this.createSkipModal();
        this.createSessionModal();
        this.createInfoModal();
        if (endSessionBtn) endSessionBtn.addEventListener('click', () => this.endSession());
        if (this.resetBtn) this.resetBtn.addEventListener('click', () => this.resetAnswer());
        if (this.addBtn) this.addBtn.addEventListener('click', () => this.addSentence());
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearAllSentences());
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportJSON());
        if (importBtn) importBtn.addEventListener('click', () => importFile.click());
        if (importFile) importFile.addEventListener('change', (e) => this.importJSON(e));
        if (this.checkBtn) this.checkBtn.addEventListener('click', () => this.checkAnswer());
        if (this.hintBtn) this.hintBtn.addEventListener('click', () => this.giveHint());
        if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.showCorrectAndNext());
        if (diffSelect) diffSelect.addEventListener('change', (e) => this.setDifficulty(e.target.value));
        if (darkToggle) darkToggle.addEventListener('change', (e) => this.toggleDarkMode(e.target.checked));
        if (this.inputSentence) {
            this.inputSentence.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.addSentence(); });
        }
        if (this.inputTranslation) {
            this.inputTranslation.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.addSentence(); });
        }
        if (this.inputDistractor) {
            this.inputDistractor.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.addSentence(); });
        }
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && this.answerAreaElm) {
                const last = this.answerAreaElm.lastChild;
                if (last && last.classList && last.classList.contains('answer-word')) {
                    this.removeWord(last.dataset.word, last);
                }
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (this.checkBtn && !this.checkBtn.disabled) {
                    this.checkAnswer();
                }
            }
            if (e.altKey && e.key === 'Enter') {
                e.preventDefault();
                if (this.nextBtn) this.nextBtn.click();
            }
            if (e.key === 'Escape') {
                if (this.skipModal && this.skipModal.style.display === 'flex') {
                    this.closeSkipModal(false);
                }
                if (this.sessionModal && this.sessionModal.style.display === 'flex') {
                    this.sessionModal.style.display = 'none';
                }
            }
        });
        const darkPref = localStorage.getItem('wordplayDarkMode');
        if (darkPref === 'true') {
            document.body.classList.add('dark-mode');
            if (darkToggle) darkToggle.checked = true;
        }
        console.log('WordPlay loaded.');
    }
    createSkipModal() {
        const template = document.getElementById('skip-modal-template');
        const clone = template.content.cloneNode(true);
        document.body.appendChild(clone);
        const allModals = document.querySelectorAll('.modal-overlay');
        for (let m of allModals) {
            if (m.querySelector('#skip-dont-show')) {
                this.skipModal = m;
                break;
            }
        }
        this.skipDontShow = document.getElementById('skip-dont-show');
        this.skipCancelBtn = document.getElementById('skip-cancel-btn');
        this.skipConfirmBtn = document.getElementById('skip-confirm-btn');
        this.skipCancelBtn.addEventListener('click', () => this.closeSkipModal(false));
        this.skipConfirmBtn.addEventListener('click', () => this.closeSkipModal(true));
        this.skipModal.addEventListener('click', (e) => {
            if (e.target === this.skipModal) {
                this.closeSkipModal(false);
            }
        });
        this.skipModal.style.display = 'none';
    }
    createSessionModal() {
        const template = document.getElementById('session-modal-template');
        const clone = template.content.cloneNode(true);
        document.body.appendChild(clone);
        const allModals = document.querySelectorAll('.modal-overlay');
        for (let m of allModals) {
            if (m.querySelector('#session-close-btn')) {
                this.sessionModal = m;
                break;
            }
        }
        const closeBtn = this.sessionModal.querySelector('#session-close-btn');
        closeBtn.addEventListener('click', () => {
            this.sessionModal.style.display = 'none';
        });
        this.sessionModal.addEventListener('click', (e) => {
            if (e.target === this.sessionModal) {
                this.sessionModal.style.display = 'none';
            }
        });
        this.sessionModal.style.display = 'none';
    }
    createInfoModal() {
        const template = document.getElementById('info-modal-template');
        const clone = template.content.cloneNode(true);
        document.body.appendChild(clone);
        const allModals = document.querySelectorAll('.modal-overlay');
        this.infoModal = Array.from(allModals).find(m => m.querySelector('#info-modal-title'));
        const closeBtn = this.infoModal.querySelector('.info-close-btn');
        closeBtn.addEventListener('click', () => {
            this.infoModal.style.display = 'none';
        });
        this.infoModal.addEventListener('click', (e) => {
            if (e.target === this.infoModal) this.infoModal.style.display = 'none';
        });
        const icon = document.getElementById('info-icon-sentences');
        if (icon) {
            icon.addEventListener('click', () => {
                this.infoModal.style.display = 'flex';
            });
        }
    }
    showConfirmModal(message, onConfirm) {
        const template = document.getElementById('confirm-modal-template');
        const clone = template.content.cloneNode(true);
        document.body.appendChild(clone);
        const modals = document.querySelectorAll('.modal-overlay');
        const confirmModal = modals[modals.length - 1];
        confirmModal.querySelector('#confirm-message').textContent = message;
        confirmModal.style.display = 'flex';
        const cancelBtn = confirmModal.querySelector('#confirm-cancel-btn');
        const okBtn = confirmModal.querySelector('#confirm-ok-btn');
        const close = () => {
            confirmModal.remove();
        };
        cancelBtn.addEventListener('click', close);
        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) close();
        });
        okBtn.addEventListener('click', () => {
            close();
            if (onConfirm) onConfirm();
        });
    }
    openSkipModal() {
        if (!this.skipModal) return;
        this.skipModal.style.display = 'flex';
        this.skipDontShow.checked = this.skipWarningDisabled;
        requestAnimationFrame(() => {
            this.skipCancelBtn.focus();
        });
    }
    closeSkipModal(proceed) {
        if (!this.skipModal || this.skipModal.style.display === 'none') return;
        this.skipModal.style.display = 'none';
        if (proceed) {
            if (this.skipDontShow.checked) {
                this.skipWarningDisabled = true;
                this.saveState();
            }
            this.streak = 0;
            this.updateStreak();
            this.saveState();
            this.nextQuestion();
        }
    }
    loadState() {
        try {
            const saved = localStorage.getItem('wordplayState');
            if (saved) {
                const data = JSON.parse(saved);
                this.sentences = data.sentences || [];
                this.score = data.score || 0;
                this.streak = data.streak || 0;
                this.bestStreak = data.bestStreak || 0;
                this.currentDiffKey = data.diff || 'normal';
                this.currentDiff = WordPlayGame.DIFF[this.currentDiffKey];
                this.milestones = data.milestones || { 100: false, 500: false, 1000: false };
                this.skipWarningDisabled = data.skipWarningDisabled || false;
                this.sentences.forEach(s => {
                    if (!s.distractors) s.distractors = [];
                    if (!s.wordOrder) s.wordOrder = this.parseTranslationOrder(s.translation);
                    if (s.hasExplicitOrder === undefined) {
                        s.hasExplicitOrder = this.translationHasExplicitPositions(s.translation);
                    }
                });
            }
        } catch (e) {
            console.warn('Could not load state', e);
            this.resetStateToDefaults();
        }
    }
    resetStateToDefaults() {
        this.sentences = [];
        this.score = 0;
        this.streak = 0;
        this.bestStreak = 0;
        this.currentDiffKey = 'normal';
        this.currentDiff = WordPlayGame.DIFF.normal;
        this.milestones = { 100: false, 500: false, 1000: false };
        this.skipWarningDisabled = false;
    }
    saveState() {
        try {
            localStorage.setItem('wordplayState', JSON.stringify({
                sentences: this.sentences,
                score: this.score,
                streak: this.streak,
                bestStreak: this.bestStreak,
                diff: this.currentDiffKey,
                milestones: this.milestones,
                skipWarningDisabled: this.skipWarningDisabled
            }));
        } catch (e) {
            console.warn('Could not save state', e);
        }
    }
    toggleDarkMode(enabled) {
        document.body.classList.toggle('dark-mode', enabled);
        localStorage.setItem('wordplayDarkMode', String(enabled));
    }
    shuffleArr(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    parseWords(sentence) {
        return sentence.trim().split(/\s+/).filter(Boolean);
    }
    translationHasExplicitPositions(translation) {
        const tokens = translation.trim().split(/\s+/).filter(Boolean);
        return tokens.some(token => /^.+?\([\d,]+\)$/.test(token));
    }
    parseTranslationOrder(translation) {
        const tokens = translation.trim().split(/\s+/).filter(Boolean);
        const order = [];
        let position = 1;
        for (const token of tokens) {
            const match = token.match(/^(.+?)\(([\d,]+)\)$/);
            if (match) {
                const word = match[1];
                const positions = match[2].split(',').map(Number).filter(n => !isNaN(n) && n > 0);
                if (positions.length === 0) {
                    order.push({ word, positions: [position] });
                } else {
                    order.push({ word, positions });
                }
            } else {
                order.push({ word: token, positions: [position] });
            }
            position++;
        }
        const posMap = new Map();
        for (const item of order) {
            const posSet = new Set(item.positions);
            for (const p of posSet) {
                if (!posMap.has(p)) posMap.set(p, []);
                posMap.get(p).push({ word: item.word, count: item.positions.length });
            }
        }
        for (const [p, entries] of posMap.entries()) {
            if (entries.length > 1) {
                const allSingle = entries.every(e => e.count === 1);
                if (allSingle) {
                    throw new Error(
                        `Position ${p} is assigned to multiple words that each have only this position: ${entries.map(e => e.word).join(', ')}. This is not allowed.`
                    );
                }
            }
        }
        return order;
    }
    isOrderCorrect(userWords, wordOrder) {
        if (userWords.length !== wordOrder.length) return false;
        const n = wordOrder.length;
        const allowedPerPosition = Array.from({ length: n }, () => new Set());
        for (let i = 0; i < n; i++) {
            const item = wordOrder[i];
            const positions = item.positions;
            for (const pos of positions) {
                if (pos >= 1 && pos <= n) {
                    allowedPerPosition[pos - 1].add(item.word.toLowerCase());
                }
            }
        }
        const userCounts = new Map();
        for (const w of userWords) {
            const key = w.toLowerCase();
            userCounts.set(key, (userCounts.get(key) || 0) + 1);
        }
        const orderCounts = new Map();
        for (const item of wordOrder) {
            const key = item.word.toLowerCase();
            orderCounts.set(key, (orderCounts.get(key) || 0) + 1);
        }
        if (userCounts.size !== orderCounts.size) return false;
        for (const [key, count] of orderCounts) {
            if (userCounts.get(key) !== count) return false;
        }
        for (let i = 0; i < n; i++) {
            const word = userWords[i].toLowerCase();
            if (!allowedPerPosition[i].has(word)) {
                return false;
            }
        }
        return true;
    }
    addSentence() {
        const orig = this.inputSentence.value.trim();
        const trans = this.inputTranslation.value.trim();
        const distractorStr = this.inputDistractor.value.trim();
        let warnings = [];
        if (!orig) {
            this.feedbackElm.textContent = 'Please enter an original sentence.';
            this.feedbackElm.className = 'feedback invalid';
            return;
        }
        if (!trans) {
            this.feedbackElm.textContent = 'Please enter a translation.';
            this.feedbackElm.className = 'feedback invalid';
            return;
        }
        const transWordsRaw = this.parseWords(trans);
        if (transWordsRaw.length === 0) {
            this.feedbackElm.textContent = 'Translation must contain at least one word.';
            this.feedbackElm.className = 'feedback invalid';
            return;
        }
        const transWordsClean = transWordsRaw.map(w => this.stripPositionMarkers(w));
        let distractors = [];
        if (distractorStr) {
            distractors = distractorStr.split(',').map(s => s.trim()).filter(Boolean);
            const unique = new Set();
            const dupes = [];
            const filtered = [];
            for (const d of distractors) {
                const key = d.toLowerCase();
                if (unique.has(key)) {
                    dupes.push(d);
                } else {
                    unique.add(key);
                    filtered.push(d);
                }
            }
            if (dupes.length > 0) {
                warnings.push(`Duplicate distractors ignored: ${dupes.join(', ')}`);
            }
            distractors = filtered;
            const transSet = new Set(transWordsClean.map(w => w.toLowerCase()));
            const conflict = [];
            const cleaned = [];
            for (const d of distractors) {
                if (transSet.has(d.toLowerCase())) {
                    conflict.push(d);
                } else {
                    cleaned.push(d);
                }
            }
            if (conflict.length > 0) {
                warnings.push(`Distractors that are also in translation removed: ${conflict.join(', ')}`);
            }
            distractors = cleaned;
        }
        let wordOrder;
        let hasExplicitOrder = this.translationHasExplicitPositions(trans);
        try {
            wordOrder = this.parseTranslationOrder(trans);
        } catch (e) {
            this.feedbackElm.textContent = `Error in translation: ${e.message}`;
            this.feedbackElm.className = 'feedback invalid';
            return;
        }
        const newSentence = {
            orig,
            translation: trans,
            distractors,
            wordOrder,
            hasExplicitOrder,
            success: 0,
            fail: 0
        };
        this.sentences.push(newSentence);
        this.updateSentenceCountDisplay();
        this.inputSentence.value = '';
        this.inputTranslation.value = '';
        this.inputDistractor.value = '';
        if (warnings.length > 0) {
            this.feedbackElm.textContent = warnings.join(' ');
            this.feedbackElm.className = 'feedback invalid';
        } else {
            this.feedbackElm.textContent = 'Sentence added successfully.';
            this.feedbackElm.className = 'feedback valid';
        }
        setTimeout(() => { if (this.feedbackElm) this.feedbackElm.textContent = ''; }, 3000);
        this.saveState();
        if (this.sentences.length === 1) this.nextQuestion();
    }
    updateSentenceCountDisplay() {
        const countSpan = document.getElementById('sentence-count');
        if (countSpan) countSpan.textContent = this.sentences.length;
    }
    updateStreak() {
        const streakElm = document.getElementById('streak-display');
        if (!streakElm) return;
        if (this.streak >= 25) streakElm.textContent = " 🔥🔥🔥 " + this.streak;
        else if (this.streak >= 15) streakElm.textContent = " 🔥🔥 " + this.streak;
        else if (this.streak >= 5) streakElm.textContent = " 🔥 " + this.streak;
        else streakElm.textContent = "";
    }
    renderInitial() {
        if (this.sentences.length === 0) {
            this.sourceSentenceElm.textContent = 'Add a sentence to start.';
            this.wordBankElm.innerHTML = '';
            this.answerAreaElm.innerHTML = '';
            this.feedbackElm.textContent = '';
        } else {
            this.nextQuestion();
        }
    }
    clearAllSentences() {
        this.showConfirmModal('This will permanently delete all saved sentences and distractors. Continue?', () => {
            this.sentences = [];
            this.lastSentenceIndex = null;
            this.updateSentenceCountDisplay();
            this.currentSentence = null;
            this.sourceSentenceElm.textContent = 'Add a sentence to start.';
            this.wordBankElm.innerHTML = '';
            this.answerAreaElm.innerHTML = '';
            this.answerWords = [];
            this.feedbackElm.textContent = 'All sentences are deleted.';
            this.feedbackElm.className = 'feedback invalid';
            setTimeout(() => { if (this.feedbackElm) this.feedbackElm.textContent = ''; }, 2500);
            this.saveState();
        });
    }
    exportJSON() {
        const dataStr = JSON.stringify(this.sentences, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'wordplay_sentences.json';
        a.click();
        URL.revokeObjectURL(url);
    }
    importJSON(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (!Array.isArray(imported)) {
                    alert('Invalid format – a sequence of sentences is expected.');
                    return;
                }
                const valid = imported.filter(s =>
                    s && typeof s.orig === 'string' && typeof s.translation === 'string' &&
                    s.orig.trim() !== '' && s.translation.trim() !== ''
                );
                if (valid.length < imported.length) {
                    alert(`${imported.length - valid.length} sentence(s) were skipped because they miss 'orig' or 'translation'.`);
                }
                if (!confirm('Importing will replace all current sentences (statistics reset). Continue?')) return;
                this.sentences = valid.map(s => {
                    const dist = s.distractors || [];
                    let order, hasExp;
                    try {
                        order = s.wordOrder || this.parseTranslationOrder(s.translation);
                        hasExp = s.hasExplicitOrder !== undefined ? s.hasExplicitOrder :
                            this.translationHasExplicitPositions(s.translation);
                    } catch (err) {
                        alert(`Skipping sentence due to position conflict: "${s.orig}" - ${err.message}`);
                        return null;
                    }
                    return { ...s, distractors: dist, wordOrder: order, hasExplicitOrder: hasExp,
                        success: 0, fail: 0 };
                }).filter(Boolean);
                this.lastSentenceIndex = null;
                this.updateSentenceCountDisplay();
                this.score = 0;
                this.streak = 0;
                this.bestStreak = 0;
                this.totalCorrect = 0;
                this.totalIncorrect = 0;
                this.scoreElm.textContent = this.score;
                this.milestones = { 100: false, 500: false, 1000: false };
                this.updateStreak();
                this.nextQuestion();
                alert(`${this.sentences.length} sentences imported.`);
                this.saveState();
            } catch (err) {
                alert('Invalid JSON document: ' + err.message);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }
    getWeight(sentence) {
        const total = sentence.success + sentence.fail + 1;
        const mastery = sentence.success / total;
        return Math.pow(1 - mastery, this.currentDiff.weightPower) + this.currentDiff.minWeight;
    }
    getWeightedRandomIndex() {
        if (this.sentences.length === 0) return -1;
        const weights = this.sentences.map(s => this.getWeight(s));
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) return i;
        }
        return 0;
    }
    getNextIndex() {
        if (this.sentences.length === 0) return -1;
        if (this.sentences.length === 1) return 0;
        let index;
        let attempts = 0;
        do {
            index = this.getWeightedRandomIndex();
            attempts++;
            if (attempts > 100) break;
        } while (index === this.lastSentenceIndex && this.sentences.length > 1);
        this.lastSentenceIndex = index;
        return index;
    }
    nextQuestion() {
        this.sentenceSolvedCorrectly = false;
        this.hintCount = 0;
        if (this.sentences.length === 0) {
            this.sourceSentenceElm.textContent = 'Add sentence...';
            this.wordBankElm.innerHTML = '';
            this.answerAreaElm.innerHTML = '';
            this.feedbackElm.textContent = '';
            return;
        }
        const selectedIndex = this.getNextIndex();
        if (selectedIndex === -1) return;
        this.currentSentence = this.sentences[selectedIndex]; 
        this.hasBeenCorrectlyAnsweredThisAttempt = false;
        this.hasAttemptedThisSentence = false;
        this.hasBeenPenalized = false;
        this.displaySentence(this.currentSentence);
        document.querySelectorAll('.answer-word').forEach(el => el.className = 'answer-word');
        if (this.hintBtn) this.hintBtn.disabled = false;
    }
    displaySentence(sentence) {
        if (!sentence || !sentence.translation) {
            this.sourceSentenceElm.textContent = ' data issue ';
            this.wordBankElm.innerHTML = '';
            return;
        }
        if (this.checkBtn) this.checkBtn.disabled = false;
        this.sourceSentenceElm.textContent = sentence.orig;
        let rawWords = this.parseWords(sentence.translation);
        let words = rawWords.map(w => this.stripPositionMarkers(w));
        if (sentence.distractors && sentence.distractors.length > 0) {
            const wordSet = new Set(words.map(w => w.toLowerCase()));
            const availableDistractors = sentence.distractors.filter(d => !wordSet.has(d.toLowerCase()));
            const needed = Math.min(this.currentDiff.extraDistractors, availableDistractors.length);
            const selected = this.shuffleArr(availableDistractors).slice(0, needed);
            words = words.concat(selected);
        }
        const shuffled = this.shuffleWithStrength(words, this.currentDiff.shuffleStrength);
        this.wordBankElm.innerHTML = '';
        shuffled.forEach(word => {
            const div = document.createElement('div');
            div.className = 'word';
            div.textContent = word;
            div.dataset.word = word;
            this.wordBankElm.appendChild(div);
        });
        this.wordBankElm.onclick = (e) => {
            const target = e.target.closest('.word');
            if (target && !target.classList.contains('used')) {
                this.selectWord(target.dataset.word, target);
            }
        };
        this.answerAreaElm.innerHTML = '';
        this.answerWords = [];
        this.feedbackElm.textContent = '';
    }
    shuffleWithStrength(array, strength) {
        const arr = [...array];
        const len = arr.length;
        const swaps = Math.floor(strength * len * 2);
        for (let i = 0; i < swaps; i++) {
            const idx1 = Math.floor(Math.random() * len);
            let idx2 = Math.floor(Math.random() * len);
            while (idx2 === idx1 && len > 1) idx2 = Math.floor(Math.random() * len);
            [arr[idx1], arr[idx2]] = [arr[idx2], arr[idx1]];
        }
        return arr;
    }
    selectWord(word, element) {
        if (element.classList.contains('used')) return;
        const answerDiv = document.createElement('div');
        answerDiv.className = 'answer-word';
        answerDiv.textContent = word;
        answerDiv.dataset.word = word;
        answerDiv.bankElement = element;
        answerDiv.onclick = () => this.removeWord(word, answerDiv);
        this.answerAreaElm.appendChild(answerDiv);
        element.classList.add('used');
        this.answerWords.push(word);
    }
    removeWord(word, answerDiv) {
        if (answerDiv.bankElement) answerDiv.bankElement.classList.remove('used');
        answerDiv.remove();
        const index = this.answerWords.indexOf(word);
        if (index !== -1) this.answerWords.splice(index, 1);
    }
    giveHint() {
        if (!this.currentSentence || this.sentenceSolvedCorrectly) return;
        if (this.hintCount >= 2) {
            this.feedbackElm.textContent = 'No more hints available for this sentence.';
            this.feedbackElm.className = 'feedback invalid';
            return;
        }
        const rawCorrect = this.parseWords(this.currentSentence.translation);
        const correctWords = rawCorrect.map(w => this.stripPositionMarkers(w));
        const notPlaced = correctWords.filter(w => !this.answerWords.includes(w));
        if (notPlaced.length === 0) {
            this.feedbackElm.textContent = 'All correct words are already placed!';
            this.feedbackElm.className = 'feedback invalid';
            return;
        }
        const hintWord = notPlaced[Math.floor(Math.random() * notPlaced.length)];
        const bankEls = this.wordBankElm.querySelectorAll('.word');
        let targetEl = null;
        for (let el of bankEls) {
            if (el.dataset.word === hintWord && !el.classList.contains('used')) {
                targetEl = el;
                break;
            }
        }
        if (targetEl) {
            targetEl.classList.add('hint-flash');
            setTimeout(() => targetEl.classList.remove('hint-flash'), 1500);
            this.hintCount++;
            this.feedbackElm.textContent = `Hint ${this.hintCount}/2: highlighted a word.`;
            this.feedbackElm.className = 'feedback valid';
            setTimeout(() => { if (this.feedbackElm) this.feedbackElm.textContent = ''; }, 2000);
        } else {
            this.feedbackElm.textContent = 'No available hint word in the bank.';
            this.feedbackElm.className = 'feedback invalid';
        }
    }
    checkAnswer() {
        if (!this.currentSentence) return;
        this.hasAttemptedThisSentence = true;
        const rawCorrect = this.parseWords(this.currentSentence.translation);
        const correctWords = rawCorrect.map(w => this.stripPositionMarkers(w));
        const userWords = [...this.answerWords];
        if (userWords.length !== correctWords.length) {
            this.clearAnswerHighlighting();
            this.feedbackElm.textContent = `You need to use exactly ${correctWords.length} words. You have ${userWords.length}.`;
            this.feedbackElm.className = 'feedback invalid';
            return;
        }
        let isCorrect = false;
        let positionStatus = null;
        if (this.currentSentence.hasExplicitOrder &&
            this.currentSentence.wordOrder && this.currentSentence.wordOrder.length > 0) {
            isCorrect = this.isOrderCorrect(userWords, this.currentSentence.wordOrder);
            const n = userWords.length;
            positionStatus = userWords.map((word, idx) => {
                const item = this.currentSentence.wordOrder[idx];
                const allowedWords = item.positions.map(
                    p => this.currentSentence.wordOrder[p-1]?.word.toLowerCase()
                ).filter(Boolean);
                if (allowedWords.includes(word.toLowerCase())) {
                    return 'correct';
                }
                const allCorrect = this.currentSentence.wordOrder.map(entry => entry.word.toLowerCase());
                if (allCorrect.includes(word.toLowerCase())) {
                    return 'wrongPosition';
                }
                return 'incorrect';
            });
        } else {
            const correctCountMap = {};
            correctWords.forEach(w => { const l = w.toLowerCase();
                correctCountMap[l] = (correctCountMap[l] || 0) + 1; });
            const userCountMap = {};
            userWords.forEach(w => { const l = w.toLowerCase();
                userCountMap[l] = (userCountMap[l] || 0) + 1; });
            isCorrect =
                Object.keys(correctCountMap).length === Object.keys(userCountMap).length &&
                Object.keys(correctCountMap).every(key => userCountMap[key] === correctCountMap[key]);
        }
        if (isCorrect) {
            if (!this.hasBeenCorrectlyAnsweredThisAttempt) {
                if (!this.hasBeenPenalized) {
                    this.currentSentence.success++;
                    this.score += WordPlayGame.CORRECT_POINTS;
                    this.scoreElm.textContent = this.score;
                    this.checkAchievements(this.score - WordPlayGame.CORRECT_POINTS, this.score);
                    this.hasBeenCorrectlyAnsweredThisAttempt = true;
                    this.sentenceSolvedCorrectly = true;
                    this.totalCorrect++;
                    this.streak++;
                    if (this.streak > this.bestStreak) {
                        this.bestStreak = this.streak;
                    }
                    this.updateStreak();
                    this.feedbackElm.innerHTML = 'Great! +' + WordPlayGame.CORRECT_POINTS + ' points';
                } else {
                    this.hasBeenCorrectlyAnsweredThisAttempt = true;
                    this.sentenceSolvedCorrectly = true;
                    this.totalCorrect++;
                    this.feedbackElm.innerHTML = 'Correct!';
                }
                this.feedbackElm.className = 'feedback valid';
                this.checkBtn.disabled = true;
                if (this.hintBtn) this.hintBtn.disabled = true;
            } else {
                this.feedbackElm.innerHTML = 'Correct, but you already got the points.';
                this.feedbackElm.className = 'feedback invalid';
            }
        } else {
            this.currentSentence.fail++;
            this.feedbackElm.innerHTML = 'Incorrect. Check the words.';
            this.feedbackElm.className = 'feedback invalid';
            if (!this.hasBeenCorrectlyAnsweredThisAttempt && !this.hasBeenPenalized) {
                this.score = Math.max(0, this.score - WordPlayGame.WRONG_PENALTY);
                this.totalIncorrect++;
                this.scoreElm.textContent = this.score;
                this.hasBeenPenalized = true;
            }
            this.streak = 0;
            this.updateStreak();
        }
        this.highlightAnswerFeedback(userWords, correctWords, positionStatus);
        this.saveState();
    }
    highlightAnswerFeedback(userWords, correctWords, positionStatus = null) {
        const answerEls = document.querySelectorAll('.answer-word');
        if (positionStatus && positionStatus.length === answerEls.length) {
            answerEls.forEach((el, i) => {
                const word = el.dataset.word || '';
                el.className = 'answer-word';
                let symbol = '';
                if (positionStatus[i] === 'correct') {
                    el.classList.add('correct');
                    symbol = ' ✓';
                } else if (positionStatus[i] === 'wrongPosition') {
                    el.classList.add('wrong-position');
                    symbol = ' ⇄';
                } else {
                    el.classList.add('incorrect');
                    symbol = ' ✗';
                }
                el.textContent = word + symbol;
            });
        } else {
            const correctCounts = {};
            correctWords.forEach(w => {
                const lower = w.toLowerCase();
                correctCounts[lower] = (correctCounts[lower] || 0) + 1;
            });
            answerEls.forEach(el => {
                el.className = 'answer-word';
                const cleanWord = (el.dataset.word || '').toLowerCase();
                if (correctCounts[cleanWord] && correctCounts[cleanWord] > 0) {
                    el.classList.add('correct');
                    el.textContent = el.dataset.word + ' ✓';
                    correctCounts[cleanWord]--;
                } else {
                    el.classList.add('incorrect');
                    el.textContent = el.dataset.word + ' ✗';
                }
            });
        }
    }
    clearAnswerHighlighting() {
        const answerEls = document.querySelectorAll('.answer-word');
        answerEls.forEach(el => {
            el.className = 'answer-word';
            if (el.dataset.word) {
                el.textContent = el.dataset.word;
            }
        });
    }
    checkAchievements(oldScore, newScore) {
        const thresholds = [100, 500, 1000];
        let message = null;
        thresholds.forEach(m => {
            if (!this.milestones[m] && oldScore < m && newScore >= m) {
                this.milestones[m] = true;
                if (m === 100) message = 'Wow, you passed 100 points! Amazing!';
                else if (m === 500) message = 'Over 500 points?! Unbelievable!';
                else if (m === 1000) message = 'You got over 1000 points! Take a breather. :)';
            }
        });
        if (message) {
            this.feedbackElm.innerHTML = message;
            this.feedbackElm.className = 'feedback valid';
            setTimeout(() => { if (this.feedbackElm) this.feedbackElm.textContent = ''; }, 3000);
            this.saveState();
        }
    }
    showCorrectAndNext() {
        if (!this.currentSentence) return;
        if (!this.hasAttemptedThisSentence) {
            if (this.skipWarningDisabled) {
                this.streak = 0;
                this.updateStreak();
                this.saveState();
                this.nextQuestion();
                return;
            }
            this.openSkipModal();
            return;
        }
        this.nextQuestion();
    }
    endSession() {
        if (!this.sessionModal) return;
        this.sessionModal.querySelector('#session-score').textContent = this.score;
        this.sessionModal.querySelector('#session-correct').textContent = this.totalCorrect;
        this.sessionModal.querySelector('#session-wrong').textContent = this.totalIncorrect;
        this.sessionModal.querySelector('#session-streak').textContent = this.bestStreak;
        this.sessionModal.style.display = 'flex';
        this.score = 0;
        this.streak = 0;
        this.bestStreak = 0;
        this.totalCorrect = 0;
        this.totalIncorrect = 0;
        this.scoreElm.textContent = this.score;
        this.updateStreak();
        this.milestones = { 100: false, 500: false, 1000: false };
        this.saveState();
        if (this.sentences.length > 0) this.nextQuestion();
        else {
            this.sourceSentenceElm.textContent = 'Add sentence to start';
            this.wordBankElm.innerHTML = '';
            this.answerAreaElm.innerHTML = '';
            this.feedbackElm.textContent = '';
        }
        if (this.hintBtn) this.hintBtn.disabled = false;
    }
    resetAnswer() {
        this.showConfirmModal('Reset will delete ALL learning statistics (success rates, score, streak). Sentences will be kept. Continue?', () => {
            this.score = 0;
            this.streak = 0;
            this.bestStreak = 0;
            this.totalCorrect = 0;
            this.totalIncorrect = 0;
            this.lastSentenceIndex = null;
            this.milestones = { 100: false, 500: false, 1000: false };
            this.hasAttemptedThisSentence = false;
            this.hasBeenCorrectlyAnsweredThisAttempt = false;
            this.scoreElm.textContent = this.score;
            this.updateStreak();
            this.sentences.forEach(s => { s.success = 0; s.fail = 0; });
            if (this.sentences.length > 0) this.nextQuestion();
            else this.sourceSentenceElm.textContent = 'Add a sentence to start.';
            this.saveState();
        });
    }
    setDifficulty(levelKey) {
        const newDiff = WordPlayGame.DIFF[levelKey];
        if (!newDiff) return;
        this.showConfirmModal(`Changing the difficulty to "${levelKey}" will reset the statistics and your current result. Continue?`, () => {
            this.currentDiffKey = levelKey;
            this.currentDiff = newDiff;
            this.sentences.forEach(s => { s.success = 0; s.fail = 0; });
            this.score = 0;
            this.streak = 0;
            this.bestStreak = 0;
            this.totalCorrect = 0;
            this.totalIncorrect = 0;
            this.scoreElm.textContent = this.score;
            this.milestones = { 100: false, 500: false, 1000: false };
            this.updateStreak();
            this.currentSentence = null;
            this.answerWords = [];
            this.answerAreaElm.innerHTML = '';
            this.wordBankElm.innerHTML = '';
            this.feedbackElm.textContent = '';
            this.lastSentenceIndex = null;
            if (this.sentences.length > 0) this.nextQuestion();
            this.saveState();
        });
    }
}
document.addEventListener('DOMContentLoaded', () => {
    window.game = new WordPlayGame();
    window.game.init();
});
