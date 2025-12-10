

let joueurs = [];
let joueursSelectionnes = [];
let joueurDuJour = null;

const searchInput = document.getElementById('searchInput');
const suggestionsContainer = document.getElementById('suggestions');
const selectedPlayersContainer = document.getElementById('selectedPlayers');



// ===== SYSTÈME D'INDICES =====
let hintButtons = {
    montant_transfert: { unlockAt: 5, visible: false, unlocked: false, revealed: false },
    periode_psg: { unlockAt: 9, visible: false, unlocked: false, revealed: false },
    parcours: { unlockAt: 13, visible: false, unlocked: false, revealed: false }
};

// ===== CHARGEMENT DES DONNÉES =====
async function loadPlayers() {
    try {
        const response = await fetch('js/data.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        joueurs = await response.json().then(data => data.joueurs);
        console.log(`${joueurs.length} joueurs chargés`);
    } catch (error) {
        console.error('Erreur lors du chargement des joueurs:', error);
    }
}

// ===== UTILITAIRES =====
function getPlayerPhotoUrl(player) {
    if (player.photo && player.photo.startsWith('http')) return player.photo;
    if (player.photo) return player.photo;
    return `https://via.placeholder.com/80x80/dc143c/ffffff?text=${player.nom.charAt(0)}`;
}

function getDailySeed() {
    const today = new Date();
    return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function getTimeUntilMidnight() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const diff = tomorrow - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours}h ${minutes}m ${seconds}s`;
}

function updateCountdown() {
    const countdownElement = document.getElementById('countdown-timer');
    if (countdownElement) countdownElement.textContent = getTimeUntilMidnight();
}

function getArrowIcon(direction) {
    if (!direction) return '';
    const path = direction === 'up' 
        ? 'M12 5L12 19M12 5L6 11M12 5L18 11' 
        : 'M12 19L12 5M12 19L18 13M12 19L6 13';
    return `<span class="arrow-indicator"><svg viewBox="0 0 24 24" fill="none"><path d="${path}" stroke="black" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
}

