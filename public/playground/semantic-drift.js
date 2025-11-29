// semantic.drift() - words losing their grip on meaning

const wordInput = document.getElementById('word-input');
const driftBtn = document.getElementById('drift-btn');
const accelerateBtn = document.getElementById('accelerate-btn');
const stabilizeBtn = document.getElementById('stabilize-btn');
const chaosBtn = document.getElementById('chaos-btn');
const resetBtn = document.getElementById('reset-btn');
const wordDisplay = document.getElementById('word-display');
const historyDisplay = document.getElementById('history-display');
const driftValue = document.getElementById('drift-value');
const coherenceValue = document.getElementById('coherence-value');
const mutationCount = document.getElementById('mutation-count');

// State
let originalWord = '';
let currentWord = '';
let driftRate = 0.02; // probability of mutation per tick
let driftInterval = null;
let totalMutations = 0;
let isActive = false;
let driftAmount = 0;

// Similar characters for mutations
const mutations = {
    'a': ['4', '@', 'α', 'ä', 'á'],
    'e': ['3', '€', 'ε', 'ē', 'é'],
    'i': ['1', '!', 'ι', 'í', 'ï'],
    'o': ['0', 'ø', 'ω', 'ó', 'ö'],
    'u': ['v', 'μ', 'ü', 'ú', 'û'],
    's': ['$', '5', 'ς', 'š'],
    't': ['7', '†', 'τ', 'ť'],
    'l': ['1', '|', 'ł'],
    'b': ['8', 'β', 'þ'],
    'g': ['9', 'ğ'],
    'z': ['2', 'ž'],
    'n': ['ñ', 'η', 'ń'],
    'c': ['ç', 'ć', '©'],
    'p': ['þ', 'ρ'],
    'r': ['®', 'ř'],
    'h': ['#', 'ħ'],
    'd': ['đ', 'ð'],
    'f': ['ƒ'],
    'k': ['κ'],
    'm': ['μ'],
    'w': ['ω', 'ŵ'],
    'y': ['ý', 'ÿ', 'γ'],
};

// Initialize
function init() {
    driftBtn.addEventListener('click', startDrift);
    accelerateBtn.addEventListener('click', accelerateDrift);
    stabilizeBtn.addEventListener('click', stabilizeDrift);
    chaosBtn.addEventListener('click', injectChaos);
    resetBtn.addEventListener('click', resetWord);

    wordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') startDrift();
    });

    updateControls();
}

function startDrift() {
    const input = wordInput.value.trim();
    if (!input) return;

    if (isActive && originalWord === input) {
        // Stop current drift
        stopDrift();
        return;
    }

    // Start new drift
    originalWord = input;
    currentWord = input;
    totalMutations = 0;
    driftAmount = 0;
    isActive = true;

    renderWord();
    updateMetrics();
    updateControls();

    // Start drift loop
    driftInterval = setInterval(tick, 1000);

    driftBtn.textContent = 'drift.stop()';
}

function stopDrift() {
    if (driftInterval) {
        clearInterval(driftInterval);
        driftInterval = null;
    }
    isActive = false;
    driftBtn.textContent = 'begin.drift()';
    updateControls();
}

function tick() {
    if (!isActive) return;

    // Attempt mutation based on drift rate
    if (Math.random() < driftRate) {
        mutateWord();
    }

    driftAmount += driftRate;
    updateMetrics();
}

function mutateWord() {
    const chars = currentWord.split('');
    const eligibleIndices = [];

    // Find characters that can mutate
    chars.forEach((char, i) => {
        const lower = char.toLowerCase();
        if (mutations[lower] && Math.random() < 0.5) {
            eligibleIndices.push(i);
        }
    });

    if (eligibleIndices.length === 0) return;

    // Pick random character to mutate
    const index = eligibleIndices[Math.floor(Math.random() * eligibleIndices.length)];
    const char = chars[index].toLowerCase();
    const options = mutations[char];

    if (options && options.length > 0) {
        const oldChar = chars[index];
        const newChar = options[Math.floor(Math.random() * options.length)];
        chars[index] = newChar;

        const newWord = chars.join('');
        addHistory(currentWord, newWord);
        currentWord = newWord;
        totalMutations++;

        renderWord();
        updateMetrics();
    }
}

function renderWord() {
    if (!currentWord) {
        wordDisplay.innerHTML = '<span class="drift-whisper">∴ words await their dissolution ∴</span>';
        return;
    }

    const originalChars = originalWord.toLowerCase().split('');
    const currentChars = currentWord.split('');

    const html = currentChars.map((char, i) => {
        const isCorrupted = i < originalChars.length &&
                           char.toLowerCase() !== originalChars[i];
        const className = isCorrupted ? 'drift-letter corrupted mutating' : 'drift-letter';
        return `<span class="${className}">${char}</span>`;
    }).join('');

    wordDisplay.innerHTML = html;

    // Remove animation class after animation completes
    setTimeout(() => {
        document.querySelectorAll('.mutating').forEach(el => {
            el.classList.remove('mutating');
        });
    }, 500);
}

function addHistory(from, to) {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
        <span class="original">${from}</span>
        <span class="arrow">→</span>
        <span class="drifted">${to}</span>
    `;

    historyDisplay.insertBefore(item, historyDisplay.firstChild);

    // Limit history to 10 items
    while (historyDisplay.children.length > 10) {
        historyDisplay.removeChild(historyDisplay.lastChild);
    }
}

function updateMetrics() {
    driftValue.textContent = driftAmount.toFixed(2);

    // Calculate coherence as percentage of unchanged characters
    if (originalWord) {
        const originalChars = originalWord.toLowerCase().split('');
        const currentChars = currentWord.split('');

        let matches = 0;
        for (let i = 0; i < Math.min(originalChars.length, currentChars.length); i++) {
            if (currentChars[i].toLowerCase() === originalChars[i]) {
                matches++;
            }
        }

        const coherence = (matches / originalChars.length) * 100;
        coherenceValue.textContent = Math.round(coherence);
    } else {
        coherenceValue.textContent = '100';
    }

    mutationCount.textContent = totalMutations;
}

function accelerateDrift() {
    if (!isActive) return;
    driftRate = Math.min(driftRate * 1.5, 0.9);
}

function stabilizeDrift() {
    if (!isActive) return;
    driftRate = Math.max(driftRate * 0.5, 0.01);
}

function injectChaos() {
    if (!isActive) return;

    // Force 3-5 rapid mutations
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
        mutateWord();
    }
}

function resetWord() {
    stopDrift();
    currentWord = originalWord;
    totalMutations = 0;
    driftAmount = 0;
    driftRate = 0.02;

    renderWord();
    updateMetrics();
}

function updateControls() {
    const hasWord = !!currentWord;
    accelerateBtn.disabled = !isActive;
    stabilizeBtn.disabled = !isActive;
    chaosBtn.disabled = !isActive;
    resetBtn.disabled = !hasWord;
}

// Start
init();
