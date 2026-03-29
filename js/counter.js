// ========== COMPTEUR & JOUEUR D'HIER - PSGDLE ==========
// À inclure après app.js, photomode.js et ximode.js dans index.html
// <script src="js/counter.js"></script>

const COUNTER_WORKSPACE = 'itsmattrijk.github.io/PSGDLE';

// ── Clé du jour pour chaque mode ──────────────────────────────────────────────
function getTodayKey(mode) {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${mode}-${y}${m}${day}`;
}

function getYesterdayKey(mode) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${mode}-${y}${m}${day}`;
}

// ── CounterAPI ────────────────────────────────────────────────────────────────
async function fetchCounter(mode) {
    const key = getTodayKey(mode);
    try {
        const res = await fetch(`https://api.counterapi.dev/v1/${COUNTER_WORKSPACE}/${key}/get`);
        if (!res.ok) return 0;
        const data = await res.json();
        return data.count ?? data.value ?? 0;
    } catch {
        return 0;
    }
}

async function incrementCounter(mode) {
    const key = getTodayKey(mode);
    try {
        const res = await fetch(`https://api.counterapi.dev/v1/${COUNTER_WORKSPACE}/${key}/up`);
        if (!res.ok) return 0;
        const data = await res.json();
        return data.count ?? data.value ?? 0;
    } catch {
        return 0;
    }
}

// Évite d'incrémenter plusieurs fois par session
const _alreadyCounted = { wordle: false, photo: false, xi: false };

async function registerWin(mode) {
    if (_alreadyCounted[mode]) return;
    _alreadyCounted[mode] = true;
    const newCount = await incrementCounter(mode);
    updateCounterDisplay(mode, newCount);
}

// ── Joueur d'hier ─────────────────────────────────────────────────────────────
// Utilise la même logique seeded que app.js pour retrouver le joueur d'hier
function getYesterdaySeed(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() + offset;
}

function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function getYesterdayPlayer(playerList, seedOffset = 0) {
    if (!playerList || playerList.length === 0) return null;
    const seed = getYesterdaySeed(seedOffset);
    const index = Math.floor(seededRandom(seed) * playerList.length);
    return playerList[index];
}

// Même algo Mulberry32 que ximode.js (basé sur string de date)
function seededRandomXI(seedStr) {
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
        hash = ((hash << 5) - hash) + seedStr.charCodeAt(i);
        hash = hash & hash;
    }
    let t = hash + 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

function getYesterdayDateStr() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0]; // "YYYY-MM-DD"
}

// ── Affichage : bannière "Joueur d'hier" ──────────────────────────────────────
const BANNER_STYLES = `
/* ── Widget "Hier + Compteur" : capsule unifiée ── */
.psgdle-info-capsule {
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
    font-family: 'Poppins', sans-serif;
    display: flex;
    align-items: stretch;
    gap: 0;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.07);
    background: rgba(0, 8, 20, 0.90);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    animation: universalFadeIn 0.55s ease forwards 0.1s;
    opacity: 0;
    flex-shrink: 0;
}

/* Bloc gauche : "Hier" */
.psgdle-info-capsule .capsule-yesterday {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 10px 14px;
    border-right: 1px solid rgba(255, 255, 255, 0.06);
    min-width: 0;
    flex: 1;
    gap: 2px;
}

.psgdle-info-capsule .capsule-yesterday .cap-label {
    font-size: 0.6rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: rgba(255, 255, 255, 0.35);
    white-space: nowrap;
}

.psgdle-info-capsule .capsule-yesterday .cap-value {
    font-size: 0.82rem;
    font-weight: 700;
    color: #dc143c;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.psgdle-info-capsule .capsule-yesterday .cap-number {
    color: rgba(200, 168, 80, 0.9);
    font-weight: 700;
    margin-right: 3px;
    font-size: 0.78rem;
}

/* Bloc droit : compteur */
.psgdle-info-capsule .capsule-counter {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-end;
    padding: 10px 14px;
    min-width: 0;
    flex-shrink: 0;
    gap: 2px;
    text-align: right;
}

.psgdle-info-capsule .capsule-counter .cap-label {
    font-size: 0.6rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: rgba(255, 255, 255, 0.35);
    white-space: nowrap;
}

.psgdle-info-capsule .capsule-counter .cap-count {
    font-size: 0.88rem;
    font-weight: 700;
    color: #4a9eff;
    white-space: nowrap;
}

.psgdle-info-capsule .capsule-counter .counter-loading {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #4a9eff;
    animation: counterPulse 1s ease-in-out infinite;
    vertical-align: middle;
    margin-right: 2px;
}

@keyframes counterPulse {
    0%, 100% { opacity: 0.2; transform: scale(0.8); }
    50%       { opacity: 1;   transform: scale(1.1); }
}

/* ── Compatibilité ancien style (inutilisé mais sans conflit) ── */
.psgdle-yesterday-banner,
.psgdle-counter-badge { display: none !important; }
`;

