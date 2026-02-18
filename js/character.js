// character.js - Modello personaggio D&D 5e come classe
// Versione 3.1.0 - Slot dinamici con bonus personalizzabili

class Character {
    constructor(name = 'Merlin', level = 1, stats = { int: 16 }) {
        this.name = name;
        this.level = level;
        this.stats = {
            for: stats.for || 10,
            des: stats.des || 10,
            cos: stats.cos || 10,
            int: stats.int || 16,
            sag: stats.sag || 10,
            cha: stats.cha || 10
        };
        this.preparedSpells = [];
        this.favoriteSpells = [];
        this.class = 'Mago';
        this.race = '';
        this.alignment = '';
        this.notes = '';
        this.resources = {}; // Risorse di classe specifiche
        this.bonusCantrips = 0; // Trucchetti bonus da talenti/razze
        
        // NUOVO: Bonus personalizzati per gli slot (da talenti, razze, ecc.)
        this.customSlotBonus = {
            1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0
        };
        
        // NUOVO: Flag per modalità manuale (override completo)
        this.manualSlotMode = false;
        this.manualSlots = {
            1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0
        };
        
        this._version = '3.1.0';
        
        // Determina il tipo di incantatore in base alla classe
        this.type = Character.classType[this.class] || 'full';
        
        // Inizializza gli slot basandosi sulla tabella
        this.slots = {};
        this.updateSlots();
        
        // Inizializza le risorse di classe specifiche
        this.initClassResources();
    }

    // Aggiorna gli slot in base al livello e alla classe
    updateSlots() {
        // Determina il tipo di incantatore in base alla classe
        const type = Character.classType[this.class] || 'full';
        this.type = type; // Aggiorna il tipo corrente
        
        // Ottieni la tabella base per questo tipo di incantatore al livello corrente
        const baseTable = Character.slotTables[type]?.[this.level] || {};
        
        // Inizializza o aggiorna tutti gli slot
        for (let i = 1; i <= 9; i++) {
            // Calcola il massimo degli slot: base + bonus personalizzati
            let maxSlots;
            
            if (this.manualSlotMode) {
                // Modalità manuale: usa i valori impostati dall'utente
                maxSlots = this.manualSlots[i] || 0;
            } else {
                // Modalità automatica: base + bonus
                const baseSlots = baseTable[i] || 0;
                const bonusSlots = this.customSlotBonus[i] || 0;
                maxSlots = baseSlots + bonusSlots;
            }
            
            // Se il personaggio aveva già degli slot, mantieni quelli usati (ma non superare il nuovo max)
            if (this.slots && this.slots[i]) {
                this.slots[i].max = maxSlots;
                this.slots[i].used = Math.min(this.slots[i].used || 0, maxSlots);
            } else {
                // Altrimenti crea nuovi slot
                if (!this.slots) this.slots = {};
                this.slots[i] = {
                    max: maxSlots,
                    used: 0
                };
            }
        }
    }

    // Avanzamento di livello
    levelUp() {
        if (this.level >= 20) {
            console.warn('⚠️ Livello massimo raggiunto (20)');
            return false;
        }
        
        this.level++;
        
        // Ricalcola gli slot in base al nuovo livello
        this.updateSlots();
        
        // Ricalcola le risorse di classe
        this.initClassResources();
        
        this.save();
        console.log(`🎉 Avanzato al livello ${this.level}!`);
        return true;
    }

    // Retrocessione di livello (per correzioni)
    levelDown() {
        if (this.level <= 1) {
            console.warn('⚠️ Livello minimo raggiunto (1)');
            return false;
        }
        
        this.level--;
        
        // Ricalcola gli slot in base al nuovo livello
        this.updateSlots();
        
        // Ricalcola le risorse di classe
        this.initClassResources();
        
        this.save();
        console.log(`↩️ Retrocesso al livello ${this.level}`);
        return true;
    }