function removeAccents(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// ===== LOGIQUE DU JEU =====
function selectDailyPlayer() {
    if (joueurs.length === 0) {
        console.error('Aucun joueur chargé');
        return null;
    }
    
    const seed = getDailySeed();
    const randomValue = seededRandom(seed);
    const index = Math.floor(randomValue * joueurs.length);
    joueurDuJour = joueurs[index];
    
    return joueurDuJour;
}

function compareWithDailyPlayer(player) {
    if (!joueurDuJour) return null;
    
    const compareValue = (val1, val2) => ({
        status: val1 === val2 ? 'correct' : 'incorrect',
        direction: val1 < val2 ? 'up' : (val1 > val2 ? 'down' : null)
    });
    
    return {
        nationalite: player.nationalite === joueurDuJour.nationalite ? 'correct' : 'incorrect',
        age: compareValue(player.age, joueurDuJour.age),
        poste: player.poste === joueurDuJour.poste ? 'correct' : 'incorrect',
        numero: compareValue(player.numero, joueurDuJour.numero),
        taille: compareValue(player.taille, joueurDuJour.taille),
        forme_au_club: player.forme_au_club === joueurDuJour.forme_au_club ? 'correct' : 'incorrect',
        nombre_matchs: compareValue(player.nombre_matchs, joueurDuJour.nombre_matchs),
        isCorrectPlayer: player.id === joueurDuJour.id
    };
}

// ===== SYSTÈME D'INDICES =====
function updateHintButtons() {
    const attempts = joueursSelectionnes.length;
    
    if (attempts >= 1) {
        hintButtons.montant_transfert.visible = true;
        hintButtons.periode_psg.visible = true;
        hintButtons.parcours.visible = true;
    }
    
    if (attempts >= 5) hintButtons.montant_transfert.unlocked = true;
    if (attempts >= 9) hintButtons.periode_psg.unlocked = true;
    if (attempts >= 13) hintButtons.parcours.unlocked = true;
    
    renderHintButtons();
    adjustMargin(); // Ajuste le margin après la mise à jour
}

function toggleHint(hintType) {
    const config = hintButtons[hintType];
    if (!config || !config.unlocked) return;
    
    config.revealed = !config.revealed;
    renderHintButtons();
    
    // Appliquer la classe à la BOX au lieu du container
    const boxEl = document.querySelector('.box');
    if (boxEl && hintType === 'parcours') {
        if (config.revealed) {
            boxEl.classList.add('expanded-parcours');
        } else {
            boxEl.classList.remove('expanded-parcours');
        }
    }
}


function renderHintButtons() {
    const container = document.querySelector('.hint-buttons-container');
    if (!container) return;
    
    const attempts = joueursSelectionnes.length;
    
    const hints = [
        {
            type: 'montant_transfert',
            icon: '💰',
            label: 'Montant du transfert',
            value: joueurDuJour?.montant_transfert || 'N/A',
            unlockAt: 5
        },
        {
            type: 'periode_psg',
            icon: '📅',
            label: 'Période au PSG',
            value: joueurDuJour?.periode_psg || 'N/A',
            unlockAt: 9
        },
        {
            type: 'parcours',
            icon: '🏆',
            label: 'Parcours',
            value: joueurDuJour?.parcours || 'N/A',
            unlockAt: 13
        }
    ];
    
    container.innerHTML = hints.map(hint => {
        const config = hintButtons[hint.type];
        const isVisible = config.visible;
        const isUnlocked = config.unlocked;
        const attemptsNeeded = hint.unlockAt - attempts;
        
        return `
            <div class="hint-button ${isVisible ? 'visible' : ''} ${isUnlocked ? 'unlocked' : ''} ${config.revealed ? 'active' : ''}" 
                 data-hint="${hint.type}"
                 ${isUnlocked ? `onclick="toggleHint('${hint.type}')"` : ''}>
                <div class="hint-icon">${hint.icon}</div>
                <div class="hint-label">${hint.label}</div>
                ${!isUnlocked ? `
                    <div class="hint-lock">
                        🔒
                        <span class="hint-unlock-text">
                            ${attemptsNeeded > 0 ? `${attemptsNeeded} essai${attemptsNeeded > 1 ? 's' : ''}` : 'Bientôt...'}
                        </span>
                    </div>
                ` : `
                    <div class="hint-value ${config.revealed ? 'revealed' : ''} ${hint.type === 'parcours' ? 'hint-value-long' : ''}">
                        ${hint.value}
                    </div>
                `}
            </div>
        `;
    }).join('');
}




// ===== VICTOIRE =====
function showVictoryBox() {
    // Éviter de créer plusieurs fois la box
    if (document.getElementById('victory-box')) return;
    
    searchInput.disabled = true;
    searchInput.placeholder = "Joueur trouvé ! Revenez demain...";
    
    const victoryHTML = `
        <div class="victory-container" id="victory-box">
            <div class="box">
                <div class="title victory-title">🎉 VICTOIRE ! 🎉</div>
                <div class="victory-content">
                    <img src="${getPlayerPhotoUrl(joueurDuJour)}" 
                         alt="${joueurDuJour.nom}" 
                         class="victory-photo"
                         onerror="this.src='https://via.placeholder.com/150x150/dc143c/ffffff?text=${joueurDuJour.nom.charAt(0)}'">
                    <div class="victory-text">
                        Bravo tu as trouvé <strong>${joueurDuJour.nom}</strong> !
                    </div>
                    <div class="victory-stats">
                        <div class="stat-item">
                            <span class="stat-label">Nombre d'essais :</span>
                            <span class="stat-value">${joueursSelectionnes.length}</span>
                        </div>
                        <div class="stat-item countdown-item">
                            <span class="stat-label">Joueur suivant dans : </span>
                            <span class="stat-value" id="countdown-timer">${getTimeUntilMidnight()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
 selectedPlayersContainer.insertAdjacentHTML('afterend', victoryHTML);

// Scroll amélioré pour mobile et desktop
setTimeout(() => {
    const victoryBox = document.getElementById('victory-box');
    if (victoryBox) {
        // Récupérer la position exacte de la victory box
        const boxRect = victoryBox.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const targetPosition = boxRect.top + scrollTop - 20;
        
        // Scroll universel qui fonctionne sur tous les appareils
        window.scrollTo({ 
            top: targetPosition, 
            behavior: 'smooth' 
        });
        
        // Fallback pour les anciens navigateurs mobiles
        if (window.pageYOffset === scrollTop) {
            victoryBox.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start',
                inline: 'nearest'
            });
        }
    }
}, 150);

setInterval(updateCountdown, 1000);

    saveGameState();

      // AJOUTER : enregistrer les stats UNE SEULE FOIS
updateStatsAfterGame(joueursSelectionnes.length, true);

    

    // Marquer que les stats ont été enregistrées
const state = JSON.parse(localStorage.getItem("psgQuizState"));
state.statsRecorded = true;
localStorage.setItem("psgQuizState", JSON.stringify(state));

    
}

// ===== RECHERCHE =====
function searchPlayers(query) {
    if (!query || query.length < 1) return [];
    const normalizedQuery = removeAccents(query.toLowerCase());
    return joueurs.filter(joueur => 
        removeAccents(joueur.nom.toLowerCase()).includes(normalizedQuery) &&
        !joueursSelectionnes.some(selected => selected.id === joueur.id)
    ).slice(0, 8);
}

function showSuggestions(players) {
    if (players.length === 0) {
        suggestionsContainer.innerHTML = '<div class="no-results">🔍 Aucun joueur trouvé</div>';
        suggestionsContainer.className = 'suggestions show';
        return;
    }

    suggestionsContainer.innerHTML = players.map(player => `
        <div class="suggestion-item" data-player-id="${player.id}">
            <img src="${getPlayerPhotoUrl(player)}" alt="${player.nom}" class="player-photo"
                 onerror="this.src='https://via.placeholder.com/50x50/dc143c/ffffff?text=${player.nom.charAt(0)}'">
            <div class="player-info">
                <div class="player-name">${player.nom}</div>
                <div class="player-details">${player.poste} • ${player.nationalite}</div>
            </div>
        </div>
    `).join('');
    
    suggestionsContainer.className = 'suggestions show';

    document.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            selectPlayer(parseInt(item.getAttribute('data-player-id')));
        });
    });
}

function hideSuggestions() {
    suggestionsContainer.innerHTML = '';
    suggestionsContainer.className = 'suggestions';
}

// ===== SÉLECTION DE JOUEUR =====
function selectPlayer(playerId) {
    const player = joueurs.find(j => j.id === playerId);
    if (!player || joueursSelectionnes.some(s => s.id === playerId)) return;

    joueursSelectionnes.push(player);
    searchInput.value = '';
    hideSuggestions();

    const comparison = compareWithDailyPlayer(player);
    
    const alreadyWon = document.getElementById('victory-box') !== null;

    // Afficher tous les joueurs (version responsive)
    renderPlayersResponsive();

    // Mettre à jour les boutons d'indices
    updateHintButtons();

    updateSubtitleVisibility();

    // Scroll vers la zone des joueurs sélectionnés
    setTimeout(() => {
        selectedPlayersContainer.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
        });
    }, 100);

    // Vérifier la victoire seulement si on n'a pas déjà gagné
    if (comparison?.isCorrectPlayer && !alreadyWon) {
        setTimeout(() => {
            showVictoryBox();
        }, 3000);
    }

    saveGameState();
}

// ===== AFFICHAGE =====
function adjustTextSizing() {
    const categoryValues = document.querySelectorAll('.category-value');
    
    categoryValues.forEach(element => {
        const text = element.textContent.trim();
        const textLength = text.length;
        
        element.classList.remove('text-short', 'text-medium', 'text-long', 'text-very-long');
        element.style.setProperty('--text-length', textLength);
        
        if (textLength <= 2) {
            element.classList.add('text-short');
        } else if (textLength <= 4) {
            element.classList.add('text-medium');
        } else if (textLength <= 6) {
            element.classList.add('text-long');
        } else if (textLength <= 15) {
            element.classList.add('text-very-long');
        } else {
            element.classList.add('text-extremely-long');
        }
        
        const parentCategory = element.closest('.category');
        if (parentCategory) {
            const categoryIndex = Array.from(parentCategory.parentElement.children).indexOf(parentCategory);
            
            if (categoryIndex === 1) {
                element.setAttribute('data-type', 'nationality');
            } else if (categoryIndex === 3) {
                element.setAttribute('data-type', 'position');
            }
            
        }
    });
}

// ===== UTILITAIRE : gérer l'affichage du sous-titre =====
function updateSubtitleVisibility() {
    const subtitle = document.getElementById('subtitle');
    if (!subtitle) return;
    // cacher si au moins un essai, sinon remettre l'affichage par défaut
    subtitle.style.display = (joueursSelectionnes.length > 0) ? 'none' : '';
}


function displaySelectedPlayers() {
    if (joueursSelectionnes.length === 0) {
        selectedPlayersContainer.innerHTML = '';
        return;
    }

    let html = `
        <div class="categories-header">
            <div class="category-header-item">Joueur</div>
            <div class="category-header-item nationality-header">NATIONALITÉ</div>
            <div class="category-header-item">Âge</div>
            <div class="category-header-item">Poste</div>
            <div class="category-header-item">Numéro</div>
            <div class="category-header-item">Taille</div>
            <div class="category-header-item">Formé au club</div>
            <div class="category-header-item">Matchs joués</div>
        </div>
        <div id="players-list">
    `;

    [...joueursSelectionnes].reverse().forEach((player, index) => {
        const c = compareWithDailyPlayer(player);
        const isNewPlayer = index === 0 ? ' new-player' : '';
        
        html += `
            <div class="selected-player${isNewPlayer}">
                <div class="player-categories">
                    <div class="category">
                        <div class="category-content">
                            <img src="${getPlayerPhotoUrl(player)}" alt="${player.nom}" class="player-main-photo"
                                 onerror="this.src='https://via.placeholder.com/80x80/dc143c/ffffff?text=${player.nom.charAt(0)}'">
                            <span class="player-name-main">${player.nom}</span>
                        </div>
                    </div>
                    <div class="category ${c.nationalite}">
                        <div class="category-content">
                            <span class="category-value">${player.nationalite}</span>
                        </div>
                    </div>
                    <div class="category ${c.age.status}">
                        <div class="category-content">
                            ${c.age.direction ? getArrowIcon(c.age.direction) : ''}
                            <span class="category-value">${player.age}</span>
                        </div>
                    </div>
                    <div class="category ${c.poste}">
                        <div class="category-content">
                            <span class="category-value">${player.poste}</span>
                        </div>
                    </div>
                    <div class="category ${c.numero.status}">
                        <div class="category-content">
                            ${c.numero.direction ? getArrowIcon(c.numero.direction) : ''}
                            <span class="category-value">${player.numero}</span>
                        </div>
                    </div>
                    <div class="category ${c.taille.status}">
                        <div class="category-content">
                            ${c.taille.direction ? getArrowIcon(c.taille.direction) : ''}
                            <span class="category-value">${player.taille}</span>
                        </div>
                    </div>
                    <div class="category ${c.forme_au_club}">
                        <div class="category-content">
                            <span class="category-value ${player.forme_au_club ? 'yes' : 'no'}">
                                ${player.forme_au_club ? 'Oui' : 'Non'}
                            </span>
                        </div>
                    </div>
                    <div class="category ${c.nombre_matchs.status}">
                        <div class="category-content">
                            ${c.nombre_matchs.direction ? getArrowIcon(c.nombre_matchs.direction) : ''}
                            <span class="category-value">${player.nombre_matchs}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    selectedPlayersContainer.innerHTML = html;

    setTimeout(adjustTextSizing, 50);
    
    setTimeout(() => {
        const newPlayerEl = document.querySelector('.selected-player.new-player');
        if (newPlayerEl) {
            newPlayerEl.classList.remove('new-player');
        }
    }, 3000);
}

function displaySelectedPlayersMobile() {
    if (joueursSelectionnes.length === 0) {
        selectedPlayersContainer.innerHTML = '';
        return;
    }

    let html = `
      <div class="carousel-wrapper">
        <div class="carousel-scroll-hint">
          ← Défiler Horizontalement pour voir plus →
        </div>
        <div class="carousel-container">
          <div class="carousel-track">
            <div class="categories-header">
              <div class="category-header-item">Joueur</div>
              <div class="category-header-item nationality-header">NATIONALITÉ</div>
              <div class="category-header-item">Âge</div>
              <div class="category-header-item">Poste</div>
              <div class="category-header-item">Numéro</div>
              <div class="category-header-item">Taille</div>
              <div class="category-header-item">Formé au club</div>
              <div class="category-header-item">Matchs joués</div>
            </div>
    `;

    [...joueursSelectionnes].reverse().forEach((player, index) => {
        const c = compareWithDailyPlayer(player) || {};
        const isNewPlayer = index === 0 ? ' new-player' : '';

        html += `
          <div class="player-categories${isNewPlayer}">
            <div class="category">
              <div class="category-content">
                <img src="${getPlayerPhotoUrl(player)}" alt="${player.nom}" class="player-main-photo"
                     onerror="this.src='https://via.placeholder.com/80x80/dc143c/ffffff?text=${(player.nom||'').charAt(0)}'">
                <span class="player-name-main">${player.nom ?? '—'}</span>
              </div>
            </div>

            <div class="category ${c.nationalite ?? ''}">
              <div class="category-content">
                <span class="category-value">${player.nationalite ?? '—'}</span>
              </div>
            </div>

            <div class="category ${c.age?.status ?? ''}">
              <div class="category-content">
                ${c.age?.direction ? getArrowIcon(c.age.direction) : ''}
                <span class="category-value">${player.age ?? '—'}</span>
              </div>
            </div>

            <div class="category ${c.poste ?? ''}">
              <div class="category-content">
                <span class="category-value">${player.poste ?? '—'}</span>
              </div>
            </div>

            <div class="category ${c.numero?.status ?? ''}">
              <div class="category-content">
                ${c.numero?.direction ? getArrowIcon(c.numero.direction) : ''}
                <span class="category-value">${player.numero ?? '—'}</span>
              </div>
            </div>

            <div class="category ${c.taille?.status ?? ''}">
              <div class="category-content">
                ${c.taille?.direction ? getArrowIcon(c.taille.direction) : ''}
                <span class="category-value">${player.taille ?? '—'}</span>
              </div>
            </div>

            <div class="category ${c.forme_au_club ?? ''}">
              <div class="category-content">
                <span class="category-value ${player.forme_au_club ? 'yes' : 'no'}">
                  ${player.forme_au_club ? 'Oui' : 'Non'}
                </span>
              </div>
            </div>

            <div class="category ${c.nombre_matchs?.status ?? ''}">
              <div class="category-content">
                ${c.nombre_matchs?.direction ? getArrowIcon(c.nombre_matchs.direction) : ''}
                <span class="category-value">${player.nombre_matchs ?? '—'}</span>
              </div>
            </div>
          </div>
        `;
    });

    html += `
          </div>
        </div>
        <div class="carousel-scrollbar">
          <div class="carousel-scrollbar-thumb"></div>
        </div>
      </div>
    `;

    selectedPlayersContainer.innerHTML = html;

    const container = selectedPlayersContainer.querySelector('.carousel-container');
    const scrollbar = selectedPlayersContainer.querySelector('.carousel-scrollbar-thumb');
    
    if (container && scrollbar) {
        container.addEventListener('scroll', () => {
            const scrollPercentage = container.scrollLeft / (container.scrollWidth - container.clientWidth);
            const maxScroll = 100 - (scrollbar.parentElement.clientWidth / container.scrollWidth * 100);
            scrollbar.style.left = `${scrollPercentage * maxScroll}%`;
        });

        const thumbWidth = (container.clientWidth / container.scrollWidth) * 100;
        scrollbar.style.width = `${thumbWidth}%`;
    }

    setTimeout(adjustTextSizing, 40);
    
    setTimeout(() => {
        const newPlayerEl = document.querySelector('.player-categories.new-player');
        if (newPlayerEl) {
            newPlayerEl.classList.remove('new-player');
        }
    }, 3000);
}

function renderPlayersResponsive() {
    const victoryBox = document.getElementById('victory-box');
    const victoryHTML = victoryBox ? victoryBox.outerHTML : null;
    
    if (window.innerWidth <= 768) {
        displaySelectedPlayersMobile();
    } else {
        displaySelectedPlayers();
    }
    
    if (victoryHTML && !document.getElementById('victory-box')) {
        selectedPlayersContainer.insertAdjacentHTML('afterend', victoryHTML);
        setInterval(updateCountdown, 1000);
    }
}

// ===== ÉVÉNEMENTS =====
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    query.length === 0 ? hideSuggestions() : showSuggestions(searchPlayers(query));
});

