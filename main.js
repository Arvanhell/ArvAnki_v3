// --- 1. HELPER & GLOBAL STATE ---
const $ = (id) => document.getElementById(id);

let deck = [];
let currentIndex = 0;
let currentUser = 'Guest';
let editMode = false;
let cardToEditIndex = null;
let currentActiveSector = 'All';

// --- 2. STORAGE & STATS ---
const updateStats = () => {
  const total = $('total-cards');
  if (total) total.innerText = deck.length;
};

const saveToStorage = () => {
  localStorage.setItem(`deck_${currentUser}`, JSON.stringify(deck));
};

// --- 3. IMPORT / EXPORT LOGIC ---
const importDeck = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importedData = JSON.parse(e.target.result);
      if (Array.isArray(importedData)) {
        deck = importedData;
        saveToStorage();
        updateStats();
        showNextDueCard();
        alert("System: Dimension data synchronized.");
      } else {
        alert("Error: Invalid data structure.");
      }
    } catch (err) {
      alert("System Error: Data corrupted.");
    }
  };
  reader.readAsText(file);
  event.target.value = ''; 
};

// --- 4. CORE LOGIC ---
const addFlashcard = () => {
  const q = $('quest-input').value;
  const a = $('ans-input').value;
  const s = $('sector-input').value || 'Deep Space';
  
  if (q && a) {
    if (editMode && cardToEditIndex !== null) {
      deck[cardToEditIndex] = { ...deck[cardToEditIndex], question: q, answer: a, sector: s };
      editMode = false;
      cardToEditIndex = null;
      $('add-btn').innerText = 'Add to Deck';
      $('add-btn').style.background = '';
    } else {
      deck.push({ question: q, answer: a, sector: s, nextReview: 0 });
    }
    saveToStorage();
    updateStats();
    $('quest-input').value = '';
    $('ans-input').value = '';
    showNextDueCard();
  }
};
// --- Delete Card Logic

const deleteCard = (e) => {
  if (e) e.stopPropagation(); // no flipping card while we click delete card
  if (currentIndex === -1 || deck.length === 0) return;
  if (confirm("Neutralize this card?")) {
    deck.splice(currentIndex, 1); // delete showing card
    saveToStorage();
    updateStats();
    
    if (deck.length === 0) {
      currentIndex = -1;
    } else if (currentIndex >= deck.length){
      currentIndex = deck.length -1;
    }
    showNextDueCard();
    alert("Target neutralized, follow the path Pilot");
  }
};


// --- Edit Card Logic

const editCurrentCard = (e) => {
  if (e) e.stopPropagation(); 
  const currentCard = deck[currentIndex];
  if (currentCard) {
    $('quest-input').value = currentCard.question;
    $('ans-input').value = currentCard.answer;
    $('sector-input').value = currentCard.sector;
    editMode = true;
    cardToEditIndex = currentIndex;
    $('add-btn').innerText = "REPLACE DATA";
    $('add-btn').style.background = "#d73a49";
    closeDeckView();
    window.scrollTo({top: 0, behavior: 'smooth'});
  }
};

// --- 5. RENDER & NAVIGATION ---
const renderCard = () => {
  const currentCard = deck[currentIndex];
  const inner = $('card-inner');
  const qText = $('question-text');
  const aText = $('answer-text');
  
  if (inner) inner.classList.remove('is-flipped');     

  if (!currentCard || currentIndex === -1) {
    qText.innerHTML = "<div style='opacity:0.5;'>All clear, Pilot.</div>";
    if ($('show-answer')) $('show-answer').style.display = 'none';
    if ($('repetition-controls')) $('repetition-controls').style.display = 'none';
    return;
  }

  qText.innerHTML = currentCard.question;
  if (aText) {
    aText.innerText = currentCard.answer;
    aText.style.display = 'block';
  }
  if ($('show-answer')) $('show-answer').style.display = 'block';
  if ($('repetition-controls')) $('repetition-controls').style.display = 'none';
};

