


// ========== PSGDLE PHOTO MYSTÈRE - SYSTÈME COMPLET ==========

class PSGDLEPhotoGame {
    constructor() {
        this.playersData = null;
        this.dailyPlayer = null;
        this.currentAttempt = 0;
        this.maxAttempts = 6;
        this.gameWon = false;
        this.gameLost = false;
        this.attempts = [];
        this.storageKey = 'psgdle_photo_save';
        this.statsKey = 'psgdle_photo_stats';
        
        this.init();
    }

    async init() {
        try {
            console.log('📸 Initialisation PSGDLE Photo...');
            
            await this.loadPlayers();
            this.selectDailyPlayer();
            
            const savedGame = this.loadGameState();
            if (savedGame && savedGame.date === this.getTodayDate() && savedGame.playerId === this.dailyPlayer.id) {
                console.log('🎮 Partie en cours restaurée');
                this.restoreSavedGame(savedGame);
            } else {
                this.startNewGame();
            }
            
            this.initSearchBar();
            this.initModals();
            this.updateCountdown();
            setInterval(() => this.updateCountdown(), 1000);
            
            console.log('✅ PSGDLE Photo initialisé');
            console.log('👤 Joueur du jour:', this.dailyPlayer.nom);
        } catch (error) {
            console.error('❌ Erreur initialisation Photo Mode:', error);
        }
    }

    getTodayDate() {
        return new Date().toISOString().split('T')[0];
    }

    async loadPlayers() {
        try {
            const response = await fetch('js/data.json');
            const data = await response.json();
            this.playersData = data.joueurs || data;
            
            // Filtrer les joueurs avec photos
            this.playersData = this.playersData.filter(p => p.photo && p.photo.trim() !== '');
            
            console.log('✅ Joueurs avec photos chargés:', this.playersData.length);
        } catch (error) {
            console.error('❌ Erreur chargement joueurs:', error);
        }
    }

    selectDailyPlayer() {
    const today = this.getTodayDate();
    const baseSeed = parseInt(today.split('-').join(''), 10);

    // Décale volontairement le seed pour éviter d'avoir le même joueur que le mode normal
    const seed = baseSeed + 1234;

        function seededRandom(seed) {
            const x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
        }

        const randomIndex = Math.floor(seededRandom(seed) * this.playersData.length);
        this.dailyPlayer = this.playersData[randomIndex];

        console.log('🎯 Joueur du jour sélectionné:', this.dailyPlayer.nom);
    }

    startNewGame() {
        this.currentAttempt = 0;
        this.gameWon = false;
        this.gameLost = false;
        this.attempts = [];
        
        this.displayPhoto();
        this.updateAttemptsCounter();
        this.clearHistory();
        
        document.getElementById('photoSearchInput').disabled = false;
        document.getElementById('photo-subtitle').style.display = '';
    }

    displayPhoto() {
        const img = document.getElementById('mystery-photo');
        img.src = this.dailyPlayer.photo;
        img.className = 'mystery-image blur-level-1';
    }

    updateBlurLevel() {
        const img = document.getElementById('mystery-photo');
        const blurLevel = Math.min(this.currentAttempt + 1, 6);
        
        // Calculer les valeurs de flou pour l'animation
        const previousBlur = Math.max(50 - (blurLevel - 2) * 10, 50);
        const newBlur = 50 - blurLevel * 10;
        
        // Animation de déflouage
        img.style.setProperty('--blur-from', `${previousBlur}px`);
        img.style.setProperty('--blur-to', `${newBlur}px`);
        img.classList.add('animating');
        
        setTimeout(() => {
            img.className = `mystery-image blur-level-${blurLevel}`;
            img.classList.remove('animating');
        }, 100);
    }

    updateAttemptsCounter() {
        document.getElementById('current-attempt').textContent = this.currentAttempt;
        document.getElementById('max-attempts').textContent = this.maxAttempts;
    }