searchInput.addEventListener('focus', () => {
    const query = searchInput.value.trim();
    if (query.length > 0) showSuggestions(searchPlayers(query));
});

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        hideSuggestions();
        searchInput.blur();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        const results = searchPlayers(searchInput.value.trim());
        if (results.length > 0) selectPlayer(results[0].id);
    }
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) hideSuggestions();
});

document.querySelector('.search-btn').addEventListener('click', (e) => {
    e.preventDefault();
    const results = searchPlayers(searchInput.value.trim());
    results.length === 1 ? selectPlayer(results[0].id) : showSuggestions(results);
});

let resizeTimeout;
let lastWidth = window.innerWidth;

window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const newWidth = window.innerWidth;
        if (Math.abs(newWidth - lastWidth) > 50) {
            lastWidth = newWidth;
            adjustTextSizing();
            renderPlayersResponsive();
        }
    }, 300);
});

document.addEventListener('touchstart', (e) => {
    if (e.target.closest('.search-container') || 
        e.target.closest('.suggestion-item') ||
        e.target.closest('.nav-button')) {
        return;
    }
    e.stopPropagation();
}, { passive: true });

// ===== INITIALISATION =====
async function initApp() {
    console.log("Initialisation...");
    await loadPlayers();
    selectDailyPlayer();
    renderHintButtons();
    loadGameState();
    console.log("Application prête !");
}


