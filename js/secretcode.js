// ========== CODE SECRET PSGDLE - MODE ILLIMITÉ ==========

class SecretCodeDetector {
    constructor() {
        this.secretCode = 'PSGDLE';
        this.currentInput = '';
        this.timeout = null;
        this.isActive = false;
        
        this.init();
    }
    
    init() {
        document.addEventListener('keydown', (e) => {
            // Ignorer si on est dans un input ou textarea
            if (e.target.matches('input, textarea')) {
                return;
            }
            
            // Ajouter la touche pressée à la chaîne
            this.currentInput += e.key.toUpperCase();
            
            // Limiter la longueur pour éviter les problèmes de mémoire
            if (this.currentInput.length > this.secretCode.length) {
                this.currentInput = this.currentInput.slice(-this.secretCode.length);
            }
            
            // Vérifier si le code secret est tapé
            if (this.currentInput === this.secretCode) {
                this.activateSecretMode();
                this.currentInput = '';
            }
            
            // Réinitialiser après 2 secondes d'inactivité
            clearTimeout(this.timeout);
            this.timeout = setTimeout(() => {
                this.currentInput = '';
            }, 2000);
        });
    }
    
    activateSecretMode() {
        if (this.isActive) {
            this.showNotification('Mode illimité déjà activé ! 🎮', 'info');
            return;
        }
        
        this.isActive = true;
        
        // Animation et notification
        this.showNotification('🎉 CODE SECRET ACTIVÉ ! 🎉', 'success');
        this.createConfetti();
        
        // Déterminer quel mode est actif
        const activeMode = this.getActiveMode();
        
        if (activeMode === 'classic') {
            this.resetClassicMode();
        } else if (activeMode === 'photo') {
            this.resetPhotoMode();
        } else if (activeMode === 'xi') {
            this.resetXIMode();
        }
        
        // Réactiver après 3 secondes
        setTimeout(() => {
            this.isActive = false;
        }, 3000);
    }
    
    getActiveMode() {
        const classicMode = document.getElementById('wordle-mode');
        const photoMode = document.getElementById('photo-mode');
        const xiMode = document.getElementById('xi-mode');
        
        if (classicMode && classicMode.classList.contains('active')) {
            return 'classic';
        } else if (photoMode && photoMode.classList.contains('active')) {
            return 'photo';
        } else if (xiMode && xiMode.classList.contains('active')) {
            return 'xi';
        }
        return null;
    }
    
resetClassicMode() {
    console.log('🔄 Réinitialisation du mode Classique...');
    
    localStorage.removeItem('psgQuizState');
    
    if (typeof window.joueursSelectionnes !== 'undefined') {
        window.joueursSelectionnes.length = 0;
    }
    
    const victoryBox = document.getElementById('victory-box');
    if (victoryBox) {
        victoryBox.remove();
    }
    
    // ✅ NOUVEAU : Effacer l'historique
    const selectedPlayersContainer = document.getElementById('selectedPlayers');
    if (selectedPlayersContainer) {
        selectedPlayersContainer.innerHTML = '';
    }
    
    // Réinitialiser les boutons d'indices
    if (typeof window.hintButtons !== 'undefined') {
        window.hintButtons.montant_transfert = { unlockAt: 5, visible: false, unlocked: false, revealed: false };
        window.hintButtons.periode_psg = { unlockAt: 9, visible: false, unlocked: false, revealed: false };
        window.hintButtons.parcours = { unlockAt: 13, visible: false, unlocked: false, revealed: false };
        if (typeof window.renderHintButtons === 'function') {
            window.renderHintButtons();
        }
    }
    
    // ✅ NOUVEAU : Vider le container des hints
    const hintsContainer = document.querySelector('.hint-buttons-container');
    if (hintsContainer) {
        hintsContainer.innerHTML = '';
        hintsContainer.style.minHeight = '0';
        hintsContainer.style.padding = '0';
    }
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.disabled = false;
        searchInput.placeholder = "Rechercher un joueur...";
        searchInput.value = '';
    }
    
    const subtitle = document.getElementById('subtitle');
    if (subtitle) {
        subtitle.style.display = '';
    }
    
    if (typeof window.regenererJoueurAleatoire === 'function') {
        window.regenererJoueurAleatoire();
    }
    
    if (typeof window.adjustMargin === 'function') {
        window.adjustMargin();
    }
    
