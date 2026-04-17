// --- EMERGENCY SERVICE WORKER KILL -SWITCH ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registrations of registrations) {
      registration.unregister();
      console.log("System: Legacy Service Worker nautralized.");
    }
  });
}

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
  const c = $('context-input').value;
  const s = $('sector-input').value || 'Deep Space';
  
  if (q && a) {
    const cardData = {
      question: q,
      answer: a,
      context: c,
      sector: s,
      nextReview: 0
    };

    if (editMode && cardToEditIndex !== null) {
      deck[cardToEditIndex] = cardData;
      editMode = false;
      cardToEditIndex = null;
      $('add-btn').innerText = 'Add to Deck';
      $('add-btn').style.background = '';
    } else {
      deck.push(cardData);
    }
    saveToStorage();
    updateStats();
    $('quest-input').value = '';
    $('ans-input').value = '';
    $('context-input').value = '';
    showNextDueCard();
  }
};
// ---- Delete Card Logic ---- //

const deleteCard = (e) => {
  if (e) e.stopPropagation(); // no flipping card while we click delete card
  if (currentIndex < 0 || currentIndex >= deck.length) {
    alert("System: No target locked");
    return;
  }
  if (confirm("Neutralize this card permanently?")) {
    deck.splice(currentIndex, 1); // delete showing card
    saveToStorage();
    updateStats();
    // next step after delete
    if (deck.length === 0) {
      currentIndex = -1;
      closeDeckView();
    } else {
      if (currentIndex >= deck.length) {
      currentIndex = deck.length -1;
    }
    renderCard();
  }
   // showNextDueCard();
    alert("Target neutralized, follow the path Pilot");
  }
};
// system online back to work fox: delete//

// --- Edit Card Logic

const editCurrentCard = (e) => {
  if (e) e.stopPropagation(); 
  const currentCard = deck[currentIndex];
  if (!currentCard) {
    alert("System: Data record not found.");
    return;
  }
    $('quest-input').value = currentCard.question;
    $('ans-input').value = currentCard.answer;
    $('context-input').value = currentCard.context || ''; // Load context into input
    $('sector-input').value = currentCard.sector || 'Deep Space';
    // Activation of edit procedure
    editMode = true;
    cardToEditIndex = currentIndex;
    const addBtn = $('add-btn');
    if (addBtn) {
    $('add-btn').innerText = "REPLACE DATA";
    $('add-btn').style.background = "#d73a49";
    }
    closeDeckView();
    window.scrollTo({top: 0, behavior: 'smooth'});
};