    initSearchBar() {
        const searchInput = document.getElementById('photoSearchInput');
        const suggestionsDiv = document.getElementById('photo-suggestions');

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query.length === 0) {
                this.hideSuggestions();
            } else {
                this.showSuggestions(this.searchPlayers(query));
            }
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const results = this.searchPlayers(searchInput.value.trim());
                if (results.length > 0) {
                    this.makeGuess(results[0]);
                }
            } else if (e.key === 'Escape') {
                this.hideSuggestions();
                searchInput.blur();
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideSuggestions();
            }
        });
    }

    searchPlayers(query) {
        if (!query || query.length < 1) return [];
        
        const normalizedQuery = this.removeAccents(query.toLowerCase());
        
        return this.playersData.filter(player => {
            const alreadyGuessed = this.attempts.some(a => a.playerId === player.id);
            if (alreadyGuessed) return false;
            
            return this.removeAccents(player.nom.toLowerCase()).includes(normalizedQuery);
        }).slice(0, 8);
    }

    removeAccents(str) {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    showSuggestions(players) {
        const suggestionsDiv = document.getElementById('photo-suggestions');
        
        if (players.length === 0) {
            suggestionsDiv.innerHTML = '<div class="no-results">🔍 Aucun joueur trouvé</div>';
            suggestionsDiv.className = 'suggestions show';
            return;
        }

        suggestionsDiv.innerHTML = players.map(player => `
            <div class="suggestion-item" data-player-id="${player.id}">
                <img src="${player.photo}" alt="${player.nom}" class="player-photo"
                     onerror="this.src='https://via.placeholder.com/50x50/dc143c/ffffff?text=${player.nom.charAt(0)}'">
                <div class="player-info">
                    <div class="player-name">${player.nom}</div>
                    <div class="player-details">${player.poste} • ${player.nationalite}</div>
                </div>
            </div>
        `).join('');
        
        suggestionsDiv.className = 'suggestions show';

        document.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const playerId = parseInt(item.getAttribute('data-player-id'));
                const player = this.playersData.find(p => p.id === playerId);
                if (player) {
                    this.makeGuess(player);
                }
            });
        });
    }

    hideSuggestions() {
        const suggestionsDiv = document.getElementById('photo-suggestions');
        suggestionsDiv.innerHTML = '';
        suggestionsDiv.className = 'suggestions';
    }

    makeGuess(player) {
        if (this.gameWon || this.gameLost) return;

        this.currentAttempt++;
        const isCorrect = player.id === this.dailyPlayer.id;

        const attempt = {
            playerId: player.id,
            playerName: player.nom,
            attemptNumber: this.currentAttempt,
            correct: isCorrect
        };

        this.attempts.push(attempt);
        this.addAttemptToHistory(attempt);
        
        document.getElementById('photoSearchInput').value = '';
        this.hideSuggestions();

        if (isCorrect) {
            this.handleVictory();
        } else {
            this.updateBlurLevel();
            this.updateAttemptsCounter();
            
            if (this.currentAttempt >= this.maxAttempts) {
                this.handleDefeat();
            }
        }

        this.saveGameState();
    }

    addAttemptToHistory(attempt) {
        const historyDiv = document.getElementById('attempts-history');
        
        const attemptDiv = document.createElement('div');
        attemptDiv.className = `attempt-item ${attempt.correct ? 'correct' : 'incorrect'}`;
        attemptDiv.innerHTML = `
            <span class="attempt-number">#${attempt.attemptNumber}</span>
            <span class="attempt-player-name">${attempt.playerName}</span>
            <span class="attempt-status">${attempt.correct ? '✅' : '❌'}</span>
        `;
        
        historyDiv.insertBefore(attemptDiv, historyDiv.firstChild);
    }

    clearHistory() {
        document.getElementById('attempts-history').innerHTML = '';
    }

    handleVictory() {
        this.gameWon = true;
        
        const img = document.getElementById('mystery-photo');
        img.className = 'mystery-image blur-level-revealed';
        
        document.getElementById('photoSearchInput').disabled = true;
        document.getElementById('photo-subtitle').style.display = 'none';
        
        this.updateStats(true);
        this.saveGameState();
        
        setTimeout(() => {
            this.displayVictoryBox();
        }, 800);
    }

    handleDefeat() {
        this.gameLost = true;
        
        const img = document.getElementById('mystery-photo');
        img.className = 'mystery-image blur-level-revealed';
        
        document.getElementById('photoSearchInput').disabled = true;
        document.getElementById('photo-subtitle').style.display = 'none';
        
        this.updateStats(false);
        this.saveGameState();
        
        setTimeout(() => {
            this.displayDefeatBox();
        }, 800);
    }

    displayVictoryBox() {
        if (document.getElementById('photo-victory-box')) return;

        const victoryHTML = `
            <div class="photo-victory-container" id="photo-victory-box">
                <div class="box">
                    <div class="title victory-title">🎉 BRAVO ! 🎉</div>
                    <div class="photo-victory-content">
                        <img src="${this.dailyPlayer.photo}" 
                             alt="${this.dailyPlayer.nom}" 
                             class="photo-victory-image">
                        <div class="photo-victory-text">
                            Tu as trouvé <strong>${this.dailyPlayer.nom}</strong> en <strong>${this.currentAttempt}</strong> tentative${this.currentAttempt > 1 ? 's' : ''} !
                        </div>
                        <div class="victory-stats">
                            <div class="stat-item">
                                <span class="stat-label">Tentatives utilisées :</span>
                                <span class="stat-value">${this.currentAttempt} / ${this.maxAttempts}</span>
                            </div>
                            <div class="stat-item countdown-item">
                                <span class="stat-label">Prochain joueur dans :</span>
                                <span class="stat-value" id="photo-countdown-timer">${this.getTimeUntilMidnight()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const historyDiv = document.getElementById('attempts-history');
        historyDiv.insertAdjacentHTML('afterend', victoryHTML);

        this.startVictoryCountdown();
        this.scrollToVictory();
    }

    displayDefeatBox() {
        if (document.getElementById('photo-victory-box')) return;

        const defeatHTML = `
            <div class="photo-victory-container" id="photo-victory-box">
                <div class="box">
                    <div class="title victory-title">😢 PERDU !</div>
                    <div class="photo-victory-content">
                        <img src="${this.dailyPlayer.photo}" 
                             alt="${this.dailyPlayer.nom}" 
                             class="photo-victory-image">
                        <div class="photo-victory-text">
                            C'était <strong>${this.dailyPlayer.nom}</strong> !<br>
                            Reviens demain pour un nouveau défi.
                        </div>
                        <div class="victory-stats">
                            <div class="stat-item countdown-item">
                                <span class="stat-label">Prochain joueur dans :</span>
                                <span class="stat-value" id="photo-countdown-timer">${this.getTimeUntilMidnight()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const historyDiv = document.getElementById('attempts-history');
        historyDiv.insertAdjacentHTML('afterend', defeatHTML);

        this.startVictoryCountdown();
        this.scrollToVictory();
    }

    scrollToVictory() {
        setTimeout(() => {
            const victoryBox = document.getElementById('photo-victory-box');
            if (victoryBox) {
                victoryBox.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start'
                });
            }
        }, 150);
    }

    getTimeUntilMidnight() {
        const now = new Date();
        const midnight = new Date();
        midnight.setHours(24, 0, 0, 0);
        
        const diff = midnight - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    startVictoryCountdown() {
        const updateTimer = () => {
            const timer = document.getElementById('photo-countdown-timer');
            if (timer) {
                timer.textContent = this.getTimeUntilMidnight();
            }
        };

        updateTimer();
        setInterval(updateTimer, 1000);
    }

    updateCountdown() {
        const countdownEl = document.getElementById('countdown-photo');
        if (countdownEl) {
            countdownEl.textContent = this.getTimeUntilMidnight();
        }
    }

    saveGameState() {
        try {
            const gameState = {
                date: this.getTodayDate(),
                playerId: this.dailyPlayer.id,
                currentAttempt: this.currentAttempt,
                attempts: this.attempts,
                gameWon: this.gameWon,
                gameLost: this.gameLost
            };
            localStorage.setItem(this.storageKey, JSON.stringify(gameState));
        } catch (error) {
            console.error('❌ Erreur sauvegarde:', error);
        }
    }

    loadGameState() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.error('❌ Erreur chargement sauvegarde:', error);
            return null;
        }
    }

    restoreSavedGame(savedGame) {
        this.currentAttempt = savedGame.currentAttempt;
        this.attempts = savedGame.attempts;
        this.gameWon = savedGame.gameWon;
        this.gameLost = savedGame.gameLost;

        // ✅ Afficher la photo
        const img = document.getElementById('mystery-photo');
        img.src = this.dailyPlayer.photo;
        
        // ✅ CORRECTION : Appliquer le bon niveau de flou directement
        if (this.gameWon || this.gameLost) {
            // Si la partie est terminée, déflouter complètement
            img.className = 'mystery-image blur-level-revealed';
        } else {
            // Sinon, appliquer le niveau de flou correspondant aux tentatives
            const blurLevel = Math.min(this.currentAttempt + 1, 6);
            img.className = `mystery-image blur-level-${blurLevel}`;
        }
        
        this.updateAttemptsCounter();

        // Restaurer l'historique des tentatives
        savedGame.attempts.forEach(attempt => {
            this.addAttemptToHistory(attempt);
        });

        // Gérer l'état de victoire/défaite
        if (this.gameWon) {
            document.getElementById('photoSearchInput').disabled = true;
            document.getElementById('photo-subtitle').style.display = 'none';
            this.displayVictoryBox();
        } else if (this.gameLost) {
            document.getElementById('photoSearchInput').disabled = true;
            document.getElementById('photo-subtitle').style.display = 'none';
            this.displayDefeatBox();
        }
    }

    updateStats(won) {
        try {
            const stats = this.loadStats();
            
            stats.gamesPlayed++;
            
            if (won) {
                stats.gamesWon++;
                stats.totalAttempts += this.currentAttempt;
                
                if (!stats.bestScore || this.currentAttempt < stats.bestScore) {
                    stats.bestScore = this.currentAttempt;
                }
                
                if (!stats.distribution[this.currentAttempt]) {
                    stats.distribution[this.currentAttempt] = 0;
                }
                stats.distribution[this.currentAttempt]++;
                
                // Gestion streak
                const today = this.getTodayDate();
                if (stats.lastWinDate) {
                    const last = new Date(stats.lastWinDate);
                    const diffDays = Math.floor((new Date(today) - last) / (1000 * 60 * 60 * 24));
                    stats.currentStreak = diffDays === 1 ? stats.currentStreak + 1 : 1;
                } else {
                    stats.currentStreak = 1;
                }
                stats.lastWinDate = today;
                
                if (stats.currentStreak > stats.maxStreak) {
                    stats.maxStreak = stats.currentStreak;
                }
            } else {
                stats.currentStreak = 0;
            }
            
            this.saveStats(stats);
        } catch (error) {
            console.error('❌ Erreur mise à jour stats:', error);
        }
    }

    loadStats() {
        try {
            const saved = localStorage.getItem(this.statsKey);
            return saved ? JSON.parse(saved) : {
                gamesPlayed: 0,
                gamesWon: 0,
                totalAttempts: 0,
                bestScore: null,
                currentStreak: 0,
                maxStreak: 0,
                lastWinDate: null,
                distribution: {}
            };
        } catch (error) {
            console.error('❌ Erreur chargement stats:', error);
            return {
                gamesPlayed: 0,
                gamesWon: 0,
                totalAttempts: 0,
                bestScore: null,
                currentStreak: 0,
                maxStreak: 0,
                lastWinDate: null,
                distribution: {}
            };
        }
    }

    saveStats(stats) {
        try {
            localStorage.setItem(this.statsKey, JSON.stringify(stats));
        } catch (error) {
            console.error('❌ Erreur sauvegarde stats:', error);
        }
    }

    initModals() {
        // Modal Comment Jouer
        const howToModal = document.getElementById('photoHowToModal');
        const openHowTo = document.getElementById('openPhotoModal');
        const closeHowTo = document.getElementById('closePhotoModal');

        if (openHowTo) {
            openHowTo.addEventListener('click', (e) => {
                e.preventDefault();
                howToModal.style.display = 'block';
                document.body.classList.add('modal-open');
            });
        }

        if (closeHowTo) {
            closeHowTo.addEventListener('click', () => {
                howToModal.style.display = 'none';
                document.body.classList.remove('modal-open');
            });
        }

        howToModal.addEventListener('click', (e) => {
            if (e.target === howToModal) {
                howToModal.style.display = 'none';
                document.body.classList.remove('modal-open');
            }
        });

        // Modal Q&A
        const qaModal = document.getElementById('qaPhotoModal');
        const openQA = document.getElementById('openQAPhotoModal');
        const closeQA = document.getElementById('closeQAPhotoModal');

        if (openQA) {
            openQA.addEventListener('click', (e) => {
                e.preventDefault();
                qaModal.style.display = 'block';
                document.body.classList.add('modal-open');
            });
        }

        if (closeQA) {
            closeQA.addEventListener('click', () => {
                qaModal.style.display = 'none';
                document.body.classList.remove('modal-open');
            });
        }

        qaModal.addEventListener('click', (e) => {
            if (e.target === qaModal) {
                qaModal.style.display = 'none';
                document.body.classList.remove('modal-open');
            }
        });

        // Modal Stats
        const statsModal = document.getElementById('statsPhotoModal');
        const openStats = document.getElementById('openStatsPhotoModal');
        const closeStats = document.getElementById('closeStatsPhotoModal');

        if (openStats) {
            openStats.addEventListener('click', (e) => {
                e.preventDefault();
                this.displayStats();
                statsModal.style.display = 'block';
                document.body.classList.add('modal-open');
            });
        }

        if (closeStats) {
            closeStats.addEventListener('click', () => {
                statsModal.style.display = 'none';
                document.body.classList.remove('modal-open');
            });
        }

        statsModal.addEventListener('click', (e) => {
            if (e.target === statsModal) {
                statsModal.style.display = 'none';
                document.body.classList.remove('modal-open');
            }
        });
    }

    displayStats() {
        const stats = this.loadStats();
        const container = document.getElementById('statsPhotoContent');
        
        if (stats.gamesPlayed === 0) {
            container.innerHTML = `
                <div class="empty-stats">
                    <div class="empty-stats-icon">📸</div>
                    <div class="empty-stats-text">
                        Aucune partie jouée pour le moment.<br>
                        Commence une partie pour voir tes statistiques !
                    </div>
                </div>
            `;
            return;
        }
        
        const winRate = stats.gamesPlayed > 0 
            ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) 
            : 0;
        
        const avgAttempts = stats.gamesWon > 0
            ? (stats.totalAttempts / stats.gamesWon).toFixed(1)
            : '0';
        
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
                    <div class="stat-label">Moy. tentatives</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.bestScore || '-'}</div>
                    <div class="stat-label">Meilleur score</div>
                </div>
            </div>
            
            <div class="distribution-section">
                <div class="distribution-title">📊 Distribution des tentatives</div>
                <div class="distribution-chart">
                    ${this.generateDistributionChart(stats)}
                </div>
            </div>
            
            <button class="reset-stats-btn" onclick="photoGame.resetStats()">
                🗑️ Réinitialiser les statistiques
            </button>
        `;
    }

    generateDistributionChart(stats) {
        const maxCount = Math.max(...Object.values(stats.distribution));
        let html = '';
        
        for (let i = 1; i <= 6; i++) {
            const count = stats.distribution[i] || 0;
            const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
            
            html += `
                <div class="chart-row">
                    <div class="chart-label">${i} tentative${i > 1 ? 's' : ''}</div>
                    <div class="chart-bar-container">
                        <div class="chart-bar" style="width: ${percentage}%">
                            <span class="chart-value">${count}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        return html;
    }

    resetStats() {
        if (confirm('Es-tu sûr de vouloir réinitialiser toutes tes statistiques ? Cette action est irréversible.')) {
            localStorage.removeItem(this.statsKey);
            this.displayStats();
        }
    }
}

// ========== INITIALISATION ==========
let photoGame;

window.addEventListener('DOMContentLoaded', () => {
    const photoMode = document.getElementById('photo-mode');
    if (photoMode && photoMode.classList.contains('active')) {
        photoGame = new PSGDLEPhotoGame();
    }
});

document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        if (mode === 'photo' && !photoGame) {
            setTimeout(() => {
                photoGame = new PSGDLEPhotoGame();
            }, 100);
        }
    });
});

