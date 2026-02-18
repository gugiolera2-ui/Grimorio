// ui.js - Riscritto con layout compatto, trucchetti e fix selezione incantesimi
// Versione 3.2.0 - Supporto multi-fonte per incantesimi (override caratteristica)

const UI = {
    char: null,
    selectedClasses: [], // Mantenuto per retrocompatibilità
    // Filtri semplificati per l'archivio
    filters: {
        levels: [],        // Array per multi-selezione [0, 1, 2, ...]
        casterClass: 'all',
        searchText: ''     // Testo di ricerca
    },

    // NUOVO: Mappa per convertire nomi statistiche in abbreviazioni
    statAbbr: {
        'for': 'FOR',
        'des': 'DES',
        'cos': 'COS',
        'int': 'INT',
        'sag': 'SAG',
        'cha': 'CAR'
    },

    // NUOVO: Nomi completi delle statistiche
    statFull: {
        'for': 'Forza',
        'des': 'Destrezza',
        'cos': 'Costituzione',
        'int': 'Intelligenza',
        'sag': 'Saggezza',
        'cha': 'Carisma'
    },

    init: function(character) {
        // Carica il personaggio salvato o usa quello passato
        this.char = Character.load() || character;
        this.char.save(); // Assicura che il personaggio sia salvato
        
        this.selectedClasses = []; // Inizializza vuoto
        this.renderStats();
        this.renderSlots();
        this.renderCombatList();
    },

    renderStats: function() {
        const primaryKey = Character.getPrimaryStatForClass(this.char.class);
        const mod = Character.getModifier(this.char.stats[primaryKey]);
        const cd = Character.spellSaveDC(this.char.level, mod);
        const atk = Character.spellAttackBonus(this.char.level, mod);
        
        const container = document.getElementById('quick-stats');
        if (container) {
            container.innerHTML = `
                <button id="char-sheet-btn" class="stat-box">
                    <span>CD ${cd}</span>
                    <span class="separator">•</span>
                    <span>ATK +${atk}</span>
                </button>
            `;
            // Riallega sempre il listener: ogni innerHTML ricrea il bottone
            document.getElementById('char-sheet-btn')?.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                document.getElementById('character-tab')?.classList.add('active');
                document.getElementById('search-bar').style.display = 'none';
                UI.renderCharacterSheet();
            });
        }
    },

    // NUOVO: Calcola CD e bonus attacco per un incantesimo specifico
    getSpellStats: function(spellId) {
        const spell = Database.getSpellById(spellId);
        if (!spell) return null;
        
        // Cerca se l'incantesimo ha un override di caratteristica salvato
        const spellOverride = this.char.spellAbilityOverrides?.[spellId];
        
        let abilityKey = null;
        let source = null;
        
        if (spellOverride) {
            // Usa l'override salvato
            abilityKey = spellOverride.ability;
            source = spellOverride.source || 'manuale';
        } else {
            // Altrimenti usa la caratteristica primaria della classe
            abilityKey = Character.getPrimaryStatForClass(this.char.class);
            source = 'classe';
        }
        
        const abilityScore = this.char.stats[abilityKey] || 10;
        const abilityMod = Character.getModifier(abilityScore);
        const proficiency = Character.getProficiencyBonus(this.char.level);
        
        return {
            abilityKey: abilityKey,
            abilityName: this.statFull[abilityKey] || abilityKey.toUpperCase(),
            abilityAbbr: this.statAbbr[abilityKey] || abilityKey.toUpperCase(),
            abilityScore: abilityScore,
            abilityMod: abilityMod,
            saveDC: 8 + proficiency + abilityMod,
            attackBonus: proficiency + abilityMod,
            source: source,
            overrideSource: spellOverride?.source || null
        };
    },

    // NUOVO: Imposta un override di caratteristica per un incantesimo
    setSpellAbility: function(spellId, abilityKey, source = null) {
        if (!this.char.spellAbilityOverrides) {
            this.char.spellAbilityOverrides = {};
        }
        
        if (abilityKey) {
            this.char.spellAbilityOverrides[spellId] = {
                ability: abilityKey,
                source: source
            };
        } else {
            // Rimuovi override
            delete this.char.spellAbilityOverrides[spellId];
        }
        
        this.char.save();
    },

    // NUOVO: Renderizza il selettore di caratteristica per un incantesimo
    renderAbilitySelector: function(spellId, currentAbility = null) {
        const abilities = [
            { key: 'for', label: 'FOR 💪' },
            { key: 'des', label: 'DES 🏹' },
            { key: 'cos', label: 'COS 🛡️' },
            { key: 'int', label: 'INT 📚' },
            { key: 'sag', label: 'SAG 🕯️' },
            { key: 'cha', label: 'CAR 👑' }
        ];
        
        return `
            <div class="ability-selector" data-spell="${spellId}">
                <label>🎯 Caratteristica:</label>
                <select class="ability-select" data-spell="${spellId}">
                    <option value="">Auto (classe)</option>
                    ${abilities.map(a => `
                        <option value="${a.key}" ${currentAbility === a.key ? 'selected' : ''}>
                            ${a.label}
                        </option>
                    `).join('')}
                </select>
            </div>
        `;
    },

    renderCharacterSheet: function() {
        const view = document.getElementById('main-view');
        const primaryKey = Character.getPrimaryStatForClass(this.char.class);
        const primaryLabelMap = { for:'FOR', des:'DES', cos:'COS', int:'INT', sag:'SAG', cha:'CAR' };
        const primaryLabel = primaryLabelMap[primaryKey] || 'INT';

        view.innerHTML = `
            <div class="character-sheet">

                <!-- SEZIONE 1: Header Personaggio COMPATTO -->
                <div class="character-header">
                    <input class="char-name-input" type="text" 
                           placeholder="Nome Personaggio" 
                           value="${this.char.name || ''}">
                    
                    <div class="char-info-row">
                        <select id="char-class" class="char-class-select">
                            <option value="Mago" ${this.char.class === 'Mago' ? 'selected' : ''}>Mago</option>
                            <option value="Stregone" ${this.char.class === 'Stregone' ? 'selected' : ''}>Stregone</option>
                            <option value="Chierico" ${this.char.class === 'Chierico' ? 'selected' : ''}>Chierico</option>
                            <option value="Druido" ${this.char.class === 'Druido' ? 'selected' : ''}>Druido</option>
                            <option value="Bardo" ${this.char.class === 'Bardo' ? 'selected' : ''}>Bardo</option>
                            <option value="Paladino" ${this.char.class === 'Paladino' ? 'selected' : ''}>Paladino</option>
                            <option value="Ranger" ${this.char.class === 'Ranger' ? 'selected' : ''}>Ranger</option>
                            <option value="Warlock" ${this.char.class === 'Warlock' ? 'selected' : ''}>Warlock</option>
                            <option value="Artificiere" ${this.char.class === 'Artificiere' ? 'selected' : ''}>Artificiere</option>
                        </select>
                        
                        <input id="char-race" type="text" placeholder="Razza" 
                               class="char-field-short" value="${this.char.race || ''}">
                        <input id="char-align" type="text" placeholder="Allineam." 
                               class="char-field-short" value="${this.char.alignment || ''}">
                    </div>
                    
                    <!-- LIVELLO COMPATTO: ± vicini al numero -->
                    <div class="level-row-compact">
                        <span class="level-row-label">⚙️ Livello</span>
                        <div class="level-controls-inline">
                            <span class="level-number-display">${this.char.level}</span>
                            <button id="level-down-btn" class="level-mini-btn" 
                                    ${this.char.level <= 1 ? 'disabled' : ''} title="Riduci">−</button>
                            <button id="level-up-btn" class="level-mini-btn" 
                                    ${this.char.level >= 20 ? 'disabled' : ''} title="Avanza">+</button>
                        </div>
                        <span class="level-row-hint">slot e risorse si aggiornano in automatico</span>
                    </div>
                </div>

                <!-- SEZIONE 2: Caratteristiche COMPATTE (6 in una riga) -->
                <div class="character-stats">
                    ${["FOR","DES","COS","INT","SAG","CAR"].map(stat => {
                        const statLower = stat.toLowerCase();
                        const value = this.char.stats?.[statLower] || 10;
                        const mod = Character.getModifier(value);
                        return `
                            <div class="stat-box">
                                <label>${stat}</label>
                                <input type="number" class="stat-input" data-stat="${stat}" value="${value}" min="1" max="30">
                                <span class="stat-mod">${mod >= 0 ? '+' : ''}${mod}</span>
                            </div>
                        `;
                    }).join("")}
                </div>

                <!-- SEZIONE 3: Risorse & Calcoli (con trucchetti) -->
                <div class="character-resources">
                    <h3>✨ Risorse & Calcoli</h3>
                    <div class="resources-grid">
                        <div class="resource-item">
                            <label>Caratteristica primaria</label>
                            <span class="resource-value" id="char-primary">${primaryLabel}</span>
                        </div>
                        <div class="resource-item">
                            <label>CD Incantesimi</label>
                            <span class="resource-value" id="char-cd">${this.char.getSpellSaveDC()}</span>
                        </div>
                        <div class="resource-item">
                            <label>Bonus Attacco</label>
                            <span class="resource-value" id="char-atk">+${this.char.getSpellAttackBonus()}</span>
                        </div>
                        <div class="resource-item">
                            <label>Prof. Bonus</label>
                            <span class="resource-value" id="char-prof">+${Character.getProficiencyBonus(this.char.level)}</span>
                        </div>
                        <div class="resource-item">
                            <label>Iniziativa</label>
                            <span class="resource-value" id="char-init">${Character.getModifier(this.char.stats.des) >= 0 ? '+' : ''}${Character.getModifier(this.char.stats.des)}</span>
                        </div>
                        <!-- NUOVO: Trucchetti conosciuti -->
                        <div class="resource-item">
                            <label>🎭 Trucchetti</label>
                            <span class="resource-value" id="char-cantrips">
                                ${this.char.maxCantrips ? this.char.maxCantrips() : '—'}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- SEZIONE 4: Slot Incantesimi (solo nella scheda) - MODIFICATO con controlli -->
                <div class="character-resources">
                    <h3>🔮 Slot Incantesimi 
                        <span class="slot-mode-indicator" id="slot-mode-indicator">
                            ${this.char.manualSlotMode ? '✏️ Manuale' : '🤖 Automatico'}
                        </span>
                    </h3>
                    <div id="character-slots" class="slots-grid"></div>
                    
                    <!-- NUOVO: Pannello di controllo slot -->
                    <div class="slot-control-panel">
                        <button id="toggle-slot-mode" class="slot-mode-btn">
                            ${this.char.manualSlotMode ? '🔁 Passa a Automatico' : '✏️ Passa a Manuale'}
                        </button>
                        <button id="add-bonus-slot" class="slot-bonus-btn">➕ Aggiungi Bonus Slot</button>
                    </div>
                    
                    <!-- NUOVO: Pannello bonus slot (inizialmente nascosto) -->
                    <div id="bonus-slot-panel" class="bonus-slot-panel" style="display: none;">
                        <h4>✨ Bonus Slot Personali</h4>
                        <div class="bonus-slots-grid" id="bonus-slots-grid">
                            ${this.renderBonusSlotControls()}
                        </div>
                        <button id="close-bonus-panel" class="close-panel-btn">✕ Chiudi</button>
                    </div>
                </div>

                <!-- SEZIONE 5: Risorse di classe -->
                <div class="class-resources-section">
                    <h3>⚙️ Risorse di classe</h3>
                    <div id="class-resources" class="class-resources-grid"></div>
                </div>

                <!-- SEZIONE 6: Note -->
                <div class="character-notes">
                    <h3>📜 Note, tratti, capacità</h3>
                    <textarea id="char-notes" placeholder="Note, tratti, capacità...">${this.char.notes || ""}</textarea>
                </div>

                <!-- SEZIONE 7: Export/Import -->
                <div class="character-export">
                    <h3>💾 Salvataggio & Caricamento</h3>
                    <div class="export-buttons">
                        <button id="export-btn" class="action-btn">
                            📥 Esporta Personaggio
                        </button>
                        <button id="import-btn" class="action-btn">
                            📤 Importa Personaggio
                        </button>
                        <input type="file" id="import-file" accept=".json,application/json" style="display:none;">
                    </div>
                </div>

            </div>
        `;

        this.attachCharacterListeners();
        this.renderCharacterSlots(); // Aggiunge la visualizzazione degli slot nella scheda
        this.renderClassResources();
        this.attachExportImportListeners();
        this.attachSlotControlListeners(); // NUOVO: Attacca listener per controlli slot
    },

    // NUOVO: Renderizza i controlli per i bonus slot
    renderBonusSlotControls: function() {
        let html = '';
        for (let lvl = 1; lvl <= 9; lvl++) {
            const bonus = this.char.customSlotBonus?.[lvl] || 0;
            html += `
                <div class="bonus-slot-row">
                    <span class="bonus-level">Liv. ${lvl}</span>
                    <input type="number" class="bonus-input" data-level="${lvl}" value="${bonus}" min="0" max="9">
                    <div class="bonus-actions">
                        <button class="bonus-minus" data-level="${lvl}" ${bonus <= 0 ? 'disabled' : ''}>−</button>
                        <button class="bonus-plus" data-level="${lvl}">+</button>
                    </div>
                </div>
            `;
        }
        return html;
    },

    // Visualizza SOLO gli slot disponibili al livello corrente
    renderCharacterSlots: function() {
        const container = document.getElementById('character-slots');
        if (!container) return;

        let html = '';
        for (let lvl = 1; lvl <= 9; lvl++) {
            const slot = this.char.slots[lvl];
            
            // Salta se non ha slot per questo livello
            if (!slot || slot.max === 0) continue;
            
            const available = slot.max - slot.used;
            
            html += `
                <div class="slot-level-row">
                    <span class="slot-level">Liv. ${lvl}</span>
                    <div class="slot-indicator interactive-slots" data-level="${lvl}">
                        ${this.renderInteractiveSlotDots(slot.max, slot.used, lvl)}
                    </div>
                    <div class="slot-controls-mini">
                        <button class="slot-use-minus" data-level="${lvl}" ${slot.used <= 0 ? 'disabled' : ''}>−</button>
                        <span class="slot-used-count">${slot.used}/${slot.max}</span>
                        <button class="slot-use-plus" data-level="${lvl}" ${slot.used >= slot.max ? 'disabled' : ''}>+</button>
                    </div>
                </div>
            `;
        }
        
        if (html === '') {
            html = '<p class="empty-state">Nessuno slot disponibile</p>';
        }
        
        container.innerHTML = html;
        
        // Aggiungi listener per i controlli interattivi degli slot
        this.attachInteractiveSlotListeners();
    },

    // NUOVO: Renderizza i dot interattivi per gli slot
    renderInteractiveSlotDots: function(max, used, level) {
        let dots = '';
        for (let i = 0; i < max; i++) {
            const isUsed = i < used;
            dots += `<div class="slot-dot interactive-dot ${isUsed ? 'used' : 'available'}" 
                          data-level="${level}" data-index="${i}" 
                          title="${isUsed ? 'Usato' : 'Disponibile'}"></div>`;
        }
        return dots;
    },

    // NUOVO: Attacca listener per gli slot interattivi
    attachInteractiveSlotListeners: function() {
        // Listener per i dot (click per usare/ripristinare)
        document.querySelectorAll('.interactive-dot').forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                const level = parseInt(dot.dataset.level);
                const isUsed = dot.classList.contains('used');
                
                if (isUsed) {
                    // Ripristina slot
                    if (this.char.restoreSlot(level)) {
                        this.showNotification(`🔓 Slot Liv. ${level} ripristinato`);
                    }
                } else {
                    // Usa slot
                    if (this.char.useSlot(level)) {
                        this.showNotification(`🔒 Slot Liv. ${level} utilizzato`);
                    }
                }
                
                // Aggiorna visualizzazione
                this.renderCharacterSlots();
                this.renderSlots(); // Aggiorna anche l'header
            });
        });

        // Listener per pulsanti +/-
        document.querySelectorAll('.slot-use-plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const level = parseInt(btn.dataset.level);
                if (this.char.useSlot(level)) {
                    this.showNotification(`🔒 Slot Liv. ${level} utilizzato`);
                    this.renderCharacterSlots();
                    this.renderSlots();
                }
            });
        });

        document.querySelectorAll('.slot-use-minus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const level = parseInt(btn.dataset.level);
                if (this.char.restoreSlot(level)) {
                    this.showNotification(`🔓 Slot Liv. ${level} ripristinato`);
                    this.renderCharacterSlots();
                    this.renderSlots();
                }
            });
        });
    },

    // NUOVO: Attacca listener per i controlli slot
    attachSlotControlListeners: function() {
        // Toggle modalità automatica/manuale
        const toggleBtn = document.getElementById('toggle-slot-mode');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.char.setManualMode(!this.char.manualSlotMode);
                
                // Aggiorna indicatore
                const indicator = document.getElementById('slot-mode-indicator');
                if (indicator) {
                    indicator.textContent = this.char.manualSlotMode ? '✏️ Manuale' : '🤖 Automatico';
                }
                
                // Aggiorna testo bottone
                toggleBtn.textContent = this.char.manualSlotMode ? '🔁 Passa a Automatico' : '✏️ Passa a Manuale';
                
                // Ricarica la visualizzazione slot
                this.renderCharacterSlots();
                this.renderSlots();
                
                this.showNotification(`Modalità slot: ${this.char.manualSlotMode ? 'Manuale' : 'Automatica'}`);
            });
        }

        // Apri pannello bonus
        const bonusBtn = document.getElementById('add-bonus-slot');
        const bonusPanel = document.getElementById('bonus-slot-panel');
        if (bonusBtn && bonusPanel) {
            bonusBtn.addEventListener('click', () => {
                bonusPanel.style.display = 'block';
            });
        }

        // Chiudi pannello bonus
        const closeBtn = document.getElementById('close-bonus-panel');
        if (closeBtn && bonusPanel) {
            closeBtn.addEventListener('click', () => {
                bonusPanel.style.display = 'none';
            });
        }

        // Listener per input bonus
        document.querySelectorAll('.bonus-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const level = parseInt(e.target.dataset.level);
                const value = parseInt(e.target.value) || 0;
                this.char.setSlotBonus(level, value);
                
                // Aggiorna stato bottoni +/- 
                const row = e.target.closest('.bonus-slot-row');
                if (row) {
                    const minusBtn = row.querySelector('.bonus-minus');
                    if (minusBtn) minusBtn.disabled = value <= 0;
                }
                
                this.renderCharacterSlots();
                this.renderSlots();
                this.showNotification(`Bonus slot Liv. ${level} aggiornato a ${value}`);
            });
        });

        // Listener per pulsanti plus/minus bonus
        document.querySelectorAll('.bonus-plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const level = parseInt(btn.dataset.level);
                const input = document.querySelector(`.bonus-input[data-level="${level}"]`);
                if (input) {
                    const current = parseInt(input.value) || 0;
                    const newValue = current + 1;
                    input.value = newValue;
                    this.char.setSlotBonus(level, newValue);
                    
                    // Abilita pulsante minus
                    const row = btn.closest('.bonus-slot-row');
                    const minusBtn = row?.querySelector('.bonus-minus');
                    if (minusBtn) minusBtn.disabled = false;
                    
                    this.renderCharacterSlots();
                    this.renderSlots();
                }
            });
        });

        document.querySelectorAll('.bonus-minus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const level = parseInt(btn.dataset.level);
                const input = document.querySelector(`.bonus-input[data-level="${level}"]`);
                if (input) {
                    const current = parseInt(input.value) || 0;
                    if (current > 0) {
                        const newValue = current - 1;
                        input.value = newValue;
                        this.char.setSlotBonus(level, newValue);
                        
                        // Disabilita pulsante minus se arriva a 0
                        if (newValue <= 0) btn.disabled = true;
                        
                        this.renderCharacterSlots();
                        this.renderSlots();
                    }
                }
            });
        });
    },

    renderClassResources: function() {
        const box = document.getElementById("class-resources");
        if (!box) return;

        const cls = this.char.class;
        const res = this.char.resources || {};

        // Mappa icone steampunk per le risorse
        const icons = {
            sorceryPoints: "🜁",        // aria alchemica
            metamagic: "⚗️",           // alambicco
            pactSlots: "🜂",            // fuoco
            invocations: "👁️",         // occhio eldritch
            channelDivinity: "✝️",      // simbolo sacro
            rage: "🔥",                 // ira
            ki: "☯️",                   // ki monastico
            actionSurge: "⚡",           // fulmine
            secondWind: "🌬️",          // vento
            superiorityDice: "⚔️",      // manovre
            infusions: "🜄",            // acqua alchemica
            knownSpells: "📘",          // incantesimi conosciuti
            favoredEnemy: "🎯",          // nemico prescelto
            bardicInspiration: "🎵",     // ispirazione
            wildShape: "🐺",            // forma selvatica
            pactLevel: "⛭",             // ingranaggio
            magicalSecrets: "🔮",        // segreti magici
            default: "⚙️"               // ingranaggio generico
        };

        const addResource = (key, label, current, max = null) => `
            <div class="resource-item">
                <label>
                    <span class="resource-icon">${icons[key] || icons.default}</span>
                    ${label}
                </label>
                <div class="resource-control">
                    <input type="number" class="resource-input" data-key="${key}" value="${current || 0}" min="0" ${max !== null ? `max="${max}"` : ''}>
                    ${max !== null ? `<span class="resource-max">/ ${max}</span>` : ''}
                </div>
            </div>
        `;

        const addArrayResource = (key, label, items) => `
            <div class="resource-item array-resource">
                <label>
                    <span class="resource-icon">${icons[key] || icons.default}</span>
                    ${label}
                </label>
                <div class="resource-tags">
                    ${items && items.length > 0 
                        ? items.map(item => `<span class="resource-tag">${item}</span>`).join('') 
                        : '<span class="empty-tag">Nessuna</span>'}
                </div>
            </div>
        `;

        let html = "";

        // Risorse in base alla classe
        switch(cls) {
            case "Stregone":
                html += addResource("sorceryPoints", "Punti Stregoneria", res.sorceryPoints?.current, res.sorceryPoints?.max);
                if (res.metamagic && res.metamagic.length > 0) {
                    html += addArrayResource("metamagic", "Metamagie", res.metamagic);
                }
                break;

            case "Warlock":
                html += addResource("pactSlots", "Slot del Patto", res.pactSlots || 0);
                if (res.invocations && res.invocations.length > 0) {
                    html += addArrayResource("invocations", "Invocazioni", res.invocations);
                }
                break;

            case "Paladino":
            case "Chierico":
                html += addResource("channelDivinity", "Canale Divino", res.channelDivinity?.current, res.channelDivinity?.max);
                break;

            case "Barbaro":
                html += addResource("rage", "Ire", res.rage?.current, res.rage?.max);
                break;

            case "Monaco":
                html += addResource("ki", "Punti Ki", res.ki?.current, res.ki?.max);
                break;

            case "Guerriero (Eldritch Knight)":
            case "Guerriero":
                html += addResource("actionSurge", "Action Surge", res.actionSurge?.current, res.actionSurge?.max);
                html += addResource("secondWind", "Second Wind", res.secondWind?.current, res.secondWind?.max);
                if (res.superiorityDice) {
                    html += addResource("superiorityDice", "Dadi Superiorità", res.superiorityDice?.current, res.superiorityDice?.max);
                }
                break;

            case "Artificiere":
                html += addResource("infusions", "Infusioni", res.infusions?.current, res.infusions?.max);
                if (res.infusions?.known && res.infusions.known.length > 0) {
                    html += addArrayResource("infusions-known", "Infusioni Conosciute", res.infusions.known);
                }
                break;

            case "Ranger":
                html += addResource("knownSpells", "Incantesimi Conosciuti", res.knownSpells?.current, res.knownSpells?.max);
                if (res.favoredEnemy && res.favoredEnemy.length > 0) {
                    html += addArrayResource("favoredEnemy", "Nemici Prescelti", res.favoredEnemy);
                }
                break;

            case "Bardo":
                html += addResource("bardicInspiration", "Ispirazione Bardica", res.bardicInspiration?.current, res.bardicInspiration?.max);
                if (res.magicalSecrets && res.magicalSecrets.length > 0) {
                    html += addArrayResource("magicalSecrets", "Segreti Magici", res.magicalSecrets);
                }
                break;

            case "Druido":
                html += addResource("wildShape", "Wild Shape", res.wildShape?.current, res.wildShape?.max);
                break;

            default:
                html = "<p class='empty-state'>Nessuna risorsa speciale</p>";
        }

        box.innerHTML = html;

        // Listener per gli input delle risorse con pulsazione
        document.querySelectorAll(".resource-input").forEach(inp => {
            inp.addEventListener("input", e => {
                const key = e.target.dataset.key;
                const value = Number(e.target.value);
                const max = e.target.max ? Number(e.target.max) : null;
                
                // Limita al massimo se presente
                const finalValue = max !== null ? Math.min(value, max) : value;
                e.target.value = finalValue;
                
                // Aggiorna la risorsa nel modello
                if (this.char.resources[key] && typeof this.char.resources[key] === 'object') {
                    this.char.resources[key].current = finalValue;
                } else {
                    // Per risorse semplici come numeri
                    this.char.resources[key] = finalValue;
                }
                
                this.char.save();
                
                // Effetto pulsazione sulla risorsa modificata
                const box = e.target.closest('.resource-item');
                if (box) {
                    box.classList.add('pulse');
                    setTimeout(() => box.classList.remove('pulse'), 600);
                }
            });
        });
    },

    attachCharacterListeners: function() {
        // Listener per il nome
        const nameInput = document.querySelector(".char-name-input");
        if (nameInput) {
            nameInput.addEventListener("input", e => {
                this.char.name = e.target.value;
                this.char.save();
                this.renderStats();
            });
        }

        // Listener per le statistiche
        document.querySelectorAll(".stat-input").forEach(input => {
            input.addEventListener("input", e => {
                const stat = e.target.dataset.stat.toLowerCase();
                const value = Number(e.target.value);
                
                // Aggiorna il modificatore visualizzato
                const modSpan = e.target.parentElement.querySelector('.stat-mod');
                if (modSpan) {
                    modSpan.textContent = `${Character.getModifier(value) >= 0 ? '+' : ''}${Character.getModifier(value)}`;
                }
                
                // Aggiorna il personaggio
                this.char.stats[stat] = value;
                this.char.save();
                
                // Aggiorna tutto ciò che dipende dalle statistiche
                this.updateSpellStats();
            });
        });

        // Listener per la classe
        const classSelect = document.getElementById("char-class");
        if (classSelect) {
            classSelect.addEventListener("change", e => {
                this.char.class = e.target.value;
                // Re-inizializza le risorse per la nuova classe
                this.char.initClassResources();
                this.char.save();
                this.updateSpellStats();
                this.renderClassResources(); // Aggiorna le risorse quando cambia classe
                this.renderCharacterSlots(); // Aggiorna gli slot
                
                // Aggiorna il contatore trucchetti
                const cantripsSpan = document.getElementById('char-cantrips');
                if (cantripsSpan && this.char.maxCantrips) {
                    cantripsSpan.textContent = this.char.maxCantrips();
                }
            });
        }

        // Listener per la razza
        const raceInput = document.getElementById("char-race");
        if (raceInput) {
            raceInput.addEventListener("input", e => {
                this.char.race = e.target.value;
                this.char.save();
            });
        }

        // Listener per l'allineamento
        const alignInput = document.getElementById("char-align");
        if (alignInput) {
            alignInput.addEventListener("input", e => {
                this.char.alignment = e.target.value;
                this.char.save();
            });
        }

        // Listener per le note
        const notesInput = document.getElementById("char-notes");
        if (notesInput) {
            notesInput.addEventListener("input", e => {
                this.char.notes = e.target.value;
                this.char.save();
            });
        }

        // Listener per i bottoni di gestione livello
        this.attachLevelListeners();
    },

    // Listener per i bottoni di gestione livello
    attachLevelListeners: function() {
        // Listener Level Up
        const levelUpBtn = document.getElementById('level-up-btn');
        if (levelUpBtn) {
            levelUpBtn.addEventListener('click', () => {
                const oldLevel = this.char.level;
                
                if (this.char.levelUp()) {
                    // Successo
                    
                    // Aggiorna il valore nel display
                    const levelDisplay = document.querySelector('.level-number-display');
                    if (levelDisplay) {
                        levelDisplay.textContent = this.char.level;
                    }
                    
                    // Aggiorna stato bottoni
                    const levelDownBtn = document.getElementById('level-down-btn');
                    if (levelDownBtn) levelDownBtn.disabled = this.char.level <= 1;
                    if (levelUpBtn) levelUpBtn.disabled = this.char.level >= 20;
                    
                    // Ri-renderizza per aggiornare tutto
                    this.renderCharacterSlots();
                    this.renderClassResources();
                    this.renderStats(); // Aggiorna CD e ATK
                    this.renderSlots(); // Aggiorna gli slot nell'header
                    
                    // Aggiorna trucchetti
                    const cantripsSpan = document.getElementById('char-cantrips');
                    if (cantripsSpan && this.char.maxCantrips) {
                        cantripsSpan.textContent = this.char.maxCantrips();
                    }
                    
                    this.showNotification(`🎉 Congratulazioni! Sei avanzato al livello ${this.char.level}!`);
                    
                    // Mostra cosa è cambiato
                    const newSlots = this.char.slots;
                    let changes = [];
                    
                    for (let lvl = 1; lvl <= 9; lvl++) {
                        if (newSlots[lvl]?.max > 0) {
                            changes.push(`Liv. ${lvl}: ${newSlots[lvl].max} slot`);
                        }
                    }
                    
                    if (changes.length > 0) {
                        console.log(`📊 Nuovi slot: ${changes.join(', ')}`);
                    }
                } else {
                    this.showNotification('⚠️ Livello massimo raggiunto (20)');
                }
            });
        }

        // Listener Level Down
        const levelDownBtn = document.getElementById('level-down-btn');
        if (levelDownBtn) {
            levelDownBtn.addEventListener('click', () => {
                if (confirm('⚠️ Sei sicuro di voler ridurre il livello? Questa azione modificherà i tuoi slot incantesimi e risorse di classe.')) {
                    if (this.char.levelDown()) {
                        // Successo
                        
                        // Aggiorna il valore nel display
                        const levelDisplay = document.querySelector('.level-number-display');
                        if (levelDisplay) {
                            levelDisplay.textContent = this.char.level;
                        }
                        
                        // Aggiorna stato bottoni
                        const levelUpBtn = document.getElementById('level-up-btn');
                        if (levelDownBtn) levelDownBtn.disabled = this.char.level <= 1;
                        if (levelUpBtn) levelUpBtn.disabled = this.char.level >= 20;
                        
                        this.renderCharacterSlots();
                        this.renderClassResources();
                        this.renderStats();
                        this.renderSlots();
                        
                        // Aggiorna trucchetti
                        const cantripsSpan = document.getElementById('char-cantrips');
                        if (cantripsSpan && this.char.maxCantrips) {
                            cantripsSpan.textContent = this.char.maxCantrips();
                        }
                        
                        this.showNotification(`↩️ Livello ridotto a ${this.char.level}`);
                    } else {
                        this.showNotification('⚠️ Livello minimo raggiunto (1)');
                    }
                }
            });
        }
    },

    attachExportImportListeners: function() {
        // Listener per il pulsante Export
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                try {
                    // Genera filename con nome personaggio e data
                    const safeName = this.char.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    const today = new Date().toISOString().split('T')[0];
                    const filename = `${safeName}_${today}.json`;
                    
                    // Chiama il metodo statico di download
                    Character.downloadJSON(this.char, filename);
                    
                    // Mostra notifica di successo
                    this.showNotification('✅ Personaggio esportato con successo!', 'success');
                } catch (error) {
                    console.error('Errore export:', error);
                    this.showNotification('❌ Errore durante l\'export', 'error');
                }
            });
        }

        // Listener per il pulsante Import
        const importBtn = document.getElementById('import-btn');
        const importFile = document.getElementById('import-file');
        
        if (importBtn && importFile) {
            importBtn.addEventListener('click', () => {
                // Simula click sull'input file nascosto
                importFile.click();
            });
            
            importFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        // Tenta di importare il personaggio
                        const importedChar = Character.importFromJSON(event.target.result);
                        
                        if (importedChar) {
                            // Chiedi conferma all'utente
                            if (confirm(`Importare il personaggio "${importedChar.name}"? Questo sovrascriverà il personaggio corrente.`)) {
                                // Sostituisci il personaggio corrente
                                this.char = importedChar;
                                this.char.save();
                                
                                // Aggiorna tutta l'interfaccia
                                this.refresh();
                                
                                // Se siamo nel tab personaggio, aggiorna la vista
                                const active = document.querySelector('.tab-btn.active')?.dataset.tab;
                                if (active === 'character') {
                                    this.renderCharacterSheet();
                                }
                                
                                this.showNotification(`✅ Personaggio "${importedChar.name}" importato!`, 'success');
                            }
                        } else {
                            this.showNotification('❌ File JSON non valido', 'error');
                        }
                    } catch (error) {
                        console.error('Errore import:', error);
                        this.showNotification('❌ Errore durante l\'import', 'error');
                    }
                    
                    // Resetta l'input file
                    importFile.value = '';
                };
                
                reader.readAsText(file);
            });
        }
    },

    updateSpellStats: function() {
        // Aggiorna CD e ATK nell'header
        this.renderStats();
        
        const primaryKey = Character.getPrimaryStatForClass(this.char.class);
        const primaryMod = Character.getModifier(this.char.stats[primaryKey] || 10);

        const cdSpan = document.getElementById('char-cd');
        const atkSpan = document.getElementById('char-atk');
        const profSpan = document.getElementById('char-prof');
        const initSpan = document.getElementById('char-init');
        const primarySpan = document.getElementById('char-primary');
        const cantripsSpan = document.getElementById('char-cantrips');

        if (cdSpan) {
            cdSpan.textContent = Character.spellSaveDC(this.char.level, primaryMod);
        }
        if (atkSpan) {
            atkSpan.textContent = '+' + Character.spellAttackBonus(this.char.level, primaryMod);
        }
        if (profSpan) {
            profSpan.textContent = '+' + Character.getProficiencyBonus(this.char.level);
        }
        if (initSpan) {
            const desMod = Character.getModifier(this.char.stats.des);
            initSpan.textContent = `${desMod >= 0 ? '+' : ''}${desMod}`;
        }
        if (primarySpan) {
            const map = { for:'FOR', des:'DES', cos:'COS', int:'INT', sag:'SAG', cha:'CAR' };
            primarySpan.textContent = map[primaryKey] || 'INT';
        }
        if (cantripsSpan && this.char.maxCantrips) {
            cantripsSpan.textContent = this.char.maxCantrips();
        }
    },

    renderSlotDots: function(max, available) {
        let dots = '';
        for (let i = 0; i < max; i++) {
            const filled = i < available;
            dots += `<div class="slot-dot ${filled ? 'available' : 'used'}"></div>`;
        }
        return dots;
    },

    renderSlots: function() {
        const container = document.getElementById('slot-tracker');
        if (!container) return;

        let html = '';
        for (let lvl = 1; lvl <= 9; lvl++) {
            const slot = this.char.slots[lvl];
            if (!slot || slot.max === 0) continue;

            let orbs = '';
            for (let i = 0; i < slot.max; i++) {
                const charged = i < (slot.max - slot.used);
                orbs += `<div class="orb ${charged ? 'charged' : ''}"></div>`;
            }

            html += `
                <div class="slot-row">
                    <span class="lvl-label">Liv. ${lvl}</span>
                    <div class="orb-container">${orbs}</div>
                </div>
            `;
        }
        container.innerHTML = html;

        // Aggiungi pulsazione agli orbs appena aggiornati
        setTimeout(() => {
            document.querySelectorAll('.orb').forEach(o => {
                o.classList.add('pulse');
                setTimeout(() => o.classList.remove('pulse'), 600);
            });
        }, 10);
    },

    renderCombatList: function() {
        const view = document.getElementById('main-view');
        
        const prepared = this.char.preparedSpells
            .map(id => Database.getSpellById(id))
            .filter(s => s != null);

        view.innerHTML = `
            <div class="combat-list">
                ${prepared.length > 0 
                    ? prepared.map(s => this.createSpellCard(s, 'combat')).join('')
                    : '<div class="empty-state">✨ Nessuna magia preparata</div>'
                }
            </div>
        `;

        this.attachCombatListeners();
    },

    attachCombatListeners: function() {
        document.querySelectorAll('.cast-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = btn.closest('.spell-card');
                const spellId = card?.dataset.spellId;
                const spell = Database.getSpellById(spellId);
                if (!spell) return;

                // I trucchetti non consumano slot
                if (spell.livello === 0) {
                    this.showNotification(`✨ ${spell.nome} lanciato!`);
                    return;
                }

                // Trova gli slot disponibili >= livello dell'incantesimo
                const available = [];
                for (let lvl = spell.livello; lvl <= 9; lvl++) {
                    const slot = this.char.slots[lvl];
                    if (slot && slot.used < slot.max) {
                        available.push(lvl);
                    }
                }

                if (available.length === 0) {
                    this.showNotification(`❌ Nessuno slot disponibile per ${spell.nome}!`, 'error');
                    return;
                }

                // Se c'è un solo livello disponibile, usalo direttamente
                if (available.length === 1) {
                    this._castWithSlot(spell, available[0]);
                    return;
                }

                // Altrimenti mostra il selettore di slot
                this._showSlotPicker(spell, available);
            });
        });
    },

    _castWithSlot: function(spell, slotLevel) {
        if (this.char.useSlot(slotLevel)) {
            const upcasted = slotLevel > spell.livello ? ` (potenziato al Liv. ${slotLevel})` : '';
            this.showNotification(`⚡ ${spell.nome} lanciato con slot Liv. ${slotLevel}${upcasted}!`);
            this.renderSlots();         // Aggiorna tracker header
            this.renderCombatList();    // Aggiorna la lista (riflette slot rimasti)
        }
    },

    _showSlotPicker: function(spell, available) {
        // Rimuovi un picker eventualmente già aperto
        document.getElementById('slot-picker-overlay')?.remove();

        const options = available.map(lvl => {
            const slot = this.char.slots[lvl];
            const remaining = slot.max - slot.used;
            const upcasted = lvl > spell.livello ? ' ⬆️' : '';
            return `<button class="slot-pick-btn" data-level="${lvl}">
                        Liv. ${lvl}${upcasted} <span class="slot-pick-count">(${remaining} rimasti)</span>
                    </button>`;
        }).join('');

        const overlay = document.createElement('div');
        overlay.id = 'slot-picker-overlay';
        overlay.className = 'slot-picker-overlay';
        overlay.innerHTML = `
            <div class="slot-picker-modal">
                <h4>⚡ ${spell.nome}</h4>
                <p>Scegli il livello dello slot:</p>
                <div class="slot-pick-options">${options}</div>
                <button class="slot-pick-cancel">Annulla</button>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelectorAll('.slot-pick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const level = parseInt(btn.dataset.level);
                overlay.remove();
                this._castWithSlot(spell, level);
            });
        });

        overlay.querySelector('.slot-pick-cancel').addEventListener('click', () => overlay.remove());
        // Click fuori dalla modal chiude il picker
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    },

    // renderArchive con filtro classe
    renderArchive: function() {
        try {
            const view = document.getElementById('main-view');
            
            // HTML filtri semplificato (COMPATTO, nella vista)
            const filtersHTML = `
                <div class="archive-filters-compact">
                    <div class="filter-row">
                        <div class="filter-group-inline">
                            <label>📊 Livelli</label>
                            <div class="level-checkboxes">
                                ${[0,1,2,3,4,5,6,7,8,9].map(lvl => `
                                    <label class="level-checkbox">
                                        <input type="checkbox" value="${lvl}" 
                                            ${this.filters.levels.includes(lvl) ? 'checked' : ''}
                                            data-filter="level">
                                        <span>${lvl === 0 ? 'T' : lvl}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="filter-group-inline filter-class-wide">
                            <label>🧙 Classe</label>
                            <select id="filter-casterClass">
                                <option value="all">Tutte le Classi</option>
                                <option value="Mago" ${this.filters.casterClass === 'Mago' ? 'selected' : ''}>Mago</option>
                                <option value="Stregone" ${this.filters.casterClass === 'Stregone' ? 'selected' : ''}>Stregone</option>
                                <option value="Chierico" ${this.filters.casterClass === 'Chierico' ? 'selected' : ''}>Chierico</option>
                                <option value="Druido" ${this.filters.casterClass === 'Druido' ? 'selected' : ''}>Druido</option>
                                <option value="Bardo" ${this.filters.casterClass === 'Bardo' ? 'selected' : ''}>Bardo</option>
                                <option value="Warlock" ${this.filters.casterClass === 'Warlock' ? 'selected' : ''}>Warlock</option>
                                <option value="Paladino" ${this.filters.casterClass === 'Paladino' ? 'selected' : ''}>Paladino</option>
                                <option value="Ranger" ${this.filters.casterClass === 'Ranger' ? 'selected' : ''}>Ranger</option>
                                <option value="Artificiere" ${this.filters.casterClass === 'Artificiere' ? 'selected' : ''}>Artificiere</option>
                            </select>
                        </div>
                        
                        <button id="clear-filters" class="clear-filters-btn">🔄 Reset</button>
                    </div>
                </div>
            `;

            // Applica i filtri
            let filteredSpells = Database.allSpells.filter(spell => {
                // Filtro livelli (multi-selezione)
                if (this.filters.levels.length > 0) {
                    if (!this.filters.levels.includes(spell.livello)) {
                        return false;
                    }
                }
                
                // Filtro classe lanciatore con case-insensitive
                if (this.filters.casterClass !== 'all') {
                    if (!spell.lanciatori) {
                        console.warn('⚠️ Incantesimo senza lanciatori:', spell.nome);
                        return false;
                    }
                    
                    // Converti tutto in minuscolo per confronto sicuro
                    const casterClassLower = this.filters.casterClass.toLowerCase();
                    const lanciatoriLower = spell.lanciatori.map(l => l.toLowerCase());
                    
                    if (!lanciatoriLower.includes(casterClassLower)) {
                        return false;
                    }
                }
                
                // Filtro ricerca testuale
                if (this.filters.searchText.trim() !== '') {
                    const searchLower = this.filters.searchText.toLowerCase();
                    const nameMatch = spell.nome.toLowerCase().includes(searchLower);
                    const descMatch = spell.descrizione && spell.descrizione.toLowerCase().includes(searchLower);
                    
                    if (!nameMatch && !descMatch) {
                        return false;
                    }
                }
                
                return true;
            });

            // Ordina per livello e nome
            filteredSpells.sort((a, b) => {
                if (a.livello !== b.livello) return a.livello - b.livello;
                return a.nome.localeCompare(b.nome);
            });

            // Raggruppa per livello
            const byLevel = {};
            for (let i = 0; i <= 9; i++) byLevel[i] = [];
            
            filteredSpells.forEach(spell => {
                const level = parseInt(spell.livello);
                if (level >= 0 && level <= 9 && byLevel[level]) {
                    byLevel[level].push(spell);
                }
            });

            // Costruisci l'HTML dell'archivio
            let archiveHTML = filtersHTML;
            
            // Aggiungi il layout principale
            archiveHTML += `<div class="archive-layout">`;
            
            // Lista incantesimi
            archiveHTML += `<div class="spell-list">`;
            
            if (filteredSpells.length === 0) {
                archiveHTML += '<div class="empty-state">🔮 Nessun incantesimo trovato</div>';
            } else {
                // Mostra gli incantesimi raggruppati per livello
                for (let lvl = 0; lvl <= 9; lvl++) {
                    if (byLevel[lvl].length === 0) continue;
                    
                    archiveHTML += `
                        <div class="level-group">
                            <h4 class="level-header">${lvl === 0 ? '🎭 Trucchetti' : `Livello ${lvl}`}</h4>
                            ${byLevel[lvl].map(s => this.createSpellCard(s, 'archive')).join('')}
                        </div>
                    `;
                }
            }
            
            archiveHTML += `</div>`; // Chiudi spell-list
            
            // Pannello informazioni (MODIFICATO: contatore informativo senza limite)
            archiveHTML += `
                <div class="class-filter-panel">
                    <div class="filter-stats">
                        <span class="result-count">📊 ${filteredSpells.length} incantesimi</span>
                        <span class="prepared-count">⭐ ${this.char.preparedSpells.length} preparati</span>
                    </div>
                </div>
            `;
            
            archiveHTML += `</div>`; // Chiudi archive-layout
            
            view.innerHTML = archiveHTML;
            
            this.attachArchiveListeners();
            
        } catch (error) {
            console.error('❌ Errore in renderArchive:', error);
            document.getElementById('main-view').innerHTML = `
                <div class="error-state">
                    <h3>❌ Errore nel caricamento dell'archivio</h3>
                    <p>${error.message}</p>
                    <button onclick="UI.refresh()">🔄 Riprova</button>
                </div>
            `;
        }
    },

    // MODIFICATO: createSpellCard con supporto multi-caratteristica
    createSpellCard: function(spell, mode) {
        const prepared = this.char.preparedSpells.includes(spell.id);
        const badge = spell.livello === 0 
            ? '<span class="badge-cantrip">🎭 Trucchetto</span>'
            : `<span class="badge-level">Liv. ${spell.livello}</span>`;

        // Aggiungi indicatori delle classi se disponibili
        const classIndicators = spell.lanciatori 
            ? `<div class="spell-classes">${spell.lanciatori.map(c => `🏷️ ${c}`).join(' ')}</div>`
            : '';

        // Icone per componenti, concentrazione e rituale
        const metaIcons = [];
        if (spell.componenti) {
            if (spell.componenti.includes('V')) metaIcons.push('🗣️');
            if (spell.componenti.includes('S')) metaIcons.push('🤲');
            if (spell.componenti.includes('M')) metaIcons.push('🧪');
        }
        if (spell.concentrazione) metaIcons.push('🎯');
        if (spell.rituale) metaIcons.push('📿');
        
        const metaIconsHTML = metaIcons.length > 0 
            ? `<div class="spell-meta-icons">${metaIcons.join(' ')}</div>` 
            : '';

        // NUOVO: Calcola le statistiche specifiche per questo incantesimo
        const spellStats = this.getSpellStats(spell.id);
        let statsHTML = '';
        
        if (spellStats) {
            const overrideClass = spellStats.source === 'manuale' ? 'ability-override' : '';
            statsHTML = `
                <div class="spell-stats ${overrideClass}" title="Basato su ${spellStats.abilityName} (${spellStats.abilityAbbr} ${spellStats.abilityMod >= 0 ? '+' : ''}${spellStats.abilityMod})">
                    <span class="stat-pill">CD ${spellStats.saveDC}</span>
                    <span class="stat-pill">ATT +${spellStats.attackBonus}</span>
                    <span class="stat-pill ability-pill" data-spell="${spell.id}">
                        ${spellStats.abilityAbbr} ${spellStats.abilityMod >= 0 ? '+' : ''}${spellStats.abilityMod}
                        ${spellStats.source === 'manuale' ? ' ✏️' : ''}
                    </span>
                </div>
            `;
        }

        let button = '';
        if (mode === 'combat') {
            button = `<button class="cast-btn">⚡ Lancia</button>`;
        } else {
            const star = prepared ? '⭐' : '☆';
            // Aggiungi il selettore di caratteristica solo in modalità archivio
            const currentAbility = this.char.spellAbilityOverrides?.[spell.id]?.ability || '';
            const abilitySelector = this.renderAbilitySelector(spell.id, currentAbility);
            
            button = `
                <div class="spell-actions">
                    <button class="star-btn ${prepared ? 'active' : ''}" data-spell-id="${spell.id}">${star}</button>
                    ${abilitySelector}
                </div>
            `;
        }

        return `
            <div class="spell-card" data-spell-id="${spell.id}">
                <div class="spell-header" onclick="UI.toggleCard(this)">
                    <div class="spell-title">
                        <h3>${spell.nome}</h3>
                        ${badge}
                    </div>
                    <div class="spell-meta">
                        <span>⏱️ ${spell.tempoLancio || 'Azione'}</span>
                        <span>🎯 ${spell.gittata || 'Contatto'}</span>
                    </div>
                    ${classIndicators}
                    ${metaIconsHTML}
                    ${statsHTML}
                </div>
                <div class="spell-body" style="display: none;">
                    <div class="description">${spell.descrizione}</div>
                    <div class="spell-footer">
                        <span class="spell-school">🏛️ ${spell.scuola}</span>
                        ${button}
                    </div>
                </div>
            </div>
        `;
    },

    toggleCard: function(header) {
        const body = header.nextElementSibling;
        const hidden = body.style.display === 'none';
        body.style.display = hidden ? 'block' : 'none';
    },

    _attachStarListener: function(btn) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const spellId = btn.dataset.spellId;
            if (!spellId) return;
            const isPrepared = this.char.preparedSpells.includes(spellId);
            if (isPrepared) {
                this.char.unprepareSpell(spellId);
                this.showNotification('📖 Incantesimo rimosso dal Lancio');
            } else {
                this.char.prepareSpell(spellId);
                this.showNotification('✨ Incantesimo aggiunto al Lancio!');
            }
            const newStar = this.char.preparedSpells.includes(spellId) ? '⭐' : '☆';
            btn.textContent = newStar;
            btn.classList.toggle('active', this.char.preparedSpells.includes(spellId));
            const preparedCount = document.querySelector('.prepared-count');
            if (preparedCount) preparedCount.textContent = `⭐ ${this.char.preparedSpells.length} preparati`;
        });
    },

    _attachAbilityListener: function(select) {
        select.addEventListener('change', (e) => {
            e.stopPropagation();
            const spellId = select.dataset.spell;
            const ability = select.value || null;
            this.setSpellAbility(spellId, ability, 'manuale');
            const card = select.closest('.spell-card');
            if (card) {
                const spell = Database.getSpellById(spellId);
                if (spell) {
                    const newCardHTML = this.createSpellCard(spell, 'archive');
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = newCardHTML;
                    const newCard = tempDiv.firstChild;
                    card.parentNode.replaceChild(newCard, card);
                    const newStarBtn = newCard.querySelector('.star-btn');
                    if (newStarBtn) this._attachStarListener(newStarBtn);
                    const newAbilitySelect = newCard.querySelector('.ability-select');
                    if (newAbilitySelect) this._attachAbilityListener(newAbilitySelect);
                }
            }
            this.showNotification(ability ?
                `✨ Incantesimo ora usa ${this.statFull[ability]}` :
                '↩️ Incantesimo torna alla caratteristica di classe');
        });
    },

    attachArchiveListeners: function() {
        // Listener checkbox livelli
        document.querySelectorAll('[data-filter="level"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const level = parseInt(e.target.value);
                if (e.target.checked) {
                    if (!this.filters.levels.includes(level)) {
                        this.filters.levels.push(level);
                    }
                } else {
                    this.filters.levels = this.filters.levels.filter(l => l !== level);
                }
                this.renderArchive();
            });
        });
        
        // Listener classe
        document.getElementById('filter-casterClass')?.addEventListener('change', (e) => {
            this.filters.casterClass = e.target.value;
            this.renderArchive();
        });
        
        // Listener reset
        document.getElementById('clear-filters')?.addEventListener('click', () => {
            this.filters.levels = [];
            this.filters.casterClass = 'all';
            this.filters.searchText = ''; // Resetta anche il testo di ricerca
            this.renderArchive();
            
            // Aggiorna anche il campo di ricerca nella tab-nav
            const searchInput = document.getElementById('global-search');
            if (searchInput) {
                searchInput.value = '';
            }
        });

        // Listener per i bottoni stella
        document.querySelectorAll('.star-btn').forEach(btn => this._attachStarListener(btn));

        // Listener per i selettori di caratteristica
        document.querySelectorAll('.ability-select').forEach(select => this._attachAbilityListener(select));
    },

    // Metodo per gestire la ricerca globale dalla tab-nav
    handleGlobalSearch: function(searchText) {
        // Aggiorna il filtro searchText
        this.filters.searchText = searchText;
        
        // Se la vista attuale è l'archivio, aggiorna
        const active = document.querySelector('.tab-btn.active')?.dataset.tab;
        if (active === 'archive') {
            this.renderArchive();
        }
    },

    showNotification: function(message, type = 'success') {
        const notif = document.createElement('div');
        notif.className = 'notification';
        notif.textContent = message;
        notif.style.background = type === 'success' ? 'var(--purple)' : 'var(--danger)';
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 2000);
    },

    renderStatsTab: function() {
        const view = document.getElementById('main-view');
        const saveDC = this.char.getSpellSaveDC();
        const attackBonus = this.char.getSpellAttackBonus();
        const totalPrepared = this.char.preparedSpells.length;
        const maxPreparable = this.char.maxPreparedSpells();

        let slotsHtml = '';
        for (let lvl = 1; lvl <= 9; lvl++) {
            const slot = this.char.slots[lvl];
            if (!slot || slot.max === 0) continue;
            let dots = '';
            for (let i = 0; i < slot.max; i++) {
                const used = i < slot.used;
                dots += `<div class="slot-dot ${used ? 'used' : 'available'}"></div>`;
            }
            slotsHtml += `
                <div class="slot-level-row">
                    <span class="slot-level">Liv. ${lvl}</span>
                    <div class="slot-indicator">${dots}</div>
                </div>
            `;
        }

        view.innerHTML = `
            <div class="stats-view">
                <div class="stats-card">
                    <h3>📊 Statistiche</h3>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-value">${saveDC}</div>
                            <div class="stat-label">CD</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">+${attackBonus}</div>
                            <div class="stat-label">ATT</div>
                        </div>
                    </div>
                </div>
                <div class="stats-card">
                    <h3>💫 Slot</h3>
                    <div class="slots-grid">${slotsHtml}</div>
                </div>
                <div class="stats-card">
                    <h3>📈 Preparazione</h3>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-value">${totalPrepared}</div>
                            <div class="stat-label">Preparate</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${maxPreparable}</div>
                            <div class="stat-label">Massimo</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    refresh: function() {
        this.renderStats();
        this.renderSlots();
        
        const active = document.querySelector('.tab-btn.active')?.dataset.tab;
        if (active === 'combat') this.renderCombatList();
        else if (active === 'archive') { this.renderArchive(); }
        else if (active === 'stats') { this.renderStatsTab(); }
        else if (active === 'character') { this.renderCharacterSheet(); }
    }
};