const toggleFlip = (e) => {
  if (e && (e.target.closest('#repetition-controls') || e.target.closest('#edit-hint'))) return;
  const inner = $('card-inner');
  if (inner) {
    inner.classList.toggle('is-flipped');
    const isFlipped = inner.classList.contains('is-flipped');
    if ($('repetition-controls')) $('repetition-controls').style.display = isFlipped ? 'flex' : 'none';
    if ($('show-answer')) $('show-answer').style.display = isFlipped ? 'none' : 'block';
  }
};

const showNextDueCard = () => {
  const now = Date.now();
  const dueCards = deck.filter(c => (currentActiveSector === 'All' || c.sector === currentActiveSector) && (!c.nextReview || c.nextReview <= now));
  currentIndex = dueCards.length > 0 ? deck.indexOf(dueCards[0]) : -1;
  renderCard();
  renderSectorFilters();
};

const renderSectorFilters = () => {
  const nav = $('sector-nav');
  if (!nav) return;
  const sectors = ['All', ...new Set(deck.map(c => c.sector || 'Deep Space'))];
  nav.innerHTML = ''; 
  sectors.forEach(s => {
    const btn = document.createElement('button');
    btn.innerText = s;
    btn.className = (currentActiveSector === s) ? 'active-sector-btn' : 'sector-btn';
    btn.onclick = () => { currentActiveSector = s; showNextDueCard(); };
    nav.appendChild(btn);
  });
};

// --- 6. TOOLS & INSPECTOR ---
const openInspector = () => {
  const list = $('archive-list');
  if (!list) return;
  list.innerHTML = '<h3 style="color:var(--neon-blue)">— DIMENSION LOGS —</h3>';
  deck.forEach(c => {
    list.innerHTML += `<div style="border-bottom:1px solid #222; padding:5px; font-size:0.8rem;">Q: ${c.question} | S: ${c.sector}</div>`;
  });
  list.style.display = (list.style.display === 'none') ? 'block' : 'none';
};

const openDeckView = () => { $('deck-modal').style.display = 'flex'; showNextDueCard(); };
const closeDeckView = () => { $('deck-modal').style.display = "none"; };

const syncSystem = () => {
  const name = $('user-input').value.trim();
  if (name) {
    currentUser = name;
    $('display-name').innerText = currentUser;
    deck = JSON.parse(localStorage.getItem(`deck_${currentUser}`)) || [];
    updateStats();
    showNextDueCard();
  }
};

// --- 7. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  if($('login-btn')) $('login-btn').onclick = syncSystem;
  if($('add-btn')) $('add-btn').onclick = addFlashcard;
  if($('star-gate-btn')) $('star-gate-btn').onclick = openInspector;
  
  const deleteBtn = $('delete-btn');
    if (deleteBtn) {
    deleteBtn.style.display = 'block'; // Pokazujemy śmietnik
    deleteBtn.onclick = deleteCard;    // Łączymy z funkcją
}

  const rate = (d) => {
    if (currentIndex === -1) return;
    deck[currentIndex].nextReview = Date.now() + (d * 86400000);
    saveToStorage(); updateStats(); showNextDueCard();
  };

  if($('hard-btn')) $('hard-btn').onclick = () => rate(1);
  if($('good-btn')) $('good-btn').onclick = () => rate(3);
  if($('easy-btn')) $('easy-btn').onclick = () => rate(7);

  // Tools
  if($('export-btn')) $('export-btn').onclick = () => {
    if (deck.length === 0) return alert("Empty!");
    const blob = new Blob([JSON.stringify(deck, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `deck.json`; a.click();
  };

  const impBtn = $('import-btn'), impInp = $('import-input');
  if (impBtn && impInp) {
    impBtn.onclick = () => impInp.click();
    impInp.onchange = importDeck;
  }

  updateStats();
  showNextDueCard();
  renderSectorFilters();
});