    // Inizializza le risorse in base alla classe
    initClassResources() {
        // Resetta le risorse
        this.resources = {};
        
        switch(this.class) {
            case 'Warlock':
                // Warlock - Slot a riposo breve + Invocazioni
                const pactSlots = Character.slotTables.warlock[this.level]?.[Math.min(5, Math.ceil(this.level/2))] || 1;
                this.resources.pactSlots = {
                    max: pactSlots,
                    current: pactSlots
                };
                this.resources.invocations = [];
                this.resources.mysticArcanum = [];
                break;
                
            case 'Stregone':
                // Stregone - Punti Stregoneria + Metamagie
                this.resources.sorceryPoints = {
                    max: this.level,
                    current: this.level
                };
                this.resources.metamagic = [];
                break;
                
            case 'Paladino':
            case 'Chierico':
                // Paladino/Chierico - Canale Divino
                this.resources.channelDivinity = {
                    max: this.getChannelDivinityMax(),
                    current: this.getChannelDivinityMax()
                };
                break;
                
            case 'Barbaro':
                // Barbaro - Ira
                this.resources.rage = {
                    max: this.getRageMax(),
                    current: this.getRageMax()
                };
                break;
                
            case 'Monaco':
                // Monaco - Ki
                this.resources.ki = {
                    max: this.level,
                    current: this.level
                };
                break;
                
            case 'Guerriero':
                // Guerriero - Punti Superiorità, Action Surge, Second Wind
                this.resources.actionSurge = {
                    max: this.getActionSurgeMax(),
                    current: this.getActionSurgeMax()
                };
                this.resources.secondWind = {
                    max: 1,
                    current: 1
                };
                // Punti Superiorità (disponibili dal 3° livello)
                if (this.level >= 3) {
                    this.resources.superiorityDice = {
                        max: this.getSuperiorityDiceMax(),
                        current: this.getSuperiorityDiceMax()
                    };
                }
                break;
                
            case 'Guerriero (Eldritch Knight)':
                // Eldritch Knight - Ha gli stessi di Guerriero + magia
                this.resources.actionSurge = {
                    max: this.getActionSurgeMax(),
                    current: this.getActionSurgeMax()
                };
                this.resources.secondWind = {
                    max: 1,
                    current: 1
                };
                break;
                
            case 'Artificiere':
                // Artificiere - Infusioni
                this.resources.infusions = {
                    max: this.getInfusionMax(),
                    current: this.getInfusionMax(),
                    known: []
                };
                break;
                
            case 'Ranger':
                // Ranger - Incantesimi conosciuti, Nemici Prescelti
                this.resources.knownSpells = {
                    max: this.getRangerSpellsKnown(),
                    current: this.getRangerSpellsKnown()
                };
                this.resources.favoredEnemy = [];
                this.resources.naturalExplorer = [];
                break;
                
            case 'Bardo':
                // Bardo - Ispirazione Bardica
                this.resources.bardicInspiration = {
                    max: this.getBardicInspirationMax(),
                    current: this.getBardicInspirationMax()
                };
                this.resources.magicalSecrets = [];
                break;
                
            case 'Druido':
                // Druido - Wild Shape
                this.resources.wildShape = {
                    max: this.getWildShapeMax(),
                    current: this.getWildShapeMax()
                };
                break;
                
            default:
                // Mago e altre classi senza risorse speciali
                this.resources = {};
        }
    }

    // Metodi helper per calcoli delle risorse
    getChannelDivinityMax() {
        return Math.floor(this.level / 6) + 1; // 1 (1-5), 2 (6-11), 3 (12-17), 4 (18-20)
    }

    getRageMax() {
        return 2 + Math.floor((this.level - 1) / 4); // 2 (1-4), 3 (5-8), 4 (9-12), 5 (13-16), 6 (17-20)
    }

    getActionSurgeMax() {
        return this.level >= 17 ? 2 : 1;
    }

    getSuperiorityDiceMax() {
        return Math.min(6, Math.floor((this.level - 1) / 3) + 1); // 4 (3-4), 5 (5-6), 6 (7-20)
    }

