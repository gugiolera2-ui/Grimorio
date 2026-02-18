// database.js - Gestione del database incantesimi
// Versione 3.2.0 - Supporto multi-fonte e metadati avanzati

const Database = {
    allSpells: [],
    
    // NUOVO: Mappa delle classi con le loro caratteristiche primarie
    classAbilityMap: {
        'Mago': 'int',
        'Stregone': 'cha',
        'Chierico': 'sag',
        'Druido': 'sag',
        'Bardo': 'cha',
        'Paladino': 'cha',
        'Ranger': 'sag',
        'Warlock': 'cha',
        'Artificiere': 'int',
        'Guerriero (Eldritch Knight)': 'int',
        'Ladro (Arcane Trickster)': 'int'
    },
    
    // NUOVO: Nomi completi delle classi
    classFullNames: {
        'Mago': 'Mago',
        'Stregone': 'Stregone',
        'Chierico': 'Chierico',
        'Druido': 'Druido',
        'Bardo': 'Bardo',
        'Paladino': 'Paladino',
        'Ranger': 'Ranger',
        'Warlock': 'Warlock',
        'Artificiere': 'Artificiere',
        'Guerriero (Eldritch Knight)': 'Guerriero (Eldritch Knight)',
        'Ladro (Arcane Trickster)': 'Ladro (Arcane Trickster)'
    },
    
    // NUOVO: Scuole magiche con icone
    schoolIcons: {
        'Ammaliamento': '💫',
        'Aura': '✨',
        'Divinazione': '🔮',
        'Evocazione': '🔆',
        'Illusione': '🌀',
        'Invocazione': '📿',
        'Negromanzia': '💀',
        'Trasmutazione': '⚗️',
        'Abiurazione': '🛡️'
    },

    init: function() {
        console.log("📚 Il Bibliotecario sta raccogliendo i manoscritti...");
        
        // Uniamo manualmente le variabili caricate dagli script
        // Verifichiamo che esistano prima di aggiungerle per evitare errori
        const sources = [
            typeof data_lvl0 !== 'undefined' ? data_lvl0 : null,
            typeof data_lvl1 !== 'undefined' ? data_lvl1 : null,
            typeof data_lvl2 !== 'undefined' ? data_lvl2 : null,
            typeof data_lvl3 !== 'undefined' ? data_lvl3 : null,
            typeof data_lvl4 !== 'undefined' ? data_lvl4 : null,
            typeof data_lvl5 !== 'undefined' ? data_lvl5 : null,
            typeof data_lvl6 !== 'undefined' ? data_lvl6 : null,
            typeof data_lvl7 !== 'undefined' ? data_lvl7 : null,
            typeof data_lvl8 !== 'undefined' ? data_lvl8 : null,
            typeof data_lvl9 !== 'undefined' ? data_lvl9 : null
        ];

        // Filtriamo i null e uniamo tutti gli array "incantesimi"
        this.allSpells = sources
            .filter(d => d !== null)
            .flatMap(d => d.incantesimi || []);

        // NUOVO: Arricchisci gli incantesimi con metadati aggiuntivi
        this.enrichSpells();
        
        console.log(`✅ Grimorio pronto: ${this.allSpells.length} magie caricate.`);
        console.log(`📊 Statistiche: ${this.getSpellStatistics()}`);
    },
    
    // NUOVO: Arricchisce gli incantesimi con metadati utili
    enrichSpells: function() {
        this.allSpells.forEach(spell => {
            // Aggiungi icona scuola se non presente
            if (!spell.scuolaIcon && spell.scuola) {
                spell.scuolaIcon = this.schoolIcons[spell.scuola] || '📜';
            }
            
            // Standardizza i nomi delle classi (rimuovi spazi extra, capitalizza)
            if (spell.lanciatori) {
                spell.lanciatori = spell.lanciatori.map(c => c.trim());
            }
            
            // Aggiungi campo per la caratteristica consigliata
            spell.suggestedAbility = this.getSuggestedAbility(spell);
            
            // Aggiungi informazioni sul tempo di lancio normalizzato
            if (spell.tempoLancio) {
                spell.tempoLancioNormalized = this.normalizeTime(spell.tempoLancio);
            }
            
            // Aggiungi campo per i componenti come array
            if (spell.componenti) {
                spell.componentiArray = spell.componenti.split('').filter(c => c.trim());
            }
        });
    },
    
    // NUOVO: Suggerisce una caratteristica basata sulla classe principale dell'incantesimo
    getSuggestedAbility: function(spell) {
        if (!spell.lanciatori || spell.lanciatori.length === 0) {
            return 'int'; // Default a intelligenza
        }
        
        // Prendi la prima classe nella lista (di solito la principale)
        const mainClass = spell.lanciatori[0];
        return this.classAbilityMap[mainClass] || 'int';
    },
    
    // NUOVO: Normalizza i tempi di lancio per ordinamento
    normalizeTime: function(time) {
        const timeMap = {
            'Azione': 1,
            'Azione bonus': 2,
            'Reazione': 3,
            '1 minuto': 4,
            '10 minuti': 5,
            '1 ora': 6,
            '8 ore': 7,
            '12 ore': 8,
            '24 ore': 9
        };
        return timeMap[time] || 0;
    },
    
    // NUOVO: Ottiene statistiche sugli incantesimi
    getSpellStatistics: function() {
        const byLevel = {};
        const bySchool = {};
        const byClass = {};
        
        this.allSpells.forEach(spell => {
            // Per livello
            const level = spell.livello;
            byLevel[level] = (byLevel[level] || 0) + 1;
            
            // Per scuola
            const school = spell.scuola;
            bySchool[school] = (bySchool[school] || 0) + 1;
            
            // Per classe
            if (spell.lanciatori) {
                spell.lanciatori.forEach(cls => {
                    byClass[cls] = (byClass[cls] || 0) + 1;
                });
            }
        });
        
        return `Livelli: ${Object.entries(byLevel).map(([l, c]) => `${l}:${c}`).join(', ')}`;
    },

    getSpellById: function(id) {
        return this.allSpells.find(s => s.id === id);
    },
    
    // NUOVO: Ottiene incantesimi per livello
    getSpellsByLevel: function(level) {
        return this.allSpells.filter(s => s.livello === level);
    },
    
    // NUOVO: Ottiene incantesimi per classe
    getSpellsByClass: function(className) {
        const classNameLower = className.toLowerCase();
        return this.allSpells.filter(s => 
            s.lanciatori && s.lanciatori.some(c => c.toLowerCase() === classNameLower)
        );
    },
    
    // NUOVO: Ottiene incantesimi per scuola
    getSpellsBySchool: function(school) {
        return this.allSpells.filter(s => s.scuola === school);
    },
    
    // NUOVO: Cerca incantesimi per testo
    searchSpells: function(query) {
        const queryLower = query.toLowerCase();
        return this.allSpells.filter(s => 
            s.nome.toLowerCase().includes(queryLower) ||
            (s.descrizione && s.descrizione.toLowerCase().includes(queryLower))
        );
    },
    
    // NUOVO: Ottiene tutte le classi disponibili
    getAllClasses: function() {
        const classes = new Set();
        this.allSpells.forEach(spell => {
            if (spell.lanciatori) {
                spell.lanciatori.forEach(cls => classes.add(cls));
            }
        });
        return Array.from(classes).sort();
    },
    
    // NUOVO: Ottiene tutte le scuole disponibili
    getAllSchools: function() {
        const schools = new Set();
        this.allSpells.forEach(spell => {
            if (spell.scuola) {
                schools.add(spell.scuola);
            }
        });
        return Array.from(schools).sort();
    },
    
    // NUOVO: Verifica se un incantesimo è di una specifica classe
    isSpellForClass: function(spellId, className) {
        const spell = this.getSpellById(spellId);
        if (!spell || !spell.lanciatori) return false;
        
        const classNameLower = className.toLowerCase();
        return spell.lanciatori.some(c => c.toLowerCase() === classNameLower);
    },
    
    // NUOVO: Ottiene le classi compatibili con un incantesimo
    getCompatibleClasses: function(spellId) {
        const spell = this.getSpellById(spellId);
        return spell?.lanciatori || [];
    },
    
    // NUOVO: Ottiene la caratteristica consigliata per un incantesimo basato su una classe
    getAbilityForClass: function(spellId, className) {
        // Se la classe è fornita, usa quella
        if (className && this.classAbilityMap[className]) {
            return this.classAbilityMap[className];
        }
        
        // Altrimenti usa il suggerimento
        const spell = this.getSpellById(spellId);
        return spell?.suggestedAbility || 'int';
    },
    
    // NUOVO: Esporta un incantesimo in formato leggibile
    formatSpellForDisplay: function(spellId) {
        const spell = this.getSpellById(spellId);
        if (!spell) return null;
        
        return {
            ...spell,
            scuolaIcon: this.schoolIcons[spell.scuola] || '📜',
            classiFormattate: spell.lanciatori?.join(', ') || 'Nessuna',
            componenteDesc: spell.componenti ? 
                `Componenti: ${spell.componenti}${spell.concentrazione ? ' (concentrazione)' : ''}${spell.rituale ? ' (rituale)' : ''}` : 
                'Nessun componente'
        };
    }
};