// ========== PSGDLE XI - SYSTÈME COMPLET ==========

class PSGDLEXIGame {
    constructor() {
        this.playersData = null;
        this.matchesData = null;
        this.currentMatch = null;
        this.currentFormation = null;
        this.playerPlacements = {};
        this.usedPlayerIds = new Set();
        this.validationAttempts = 0;
        this.gameWon = false;
        this.storageKey = 'psgdle_xi_save';
        
        this.init();
    }

    async init() {
        try {
            console.log('🔄 Initialisation PSGDLE XI...');
            
            await this.loadData();
            this.selectDailyMatch();
            
            const savedGame = this.loadGameState();
            if (savedGame && savedGame.date === this.getTodayDate() && savedGame.matchId === this.currentMatch.id) {
                console.log('🏆 Partie déjà gagnée aujourd\'hui !');
                this.restoreSavedGame(savedGame);
            } else {
                this.displayMatchInfo();
                this.generateField();
            }
            
            this.initSearchBar();
            this.initValidation();
            
            console.log('✅ PSGDLE XI initialisé');
            console.log('👥 Joueurs chargés:', this.playersData.length);
            console.log('⚽ Match du jour:', this.currentMatch.opponent);
        } catch (error) {
            console.error('❌ Erreur initialisation:', error);
        }
    }