    getInfusionMax() {
        return Math.min(6, Math.floor((this.level + 3) / 4)); // 2 (2), 3 (6), 4 (10), 5 (14), 6 (18)
    }

    getRangerSpellsKnown() {
        return Math.min(11, Math.floor((this.level + 1) / 2) + 1); // Semplificato: ~2 + livello/2
    }

    getBardicInspirationMax() {
        return Math.max(1, this.getPrimaryMod()); // Modificatore CAR, minimo 1
    }

    getWildShapeMax() {
        return Math.floor(this.level / 4) + 1; // 1 (2-3), 2 (4-7), 3 (8-11), 4 (12-15), 5 (16-19), 6 (20)
    }

    // Metodi statici di utilità
    static getModifier(score) {
        return Math.floor((score - 10) / 2);
    }

    static getProficiencyBonus(level) {
        return Math.floor((level + 7) / 4); // Formula: 2 (1-4), 3 (5-8), 4 (9-12), 5 (13-16), 6 (17-20)
    }

    static proficiencyBonus(level) {
        return Character.getProficiencyBonus(level);
    }

    static spellSaveDC(level, mod) {
        return 8 + Character.getProficiencyBonus(level) + mod;
    }

    static spellAttackBonus(level, mod) {
        return Character.getProficiencyBonus(level) + mod;
    }

    // Metodo per ottenere la caratteristica primaria in base alla classe
    static getPrimaryStatForClass(cls) {
        return Character.primaryStatByClass[cls] || 'int';
    }

    // === METODI TRUCCHETTI ===
    
    /**
     * Ottiene il numero massimo di trucchetti conosciuti in base a classe e livello
     * @returns {number} Numero di trucchetti massimi
     */
    maxCantrips() {
        const table = Character.cantripTables[this.class];
        if (!table) return 0;
        return (table[this.level - 1] || 0) + (this.bonusCantrips || 0);
    }

    /**
     * Aggiunge un trucchetto bonus (da razza/talento)
     * @param {number} amount - Numero di trucchetti bonus da aggiungere
     */
    addBonusCantrips(amount = 1) {
        this.bonusCantrips += amount;
        this.save();
    }

    /**
     * Rimuove trucchetti bonus
     * @param {number} amount - Numero di trucchetti bonus da rimuovere
     */
    removeBonusCantrips(amount = 1) {
        this.bonusCantrips = Math.max(0, this.bonusCantrips - amount);
        this.save();
    }

    // === METODI PER GESTIONE SLOT DINAMICI ===
    
    /**
     * Aggiunge un bonus slot personalizzato per un livello specifico
     * @param {number} level - Livello dell'incantesimo (1-9)
     * @param {number} bonus - Numero di slot bonus da aggiungere
     */
    addSlotBonus(level, bonus = 1) {
        if (level < 1 || level > 9) return false;
        this.customSlotBonus[level] = (this.customSlotBonus[level] || 0) + bonus;
        this.updateSlots(); // Ricalcola gli slot con il nuovo bonus
        this.save();
        return true;
    }

    /**
     * Rimuove un bonus slot personalizzato
     * @param {number} level - Livello dell'incantesimo (1-9)
     * @param {number} bonus - Numero di slot bonus da rimuovere
     */
    removeSlotBonus(level, bonus = 1) {
        if (level < 1 || level > 9) return false;
        this.customSlotBonus[level] = Math.max(0, (this.customSlotBonus[level] || 0) - bonus);
        this.updateSlots(); // Ricalcola gli slot dopo la rimozione
        this.save();
        return true;
    }

    /**
     * Imposta un bonus slot personalizzato esatto per un livello
     * @param {number} level - Livello dell'incantesimo (1-9)
     * @param {number} bonus - Valore esatto del bonus
     */
    setSlotBonus(level, bonus) {
        if (level < 1 || level > 9) return false;
        this.customSlotBonus[level] = Math.max(0, bonus);
        this.updateSlots();
        this.save();
        return true;
    }