function injectStyles() {
    if (document.getElementById('psgdle-counter-styles')) return;
    const style = document.createElement('style');
    style.id = 'psgdle-counter-styles';
    style.textContent = BANNER_STYLES;
    document.head.appendChild(style);
}

// Crée la capsule unifiée "hier + compteur" pour un mode donné
function createInfoCapsule(mode, yesterdayPlayer) {
    const capsule = document.createElement('div');
    capsule.className = 'psgdle-info-capsule';
    capsule.id = `info-capsule-${mode}`;

    // Bloc gauche — joueur d'hier
    const yesterdayBlock = document.createElement('div');
    yesterdayBlock.className = 'capsule-yesterday';

    let hierHTML = '';
    if (yesterdayPlayer) {
        const number = yesterdayPlayer.numero
            ? `<span class="cap-number">#${yesterdayPlayer.numero}</span>` : '';
        const displayName = yesterdayPlayer._customLabel
            ?? `${yesterdayPlayer.prenom ?? ''} ${yesterdayPlayer.nom ?? yesterdayPlayer.name ?? ''}`.trim();
        hierHTML = `<span class="cap-value">${number}${displayName}</span>`;
    } else {
        hierHTML = `<span class="cap-value">—</span>`;
    }
    yesterdayBlock.innerHTML = `<span class="cap-label">Hier</span>${hierHTML}`;

    // Bloc droit — compteur
    const counterBlock = document.createElement('div');
    counterBlock.className = 'capsule-counter';
    counterBlock.id = `capsule-counter-${mode}`;
    counterBlock.innerHTML = `
        <span class="cap-label">Trouvé aujourd'hui</span>
        <span class="cap-count"><span class="counter-loading"></span></span>
    `;

    capsule.appendChild(yesterdayBlock);
    capsule.appendChild(counterBlock);
    return capsule;
}

// Compat : createYesterdayBanner / createCounterBadge redirigent vers la capsule
function createYesterdayBanner(mode, yesterdayPlayer) {
    return createInfoCapsule(mode, yesterdayPlayer);
}
function createCounterBadge() {
    return document.createElement('span'); // inutilisé, capsule créée au-dessus
}

// Met à jour l'affichage du compteur dans la capsule
function updateCounterDisplay(mode, count) {
    const block = document.getElementById(`capsule-counter-${mode}`);
    if (!block) return;
    const countEl = block.querySelector('.cap-count');
    if (!countEl) return;
    if (count === 0) {
        countEl.textContent = 'Sois le 1er !';
    } else {
        countEl.innerHTML = `<span style="color:#4a9eff;font-weight:700">${count.toLocaleString('fr-FR')}</span>`;
    }
}

// ── Injection dans chaque mode ────────────────────────────────────────────────

// Mode Classique : injection sous la search bar (avant #selectedPlayers)
function injectWordleWidgets(yesterdayPlayer) {
    const layout = document.querySelector('#section-wordle .wordle-layout');
    if (!layout) return;

    const searchContainer = layout.querySelector('.search-container');
    if (!searchContainer) return;

    const capsule = createInfoCapsule('wordle', yesterdayPlayer);
    layout.insertBefore(capsule, searchContainer);

    fetchCounter('wordle').then(count => updateCounterDisplay('wordle', count));
}

// Mode Photo : injection dans le photo-game-container, avant la search bar
function injectPhotoWidgets(yesterdayPlayer) {
    const container = document.querySelector('.photo-game-container');
    if (!container) return;

    const searchContainer = container.querySelector('.search-container');
    if (!searchContainer) return;

    const capsule = createInfoCapsule('photo', yesterdayPlayer);
    container.insertBefore(capsule, searchContainer);

    fetchCounter('photo').then(count => updateCounterDisplay('photo', count));
}