    getTodayDate() {
        return new Date().toISOString().split('T')[0];
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

    setMatch(index) {
        if (index < 0 || index >= this.matchesData.matches.length) {
            console.error("❌ Index invalide. Max:", this.matchesData.matches.length - 1);
            return;
        }

        this.currentMatch = this.matchesData.matches[index];
        this.currentFormation = this.matchesData.formations[this.currentMatch.formation];
        this.currentMatch.id = `manual_${index}_${this.getTodayDate()}`;

        this.displayMatchInfo();
        this.generateField();

        console.log(`✅ Match forcé :`, this.currentMatch);
    }

swapPlayers(fromPosition, toPosition) {
    const fromPlayerId = this.playerPlacements[fromPosition];
    const toPlayerId = this.playerPlacements[toPosition];

    // Mise à jour des placements
    if (fromPlayerId) this.playerPlacements[toPosition] = fromPlayerId;
    else delete this.playerPlacements[toPosition];

    if (toPlayerId) this.playerPlacements[fromPosition] = toPlayerId;
    else delete this.playerPlacements[fromPosition];

    // Réafficher les deux cartes
    this.refreshCard(fromPosition);
    this.refreshCard(toPosition);

    this.updateValidationButton();
    console.log(`🔄 Joueurs échangés : ${fromPosition} ↔ ${toPosition}`);
}

refreshCard(position) {
    const card = document.querySelector(`.player-card[data-position="${position}"]`);
    const playerId = this.playerPlacements[position];
    card.classList.remove("empty", "correct", "misplaced", "incorrect");

    if (!playerId) {
        const posLabel = position.split("-")[0];
        const emoji = this.getEmojiForPosition(posLabel);
        card.classList.add("empty");
        card.innerHTML = `
            <div class="player-position">${position}</div>
            <div class="player-avatar">${emoji}</div>
        `;
        return;
    }

    const player = this.getPlayerById(playerId);
    if (!player) return;

    card.innerHTML = `
        <div class="player-number">${player.numero}</div>
        <div class="player-position">${position}</div>
        <div class="player-avatar">${player.nom.charAt(0)}</div>
        <div class="xi-player-name">${player.nom}</div>
    `;
}


    saveGameState() {
        try {
            const gameState = {
                date: this.getTodayDate(),
                matchId: this.currentMatch.id,
                won: this.gameWon,
                attempts: this.validationAttempts,
                placements: this.playerPlacements
            };
            localStorage.setItem(this.storageKey, JSON.stringify(gameState));
            console.log('💾 Partie sauvegardée');
        } catch (error) {
            console.error('❌ Erreur sauvegarde:', error);
        }
    }

    restoreSavedGame(savedGame) {
        this.gameWon = true;
        this.validationAttempts = savedGame.attempts;
        this.playerPlacements = savedGame.placements;
        
        this.displayMatchInfo();
        this.generateField();
        
        Object.entries(this.playerPlacements).forEach(([position, playerId]) => {
            const player = this.getPlayerById(playerId);
            const card = document.querySelector(`.player-card[data-position="${position}"]`);
            
            if (card && player) {
                this.usedPlayerIds.add(playerId);
                card.classList.remove('empty');
                card.classList.add('correct');
                
                const photoHTML = player.photo 
                    ? `<img src="${player.photo}" alt="${player.nom}">`
                    : player.nom.charAt(0);
                
                card.innerHTML = `
                    <div class="player-number">${player.numero}</div>
                    <div class="player-position">${position}</div>
                    <div class="player-avatar">${photoHTML}</div>
                    <div class="xi-player-name">${player.nom}</div>
                `;
            }
        });
        
        this.lockGame();
        this.displayVictoryBox();
    }

    lockGame() {
        const validateBtn = document.getElementById('validateBtn');
        if (validateBtn) {
            validateBtn.disabled = true;
            validateBtn.textContent = '🎉 Composition trouvée !';
        }
        
        document.querySelectorAll('.player-card').forEach(card => {
            card.style.pointerEvents = 'none';
            card.style.cursor = 'default';
        });
    }

    async loadData() {
        try {
            const playersResponse = await fetch('js/data.json');
            const playersJson = await playersResponse.json();
            this.playersData = playersJson.joueurs || playersJson;
            
            const matchesResponse = await fetch('js/xi.json');
            this.matchesData = await matchesResponse.json();
            
            console.log('✅ Données chargées:', {
                joueurs: this.playersData.length,
                matchs: this.matchesData.matches.length
            });
        } catch (error) {
            console.error('❌ Erreur chargement données:', error);
            alert('Erreur de chargement des données. Vérifiez la console.');
        }
    }

    selectDailyMatch() {
        const today = this.getTodayDate();
        const seed = parseInt(today.split('-').join(''), 10);

        function seededRandom(seed) {
            const x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
        }

        const randomIndex = Math.floor(seededRandom(seed) * this.matchesData.matches.length);
        this.currentMatch = this.matchesData.matches[randomIndex];
        this.currentMatch.id = `match_${today}`;
        this.currentFormation = this.matchesData.formations[this.currentMatch.formation];

        console.log('🎯 Match aléatoire du jour (identique pour tous):', this.currentMatch);
    }

    displayMatchInfo() {
        const matchHeader = document.querySelector('.match-header');
        matchHeader.innerHTML = `
            <div class="match-title">PSG ${this.currentMatch.score} ${this.currentMatch.opponent}</div>
            <div class="match-date">${this.currentMatch.date} • ${this.currentMatch.competition}</div>
            <div class="match-objective">
                🎯 Reconstitue le XI titulaire (${this.currentMatch.formation})
            </div>
        `;
    }

    generateField() {
        const fieldDiv = document.querySelector('.field');
        fieldDiv.innerHTML = '';

        this.currentFormation.structure.forEach(line => {
            const lineDiv = document.createElement('div');
            lineDiv.className = 'field-line';
            lineDiv.dataset.lineType = line.line;
            lineDiv.dataset.playerCount = line.positions.length;

            line.positions.forEach(position => {
                const card = this.createPlayerCard(position);
                lineDiv.appendChild(card);
            });

            fieldDiv.appendChild(lineDiv);
        });

        console.log('✅ Terrain généré:', this.currentMatch.formation);
    }

 createPlayerCard(position) {
    const card = document.createElement('div');
    card.className = 'player-card empty';
    card.dataset.position = position;

    const positionLabel = position.split('-')[0];
    const emoji = this.getEmojiForPosition(positionLabel);

    card.innerHTML = `
        <div class="player-position">${position}</div>
        <div class="player-avatar">${emoji}</div>
    `;

    card.addEventListener('click', () => this.selectPosition(card));

    // ===== Drag & Drop Desktop =====
    card.setAttribute("draggable", true);

    card.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("position", position);
        setTimeout(() => card.classList.add("dragging"), 0);
    });