    /**
     * Attiva la modalità manuale per gli slot
     * @param {boolean} enabled - true per manuale, false per automatico
     */
    setManualMode(enabled) {
        this.manualSlotMode = enabled;
        if (enabled) {
            // Inizializza i manualSlots con i valori attuali
            for (let i = 1; i <= 9; i++) {
                this.manualSlots[i] = this.slots[i]?.max || 0;
            }
        }
        this.updateSlots();
        this.save();
    }

    /**
     * Imposta manualmente il numero di slot per un livello
     * @param {number} level - Livello dell'incantesimo (1-9)
     * @param {number} count - Numero di slot
     */
    setManualSlot(level, count) {
        if (level < 1 || level > 9) return false;
        if (!this.manualSlotMode) {
            console.warn('⚠️ Attiva prima la modalità manuale con setManualMode(true)');
            return false;
        }
        this.manualSlots[level] = Math.max(0, count);
        this.updateSlots();
        this.save();
        return true;
    }

    /**
     * Ottiene il numero base di slot per un livello (senza bonus)
     * @param {number} level - Livello dell'incantesimo (1-9)
     * @returns {number} Slot base
     */
    getBaseSlots(level) {
        const table = Character.slotTables[this.type]?.[this.level] || {};
        return table[level] || 0;
    }

    /**
     * Ottiene il bonus slot per un livello
     * @param {number} level - Livello dell'incantesimo (1-9)
     * @returns {number} Bonus slot
     */
    getSlotBonus(level) {
        return this.customSlotBonus[level] || 0;
    }

    /**
     * Ottiene la ripartizione dettagliata degli slot per debug
     * @returns {Object} Dettaglio slot per livello
     */
    getSlotBreakdown() {
        const breakdown = {};
        for (let i = 1; i <= 9; i++) {
            if (this.manualSlotMode) {
                breakdown[i] = {
                    source: 'manual',
                    total: this.manualSlots[i] || 0,
                    manual: this.manualSlots[i] || 0
                };
            } else {
                const base = this.getBaseSlots(i);
                const bonus = this.customSlotBonus[i] || 0;
                breakdown[i] = {
                    source: 'auto',
                    base: base,
                    bonus: bonus,
                    total: base + bonus
                };
            }
        }
        return breakdown;
    }

    // Metodi di istanza
    getPrimaryMod() {
        const key = Character.getPrimaryStatForClass(this.class);
        const score = this.stats[key] || 10;
        return Character.getModifier(score);
    }

    getIntMod() {
        return Character.getModifier(this.stats.int);
    }

    getSpellSaveDC() {
        return Character.spellSaveDC(this.level, this.getPrimaryMod());
    }

    getSpellAttackBonus() {
        return Character.spellAttackBonus(this.level, this.getPrimaryMod());
    }

    /**
     * Calcola il numero massimo teorico di incantesimi preparati secondo le regole base
     * ⚠️ NOTA: Questo è SOLO informativo, non viene più usato per bloccare l'aggiunta
     * @returns {number} Numero massimo secondo le regole base
     */
    maxPreparedSpells() {
        return Math.max(1, this.level + this.getPrimaryMod());
    }

    /**
     * Aggiunge un incantesimo ai preparati
     * ⚠️ MODIFICATO: Rimossa la limitazione numerica per massima flessibilità
     * @param {string} spellId - ID dell'incantesimo da preparare
     * @returns {boolean} true se aggiunto, false se già presente
     */
    prepareSpell(spellId) {
        // Controlla solo se l'incantesimo è già preparato, non il limite numerico
        if (this.preparedSpells.includes(spellId)) return false;
        
        // COMMENTATO: Rimossa la limitazione del numero massimo
        // if (this.preparedSpells.length >= this.maxPreparedSpells()) return false;
        
        this.preparedSpells.push(spellId);
        this.save();
        return true;
    }

