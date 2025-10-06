// ========== SYSTÈME D'ALTERNANCE DE MODES ==========
        
        const modeTabs = document.querySelectorAll('.mode-tab');
        const modeContents = document.querySelectorAll('.mode-content');
        const STORAGE_KEY = 'psgdle_current_mode';

        // Fonction pour changer de mode
        function switchMode(mode) {
            // Mise à jour des onglets
            modeTabs.forEach(tab => {
                if (tab.dataset.mode === mode) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });

            // Mise à jour du contenu
            modeContents.forEach(content => {
                if (content.id === `${mode}-mode`) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });

            // Sauvegarde de la préférence
            localStorage.setItem(STORAGE_KEY, mode);

            // Log pour debug
            console.log(`Mode actif : ${mode}`);
        }

        // Gestionnaires d'événements
        modeTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const mode = tab.dataset.mode;
                switchMode(mode);
            });
        });

        // Restauration du mode au chargement
        window.addEventListener('DOMContentLoaded', () => {
            const savedMode = localStorage.getItem(STORAGE_KEY);
            if (savedMode && (savedMode === 'wordle' || savedMode === 'xi')) {
                switchMode(savedMode);
            } else {
                switchMode('wordle'); // Mode par défaut
            }
        });