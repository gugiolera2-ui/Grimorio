// app.js
// Grimorio v.3.1 - DGrimorio v.3.0 - D&D 5e Spell ManagerD 5e Spell Manager RC1

const APP_VERSION = "3.1";
const APP_NAME = "Grimorio Arcano";

document.addEventListener('DOMContentLoaded', () => {
    // Log di avvio con versione
    console.log(`📖 ${APP_NAME} v.${APP_VERSION} avviato`);
    
    // 1. Inizializza il database dei file caricati
    Database.init();

    // 2. Crea il personaggio DEFAULT (usato solo se non esiste salvataggio)
    const defaultWizard = new Character('Mago Novizio', 1, {  // ⬅️ LIVELLO 1
        for: 8,
        des: 14,
        cos: 14,
        int: 16,  // ⬅️ INT 16 invece di 18
        sag: 12,
        cha: 10
    });

    // 3. Prepara alcune magie di esempio SOLO per il personaggio default
    const fireball = Database.getSpellById('palla_di_fuoco');
    const magicMissile = Database.getSpellById('missili_magici');
    const shield = Database.getSpellById('scudo');
    const detectMagic = Database.getSpellById('individuazione_della_magia');
    const light = Database.getSpellById('luce');

    if (fireball) defaultWizard.prepareSpell(fireball.id);
    if (magicMissile) defaultWizard.prepareSpell(magicMissile.id);
    if (shield) defaultWizard.prepareSpell(shield.id);
    if (detectMagic) defaultWizard.prepareSpell(detectMagic.id);
    if (light) defaultWizard.prepareSpell(light.id);

    // Rendi il personaggio accessibile globalmente
    window.character = defaultWizard;

    // 4. Inizializza UI (carica da localStorage o usa default)
    UI.init(defaultWizard);

    // 6. Gestione tab con visibilità barra di ricerca
    document.getElementById('combat-tab').addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('combat-tab').classList.add('active');
        document.getElementById('search-bar').style.display = 'none';
        UI.renderCombatList();
    });

    document.getElementById('archive-tab').addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('archive-tab').classList.add('active');
        document.getElementById('search-bar').style.display = 'flex';
        UI.renderArchive();
    });

    document.getElementById('stats-tab').addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('stats-tab').classList.add('active');
        document.getElementById('search-bar').style.display = 'none';
        UI.renderStatsTab();
    });

    document.getElementById('character-tab').addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('character-tab').classList.add('active');
        document.getElementById('search-bar').style.display = 'none';
        UI.renderCharacterSheet();
    });

    // 7. Ricerca testuale con debounce (evita il bug del cursore)
    let searchTimeout;
    document.getElementById('spell-search')?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        
        searchTimeout = setTimeout(() => {
            UI.filters.searchText = e.target.value;
            UI.renderArchive();
        }, 300);
    });

    // Bottone clear ricerca
    document.getElementById('clear-search')?.addEventListener('click', () => {
        document.getElementById('spell-search').value = '';
        UI.filters.searchText = '';
        UI.renderArchive();
    });

    // 8. Riposo lungo
    document.getElementById('long-rest-btn').addEventListener('click', () => {
        if (confirm('Fare un riposo lungo?')) {
            UI.char.longRest();  // ⬅️ USA UI.char invece di wizard
            UI.refresh();
            UI.showNotification('💤 Riposo lungo completato!');
            
            // Log per debug
            console.log(`💾 Stato salvato dopo riposo lungo - Versione app: ${APP_VERSION}`);
        }
    });

    // 10. Verifica compatibilità e gestione cache per aggiornamenti futuri
    function checkAppVersion() {
        const savedVersion = localStorage.getItem('grimorio_version');
        
        if (savedVersion !== APP_VERSION) {
            console.log(`🆕 Aggiornamento da v.${savedVersion || 'nuova installazione'} a v.${APP_VERSION}`);
            
            // Qui puoi aggiungere logica di migrazione dati se necessario in futuro
            
            localStorage.setItem('grimorio_version', APP_VERSION);
        }
    }
    
    // Esegui controllo versione
    checkAppVersion();
    // 11. Gestore Temi / Impostazioni
    const THEMES = [
        { id: 'steampunk', label: 'Steampunk',  emoji: '⚙️',  swatch: 'swatch-steampunk' },
        { id: 'bosco',     label: 'Bosco',       emoji: '🌲',  swatch: 'swatch-bosco'     },
        { id: 'drago',     label: 'Drago',       emoji: '🩸',  swatch: 'swatch-drago'     },
        { id: 'ghiaccio',  label: 'Ghiaccio',    emoji: '❄️',  swatch: 'swatch-ghiaccio'  },
        { id: 'pergamena', label: 'Pergamena',   emoji: '📜',  swatch: 'swatch-pergamena' },
    ];

    function applyTheme(themeId) {
        if (themeId === 'steampunk') {
            document.body.removeAttribute('data-theme');
        } else {
            document.body.setAttribute('data-theme', themeId);
        }
        localStorage.setItem('grimorio_theme', themeId);
    }

    function loadSavedTheme() {
        const saved = localStorage.getItem('grimorio_theme') || 'steampunk';
        applyTheme(saved);
    }

    function openSettings() {
        document.getElementById('settings-overlay')?.remove();

        const activeTheme = localStorage.getItem('grimorio_theme') || 'steampunk';

        const swatches = THEMES.map(t => `
            <button class="theme-swatch ${t.id === activeTheme ? 'active' : ''}"
                    data-theme-id="${t.id}" title="${t.label}">
                <div class="theme-swatch-preview ${t.swatch}"></div>
                <span>${t.emoji}<br>${t.label}</span>
            </button>
        `).join('');

        const overlay = document.createElement('div');
        overlay.id = 'settings-overlay';
        overlay.className = 'settings-overlay';
        overlay.innerHTML = `
            <div class="settings-panel">
                <h3>⚙️ Impostazioni</h3>
                <p class="settings-subtitle">Scegli il tuo tema</p>
                <div class="theme-grid">${swatches}</div>
                <button class="settings-close">✕ Chiudi</button>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelectorAll('.theme-swatch').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.themeId;
                applyTheme(id);
                // Aggiorna stato attivo dei bottoni
                overlay.querySelectorAll('.theme-swatch').forEach(b => {
                    b.classList.toggle('active', b.dataset.themeId === id);
                });
                UI.showNotification(`🎨 Tema "${THEMES.find(t=>t.id===id)?.label}" applicato!`);
            });
        });

        overlay.querySelector('.settings-close').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    }

    // Carica tema salvato all'avvio
    loadSavedTheme();

    // Listener sul bottone impostazioni
    document.getElementById('settings-btn')?.addEventListener('click', openSettings);

});