    unprepareSpell(spellId) {
        const index = this.preparedSpells.indexOf(spellId);
        if (index === -1) return false;
        this.preparedSpells.splice(index, 1);
        this.save();
        return true;
    }

    toggleFavorite(spellId) {
        const index = this.favoriteSpells.indexOf(spellId);
        if (index === -1) {
            this.favoriteSpells.push(spellId);
            this.save();
            return true; // Aggiunto ai preferiti
        } else {
            this.favoriteSpells.splice(index, 1);
            this.save();
            return false; // Rimosso dai preferiti
        }
    }

    isFavorite(spellId) {
        return this.favoriteSpells.includes(spellId);
    }

    isPrepared(spellId) {
        return this.preparedSpells.includes(spellId);
    }

    useSlot(level) {
        if (!this.slots[level] || this.slots[level].used >= this.slots[level].max) return false;
        this.slots[level].used++;
        this.save();
        return true;
    }

    restoreSlot(level) {
        if (!this.slots[level] || this.slots[level].used <= 0) return false;
        this.slots[level].used--;
        this.save();
        return true;
    }

    // Metodi per le risorse di classe
    useResource(resourceName, amount = 1) {
        if (!this.resources[resourceName]) return false;
        if (this.resources[resourceName].current < amount) return false;
        this.resources[resourceName].current -= amount;
        this.save();
        return true;
    }

    restoreResource(resourceName, amount = 1) {
        if (!this.resources[resourceName]) return false;
        this.resources[resourceName].current = Math.min(
            this.resources[resourceName].max,
            (this.resources[resourceName].current || 0) + amount
        );
        this.save();
        return true;
    }

    // Metodo specifico per Warlock - recupera slot a riposo breve
    recoverPactSlots() {
        if (this.class === 'Warlock') {
            for (let i = 1; i <= 9; i++) {
                if (this.slots[i]) this.slots[i].used = 0;
            }
            this.save();
            return true;
        }
        return false;
    }

    // Aggiunge una metamagia allo Stregone
    addMetamagic(metamagic) {
        if (this.class === 'Stregone' && this.resources.metamagic) {
            if (!this.resources.metamagic.includes(metamagic)) {
                this.resources.metamagic.push(metamagic);
                this.save();
                return true;
            }
        }
        return false;
    }

    // Aggiunge un'infusione all'Artificiere
    addInfusion(infusion) {
        if (this.class === 'Artificiere' && this.resources.infusions) {
            if (!this.resources.infusions.known.includes(infusion)) {
                if (this.resources.infusions.known.length < this.resources.infusions.max) {
                    this.resources.infusions.known.push(infusion);
                    this.save();
                    return true;
                }
            }
        }
        return false;
    }

    // Aggiunge un'invocazione al Warlock
    addInvocation(invocation) {
        if (this.class === 'Warlock') {
            if (!this.resources.invocations.includes(invocation)) {
                this.resources.invocations.push(invocation);
                this.save();
                return true;
            }
        }
        return false;
    }

    resetResources() {
        this.initClassResources();
        this.save();
    }

    longRest() {
        // Recupera tutti gli slot (tranne Warlock che ha regole speciali)
        if (this.class !== 'Warlock') {
            for (let i = 1; i <= 9; i++) {
                if (this.slots[i]) this.slots[i].used = 0;
            }
        }
        this.resetResources();
        this.save();
        return true;
    }

    shortRest() {
        // Per classi come Warlock che recuperano slot a riposo breve
        if (this.class === 'Warlock') {
            this.recoverPactSlots();
        }
        // Per altre classi che recuperano risorse a riposo breve
        if (this.class === 'Monaco' || this.class === 'Bardo') {
            this.resetResources();
        }
        this.save();
        return true;
    }

    getAvailableSlots() {
        const available = {};
        for (let i = 1; i <= 9; i++) {
            available[i] = Math.max(0, (this.slots[i]?.max || 0) - (this.slots[i]?.used || 0));
        }
        return available;
    }