    card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
    });

    card.addEventListener("dragover", (e) => {
        e.preventDefault();
        card.classList.add("drag-over");
    });

    card.addEventListener("dragleave", () => {
        card.classList.remove("drag-over");
    });

    card.addEventListener("drop", (e) => {
        e.preventDefault();
        card.classList.remove("drag-over");

        const fromPosition = e.dataTransfer.getData("position");
        const toPosition = position;
        if (fromPosition && fromPosition !== toPosition) {
            this.swapPlayers(fromPosition, toPosition);
        }
    });

    // ===== Mobile Long Press =====
    let touchTimer;
    card.addEventListener("touchstart", (e) => {
        touchTimer = setTimeout(() => {
            card.classList.add("dragging");
            card.dataset.longPress = "true";
        }, 500);
    });

    card.addEventListener("touchend", () => {
        clearTimeout(touchTimer);
        card.classList.remove("dragging");
        delete card.dataset.longPress;
    });

    return card;

}


    getEmojiForPosition(pos) {
        const emojis = {
            'ATT': '⚽',
            'ST': '🎯',
            'MIL': '🏃',
            'DEF': '🛡️',
            'GK': '🧤'
        };
        return emojis[pos] || '👤';
    }

    selectPosition(card) {
        if (this.gameWon) return;

        if (!card.classList.contains('empty')) {
            if (card.classList.contains('correct')) return;

            const position = card.dataset.position;
            const playerId = this.playerPlacements[position];
            
            delete this.playerPlacements[position];
            this.usedPlayerIds.delete(playerId);
            
            card.classList.add('empty');
            card.classList.remove('correct', 'misplaced', 'incorrect');
            const positionLabel = position.split('-')[0];
            const emoji = this.getEmojiForPosition(positionLabel);
            
            card.innerHTML = `
                <div class="player-position">${position}</div>
                <div class="player-avatar">${emoji}</div>
            `;

            // 🔄 Restaurer les indices déjà débloqués
            this.restoreHintsForPosition(position, card);

            this.updateValidationButton();
            console.log('❌ Joueur retiré de', position);
        } else {
            this.openSearchModal(card);
        }
    }

    // === Fonction pour restaurer les indices ===
    restoreHintsForPosition(position, card) {
        const correctId = this.getCorrectPlayerIdForPosition(position);
        const placedId = this.playerPlacements[position];
        if (placedId === correctId) return;

        const correctPlayer = this.getPlayerById(correctId);
        if (!correctPlayer) return;

        if (this.validationAttempts >= 1) {
            let hintHeight = card.querySelector('.hint-height');
            if (!hintHeight) {
                hintHeight = document.createElement('div');
                hintHeight.className = 'hint-height hint-badge';
                card.appendChild(hintHeight);
            }
            hintHeight.textContent = `📏 ${correctPlayer.taille}`;
        }

        if (this.validationAttempts >= 2) {
            let hintNumber = card.querySelector('.hint-number');
            if (!hintNumber) {
                hintNumber = document.createElement('div');
                hintNumber.className = 'hint-number hint-badge';
                card.appendChild(hintNumber);
            }
            hintNumber.textContent = `#${correctPlayer.numero}`;
        }

        if (this.validationAttempts >= 3) {
            let hintNat = card.querySelector('.hint-nationality');
            if (!hintNat) {
                hintNat = document.createElement('div');
                hintNat.className = 'hint-nationality hint-badge';
                card.appendChild(hintNat);
            }
            hintNat.textContent = `${correctPlayer.nationalite}`;
        }
    }

    openSearchModal(card) {
        const modal = document.getElementById('playerSearchModal');
        modal.dataset.targetPosition = card.dataset.position;
        modal.classList.add('active');
        
        const searchInput = document.getElementById('playerSearchInput');
        searchInput.value = '';
        searchInput.focus();
        
        this.updateSearchSuggestions('', true);
    }

    initSearchBar() {
        const searchInput = document.getElementById('playerSearchInput');
        const closeBtn = document.getElementById('closeSearchModal');
        const modal = document.getElementById('playerSearchModal');

        searchInput.addEventListener('input', (e) => {
            this.updateSearchSuggestions(e.target.value);
        });

        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }

    updateSearchSuggestions(query, showAll = false) {
        const suggestionsDiv = document.getElementById('searchSuggestions');
        suggestionsDiv.innerHTML = '';

        let availablePlayers = this.playersData.filter(player => 
            !this.usedPlayerIds.has(player.id)
        );

        if (query && query.length >= 1) {
            const searchTerm = query.toLowerCase().trim();
            availablePlayers = availablePlayers.filter(player =>
                player.nom.toLowerCase().includes(searchTerm)
            );
        }

        const displayPlayers = showAll ? availablePlayers.slice(0, 10) : availablePlayers.slice(0, 8);

        if (displayPlayers.length === 0) {
            suggestionsDiv.innerHTML = '<div class="no-results">Aucun joueur disponible</div>';
            return;
        }

        displayPlayers.forEach(player => {
            const suggestion = document.createElement('div');
            suggestion.className = 'search-suggestion';
            suggestion.innerHTML = `
                <div class="suggestion-name">${player.nom}</div>
                <div class="suggestion-info">${player.poste} • N°${player.numero} • ${player.nationalite}</div>
            `;
            
            suggestion.addEventListener('click', () => {
                this.placePlayer(player);
            });
            
            suggestionsDiv.appendChild(suggestion);
        });
    }

    placePlayer(player) {
        const modal = document.getElementById('playerSearchModal');
        const position = modal.dataset.targetPosition;
        const card = document.querySelector(`.player-card[data-position="${position}"]`);

        this.playerPlacements[position] = player.id;
        this.usedPlayerIds.add(player.id);

        card.classList.remove('empty');
        card.innerHTML = `
            <div class="player-number">${player.numero}</div>
            <div class="player-position">${position}</div>
            <div class="player-avatar">${player.nom.charAt(0)}</div>
            <div class="xi-player-name">${player.nom}</div>
        `;

        modal.classList.remove('active');

        this.updateValidationButton();
        console.log('✅ Joueur placé:', player.nom, 'à', position);
    }

    updateValidationButton() {
        const validateBtn = document.getElementById('validateBtn');
        const placedCount = Object.keys(this.playerPlacements).length;
        const totalPositions = this.currentFormation.structure.reduce((sum, line) => 
            sum + line.positions.length, 0
        );

        validateBtn.disabled = placedCount !== totalPositions || this.gameWon;
        validateBtn.textContent = `Valider la composition (${placedCount}/${totalPositions})`;
    }

    initValidation() {
        const validateBtn = document.getElementById('validateBtn');
        validateBtn.addEventListener('click', () => this.validateComposition());
    }

    validateComposition() {
        if (this.gameWon) {
            return;
        }

        this.validationAttempts++;
        console.log(`🔍 Validation #${this.validationAttempts}`);

        const results = this.checkComposition();
        this.displayValidationResults(results);

        if (results.correct === results.total) {
            setTimeout(() => this.showVictory(), 500);
        } else {
            // NOUVEAU : Appeler showProgressiveHints au lieu de showHints
            this.showProgressiveHints(results);
        }
    }

   checkComposition() {
    const results = {
        correct: 0,
        misplaced: 0,
        incorrect: 0,
        total: 0,
        details: {}
    };

    // Récupérer tous les IDs du XI titulaire (toutes lignes confondues)
    const allCorrectIds = Object.values(this.currentMatch.lineup).flat();

    // Mapping pour normaliser MID → MIL
    const normalizeLineType = (lineType) => {
        return lineType === 'MID' ? 'MIL' : lineType;
    };

    Object.entries(this.currentMatch.lineup).forEach(([lineType, correctPlayerIds]) => {
        correctPlayerIds.forEach((correctId, index) => {
            results.total++;

            // Normaliser le nom de la ligne
            const normalizedLineType = normalizeLineType(lineType);
            
            const lineStructure = this.currentFormation.structure.find(l => 
                l.line === normalizedLineType
            );

            // Vérification de sécurité
            if (!lineStructure) {
                console.error(`❌ Structure introuvable pour la ligne: ${lineType} → ${normalizedLineType}`);
                return;
            }

            const position = lineStructure.positions[index];
            const placedId = this.playerPlacements[position];

            if (placedId === correctId) {
                results.correct++;
                results.details[position] = 'correct';
            } else if (allCorrectIds.includes(placedId)) {
                results.misplaced++;
                results.details[position] = 'misplaced';
            } else {
                results.incorrect++;
                results.details[position] = 'incorrect';
            }
        });
    });

    return results;
}

    displayValidationResults(results) {
        Object.entries(results.details).forEach(([position, status]) => {
            const card = document.querySelector(`.player-card[data-position="${position}"]`);
            
            card.classList.remove('correct', 'misplaced', 'incorrect');
            
            setTimeout(() => {
                card.classList.add(status);

                if (status === 'correct') {
                    const playerId = this.playerPlacements[position];
                    const player = this.getPlayerById(playerId);
                    
                    if (player && player.photo) {
                        const avatarDiv = card.querySelector('.player-avatar');
                        avatarDiv.innerHTML = `<img src="${player.photo}" alt="${player.nom}">`;
                    }
                }
            }, 100);
        });

        console.log('📊 Résultats:', results);
    }

    // ========== NOUVEAU SYSTÈME D'INDICES ==========

    showProgressiveHints(results) {
        // Ne montrer des indices que si le joueur n'a pas tout trouvé
        if (results.correct === results.total) {
            return;
        }

        // Récupérer les positions non trouvées (misplaced + incorrect)
        const wrongPositions = Object.entries(results.details)
            .filter(([pos, status]) => status !== 'correct')
            .map(([pos]) => pos);

        if (wrongPositions.length === 0) {
            return;
        }

        // Afficher les indices selon le nombre de tentatives
        if (this.validationAttempts === 1) {
            // 1ère validation : révéler les tailles
            this.revealHeights(wrongPositions);
        } else if (this.validationAttempts === 2) {
            // 2ème validation : révéler les numéros
            this.revealNumbers(wrongPositions);
        } else if (this.validationAttempts === 3) {
            // 3ème validation : révéler les nationalités
            this.revealNationalities(wrongPositions);
        }
        // Après 3 tentatives : plus d'indices
    }

    revealHeights(positions) {
    console.log('💡 Indice 1/3 : Révélation des tailles');
    
    positions.forEach(position => {
        const card = document.querySelector(`.player-card[data-position="${position}"]`);
        if (!card) return;

        const correctPlayerId = this.getCorrectPlayerIdForPosition(position);
        const correctPlayer = this.getPlayerById(correctPlayerId);
        
        if (!correctPlayer) return;

        let hintDiv = card.querySelector('.hint-height');
        if (!hintDiv) {
            hintDiv = document.createElement('div');
            hintDiv.className = 'hint-height hint-badge';
            card.appendChild(hintDiv);
        }
        
        hintDiv.textContent = `📏 ${correctPlayer.taille}`;
    });

    this.showHintNotification('Indice 1/3 : Tailles révélées ! 📏');
}

   revealNumbers(positions) {
    console.log('💡 Indice 2/3 : Révélation des numéros');
    
    positions.forEach(position => {
        const card = document.querySelector(`.player-card[data-position="${position}"]`);
        if (!card) return;

        const correctPlayerId = this.getCorrectPlayerIdForPosition(position);
        const correctPlayer = this.getPlayerById(correctPlayerId);
        
        if (!correctPlayer) return;

        let hintDiv = card.querySelector('.hint-number');
        if (!hintDiv) {
            hintDiv = document.createElement('div');
            hintDiv.className = 'hint-number hint-badge';
            card.appendChild(hintDiv);
        }
        
        hintDiv.textContent = `#${correctPlayer.numero}`;
    });

    this.showHintNotification('Indice 2/3 : Numéros révélés ! #️⃣');
}

    revealNationalities(positions) {
    console.log('💡 Indice 3/3 : Révélation des nationalités');
    
    positions.forEach(position => {
        const card = document.querySelector(`.player-card[data-position="${position}"]`);
        if (!card) return;

        const correctPlayerId = this.getCorrectPlayerIdForPosition(position);
        const correctPlayer = this.getPlayerById(correctPlayerId);
        
        if (!correctPlayer) return;

        let hintDiv = card.querySelector('.hint-nationality');
        if (!hintDiv) {
            hintDiv = document.createElement('div');
            hintDiv.className = 'hint-nationality hint-badge';
            card.appendChild(hintDiv);
        }
        
        hintDiv.textContent = `${correctPlayer.nationalite}`;
    });

    this.showHintNotification('Indice 3/3 : Nationalités révélées ! 🌍');
}

   getCorrectPlayerIdForPosition(position) {
    // Trouver quelle ligne dans la structure (GK, DEF, MIL, ATT, ST, MOC)
    const lineStructure = this.currentFormation.structure.find(line => 
        line.positions.includes(position)
    );
    
    if (!lineStructure) return null;
    
    // Trouver l'index de la position dans cette ligne
    const positionIndex = lineStructure.positions.indexOf(position);
    
    // 🔧 CORRECTION : Chercher d'abord avec le nom de la ligne de la structure
    // Si ça ne marche pas, essayer l'inverse (MIL ↔ MID)
    let correctPlayerIds = this.currentMatch.lineup[lineStructure.line];
    
    // Si pas trouvé et que c'est MIL, essayer avec MID
    if (!correctPlayerIds && lineStructure.line === 'MIL') {
        correctPlayerIds = this.currentMatch.lineup['MID'];
    }
    
    // Si pas trouvé et que c'est MID, essayer avec MIL (au cas où)
    if (!correctPlayerIds && lineStructure.line === 'MID') {
        correctPlayerIds = this.currentMatch.lineup['MIL'];
    }
    
    // Vérification de sécurité
    if (!correctPlayerIds) {
        console.error(`❌ Impossible de trouver les joueurs pour la ligne: ${lineStructure.line}`);
        return null;
    }
    
    // Récupérer l'ID du joueur correct à cet index
    return correctPlayerIds[positionIndex];
}
    showHintNotification(message) {
        // Créer une notification temporaire
        const notification = document.createElement('div');
        notification.className = 'hint-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 30px;
            border-radius: 30px;
            font-weight: bold;
            font-size: 16px;
            z-index: 10000;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            animation: slideDown 0.5s ease-out;
        `;

        // Ajouter l'animation CSS si elle n'existe pas déjà
        if (!document.getElementById('hint-animation-style')) {
            const style = document.createElement('style');
            style.id = 'hint-animation-style';
            style.textContent = `
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Retirer la notification après 3 secondes
        setTimeout(() => {
            notification.style.animation = 'slideDown 0.5s ease-out reverse';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }

    // ========== FIN SYSTÈME D'INDICES ==========

    showHints(results) {
        console.log('💡 Positions à corriger:', 
            Object.entries(results.details)
                .filter(([pos, status]) => status !== 'correct')
                .map(([pos]) => pos)
        );
    }

    showVictory() {
        this.gameWon = true;
        
        // Sauvegarder la victoire
        this.saveGameState();

        // 📊 Enregistrer les stats globales
        const correctLineupIds = Object.values(this.currentMatch.lineup).flat();
        statsManager.recordGame(true, this.validationAttempts, correctLineupIds, this.playersData);

        
        const validateBtn = document.getElementById('validateBtn');
        validateBtn.disabled = true;
        validateBtn.textContent = '🎉 Composition trouvée !';
        
        document.querySelectorAll('.player-card').forEach(card => {
            card.style.pointerEvents = 'none';
        });

        this.displayVictoryBox();
        
        console.log('🏆 VICTOIRE en', this.validationAttempts, 'tentatives');
    }

    displayVictoryBox() {
        if (document.getElementById('xi-victory-box')) return;

        const victoryHTML = `
            <div class="victory-box-wrapper" id="xi-victory-box">
                <div class="box">
                    <div class="title victory-title">🎉 VICTOIRE ! 🎉</div>
                    <div class="victory-content">
                        <div class="victory-text">
                            Bravo ! Tu as reconstitué le XI titulaire en <strong>${this.validationAttempts}</strong> tentative(s) !
                        </div>
                        <div class="victory-stats">
                            <div class="stat-item">
                                <span class="stat-label">Match :</span>
                                <span class="stat-value">PSG ${this.currentMatch.score} ${this.currentMatch.opponent}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Formation :</span>
                                <span class="stat-value">${this.currentMatch.formation}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Nombre de tentatives :</span>
                                <span class="stat-value">${this.validationAttempts}</span>
                            </div>
                            <div class="stat-item countdown-item">
                                <span class="stat-label">Prochain match dans :</span>
                                <span class="stat-value" id="xi-countdown-timer">${this.getTimeUntilMidnight()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const fieldWrapper = document.querySelector('.field-wrapper');
        fieldWrapper.insertAdjacentHTML('afterend', victoryHTML);

        this.startCountdown();

        setTimeout(() => {
            const victoryBox = document.getElementById('xi-victory-box');
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

    startCountdown() {
        const updateCountdown = () => {
            const timer = document.getElementById('xi-countdown-timer');
            if (timer) {
                const timeLeft = this.getTimeUntilMidnight();
                timer.textContent = timeLeft;
                
                // Si minuit est passé, recharger la page
                if (timeLeft === '00:00:00') {
                    console.log('🔄 Minuit ! Rechargement pour nouveau match...');
                    setTimeout(() => {
                        location.reload();
                    }, 1000);
                }
            }
        };

        updateCountdown();
        setInterval(updateCountdown, 1000);
    }

    getPlayerById(id) {
        return this.playersData.find(p => p.id === id);
    }
}

// ========== INITIALISATION ==========
let xiGame;

window.addEventListener('DOMContentLoaded', () => {
    const xiMode = document.getElementById('xi-mode');
    if (xiMode && xiMode.classList.contains('active')) {
        xiGame = new PSGDLEXIGame();
    }
});

document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        if (mode === 'xi' && !xiGame) {
            setTimeout(() => {
                xiGame = new PSGDLEXIGame();
            }, 100);
        }
    });
});

// ----- Modal "Le XI" -----
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('leXIModal');
  if (!modal) {
    console.warn('[Modal] leXIModal introuvable dans le DOM');
    return;
  }

  const openBtn = document.getElementById('openLeXIModal');
  const closeBtn = document.getElementById('closeLeXIModal') || modal.querySelector('.modal-close');

  function openModal() {
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
  }

  if (openBtn) {
    openBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  } else {
    console.warn('[Modal] Bouton d\'ouverture introuvable (id="openLeXIModal").');
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
});

// ----- Modal "Questions/Réponses" -----
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('qaModal');
  if (!modal) return;

  const openBtn = document.getElementById('openQAModal');
  const closeBtn = document.getElementById('closeQAModal') || modal.querySelector('.modal-close');

  function openModal() {
    modal.style.display = 'flex';

    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
  }

  if (openBtn) {
    openBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });


});


// =========================
// 📊 SYSTÈME DE STATS PSGDLE XI
// =========================

class PSGDLEStats {
    constructor() {
        this.storageKey = 'psgdle_xi_stats';
        this.data = this.load();
    }

    load() {
        const saved = localStorage.getItem(this.storageKey);
        return saved ? JSON.parse(saved) : {
            totalGames: 0,
            wins: 0,
            totalAttempts: 0,
            bestScore: null,
            streak: 0,
            maxStreak: 0,
            lastWinDate: null,
            playerFrequency: {} // { "Mbappé": 12, "Marquinhos": 10, ... }
        };
    }

    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    }

    recordGame(gameWon, attempts, lineup, allPlayers) {
        this.data.totalGames++;
        if (gameWon) {
            this.data.wins++;
            this.data.totalAttempts += attempts;
            if (!this.data.bestScore || attempts < this.data.bestScore) {
                this.data.bestScore = attempts;
            }

            // 🔥 Gestion du streak
            const today = new Date().toISOString().split('T')[0];
            if (this.data.lastWinDate) {
                const last = new Date(this.data.lastWinDate);
                const diffDays = Math.floor((new Date(today) - last) / (1000 * 60 * 60 * 24));
                this.data.streak = diffDays === 1 ? this.data.streak + 1 : 1;
            } else {
                this.data.streak = 1;
            }
            this.data.lastWinDate = today;
            if (this.data.streak > this.data.maxStreak) {
                this.data.maxStreak = this.data.streak;
            }

            // 🎯 Enregistrer les joueurs trouvés
            lineup.forEach(id => {
                const player = allPlayers.find(p => p.id === id);
                if (player) {
                    this.data.playerFrequency[player.nom] = (this.data.playerFrequency[player.nom] || 0) + 1;
                }
            });
        } else {
            this.data.streak = 0;
        }

        this.save();
    }

    reset() {
        localStorage.removeItem(this.storageKey);
        this.data = this.load();
    }

    getSummary() {
        const winRate = this.data.totalGames > 0 ? Math.round((this.data.wins / this.data.totalGames) * 100) : 0;
        const avgAttempts = this.data.wins > 0 ? (this.data.totalAttempts / this.data.wins).toFixed(1) : '-';
        const topPlayers = Object.entries(this.data.playerFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name]) => name);

        return {
            streak: this.data.streak,
            wins: this.data.wins,
            avgAttempts,
            winRate,
            bestScore: this.data.bestScore || '-',
            topPlayers: topPlayers.length ? topPlayers.join(', ') : '-'
        };
    }
}
const statsManager = new PSGDLEStats();
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('statsXIModal');
  const openBtn = document.getElementById('openStatsXIModal'); // ton bouton existant
  const closeBtn = document.getElementById('closeStatsXIModal');
  const shareBtn = document.getElementById('shareStatsXIBtn');
  const resetBtn = document.getElementById('resetStatsXIBtn');

  if (!modal) {
    console.warn('PSGDLE XI : stats modal introuvable (id="statsXIModal")');
    return;
  }

  // Empêche la propagation quand on clique dans la boîte => évite de fermer le modal
  const modalContent = modal.querySelector('.psgdle-xi-modal-content');
  if (modalContent) modalContent.addEventListener('click', (e) => e.stopPropagation());

  function showToast(text) {
    // petit feedback non intrusif
    const existing = modal.querySelector('.psgdle-xi-toast');
    if (existing) existing.remove();

    const t = document.createElement('div');
    t.className = 'psgdle-xi-toast';
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }

  function populateStats() {
    const s = statsManager.getSummary();
    document.getElementById('stat-streak').textContent = s.streak ?? '-';
    document.getElementById('stat-wins').textContent = s.wins ?? 0;
    document.getElementById('stat-avg').textContent = s.avgAttempts ?? '-';
    document.getElementById('stat-rate').textContent = (s.winRate ?? 0) + '%';
    document.getElementById('stat-best').textContent = s.bestScore ?? '-';
    document.getElementById('stat-top').textContent = s.topPlayers ?? '-';
  }

  function openModal() {
    populateStats();
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  // Ouverture via bouton
  if (openBtn) {
    openBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  } else {
    console.warn('PSGDLE XI : bouton d\'ouverture stats introuvable (id="openStatsXIModal")');
  }

  // Fermeture via croix
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  // Fermeture en cliquant sur l'overlay
  modal.addEventListener('click', closeModal);

  // Fermeture au clavier (Escape)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
      closeModal();
    }
  });

  // Reset stats
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Voulez-vous vraiment réinitialiser vos statistiques ?')) {
        statsManager.reset();
        populateStats();
        showToast('Statistiques réinitialisées');
      }
    });
  }

  // Share button : share natif si dispo, sinon clipboard
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const s = statsManager.getSummary();
      const shareText = `PSGDLE XI 🔵⚪
VICTOIRE en ${s.bestScore ?? '-'} tentative(s)
Série actuelle : ${s.streak ?? 0} 🔥
Taux de réussite : ${s.winRate ?? 0}% 📈
Moy. tentatives : ${s.avgAttempts ?? '-'}
Meilleurs : ${s.topPlayers ?? '-'}

Joue à PSGDLE XI !`;

      try {
        if (navigator.share) {
          await navigator.share({
            title: 'Mes stats PSGDLE XI',
            text: shareText,
            url: window.location.href
          });
          showToast('Partage effectué');
        } else if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(shareText);
          showToast('Statistiques copiées dans le presse-papiers');
        } else {
          // Fallback : crée un textarea pour copier manuellement
          const ta = document.createElement('textarea');
          ta.value = shareText;
          ta.style.position = 'fixed'; ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
          showToast('Statistiques copiées (fallback)');
        }
      } catch (err) {
        console.error('Erreur partage/copie :', err);
        showToast('Impossible de partager / copier');
      }
    });
  }
});
