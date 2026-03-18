// --- 1. HELPER & GLOBAL STATE ---
const $ = (id) => document.getElementById(id);

let deck = [];
let currentIndex = 0;
let currentUser = 'Guest';
let editMode = false;
let cardToEditIndex = null;
let currentActiveSector = 'All' // Dimension to choose

// --- 2. STORAGE & STATS ---
const updateStats = () => {
  const total = $('total-cards');
  if (total) total.innerText = deck.length;
};

const saveToStorage = () => {
  localStorage.setItem(`deck_${currentUser}`, JSON.stringify(deck));
};
      
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
      $('delete-btn').style.display = 'none';
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
  // Validate if there is a card selected for deletion
  if (cardToEditIndex === null || cardToEditIndex === undefined) {
      console.error("Error: Show the Card to delete");
      return;
  }

  if (confirm("Are you sure want to Delete this Card?")) {
    // 1. Physically remove card from the deck array
    deck.splice(cardToEditIndex, 1);
    
    // 2. Clear edit state
    editMode = false;
    cardToEditIndex = null;
    
    // 3. Reset UI (Input fields)
    $('quest-input').value = '';
    $('ans-input').value = '';
    $('add-btn').innerText = 'Add to Deck';
    $('add-btn').style.background = '';
    $('delete-btn').style.display = 'none';

    // 4. CRITICAL: Save the updated deck to local storage
    saveToStorage();
    
    // 5. Update counter and display next available card
    updateStats();
    showNextDueCard();
    
    console.log("System: Card neutralized successfully.");
  }
};

const deleteActiveSector = () => {
  if (currentActiveSector === 'All' || currentActiveSector === 'DeepSpace') {
    alert("System: Cannot nautralize Root Dimensions.");
    return;
  }

  if (confirm(`Warning: Delete all cards in ${currentActiveSector}?`)) {
    // filter only choosen deck of cards
    deck = deck.filter(card => card.sector !== currentActiveSector);
  
    saveToStorage();
    updateStats();
    currentActiveSector = 'All'; // Back to base
    showNextDueCard(); //refresh all UI 

    console.log(`Sector ${currentActiveSector} neutralized.`);
  }
};

const startEdit = () => {
  const currentCard = deck[currentIndex];
  if (currentCard) {
    $('quest-input').value = currentCard.question;
    $('ans-input').value = currentCard.answer;
    editMode = true;
    cardToEditIndex = currentIndex;
    $('add-btn').innerText = "Replace Error";
    $('add-btn').style.background = "#d73a49";
    $('delete-btn').style.display = 'flex';
    $('quest-input').focus();
    window.scrollTo(0, 0);
  }
};

// --- 4. REVIEW LOGIC (POSTPONE) ---
const postpone = (days) => {
  const msInDay = 24 * 60 * 60 * 1000;
  deck[currentIndex].nextReview = Date.now() + (days * msInDay);
  saveToStorage();
  updateStats();
  showNextDueCard();// fire up modal is- flipped
};

const rateCard = (level) => {
  if (level === 'hard') postpone(1);
  if (level === 'good') postpone(3);
  if (level === 'easy') postpone(7);
};

// --- 5. UI RENDERING ---
const showAnswer = () => {
  const ans = $('answer-text');
  if (ans) ans.style.display = 'block'; 

  // Back of flipped card
  const controls = $('repetition-controls');
  if (controls) {
  controls.style.display = 'flex';
  }
};