// Mode XI : injection dans .xi-container, avant .match-header
function injectXIWidgets(yesterdayPlayer) {
    const xiContainer = document.querySelector('#section-xi .xi-container');
    if (!xiContainer) return;

    const matchHeader = xiContainer.querySelector('.match-header');

    const capsule = createInfoCapsule('xi', yesterdayPlayer);
    capsule.style.maxWidth = '700px';

    xiContainer.insertBefore(capsule, matchHeader ?? xiContainer.firstChild);

    fetchCounter('xi').then(count => updateCounterDisplay('xi', count));
}

// ── Accrochage aux victoires ───────────────────────────────────────────────────
// On expose des fonctions globales appelables depuis app.js / photomode.js / ximode.js

window.psgdleCounterRegisterWin = registerWin;

// Patch automatique : surveille l'apparition des boîtes de victoire/défaite
// et déclenche registerWin si le joueur a trouvé
function watchVictory() {
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (!(node instanceof HTMLElement)) continue;

                // Mode classique
                if (node.id === 'victory-box' || node.classList?.contains('victory-container')) {
                    // Vérifier si c'est une victoire (pas une défaite)
                    const isWin = node.querySelector('.victory-title')?.textContent?.includes('🎉') ||
                                  node.querySelector('[class*="victory"]');
                    if (isWin) registerWin('wordle');
                }

                // Mode photo – victoire
                if (node.id === 'photo-victory-box') {
                    const isWin = node.querySelector('.attempt-item.correct') ||
                                  node.textContent?.includes('Bravo') ||
                                  node.textContent?.includes('trouvé');
                    if (isWin) registerWin('photo');
                }

                // Mode XI
                if (node.id === 'xi-victory-box') {
                    registerWin('xi');
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// ── Point d'entrée principal ───────────────────────────────────────────────────
async function initCounterSystem() {
    injectStyles();

    // Attendre que les joueurs soient chargés (app.js expose window.joueurs)
    let attempts = 0;
    while ((!window.joueurs || window.joueurs.length === 0) && attempts < 30) {
        await new Promise(r => setTimeout(r, 200));
        attempts++;
    }

    const playerList = window.joueurs ?? [];

    // Joueur d'hier mode Classique (seed normal, liste complète)
    const yesterdayPlayerClassic = getYesterdayPlayer(playerList, 0);

    // Joueur d'hier mode Photo (seed + 1234 comme dans photomode.js, liste filtrée avec photos)
    // window.joueursPhoto est exposé par photomode.js dans loadPlayers()
    // On poll un peu si le mode photo n'est pas encore init
    let photoList = window.joueursPhoto;
    if (!photoList || photoList.length === 0) {
        photoList = playerList.filter(p => p.photo && p.photo.trim() !== '');
    }
    const yesterdayPlayerPhoto = getYesterdayPlayer(photoList, 1234);

    // Pour le XI, on charge xi.json directement (xiGame peut ne pas être init)
    let yesterdayXI = null;
    try {
        const xiRes = await fetch('js/xi.json');
        if (xiRes.ok) {
            const xiData = await xiRes.json();
            const matches = xiData.matches;
            if (matches && matches.length > 0) {
                const yesterdayStr = getYesterdayDateStr();
                const idx = Math.floor(seededRandomXI(yesterdayStr) * matches.length);
                const match = matches[idx];
                if (match) {
                    yesterdayXI = {
                        nom: match.opponent ?? match.adversaire ?? '?',
                        prenom: '',
                        numero: null,
                        _customLabel: `${match.opponent ?? match.adversaire ?? '?'}${match.date ? ' · ' + match.date : ''}`
                    };
                }
            }
        }
    } catch (e) {
        console.warn('counter.js : impossible de charger xi.json pour le XI d\'hier', e);
    }

    injectWordleWidgets(yesterdayPlayerClassic);
    injectPhotoWidgets(yesterdayPlayerPhoto);
    injectXIWidgets(yesterdayXI);

    watchVictory();
}

// Lancer après le DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCounterSystem);
} else {
    initCounterSystem();
}

// ── API publique pour appeler registerWin depuis les autres scripts ────────────
// Exemple dans app.js, au moment de la victoire :
//   window.psgdleCounterRegisterWin?.('wordle');
// Exemple dans photomode.js :
//   window.psgdleCounterRegisterWin?.('photo');
// Exemple dans ximode.js :
//   window.psgdleCounterRegisterWin?.('xi');