    hasAvailableSlot(level) {
        return this.slots[level] && this.slots[level].used < this.slots[level].max;
    }

    // Cambia classe e aggiorna tutto
    setClass(newClass) {
        this.class = newClass;
        this.type = Character.classType[newClass] || 'full';
        this.updateSlots(); // Ricalcola gli slot per la nuova classe
        this.initClassResources(); // Reinizializza le risorse
        this.save();
    }

    // Cambia livello e aggiorna tutto
    setLevel(newLevel) {
        this.level = newLevel;
        this.updateSlots(); // Ricalcola gli slot per il nuovo livello
        this.initClassResources(); // Reinizializza le risorse
        this.save();
    }

    // Persistenza
    save() {
        localStorage.setItem("character", JSON.stringify(this));
    }

    static load() {
        const raw = localStorage.getItem("character");
        if (!raw) return null;
        try {
            const data = JSON.parse(raw);
            return Character.fromObject(data);
        } catch (e) {
            console.error('Errore caricamento personaggio:', e);
            return null;
        }
    }

    // Metodo per ricreare un personaggio da un oggetto salvato
    static fromObject(data) {
        const char = new Character(data.name, data.level, data.stats);
        char.preparedSpells = data.preparedSpells || [];
        char.favoriteSpells = data.favoriteSpells || [];
        char.class = data.class || 'Mago';
        char.type = Character.classType[char.class] || 'full';
        char.race = data.race || '';
        char.alignment = data.alignment || '';
        char.notes = data.notes || '';
        char.bonusCantrips = data.bonusCantrips || 0;
        
        // Carica i bonus slot personalizzati
        char.customSlotBonus = data.customSlotBonus || {
            1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0
        };
        
        // Carica impostazioni modalità manuale
        char.manualSlotMode = data.manualSlotMode || false;
        char.manualSlots = data.manualSlots || {
            1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0
        };
        
        // Aggiorna slot in base a classe e livello
        char.updateSlots();
        
        // Recupera gli slot usati se presenti
        if (data.slots) {
            for (let i = 1; i <= 9; i++) {
                if (char.slots[i] && data.slots[i]) {
                    char.slots[i].used = Math.min(data.slots[i].used || 0, char.slots[i].max);
                }
            }
        }
        
        // Recupera le risorse
        char.resources = data.resources || {};
        
        // Recupera gli override di caratteristica per incantesimo
        char.spellAbilityOverrides = data.spellAbilityOverrides || {};
        
        return char;
    }

    // === METODI PER EXPORT/IMPORT ===
    
    /**
     * Esporta il personaggio in formato JSON
     * @returns {string} Stringa JSON formattata del personaggio
     */
    exportToJSON() {
        // Crea un oggetto con solo i dati necessari
        const exportData = {
            name: this.name,
            level: this.level,
            stats: { ...this.stats },
            class: this.class,
            race: this.race,
            alignment: this.alignment,
            preparedSpells: [...this.preparedSpells],
            favoriteSpells: [...this.favoriteSpells],
            slots: JSON.parse(JSON.stringify(this.slots)), // Clonazione profonda
            resources: JSON.parse(JSON.stringify(this.resources)),
            bonusCantrips: this.bonusCantrips,
            customSlotBonus: { ...this.customSlotBonus },
            manualSlotMode: this.manualSlotMode,
            manualSlots: { ...this.manualSlots },
            notes: this.notes,
            spellAbilityOverrides: JSON.parse(JSON.stringify(this.spellAbilityOverrides || {})),
            _version: this._version,
            _exportDate: new Date().toISOString()
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Importa un personaggio da una stringa JSON
     * @param {string} jsonString - Stringa JSON del personaggio
     * @returns {Character|null} Istanza Character o null se errore
     */
    static importFromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            // Validazione campi essenziali
            if (!data.name || typeof data.name !== 'string') {
                throw new Error('Nome personaggio mancante o non valido');
            }
            if (!data.level || typeof data.level !== 'number' || data.level < 1 || data.level > 20) {
                throw new Error('Livello mancante o non valido');
            }
            if (!data.stats || typeof data.stats !== 'object') {
                throw new Error('Statistiche mancanti o non valide');
            }
            
            // Verifica che tutte le statistiche esistano
            const requiredStats = ['for', 'des', 'cos', 'int', 'sag', 'cha'];
            for (const stat of requiredStats) {
                if (typeof data.stats[stat] !== 'number') {
                    throw new Error(`Statistica ${stat} mancante o non valida`);
                }
            }
            
            // Crea il personaggio
            const char = Character.fromObject(data);
            
            console.log(`✅ Personaggio importato con successo: ${char.name}`);
            return char;
            
        } catch (error) {
            console.error('❌ Errore importazione personaggio:', error.message);
            return null;
        }
    }

