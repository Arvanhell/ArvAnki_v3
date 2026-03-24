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
// Import to Storage 
const importDeck = (event) => {
  const file = event.target.files[0];
  if (!file) return

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
        } catch (err){
          alert("System Error: Data corrupted during transmission.");
        }
    };
    reader.readAsText(file);
    importDeck;
    event.target.value = '';
  };
 

// ---------------------------------      
// --- 3. CORE LOGIC (CARD MGMT) ---
const addFlashcard = () => {
  const q = $('quest-input').value;
  const a = $('ans-input').value;
  const s = $('sector-input').value || 'Deep Space';
  
  if (q && a) {
    if (editMode && cardToEditIndex !== null) {
      deck[cardToEditIndex].question = q;
      deck[cardToEditIndex].answer = a;
      deck[cardToEditIndex].sector = s;
      editMode = false;
      cardToEditIndex = null;
      $('add-btn').innerText = 'Add to Deck';
      $('add-btn').style.background = '';
    } else {
      deck.push({ 
        question: q,
        answer: a,
        sector: s,
        nextReview: 0 });
    }
    saveToStorage();
    updateStats();
    $('quest-input').value = '';
    $('ans-input').value = '';
    $('sector-input').value = '';
    showNextDueCard();
  }
};

const deleteCard = () => {
  if (cardToEditIndex === null) return;
  if (confirm("Are you sure want to Delete this Card?")) {
    deck.splice(cardToEditIndex, 1);
    editMode = false;
    cardToEditIndex = null;
    saveToStorage();
    updateStats();
    showNextDueCard();
    console.log("System: Card neutralized.");
  }
};

const editCurrentCard = (e) => {
  if (e) e.stopPropagation(); 
  const currentCard = deck[currentIndex];
  if (currentCard) {
    $('quest-input').value = currentCard.question;
    $('ans-input').value = currentCard.answer;
    $('sector-input').value = currentCard.sector || 'Deep Space';
    editMode = true;
    cardToEditIndex = currentIndex;
    $('add-btn').innerText = "REPLACE ERROR";
    $('add-btn').style.background = "#d73a49";
    closeDeckView();
    window.scrollTo({top: 0, behavior: 'smooth'});
    $('quest-input').focus();
  }
};

// --- 4. RENDER & 3D FLIP LOGIC ---
const renderCard = () => {
  const currentCard = deck[currentIndex];
  const inner = $('card-inner');
  const qText = $('question-text');
  const aText = $('answer-text');
  const showBtn = $('show-answer');
  const controls = $('repetition-controls');
  const editHint = $('edit-hint');
  const trash = $('delete-btn');

  // Reset pozycji karty (powrót na przód)
  if (inner) inner.classList.remove('is-flipped');     

  if (!currentCard || currentIndex === -1) {
    qText.innerHTML = "<div style='opacity:0.5;'>All clear... Rest, Spark. <br> <small>No cards due in this dimension.</small></div>";
    if (aText) aText.style.display = 'none';
    if (controls) controls.style.display = "none";
    if (showBtn) showBtn.style.display = 'none';
    if (editHint) editHint.style.display = 'none';
    return;
  }

  // Ustawienie treści
  qText.innerHTML = currentCard.question;
  if (aText) {
    aText.innerText = currentCard.answer;
    aText.style.display = 'block'; // Musi być widoczne na tyłach
  }
  
  // Widoczność elementów sterujących
  if (editHint) editHint.style.display = 'block';
  if (showBtn) showBtn.style.display = 'block';
  if (controls) controls.style.display = 'none'; // Ukryte do momentu obrotu
  if (trash) trash.style.display = editMode ? 'flex' : 'none';
};

const toggleFlip = (e) => {
  // BLOKADA: nie obracaj, jeśli kliknięto przyciski lub hinta
  if (e && e.target) {
    if (e.target.closest('#repetition-controls') || 
        e.target.closest('#edit-hint') || 
        e.target.closest('#delete-btn')) {
      return; 
    }
  }

  const inner = $('card-inner');
  if (inner) {
    inner.classList.toggle('is-flipped');
    // Jeśli karta jest odwrócona na tył (back)
    if (inner.classList.contains('is-flipped')) {
      const controls = $('repetition-controls');
      const showBtn = $('show-answer');
      if (controls) controls.style.display = 'flex'; // POKAZUJEMY PANEL OCEN
      if (showBtn) showBtn.style.display = 'none';   // UKRYWAMY PRZYCISK REVEAL
    }
  }
};

