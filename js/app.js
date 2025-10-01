let joueurs = [];
let joueursSelectionnes = [];
let joueurDuJour = null;

const searchInput = document.getElementById('searchInput');
const suggestionsContainer = document.getElementById('suggestions');
const selectedPlayersContainer = document.getElementById('selectedPlayers');

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
    
    // DEV MODE - Commenter en production
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

    const victoryBox = document.getElementById('victory-box');
    if (victoryBox) {
        victoryBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    setInterval(updateCountdown, 1000);
}

// ===== RECHERCHE =====
function searchPlayers(query) {
    if (!query || query.length < 1) return [];
    return joueurs.filter(joueur => 
        joueur.nom.toLowerCase().includes(query.toLowerCase()) &&
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

    // Vérifier la victoire seulement si on n'a pas déjà gagné
    if (comparison?.isCorrectPlayer && !alreadyWon) {
        setTimeout(() => {
            showVictoryBox();
        }, 3000);
    }
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
        } else {
            element.classList.add('text-very-long');
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
    
    // IMPORTANT : Bloquer le re-render si on vient juste d'ajouter un joueur
    const isAnimating = document.querySelector('.new-player');
    
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
        // Ne re-render que si la largeur a vraiment changé (rotation, pas zoom)
        const newWidth = window.innerWidth;
        if (Math.abs(newWidth - lastWidth) > 50) {
            lastWidth = newWidth;
            adjustTextSizing();
            renderPlayersResponsive();
        }
    }, 300);
});

// Empêcher le re-render sur touch mobile
let isRendering = false;

document.addEventListener('touchstart', (e) => {
    // Ne rien faire si on touche un élément interactif
    if (e.target.closest('.search-container') || 
        e.target.closest('.suggestion-item') ||
        e.target.closest('.nav-button')) {
        return;
    }
    // Empêcher tout re-render accidentel
    e.stopPropagation();
}, { passive: true });

// ===== INITIALISATION =====
async function initApp() {
    console.log("Initialisation...");
    await loadPlayers();
    selectDailyPlayer();
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

    console.log("=== JOUEUR ALÉATOIRE ===");
    console.log(`Index: ${index}/${joueurs.length}`);
    console.log(joueurDuJour);

    return joueurDuJour;
}