    /**
     * Scarica il personaggio come file JSON
     * @param {Character} character - Istanza Character da scaricare
     * @param {string} filename - Nome del file (opzionale)
     */
    static downloadJSON(character, filename = null) {
        if (!character || !(character instanceof Character)) {
            console.error('❌ Personaggio non valido per download');
            return;
        }
        
        // Genera nome file se non fornito
        if (!filename) {
            const safeName = character.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const today = new Date().toISOString().split('T')[0];
            filename = `${safeName}_${today}.json`;
        }
        
        try {
            // Ottieni il JSON
            const jsonString = character.exportToJSON();
            
            // Crea blob e URL
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Crea link temporaneo
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            
            // Simula click
            document.body.appendChild(link);
            link.click();
            
            // Pulizia
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);
            
            console.log(`✅ Personaggio esportato come: ${filename}`);
            
        } catch (error) {
            console.error('❌ Errore durante il download:', error.message);
        }
    }

    /**
     * Crea un backup completo del personaggio (inclusi dati aggiuntivi)
     * @returns {string} JSON con dati estesi
     */
    createBackup() {
        const backupData = {
            ...JSON.parse(this.exportToJSON()),
            _backupDate: new Date().toISOString(),
            _appVersion: this._version,
            _environment: navigator.userAgent
        };
        
        return JSON.stringify(backupData, null, 2);
    }
}