// --- 5. RENDER & NAVIGATION ---
const renderCard = () => {
  const currentCard = deck[currentIndex];
  const inner = $('card-inner');
  const qText = $('question-text');
  const aText = $('answer-text');
  
  if ($('answer-input')) $('answer-input').value = '';
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
  if (e && (e.target.closest('#repetition-controls') || e.target.closest('#edit-hint') || e.target.closest('input'))) return;
  
  const inner = $('card-inner');
  if (inner) {
    inner.classList.toggle('is-flipped');
    const isFlipped = inner.classList.contains('is-flipped');
    
    if (isFlipped) {
        if ($('repetition-controls')) $('repetition-controls').style.display = 'flex';
        if ($('show-answer')) $('show-answer').style.display = 'none';

        const userAns = $('answer-input').value.trim().toLowerCase();
        const realAns = deck[currentIndex].answer.trim().toLowerCase();
        // FIXED: Define contextData before using it
        const contextData = deck[currentIndex].context || "";
        
        if (userAns) {
          const isCorrect = userAns === realAns;
          $('answer-text').innerHTML = `
            <div style="font-size: 0.8rem; color: #888; text-transform: uppercase;">Your Version:</div>
            <div style="color: ${isCorrect ? '#44ff44' : '#ff4444'}; margin-bottom: 10px;">${$('answer-input').value}</div>
            <div style="font-size: 0.8rem; color: #888; text-transform: uppercase;">True Record:</div>
            <div style="font-size: 1.1rem; font-weight: bold; color: var(--neon-green);">${deck[currentIndex].answer}</div>
            ${contextData ? `<div style="margin-top: 15px; padding-top: 10px; border-top: 1px dashed #444; font-size: 0.85rem; color: #adbac7; font-style: italic;">${contextData}</div>` : ''}
          `;
        } else {
          // FIXED: Use .innerHTML instead of .innerText for tags to work
          $('answer-text').innerHTML = `
            <div style="font-size: 1.2rem; color: var(--neon-green); font-weight: bold;">${deck[currentIndex].answer}</div>
            ${contextData ? `<div style="margin-top: 15px; padding-top: 10px; border-top: 1px dashed #444; font-size: 0.85rem; color: #adbac7; font-style: italic;">${contextData}</div>` : ''}
          `;     
        }
    } else {
        // FRONT-SIDE RESET
        if ($('repetition-controls')) $('repetition-controls').style.display = 'none';
        if ($('show-answer')) $('show-answer').style.display = 'block';
    }
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

// --- 6. TOOLS & INSPECTOR (STAR GATE) ---
const openInspector = () => {
  const list = $('archive-list');
  if (!list) return;

// 6.1. --- Visibility Toggle: If inspector is open, hide it and early exit.
  if (list.style.display === 'block') {
    list.style.display = 'none';
    return;
  }

  // 6.2. --- DOM RESET: Clear container and initialize list generation ---
  list.innerHTML = '<h3 style="color:var(--neon-blue); text-align:center;">— DIMENSION LOGS —</h3>';
  
  if (deck.length === 0) {
    list.innerHTML += "<div style='text-align:center; opacity:0.5;'>Empty space... Sync system.</div>";
  }

  const now = Date.now();

  // 6.3. --- DYNAMIC RENDERING: Build entry list with RECALL functionality ---
  deck.forEach((c, index) => {
    const isPostponed = c.nextReview && c.nextReview > now;
    const statusColor = isPostponed ? '#ff4444' : 'var(--neon-blue)';
    const statusText = isPostponed ? '[LOCKED]' : '[READY]';

    list.innerHTML += `
      <div style="border: 1px solid #333; padding: 10px; margin-bottom: 8px; background: rgba(0,0,0,0.6); border-radius: 5px;">
        <div style="font-size: 0.6rem; color: ${statusColor}; margin-bottom: 5px;">
          ${statusText} | Sector: ${c.sector}
        </div>
        <div style="font-size: 0.8rem; color: #eee; margin-bottom: 10px;">
          Q: ${c.question.substring(0, 50)}${c.question.length > 50 ? '...' : ''}
        </div>
        <button onclick="currentIndex=${index}; renderCard(); openDeckView(); $('archive-list').style.display='none';" 
                style="background: transparent; color: var(--neon-blue); border: 1px solid var(--neon-blue); padding: 5px 12px; cursor: pointer; font-size: 0.7rem; border-radius: 3px;">
          RECALL DATA
        </button>
      </div>
    `;
  });

// 6.4.  --- UI ACTIVATION: Finalize rendering and display the archive list ---
  list.style.display = 'block';
};


const openDeckView = () => { 
  if ($('deck-modal')) $('deck-modal').style.display = 'flex'; 
}
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
    deleteBtn.style.display = 'block'; // show the bin =
    deleteBtn.onclick = deleteCard;    // execute bin
}
 
  const rate = (d) => {
    if (currentIndex === -1) return;
    deck[currentIndex].nextReview = Date.now() + (d * 86400000);
    saveToStorage(); updateStats(); showNextDueCard();
  };

  if($('hard-btn')) $('hard-btn').onclick = () => rate(1);
  if($('good-btn')) $('good-btn').onclick = () => rate(3);
  if($('easy-btn')) $('easy-btn').onclick = () => rate(7);
  if($('omega-btn')) $('omega-btn').onclick = () => rate(30);

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