    this.showNotification('Mode Classique réinitialisé ! 🎯', 'success');
}
    resetPhotoMode() {
        console.log('🔄 Réinitialisation du mode Photo...');
        
        // Supprimer la sauvegarde
        localStorage.removeItem('psgdle_photo_save');
        
        if (typeof photoGame !== 'undefined' && photoGame) {
            // Réinitialiser le jeu
            photoGame.currentAttempt = 0;
            photoGame.gameWon = false;
            photoGame.gameLost = false;
            photoGame.attempts = [];
            
            // Supprimer la victory/defeat box
            const victoryBox = document.getElementById('photo-victory-box');
            if (victoryBox) {
                victoryBox.remove();
            }
            
            // Générer un nouveau joueur aléatoire
            const randomIndex = Math.floor(Math.random() * photoGame.playersData.length);
            photoGame.dailyPlayer = photoGame.playersData[randomIndex];
            console.log('🎯 Nouveau joueur Photo:', photoGame.dailyPlayer.nom);
            
            // Réafficher la photo floutée
            photoGame.displayPhoto();
            photoGame.updateAttemptsCounter();
            photoGame.clearHistory();
            
            // Réactiver l'input
            const searchInput = document.getElementById('photoSearchInput');
            if (searchInput) {
                searchInput.disabled = false;
                searchInput.value = '';
            }
            
            const subtitle = document.getElementById('photo-subtitle');
            if (subtitle) {
                subtitle.style.display = '';
            }
        }
        
        this.showNotification('Mode Photo réinitialisé ! 📸', 'success');
    }
    
    resetXIMode() {
        console.log('🔄 Réinitialisation du mode XI...');
        
        // Supprimer la sauvegarde
        localStorage.removeItem('psgdle_xi_save');
        
        if (typeof xiGame !== 'undefined' && xiGame) {
            // Réinitialiser le jeu
            xiGame.playerPlacements = {};
            xiGame.usedPlayerIds.clear();
            xiGame.validationAttempts = 0;
            xiGame.gameWon = false;
            
            // Supprimer la victory box
            const victoryBox = document.getElementById('xi-victory-box');
            if (victoryBox) {
                victoryBox.remove();
            }
            
            // Générer un nouveau match aléatoire
            const randomIndex = Math.floor(Math.random() * xiGame.matchesData.matches.length);
            xiGame.currentMatch = xiGame.matchesData.matches[randomIndex];
            xiGame.currentMatch.id = `random_${Date.now()}`;
            xiGame.currentFormation = xiGame.matchesData.formations[xiGame.currentMatch.formation];
            console.log('🎯 Nouveau match XI:', xiGame.currentMatch.opponent);
            
            // Réafficher les infos du match et régénérer le terrain
            xiGame.displayMatchInfo();
            xiGame.generateField();
            
            // Réactiver le bouton de validation
            const validateBtn = document.getElementById('validateBtn');
            if (validateBtn) {
                validateBtn.disabled = true;
                validateBtn.textContent = 'Valider la composition (0/' + 
                    xiGame.currentFormation.structure.reduce((sum, line) => sum + line.positions.length, 0) + ')';
            }
            
            // Réactiver les cartes
            document.querySelectorAll('.player-card').forEach(card => {
                card.style.pointerEvents = '';
                card.style.cursor = '';
            });
        }
        
        this.showNotification('Mode XI réinitialisé ! ⚽', 'success');
    }
    
    showNotification(message, type = 'info') {
        // Supprimer les anciennes notifications
        const oldNotif = document.querySelector('.secret-code-notification');
        if (oldNotif) {
            oldNotif.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = `secret-code-notification ${type}`;
        notification.textContent = message;
        
        // Styles inline
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${type === 'success' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#34495e'};
            color: white;
            padding: 25px 40px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 20px;
            z-index: 999999;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            animation: secretNotifAppear 0.5s ease-out;
            text-align: center;
        `;
        
        // Ajouter l'animation CSS
        if (!document.getElementById('secret-notification-style')) {
            const style = document.createElement('style');
            style.id = 'secret-notification-style';
            style.textContent = `
                @keyframes secretNotifAppear {
                    from {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.5);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                }
                
                @keyframes secretNotifDisappear {
                    from {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                    to {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.5);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Retirer après 3 secondes
        setTimeout(() => {
            notification.style.animation = 'secretNotifDisappear 0.5s ease-out';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
    
    createConfetti() {
        const colors = ['#dc143c', '#004170', '#ffffff', '#ffd700'];
        const confettiCount = 50;
        
        for (let i = 0; i < confettiCount; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'secret-confetti';
                confetti.style.cssText = `
                    position: fixed;
                    width: 10px;
                    height: 10px;
                    background: ${colors[Math.floor(Math.random() * colors.length)]};
                    left: ${Math.random() * 100}%;
                    top: -10px;
                    opacity: 1;
                    border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
                    z-index: 999998;
                    pointer-events: none;
                    animation: confettiFall ${2 + Math.random() * 2}s linear forwards;
                `;
                
                document.body.appendChild(confetti);
                
                setTimeout(() => confetti.remove(), 4000);
            }, i * 30);
        }
        
        // Ajouter l'animation CSS des confettis
        if (!document.getElementById('confetti-animation-style')) {
            const style = document.createElement('style');
            style.id = 'confetti-animation-style';
            style.textContent = `
                @keyframes confettiFall {
                    to {
                        transform: translateY(100vh) rotate(${Math.random() * 360}deg);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// ========== INITIALISATION DU SYSTÈME SECRET ==========
let secretDetector;

document.addEventListener('DOMContentLoaded', () => {
    secretDetector = new SecretCodeDetector();
    console.log('🔍 Système de code secret initialisé');
    console.log('💡 Tape "PSGDLE" n\'importe où pour activer le mode illimité !');
});