// Tabelle degli slot come proprietà statiche
Character.slotTables = {
    full: {     // Mago, Stregone, Chierico, Druido, Bardo
        1: {1:2}, 2: {1:3}, 3: {1:4,2:2}, 4: {1:4,2:3}, 5: {1:4,2:3,3:2},
        6: {1:4,2:3,3:3}, 7: {1:4,2:3,3:3,4:1}, 8: {1:4,2:3,3:3,4:2},
        9: {1:4,2:3,3:3,4:3,5:1}, 10: {1:4,2:3,3:3,4:3,5:2},
        11: {1:4,2:3,3:3,4:3,5:2,6:1}, 12: {1:4,2:3,3:3,4:3,5:2,6:1},
        13: {1:4,2:3,3:3,4:3,5:2,6:1,7:1}, 14: {1:4,2:3,3:3,4:3,5:2,6:1,7:1},
        15: {1:4,2:3,3:3,4:3,5:2,6:1,7:1,8:1}, 16: {1:4,2:3,3:3,4:3,5:2,6:1,7:1,8:1},
        17: {1:4,2:3,3:3,4:3,5:2,6:1,7:1,8:1,9:1}, 18: {1:4,2:3,3:3,4:3,5:3,6:1,7:1,8:1,9:1},
        19: {1:4,2:3,3:3,4:3,5:3,6:2,7:1,8:1,9:1}, 20: {1:4,2:3,3:3,4:3,5:3,6:2,7:2,8:1,9:1}
    },
    half: {     // Paladino, Ranger (arrotondato per eccesso)
        1: {}, 2: {}, 3: {1:2}, 4: {1:2}, 5: {1:4,2:2}, 6: {1:4,2:2},
        7: {1:4,2:3}, 8: {1:4,2:3}, 9: {1:4,2:3,3:2}, 10: {1:4,2:3,3:2},
        11: {1:4,2:3,3:3}, 12: {1:4,2:3,3:3}, 13: {1:4,2:3,3:3,4:1},
        14: {1:4,2:3,3:3,4:1}, 15: {1:4,2:3,3:3,4:2}, 16: {1:4,2:3,3:3,4:2},
        17: {1:4,2:3,3:3,4:3,5:1}, 18: {1:4,2:3,3:3,4:3,5:1},
        19: {1:4,2:3,3:3,4:3,5:2}, 20: {1:4,2:3,3:3,4:3,5:2}
    },
    third: {    // Artificiere (da lvl 1), Eldritch Knight / Arcane Trickster (da lvl 3)
        // Nota: Artificiere inizia a lvl 1, EK/AT a lvl 3. La tabella è quella del terzo-incantatore PHB 2024.
        1: {}, 2: {1:2}, 3: {1:3}, 4: {1:3}, 5: {1:4,2:2}, 6: {1:4,2:2},
        7: {1:4,2:3}, 8: {1:4,2:3}, 9: {1:4,2:3,3:2}, 10: {1:4,2:3,3:2},
        11: {1:4,2:3,3:3}, 12: {1:4,2:3,3:3}, 13: {1:4,2:3,3:3,4:1},
        14: {1:4,2:3,3:3,4:1}, 15: {1:4,2:3,3:3,4:2}, 16: {1:4,2:3,3:3,4:2},
        17: {1:4,2:3,3:3,4:3,5:1}, 18: {1:4,2:3,3:3,4:3,5:1},
        19: {1:4,2:3,3:3,4:3,5:2}, 20: {1:4,2:3,3:3,4:3,5:2}
    },
    warlock: {  // Patto magia (il numero è il livello dello slot, il valore è il numero di slot)
        1: {1:1}, 2: {1:2}, 3: {2:2}, 4: {2:2}, 5: {3:2}, 6: {3:2},
        7: {4:2}, 8: {4:2}, 9: {5:2}, 10: {5:2}, 11: {5:3}, 12: {5:3},
        13: {5:3}, 14: {5:3}, 15: {5:3}, 16: {5:3}, 17: {5:4}, 18: {5:4},
        19: {5:4}, 20: {5:4}
    }
};

// Trucchetti conosciuti per classe e livello
Character.cantripTables = {
    'Mago':     [3,3,3,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5,5],
    'Stregone': [4,4,4,5,5,5,5,5,5,6,6,6,6,6,6,6,6,6,6,6],
    'Chierico': [3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5],
    'Druido':   [2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4],
    'Bardo':    [2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4],
    'Warlock':  [2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4],
    'Artificiere': [2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4],
    'Paladino': [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    'Ranger':   [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    'Guerriero (Eldritch Knight)': [0,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
    'Ladro (Arcane Trickster)':    [0,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2]
};

// Mappa classe -> tipo incantatore come proprietà statica
Character.classType = {
    'Mago': 'full',
    'Stregone': 'full',
    'Chierico': 'full',
    'Druido': 'full',
    'Bardo': 'full',
    'Paladino': 'half',
    'Ranger': 'half',
    'Artificiere': 'third',
    'Guerriero (Eldritch Knight)': 'third',
    'Ladro (Arcane Trickster)': 'third',
    'Warlock': 'warlock'
};

// Mappa classe -> caratteristica primaria
Character.primaryStatByClass = {
    'Mago': 'int',
    'Stregone': 'cha',
    'Chierico': 'sag',
    'Druido': 'sag',
    'Bardo': 'cha',
    'Paladino': 'cha',
    'Ranger': 'sag',
    'Artificiere': 'int',
    'Guerriero (Eldritch Knight)': 'int',
    'Ladro (Arcane Trickster)': 'int',
    'Warlock': 'cha'
};