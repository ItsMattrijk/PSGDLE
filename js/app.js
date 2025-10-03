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
    
    console.log('=== JOUEUR DU JOUR (DEV) ===');
    console.log(`Seed: ${seed}, Joueur: ${joueurDuJour.nom}, Index: ${index}/${joueurs.length}`);
    
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

// Scroll plus robuste pour mobile et desktop
setTimeout(() => {
    const victoryBox = document.getElementById('victory-box');
    if (victoryBox) {
        // Sur mobile, scroller vers le haut de la page
        if (window.innerWidth <= 768) {
            window.scrollTo({ top: victoryBox.offsetTop - 20, behavior: 'smooth' });
        } else {
            victoryBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}, 100);

setInterval(updateCountdown, 1000);

    saveGameState();
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

// ===== RACCOURCI CLAVIER SECRET =====
let secretKeySequence = [];
const SECRET_CODE = ['r', 'e', 's', 'e', 't'];
const SEQUENCE_TIMEOUT = 2000;
let sequenceTimer = null;

document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;

    secretKeySequence.push(e.key.toLowerCase());

    clearTimeout(sequenceTimer);
    sequenceTimer = setTimeout(() => {
        secretKeySequence = [];
    }, SEQUENCE_TIMEOUT);

    if (secretKeySequence.length > SECRET_CODE.length) {
        secretKeySequence.shift();
    }

    if (secretKeySequence.length === SECRET_CODE.length) {
        const isMatch = secretKeySequence.every((key, index) => key === SECRET_CODE[index]);
        
        if (isMatch) {
            console.log("🔓 Code secret activé !");
            
            joueursSelectionnes = [];
            const victoryBox = document.getElementById('victory-box');
            if (victoryBox) victoryBox.remove();
            
            searchInput.disabled = false;
            searchInput.placeholder = "Chercher un joueur...";
            
            regenererJoueurAleatoire();
            
            selectedPlayersContainer.innerHTML = '';
            
            // Réinitialiser les boutons d'indices
            hintButtons.montant_transfert = { unlockAt: 5, visible: false, unlocked: false };
            hintButtons.periode_psg = { unlockAt: 9, visible: false, unlocked: false };
            hintButtons.parcours = { unlockAt: 13, visible: false, unlocked: false };
            renderHintButtons();
            updateSubtitleVisibility();
            
            secretKeySequence = [];
            
            console.log("🎮 Nouveau joueur généré ! Bonne chance !");
        }
    }
});

// Auto-centering du bouton "Parcours" quand il devient actif
document.addEventListener("click", (e) => {
  const btn = e.target.closest('.hint-button[data-hint="parcours"]');
  if (btn && btn.classList.contains("active")) {
    btn.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest"
    });
  }
});

// ===== FONCTION POUR RÉVÉLER TOUS LES INDICES =====
function revealAllHints() {
    Object.keys(hintButtons).forEach(hintType => {
        const config = hintButtons[hintType];
        if (config) {
            config.visible = true;   // rendre visible
            config.unlocked = true;  // débloquer
            config.revealed = true;  // révéler
        }
    });
    renderHintButtons();
    console.log("✨ Tous les indices ont été révélés !");
}

// ===== RACCOURCI CLAVIER SECRET POUR RÉVÉLER LES INDICES =====
let secretHintSequence = [];
const SECRET_HINT_CODE = ['h', 'i', 'n', 't']; // exemple : tape "hint"
let hintSequenceTimer = null;

document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;

    secretHintSequence.push(e.key.toLowerCase());

    clearTimeout(hintSequenceTimer);
    hintSequenceTimer = setTimeout(() => {
        secretHintSequence = [];
    }, SEQUENCE_TIMEOUT);

    if (secretHintSequence.length > SECRET_HINT_CODE.length) {
        secretHintSequence.shift();
    }

    if (secretHintSequence.length === SECRET_HINT_CODE.length) {
        const isMatch = secretHintSequence.every((key, index) => key === SECRET_HINT_CODE[index]);
        if (isMatch) {
            console.log("🔑 Code secret indices activé !");
            revealAllHints();
            secretHintSequence = [];
        }
    }
});

// ===== SAUVEGARDE DANS LOCALSTORAGE =====
function saveGameState() {
    const state = {
        date: getDailySeed(), // identifiant unique du jour
        attempts: joueursSelectionnes.map(j => j.id),
        hasWon: document.getElementById('victory-box') !== null
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
        if (state.hasWon) {
            showVictoryBox();
        }
    } catch (e) {
        console.error("Erreur de chargement du state:", e);
        localStorage.removeItem("psgQuizState");
    }
}

// ===== RESET PAR APPUI LONG SUR LE LOGO =====
const logo = document.querySelector("header img");
let longPressTimer;

function resetGame() {
    console.log("📱 Reset via appui long sur le logo !");
    
    joueursSelectionnes = [];
    const victoryBox = document.getElementById('victory-box');
    if (victoryBox) victoryBox.remove();

    searchInput.disabled = false;
    searchInput.placeholder = "Chercher un joueur...";

    regenererJoueurAleatoire();

    selectedPlayersContainer.innerHTML = '';

    // Réinitialiser les indices
    hintButtons.montant_transfert = { unlockAt: 5, visible: false, unlocked: false };
    hintButtons.periode_psg = { unlockAt: 9, visible: false, unlocked: false };
    hintButtons.parcours = { unlockAt: 13, visible: false, unlocked: false };
    renderHintButtons();
    updateSubtitleVisibility();

    console.log("🎮 Nouveau joueur généré !");
}

// Gestion de l’appui long (3 secondes)
function startLongPress() {
    longPressTimer = setTimeout(() => {
        resetGame();
    }, 3000); // 3 secondes
}

function cancelLongPress() {
    clearTimeout(longPressTimer);
}

// Mobile (touch)
logo.addEventListener("touchstart", startLongPress);
logo.addEventListener("touchend", cancelLongPress);
logo.addEventListener("touchmove", cancelLongPress);