// --- 5. REVIEW LOGIC (POSTPONE) ---
const postpone = (days) => {
  if (currentIndex === -1) return;
  const msInDay = 24 * 60 * 60 * 1000;
  deck[currentIndex].nextReview = Date.now() + (days * msInDay);
  saveToStorage();
  updateStats();
  showNextDueCard(); // Przejdź do następnej karty
};

const rateCard = (level) => {
  if (level === 'hard') postpone(1);
  if (level === 'good') postpone(3);
  if (level === 'easy') postpone(7);
};

const showNextDueCard = () => {
  const now = Date.now();
  const dueCards = deck.filter(card => {
    const isDue = !card.nextReview || card.nextReview <= now;
    const isCorrectSector = (currentActiveSector === 'All' || card.sector === currentActiveSector);
    return isDue && isCorrectSector;
  });
  
  currentIndex = dueCards.length > 0 ? deck.indexOf(dueCards[0]) : -1;
  renderCard();
  renderSectorFilters();
};

// --- 6. SECTOR FILTERS & TOOLS ---
const renderSectorFilters = () => {
  const nav = $('sector-nav');
  if (!nav) return;
  const sectors = ['All', ...new Set(deck.map(card => card.sector || 'Deep Space'))];
  nav.innerHTML = ''; 
  sectors.forEach(sector => {
    const btn = document.createElement('button');
    btn.innerText = sector;
    btn.className = (currentActiveSector === sector) ? 'active-sector-btn' : 'sector-btn';
    btn.onclick = () => {
      currentActiveSector = sector;
      showNextDueCard();
    };
    nav.appendChild(btn);
  });
};

const openDeckView = () => {
  $('deck-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  showNextDueCard();
};

const closeDeckView = () => {
  $('deck-modal').style.display = "none";
  document.body.style.overflow = 'auto';
};

const syncSystem = () => {
  const name = $('user-input').value.trim();
  if (name) {
    currentUser = name;
    $('display-name').innerHTML = `<span style="font-size: 0.7rem; opacity: 0.7;">:</span> ${currentUser}`;
    deck = JSON.parse(localStorage.getItem(`deck_${currentUser}`)) || [];
    updateStats();
    showNextDueCard();
    $('user-input').value = '';
    $('quest-input').focus();
  } else { alert('Identify yourself, Pilot'); }
};

// --- 7. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  $('login-btn').onclick = syncSystem;
  $('add-btn').onclick = addFlashcard;
  

  // Obsługa ocen (Rating)
  if ($('hard-btn')) $('hard-btn').onclick = () => rateCard('hard');
  if ($('good-btn')) $('good-btn').onclick = () => rateCard('good');
  if ($('easy-btn')) $('easy-btn').onclick = () => rateCard('easy');
  if ($('omega-btn')) $('omega-btn').onclick = () => postpone(30);

  // System Tools
  $('export-btn').onclick = () => {
    if (deck.length === 0) return alert("Empty!");
    const dataStr = JSON.stringify(deck, null, 2);
    const dataBlob = new Blob([dataStr], {type:'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `deck_${currentUser}.json`;
    link.click();
    URL.revokeObjectURL(url); // cleaning memory good practice
  };
  $('import-btn').onclick = () => $('import-input').click();
  $('import-input').onchange = importDeck;
  const trashBtn = $('delete-btn');
  if (trashBtn) trashBtn.onclick = (e) => { e.stopPropagation(); deleteCard(); };

  updateStats();
  showNextDueCard();
  renderSectorFilters();
  console.log('--- Anki ARV V3.0: ACTIVE ---');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
    .then(reg => console.log('ARV System: Offline Mode Active', reg))
    .catch(err => console.log('ARV System: Offline Mode Failed', err));
  });
}