//////////  NEW DECK VIEW LOGIC ///////////
const openDeckView = () => {
  $('deck-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  showNextDueCard(); // we use OUR existing engine 
};

const closeDeckView = () => {
  $('deck-modal').style.display = "none";
  document.body.style.overflow = 'auto';
};


let renderCard = () => {
  const currentCard = deck[currentIndex];
  const inner = $('card-inner');
  if (inner) inner.classList.remove('is-flipped');     
  if (!'currentCard') {
    $('question-text').innerText = "All clear.. . Rest, Spark.";
    $('answer-text').style.display = 'none';
    $('repetition-controls').style.display = "none";
    $('show-answer').style.display = 'none';
    return;
  }
// Adding questions to modal
  $('question-text').innerHTML = `${currentCard.question} <br> <small style="font-size:0.6rem; color:var(--neon-blue); cursor:pointer;">[TAP TO EDIT]</small>`;
  $('question-text').onclick = startEdit;
  $('answer-text').innerText = currentCard.answer;
  $('answer-text').style.display = 'none';
  $('repetition-controls').style.display = 'none';
  $('show-answer').style.display = 'block';
  $('delete-btn').style.display = 'none';
};

const wrapRenderCard = renderCard;

const toggleFlip = () => {
  const inner = $('card-inner');
  if (inner) {
    inner.classList.toggle('is-flipped');
  if (inner.classList.contains('is-flipped')) {
    showAnswer();
    } 
  }
};

//
const showNextDueCard = () => {
  const now = Date.now();
  const dueCards = deck.filter(card => {
    const isDue = !card.nextReview || card.nextReview <= now;
    const isCorrectSector =  
     (currentActiveSector === 'All' || card.sector === currentActiveSector);
    return isDue && isCorrectSector;
    });
  if (dueCards.length > 0) {
    currentIndex = deck.indexOf(dueCards[0]);
  } else {
    currentIndex = -1;
  }
  renderCard();
  renderSectorFilters();
}

  // --- Rendering Dimensions --- // 
  const renderSectorFilters = () => {
    const currentDeck = deck || [];
    const sectors = ['All', ...new Set(deck.map(card => 
        card.sector || 'Deep Space'))];
    const nav = $('sector-nav');
    if (!nav) { 
        console.error('Critical: Sector-nav not found in HTML');
        return; // Fuse 
    }
      nav.innerHTML = ''; // Clean for all btn
      sectors.forEach(sector => {
    const btn = document.createElement('button');
        btn.innerText = sector;
        btn.className = (currentActiveSector === sector) ? 'active-sector-btn' : 'sector-btn';
    
        btn.onclick = () => {
                currentActiveSector = sector; // We changing dimension
                renderSectorFilters();   // refreshing the btns appearance
                showNextDueCard(); // Card from new dimensions
        };
            nav.appendChild(btn);
      });
    } 


  // --- STAR GATE REFRESH ---
  // Re-renders the footer list whenever the deck state changes
  const list = document.getElementById('archive-list');
  if (list && list.innerHTML !== "") {
    openInspector();
  }


// --- 6. SYNC & ARCHIVE ---
const syncSystem = () => {
  const name = $('user-input').value.trim();
  if (name) {
    currentUser = name;
    $('display-name').innerHTML = `<span style="font-size: 0.7rem; opacity: 0,7;">:</span> ${currentUser}`;
    deck = JSON.parse(localStorage.getItem(`deck_${currentUser}`)) || [];
    $('user-input').value = '';
    $('quest-input').focus();
    updateStats();
    showNextDueCard();
    console.log(`System: Identity confirmed. Welcome, ${currentUser}.`);
    } else { 
        alert('Identify yourself, Pilot'); 
    }
};

const exportDeck = () => {
  if (deck.length === 0) return alert("Empty!");
  const dataStr = JSON.stringify(deck, null, 2);
  const dataBlob = new Blob([dataStr], {type:'application/json'});
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `deck_${currentUser}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

const importDeck = (event) =>{
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      deck = JSON.parse(e.target.result);
      saveToStorage(); updateStats(); showNextDueCard();
      alert("Success!");
    } catch (err){ alert("Error!"); }
  };
  reader.readAsText(file);
};

// --- 7. INITIALIZATION (THE SPARK) ---
document.addEventListener('DOMContentLoaded', () => {
  // 1. Core Systems
  $('login-btn').onclick = syncSystem;
  $('add-btn').onclick = addFlashcard;
  $('show-answer').onclick = showAnswer;

  // 2. DISPOSAL SYSTEM - Event propagation fix
  const trashBtn = $('delete-btn');
  if (trashBtn) {
    trashBtn.onclick = (e) => {
      e.stopPropagation(); // Stops the signal to prevent clicking the card underneath
      deleteCard();
    };
  }
  
  // 3. Postpone Ratings
  const h = $('hard-btn'); 
  if(h) {
    h.innerText='HARD (1d) ⚠️';
    h.onclick = () => rateCard('hard'); 
  }
  const g = $('good-btn'); 
  if(g) {
    g.innerText = 'GOOD (3d) 💤';
    g.onclick = () => rateCard('good');
  }
  const e = $('easy-btn'); 
  if(e) {
    e.innerText = 'EASY (7d)🚀'; 
    e.onclick = () => rateCard('easy');}
  const o = $('omega-btn'); 
  if(o) {
      o.innerText = 'OMEGA(30d)💀'; 
      o.onclick = () => postpone(30);
    }

  // 4. System Tools
  $('export-btn').onclick = exportDeck;
  $('import-btn').onclick = () => $('import-input').click(); 
  $('import-input').onchange = importDeck;
  $('delete-sector-btn').onclick = deleteActiveSector;  
  // Launch sequence
  updateStats();
  showNextDueCard();
  renderSectorFilters(); 
  console.log('--- Anki ARV V2.0: MULTI-DIMENSIONAL SYSTEM ACTIVE ---');
  console.log('Status: Spark stable. Sector maped. Pilot Ready');
});

// Surgical inspection in history

const openInspector = () => {
  const list = document.getElementById('archive-list');
  
  // If list is already open - close it (toggle)
  if (list.innerHTML !== "") {
    list.innerHTML = "";
    return;
  }

  list.innerHTML = deck.map((card, index) => {
    const isPostponed = card.nextReview && card.nextReview > Date.now();
    const dateLabel = isPostponed 
      ? `[TIME-LOCK: ${new Date(card.nextReview).toLocaleDateString()}]` 
      : "[ACTIVE]";

    return `
      <div style="border: 1px solid #333; padding: 10px; margin-bottom: 8px; background: rgba(0,0,0,0.4); border-radius: 4px;">
        <div style="font-size: 0.6rem; color: ${isPostponed ? '#ff4444' : 'var(--neon-blue)'}; margin-bottom: 5px;">
          ${dateLabel}
        </div>
        <div style="font-size: 0.85rem; color: #fff; margin-bottom: 10px;">
          ${card.question.substring(0, 60)}${card.question.length > 60 ? '...' : ''}
        </div>
        <button onclick="currentIndex=${index}; renderCard(); window.scrollTo({top: 0, behavior: 'smooth'});" 
                style="background: transparent; color: var(--neon-blue); border: 1px solid var(--neon-blue); padding: 4px 10px; cursor: pointer; font-size: 0.7rem; border-radius: 2px;">
          RECALL & EDIT
        </button>
      </div>
    `;
  }).join('');
};