if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// ===== REGENERER UN JOUEUR ALÉATOIRE (CONSOLE) =====
function regenererJoueurAleatoire() {
    if (joueurs.length === 0) {
        console.error("Aucun joueur chargé !");
        return null;
    }

    const index = Math.floor(Math.random() * joueurs.length);
    joueurDuJour = joueurs[index];

    // Réinitialiser les boutons d'indices
    hintButtons.montant_transfert = { unlockAt: 5, visible: false, unlocked: false };
    hintButtons.periode_psg = { unlockAt: 9, visible: false, unlocked: false };
    hintButtons.parcours = { unlockAt: 13, visible: false, unlocked: false };
    renderHintButtons();

    console.log("=== JOUEUR ALÉATOIRE ===");
    console.log(`Index: ${index}/${joueurs.length}`);
    console.log(joueurDuJour);

    return joueurDuJour;
}


// ===== SAUVEGARDE DANS LOCALSTORAGE =====
function saveGameState() {
    const state = {
        date: getDailySeed(),
        attempts: joueursSelectionnes.map(j => j.id),
        hasWon: document.getElementById('victory-box') !== null,
        statsRecorded: false // AJOUTER ce flag
    };
    localStorage.setItem("psgQuizState", JSON.stringify(state));
}

function loadGameState() {
    const saved = localStorage.getItem("psgQuizState");
    if (!saved) return;

    try {
        const state = JSON.parse(saved);

        // Vérifie si c'est le même jour
        if (state.date !== getDailySeed()) {
            localStorage.removeItem("psgQuizState");
            return;
        }

        // Restaurer les essais
        state.attempts.forEach(id => {
            const player = joueurs.find(j => j.id === id);
            if (player) joueursSelectionnes.push(player);
        });

        renderPlayersResponsive();
        updateHintButtons();
        updateSubtitleVisibility();

// Restaurer la victoire si déjà gagnée
        // MAIS NE PAS RÉENREGISTRER LES STATS
        if (state.hasWon) {
            // Recréer la victory box sans appeler updateStatsAfterGame
            if (document.getElementById('victory-box')) return;
            
            searchInput.disabled = true;
            searchInput.placeholder = "Joueur trouvé ! Revenez demain...";
            
            const victoryHTML = `
                <div class="victory-container" id="victory-box">
                    <div class="box">
                        <div class="title victory-title">🎉 VICTOIRE ! 🎉</div>
                        <div class="victory-content">
                            <img src="${getPlayerPhotoUrl(joueurDuJour)}" 
                                 alt="${joueurDuJour.nom}" 
                                 class="victory-photo"
                                 onerror="this.src='https://via.placeholder.com/150x150/dc143c/ffffff?text=${joueurDuJour.nom.charAt(0)}'">
                            <div class="victory-text">
                                Bravo tu as trouvé <strong>${joueurDuJour.nom}</strong> !
                            </div>
                            <div class="victory-stats">
                                <div class="stat-item">
                                    <span class="stat-label">Nombre d'essais :</span>
                                    <span class="stat-value">${joueursSelectionnes.length}</span>
                                </div>
                                <div class="stat-item countdown-item">
                                    <span class="stat-label">Joueur suivant dans : </span>
                                    <span class="stat-value" id="countdown-timer">${getTimeUntilMidnight()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            selectedPlayersContainer.insertAdjacentHTML('afterend', victoryHTML);
            setInterval(updateCountdown, 1000);
            
            // Scroll vers la victory box après chargement
            setTimeout(() => {
                const victoryBox = document.getElementById('victory-box');
                if (victoryBox) {
                    const boxRect = victoryBox.getBoundingClientRect();
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    const targetPosition = boxRect.top + scrollTop - 20;
                    
                    window.scrollTo({ 
                        top: targetPosition, 
                        behavior: 'smooth' 
                    });
                    
                    if (window.pageYOffset === scrollTop) {
                        victoryBox.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'start',
                            inline: 'nearest'
                        });
                    }
                }
            }, 150);
            
            // NE PAS APPELER updateStatsAfterGame() ICI
        }
        }
     catch (e) {
        console.error("Erreur de chargement du state:", e);
        localStorage.removeItem("psgQuizState");
    }
}

function adjustMargin() {
    const container = document.querySelector('.container');
    const searchContainer = document.querySelector('.search-container');
    
    // Vérifie si au moins un bouton d'indice est visible
    const hasVisibleHints = Object.values(hintButtons).some(hint => hint.visible);
    
    const width = window.innerWidth;
    
    // TRÈS PETIT ÉCRAN (≤ 440px) - Le plus compact
    if (width <= 440) {
        if (hasVisibleHints) {
            container.style.marginTop = '-100px'; // Remonté davantage
            container.style.marginBottom = '70px';
            searchContainer.style.marginTop = '-70px';
        } else {
            container.style.marginTop = '-800px';
            container.style.marginBottom = '0';
            searchContainer.style.marginTop = '0';
        }
    }

        else if (width <= 480 && width > 438) {
        if (hasVisibleHints) {
            container.style.marginTop = '0px';
            container.style.marginBottom = '900px';
            searchContainer.style.marginTop = '-90px';
        } else {
            container.style.marginTop = '-1000px';
            container.style.marginBottom = '0';
            searchContainer.style.marginTop = '0';
        }
    } 

    // MOBILE STANDARD (441px - 800px) - Moyennement compact
    else if (width <= 800) {
        if (hasVisibleHints) {
            container.style.marginTop = '-80px'; // Aussi remonté un peu plus
            container.style.marginBottom = '90px';
            searchContainer.style.marginTop = '-90px';
        } else {
            container.style.marginTop = '-1000px';
            container.style.marginBottom = '0';
            searchContainer.style.marginTop = '0';
        }
    } 
    // DESKTOP (> 800px) - Le plus spacieux
    else {
        if (hasVisibleHints) {
            container.style.marginTop = '0';
            container.style.marginBottom = '120px';
            searchContainer.style.marginTop = '-120px';
        } else {
            container.style.marginTop = '-1200px';
            container.style.marginBottom = '0';
            searchContainer.style.marginTop = '-10px';
        }
    }
}

// ----- Modal : ouverture/fermeture + masque la barre de recherche -----
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('howToPlayModal');
  if (!modal) {
    console.warn('[Modal] howToPlayModal introuvable dans le DOM');
    return;
  }

  const openBtn = document.getElementById('openModal')
               || document.querySelector('.nav-button[title="Comment jouer ?"]')
               || null;
  const closeBtn = document.getElementById('closeModal') || modal.querySelector('.modal-close');

  // éléments de recherche
  const searchContainer = document.querySelector('.search-container');
  const searchInputEl = document.getElementById('searchInput');
  const suggestionsEl = document.getElementById('suggestions');

  function openModal() {
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // bloque le scroll arrière-plan
    document.body.classList.add('modal-open');

    // désactiver l'input pour éviter focus/clavier
    if (searchInputEl) {
      // mémoriser l'état précédent pour restaurer correctement
      searchInputEl.dataset.wasDisabled = searchInputEl.disabled ? '1' : '0';
      searchInputEl.disabled = true;
      searchInputEl.blur();
    }

    // masquer les suggestions si elles sont visibles
    if (suggestionsEl) {
      suggestionsEl.style.display = 'none';
    }

    updateModalCountdown();
  }

  function closeModal() {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');

    // restaurer l'input s'il n'était pas disabled avant
    if (searchInputEl) {
      if (searchInputEl.dataset.wasDisabled !== '1') searchInputEl.disabled = false;
      delete searchInputEl.dataset.wasDisabled;
    }

    // restaurer l'affichage des suggestions (tu peux ajuster si tu veux vider)
    if (suggestionsEl) {
      suggestionsEl.style.display = '';
    }
  }

  if (openBtn) {
    openBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  } else {
    console.warn('[Modal] Bouton d\'ouverture introuvable (id="openModal").');
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  } else {
    console.warn('[Modal] Bouton de fermeture introuvable (id="closeModal" ou .modal-close).');
  }

  // ferme quand on clique sur le backdrop (la zone sombre)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // (optionnel) ouvre automatiquement pour la démo — retire la ligne si tu veux pas auto-open
  // openModal();
});

// Countdown spécifique à la modal (ne remplace pas d'autres fonctions updateCountdown)
function updateModalCountdown() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const diff = midnight - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const countdownEl = document.getElementById('countdown');
  if (countdownEl) {
    countdownEl.textContent =
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
}
setInterval(updateModalCountdown, 1000);


document.addEventListener('DOMContentLoaded', () => {
  const aboutModal = document.getElementById('aboutModal');
  if (!aboutModal) return;

  const openAboutBtn = document.getElementById('openAboutModal');
  const closeAboutBtn = document.getElementById('closeAboutModal');

  function openAboutModalFn() {
    aboutModal.style.display = 'block';
    aboutModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
  }

  function closeAboutModalFn() {
    aboutModal.style.display = 'none';
    aboutModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
  }

  if (openAboutBtn) {
    openAboutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openAboutModalFn();
    });
  }

  if (closeAboutBtn) {
    closeAboutBtn.addEventListener('click', closeAboutModalFn);
  }

  aboutModal.addEventListener('click', (e) => {
    if (e.target === aboutModal) closeAboutModalFn();
  });
});

// Redirige le scroll vers le contenu de la modal
function enableModalScroll(modal) {
  const modalBody = modal.querySelector('.modal-body');
  if (!modalBody) return;

  // Redirige le scroll de toute la modal vers le contenu
  modal.addEventListener('wheel', (e) => {
    if (modal.style.display !== 'block') return;

    const delta = e.deltaY;
    const atTop = modalBody.scrollTop === 0;
    const atBottom = modalBody.scrollHeight - modalBody.scrollTop <= modalBody.clientHeight + 1;

    // Bloque le scroll de la page
    if ((delta < 0 && atTop) || (delta > 0 && atBottom)) {
      e.preventDefault();
    }

    // Force le scroll sur le contenu interne
    modalBody.scrollTop += delta;
  }, { passive: false });
}

// activer pour tes 2 modals
document.addEventListener('DOMContentLoaded', () => {
  const howToPlayModal = document.getElementById('howToPlayModal');
  const aboutModal = document.getElementById('aboutModal');

  if (howToPlayModal) enableModalScroll(howToPlayModal);
  if (aboutModal) enableModalScroll(aboutModal);
});

document.addEventListener('DOMContentLoaded', () => {
  const statsModal = document.getElementById('statsModal');
  const openStatsBtn = document.getElementById('openStatsModal');
  const closeStatsBtn = document.getElementById('closeStatsModal');

  function openStatsModalFn() {
    displayStats(); // IMPORTANT : appel ici
    statsModal.style.display = 'block';
    statsModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
  }

  function closeStatsModalFn() {
    statsModal.style.display = 'none';
    statsModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
  }

  if (openStatsBtn) {
    openStatsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openStatsModalFn();
    });
  }

  if (closeStatsBtn) {
    closeStatsBtn.addEventListener('click', closeStatsModalFn);
  }

  statsModal.addEventListener('click', (e) => {
    if (e.target === statsModal) closeStatsModalFn();
  });
});
 // ===== GESTION DES STATISTIQUES =====
        
function getStats() {
    const saved = localStorage.getItem('psgQuizStats');
    if (!saved) {
        return {
            gamesPlayed: 0,
            gamesWon: 0,
            currentStreak: 0,
            maxStreak: 0,
            guessDistribution: {
                1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
                6: 0, 7: 0, 8: 0, 9: 0, 10: 0,
                '11+': 0
            },
            allAttempts: [], // NOUVEAU : stocke tous les nombres d'essais
            lastPlayedDate: null
        };
    }
    return JSON.parse(saved);
}


        function saveStats(stats) {
            localStorage.setItem('psgQuizStats', JSON.stringify(stats));
        }

        function updateStatsAfterGame(attempts, won, currentDate) {
            const stats = getStats();
            
            stats.gamesPlayed++;
            
            if (won) {
                stats.gamesWon++;
                
                // Distribution des essais
                if (attempts <= 10) {
                    stats.guessDistribution[attempts]++;
                } else {
                    // enregistrer vraiment le nombre exact d’essais
                    if (!stats.guessDistribution[attempts]) {
                        stats.guessDistribution[attempts] = 0;
                    }
                    stats.guessDistribution[attempts]++;
                }

                
                // Gestion des séries
                if (stats.lastPlayedDate) {
                    const lastDate = new Date(stats.lastPlayedDate);
                    const today = new Date(currentDate);
                    const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
                    
                    if (diffDays === 1) {
                        stats.currentStreak++;
                    } else if (diffDays > 1) {
                        stats.currentStreak = 1;
                    }
                } else {
                    stats.currentStreak = 1;
                }
                
                if (stats.currentStreak > stats.maxStreak) {
                    stats.maxStreak = stats.currentStreak;
                }
            } else {
                stats.currentStreak = 0;
            }
            
            stats.lastPlayedDate = currentDate;
            saveStats(stats);
        }

        function displayStats() {
            const stats = getStats();
            const container = document.getElementById('statsContent');
            
            if (stats.gamesPlayed === 0) {
                container.innerHTML = `
                    <div class="empty-stats">
                        <div class="empty-stats-icon">🎮</div>
                        <div class="empty-stats-text">
                            Aucune partie jouée pour le moment.<br>
                            Lancez votre première partie pour voir vos statistiques !
                        </div>
                    </div>
                `;
                return;
            }
            
            const winRate = stats.gamesPlayed > 0 
                ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) 
                : 0;
            
            const avgAttempts = calculateAverageAttempts(stats);
            
            container.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${stats.gamesPlayed}</div>
                        <div class="stat-label">Parties jouées</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${winRate}%</div>
                        <div class="stat-label">Taux de réussite</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.currentStreak}</div>
                        <div class="stat-label">Série actuelle</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.maxStreak}</div>
                        <div class="stat-label">Meilleure série</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${avgAttempts}</div>
                        <div class="stat-label">Moy. d'essais</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.gamesWon}</div>
                        <div class="stat-label">Victoires</div>
                    </div>
                </div>
                
                <div class="distribution-section">
                    <div class="distribution-title">📈 Distribution des essais</div>
                    <div class="distribution-chart">
                        ${generateDistributionChart(stats)}
                    </div>
                </div>
                
                <button class="reset-stats-btn" onclick="resetStats()">
                    🗑️ Réinitialiser les statistiques
                </button>
            `;
        }

function calculateAverageAttempts(stats) {
    // Utilise le nouveau système avec les valeurs exactes
    if (stats.allAttempts && stats.allAttempts.length > 0) {
        const sum = stats.allAttempts.reduce((acc, val) => acc + val, 0);
        return (sum / stats.allAttempts.length).toFixed(1);
    }
    
    // Fallback : ancienne méthode si allAttempts n'existe pas
    // (pour compatibilité avec anciennes données)
    let totalAttempts = 0;
    let totalWins = 0;
    
    for (let i = 1; i <= 10; i++) {
        const count = stats.guessDistribution[i] || 0;
        totalAttempts += i * count;
        totalWins += count;
    }
    
    const elevenPlus = stats.guessDistribution['11+'] || 0;
    totalAttempts += 11 * elevenPlus;
    totalWins += elevenPlus;
    
    return totalWins > 0 ? (totalAttempts / totalWins).toFixed(1) : '0';
}
        function generateDistributionChart(stats) {
            const maxCount = Math.max(...Object.values(stats.guessDistribution));
            let html = '';
            
            for (let i = 1; i <= 10; i++) {
                const count = stats.guessDistribution[i] || 0;
                const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                
                html += `
                    <div class="chart-row">
                        <div class="chart-label">${i} essai${i > 1 ? 's' : ''}</div>
                        <div class="chart-bar-container">
                            <div class="chart-bar" style="width: ${percentage}%">
                                <span class="chart-value">${count}</span>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            const elevenPlus = stats.guessDistribution['11+'] || 0;
            const percentageElevenPlus = maxCount > 0 ? (elevenPlus / maxCount) * 100 : 0;
            
            html += `
                <div class="chart-row">
                    <div class="chart-label">11+ essais</div>
                    <div class="chart-bar-container">
                        <div class="chart-bar" style="width: ${percentageElevenPlus}%">
                            <span class="chart-value">${elevenPlus}</span>
                        </div>
                    </div>
                </div>
            `;
            
            return html;
        }

        function resetStats() {
            if (confirm('Êtes-vous sûr de vouloir réinitialiser toutes vos statistiques ? Cette action est irréversible.')) {
                localStorage.removeItem('psgQuizStats');
                displayStats();
            }
        }

        

function getStats() {
    const saved = localStorage.getItem('psgQuizStats');
    if (!saved) {
        return {
            gamesPlayed: 0,
            gamesWon: 0,
            currentStreak: 0,
            maxStreak: 0,
            guessDistribution: {
                1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
                6: 0, 7: 0, 8: 0, 9: 0, 10: 0,
                '11+': 0
            },
            allAttempts: [],  // ← AJOUTE CETTE LIGNE !
            lastPlayedDate: null
        };
    }
    
    const stats = JSON.parse(saved);
    
    // Migration : ajoute allAttempts si inexistant
    if (!stats.allAttempts) {
        stats.allAttempts = [];
    }
    
    return stats;
}
function saveStats(stats) {
    localStorage.setItem('psgQuizStats', JSON.stringify(stats));
}

function calculateAverageAttempts(stats) {
    console.log('🔍 calculateAverageAttempts appelée avec:', stats.allAttempts);
    
    // Utilise le nouveau système avec les valeurs exactes
    if (stats.allAttempts && stats.allAttempts.length > 0) {
        const sum = stats.allAttempts.reduce((acc, val) => acc + val, 0);
        const result = (sum / stats.allAttempts.length).toFixed(1);
        console.log('✅ Utilise allAttempts - Somme:', sum, 'Moyenne:', result);
        return result;
    }
    
    console.log('⚠️ Utilise ancienne méthode');
    
    // Fallback : ancienne méthode si allAttempts n'existe pas
    let totalAttempts = 0;
    let totalWins = 0;
    
    for (let i = 1; i <= 10; i++) {
        const count = stats.guessDistribution[i] || 0;
        totalAttempts += i * count;
        totalWins += count;
    }
    
    const elevenPlus = stats.guessDistribution['11+'] || 0;
    totalAttempts += 11 * elevenPlus;
    totalWins += elevenPlus;
    
    return totalWins > 0 ? (totalAttempts / totalWins).toFixed(1) : '0';
}

function generateDistributionChart(stats) {
    const maxCount = Math.max(...Object.values(stats.guessDistribution));
    let html = '';
    
    for (let i = 1; i <= 10; i++) {
        const count = stats.guessDistribution[i] || 0;
        const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
        
        html += `
            <div class="chart-row">
                <div class="chart-label">${i} essai${i > 1 ? 's' : ''}</div>
                <div class="chart-bar-container">
                    <div class="chart-bar" style="width: ${percentage}%">
                        <span class="chart-value">${count}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    const elevenPlus = stats.guessDistribution['11+'] || 0;
    const percentageElevenPlus = maxCount > 0 ? (elevenPlus / maxCount) * 100 : 0;
    
    html += `
        <div class="chart-row">
            <div class="chart-label">11+ essais</div>
            <div class="chart-bar-container">
                <div class="chart-bar" style="width: ${percentageElevenPlus}%">
                    <span class="chart-value">${elevenPlus}</span>
                </div>
            </div>
        </div>
    `;
    
    return html;
}

function displayStats() {
    const stats = getStats();
    const container = document.getElementById('statsContent');
    
    if (!container) {
        console.error('Element #statsContent introuvable');
        return;
    }
    
    if (stats.gamesPlayed === 0) {
        container.innerHTML = `
            <div class="empty-stats">
                <div class="empty-stats-icon">🎮</div>
                <div class="empty-stats-text">
                    Aucune partie jouée pour le moment.<br>
                    Lancez votre première partie pour voir vos statistiques !
                </div>
            </div>
        `;
        return;
    }
    
    const winRate = stats.gamesPlayed > 0 
        ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) 
        : 0;
    
    const avgAttempts = calculateAverageAttempts(stats);
    
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${stats.gamesPlayed}</div>
                <div class="stat-label">Parties jouées</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${winRate}%</div>
                <div class="stat-label">Taux de réussite</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.currentStreak}</div>
                <div class="stat-label">Série actuelle</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.maxStreak}</div>
                <div class="stat-label">Meilleure série</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${avgAttempts}</div>
                <div class="stat-label">Moy. d'essais</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.gamesWon}</div>
                <div class="stat-label">Victoires</div>
            </div>
        </div>
        
        <div class="distribution-section">
            <div class="distribution-title">Distribution des essais</div>
            <div class="distribution-chart">
                ${generateDistributionChart(stats)}
            </div>
        </div>
        
        <button class="reset-stats-btn" onclick="resetStats()">
            Réinitialiser les statistiques
        </button>
    `;
}

function resetStats() {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser toutes vos statistiques ? Cette action est irréversible.')) {
        localStorage.removeItem('psgQuizStats');
        displayStats();
    }
}

function updateStatsAfterGame(attempts, won) {
    const stats = getStats();
    const currentDate = new Date().toISOString();
    
    stats.gamesPlayed++;
    
    if (won) {
        stats.gamesWon++;
        
        // AJOUT CRITIQUE : Stocke le nombre exact d'essais
        if (!stats.allAttempts) {
            stats.allAttempts = [];
        }
        stats.allAttempts.push(attempts);
        
        // Distribution des essais (pour l'affichage du graphique)
        if (attempts <= 10) {
            stats.guessDistribution[attempts]++;
        } else {
            stats.guessDistribution['11+']++;
        }
        
        // Gestion des séries
        if (stats.lastPlayedDate) {
            const lastDate = new Date(stats.lastPlayedDate);
            const today = new Date(currentDate);
            const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                stats.currentStreak++;
            } else if (diffDays > 1) {
                stats.currentStreak = 1;
            }
        } else {
            stats.currentStreak = 1;
        }
        
        if (stats.currentStreak > stats.maxStreak) {
            stats.maxStreak = stats.currentStreak;
        }
    } else {
        stats.currentStreak = 0;
    }
    
    stats.lastPlayedDate = currentDate;
    saveStats(stats);
}

