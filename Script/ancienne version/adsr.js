/* =====================================================================
   ADSR.JS - ENVELOPE & POLYPHONIC VOICE MANAGEMENT
   ===================================================================== 
   
   Gère :
   - Enveloppes ADSR (Attack, Decay, Sustain, Release)
   - Pool de 4 voix polyphoniques
   - Allocation automatique des voix
   - Oscillateurs par voix
   
   Usage:
   - import ADSR depuis ce fichier
   - Utiliser ADSR.noteOn(midi, freq) pour déclencher une note
   - Utiliser ADSR.noteOff(midi) pour arrêter une note
   
===================================================================== */

// Créé à partir de l'audioCtx global (défini dans oscillateur.js)
class ADSRVoice {
    /**
     * Crée une voix avec enveloppe ADSR
     * @param {AudioContext} audioCtx - Contexte audio global
     * @param {GainNode} outputNode - Nœud de sortie (filtre ou destination)
     * @param {Object} oscSettings - {vol1, vol2, fine1, fine2, semi1, semi2, octave1, octave2, wave1, wave2}
     */
    constructor(audioCtx, outputNode, oscSettings = {}) {
        this.audioCtx = audioCtx;
        this.outputNode = outputNode;
        this.oscSettings = oscSettings;
        
        // Oscillateurs
        this.osc1 = null;
        this.osc2 = null;
        
        // Enveloppes
        this.envelope = audioCtx.createGain();
        this.envelope.gain.value = 0;
        
        // Gain pour les volumes individuels
        this.gainOsc1 = audioCtx.createGain();
        this.gainOsc2 = audioCtx.createGain();
        this.masterGain = audioCtx.createGain();
        
        // Connexion
        this.gainOsc1.connect(this.envelope);
        this.gainOsc2.connect(this.envelope);
        this.envelope.connect(this.masterGain);
        this.masterGain.connect(outputNode);
        
        // État
        this.midi = null;
        this.isActive = false;
        this.startTime = null;
    }

    /**
     * Déclenche une note
     * @param {number} midi - Note MIDI (0-127)
     * @param {number} freq - Fréquence en Hz
     * @param {Object} adsr - {attack, decay, sustain, release} en secondes
     */
    noteOn(midi, freq, adsr) {
        if (this.isActive) {
            this.noteOff();
        }

        this.midi = midi;
        this.isActive = true;
        this.startTime = this.audioCtx.currentTime;
        const now = this.startTime;

        try {
            // ===== OSCILLATEUR 1 =====
            this.osc1 = this.audioCtx.createOscillator();
            this.osc1.type = this.oscSettings.waveform1 || 'sine';
            
            const f1 = freq 
                * Math.pow(2, this.oscSettings.octave1 || 0)
                * Math.pow(2, (this.oscSettings.semi1 || 0) / 12);
            
            this.osc1.frequency.value = f1;
            this.osc1.detune.value = this.oscSettings.fine1 || 0;
            this.osc1.connect(this.gainOsc1);

            // ===== OSCILLATEUR 2 =====
            this.osc2 = this.audioCtx.createOscillator();
            this.osc2.type = this.oscSettings.waveform2 || 'sine';
            
            const f2 = freq 
                * Math.pow(2, this.oscSettings.octave2 || 0)
                * Math.pow(2, (this.oscSettings.semi2 || 0) / 12);
            
            this.osc2.frequency.value = f2;
            this.osc2.detune.value = this.oscSettings.fine2 || 0;
            this.osc2.connect(this.gainOsc2);

            // ===== VOLUMES =====
            this.gainOsc1.gain.value = this.oscSettings.vol1 || 0.5;
            this.gainOsc2.gain.value = this.oscSettings.vol2 || 0.5;

            // ===== DÉMARRER LES OSCILLATEURS =====
            this.osc1.start(now);
            this.osc2.start(now);

            // ===== APPLIQUER L'ENVELOPPE ADSR =====
            // Attack: 0 → 1
            this.envelope.gain.setValueAtTime(0, now);
            this.envelope.gain.linearRampToValueAtTime(1, now + adsr.attack);
            
            // Decay: 1 → sustain
            this.envelope.gain.linearRampToValueAtTime(
                adsr.sustain, 
                now + adsr.attack + adsr.decay
            );

        } catch (error) {
            console.error('❌ Voice.noteOn() error:', error);
            this.isActive = false;
        }
    }

    /**
     * Arrête une note avec release
     * @param {Object} adsr - {attack, decay, sustain, release}
     */
    noteOff(adsr) {
        if (!this.isActive) return;

        const now = this.audioCtx.currentTime;

        try {
            // Release: niveau actuel → 0
            this.envelope.gain.cancelScheduledValues(now);
            this.envelope.gain.setValueAtTime(this.envelope.gain.value, now);
            this.envelope.gain.linearRampToValueAtTime(0, now + adsr.release);

            // Arrêter les oscillateurs après release
            setTimeout(() => {
                try {
                    if (this.osc1) {
                        this.osc1.stop();
                        this.osc1.disconnect();
                        this.osc1 = null;
                    }
                    if (this.osc2) {
                        this.osc2.stop();
                        this.osc2.disconnect();
                        this.osc2 = null;
                    }
                    this.isActive = false;
                    this.midi = null;
                } catch (e) {
                    // Silencieusement ignorer (déjà arrêtés)
                }
            }, adsr.release * 1000 + 100);

        } catch (error) {
            console.error('❌ Voice.noteOff() error:', error);
            this.isActive = false;
        }
    }

    /**
     * Met à jour les paramètres d'une voix active
     */
    updateSettings(oscSettings) {
        this.oscSettings = oscSettings;

        if (this.gainOsc1) this.gainOsc1.gain.value = oscSettings.vol1 || 0.5;
        if (this.gainOsc2) this.gainOsc2.gain.value = oscSettings.vol2 || 0.5;

        // Mettre à jour les formes d'onde si la voix est active
        if (this.osc1 && oscSettings.waveform1) {
            // Attention : type ne peut pas être changé pendant que l'osc tourne
            // donc on log juste un warning
            console.warn('⚠️ Cannot change waveform on active voice');
        }
    }

    /**
     * Obtient l'état de la voix
     */
    getStatus() {
        return {
            midi: this.midi,
            isActive: this.isActive,
            elapsedTime: this.isActive ? this.audioCtx.currentTime - this.startTime : 0
        };
    }
}

/**
 * Gestionnaire ADSR principal
 * Gère un pool de voix polyphoniques
 */
class ADSRManager {
    constructor(audioCtx, outputNode, numVoices = 4) {
        this.audioCtx = audioCtx;
        this.outputNode = outputNode;
        this.numVoices = numVoices;
        
        // Pool de voix
        this.voices = [];
        this.heldNotes = new Map(); // midi → voice
        
        // Paramètres ADSR
        this.adsr = {
            attack: 0.1,    // 100ms
            decay: 0.3,     // 300ms
            sustain: 0.7,   // 70%
            release: 0.5    // 500ms
        };

        // Paramètres oscillateurs
        this.oscSettings = {
            vol1: 0.5,
            vol2: 0.5,
            fine1: 0,
            fine2: 0,
            semi1: 0,
            semi2: 0,
            octave1: 0,
            octave2: 0,
            waveform1: 'sine',
            waveform2: 'sine'
        };

        // Initialiser le pool de voix
        for (let i = 0; i < numVoices; i++) {
            this.voices.push(new ADSRVoice(audioCtx, outputNode, this.oscSettings));
        }

        console.log(`✅ ADSRManager initialized with ${numVoices} voices`);
    }

    /**
     * Déclenche une note
     */
    noteOn(midi, freq) {
        // Si la note est déjà jouée, on la remet à zéro
        if (this.heldNotes.has(midi)) {
            const oldVoice = this.heldNotes.get(midi);
            oldVoice.noteOff(this.adsr);
            this.heldNotes.delete(midi);
        }

        // Chercher une voix libre
        const freeVoice = this.voices.find(v => !v.isActive);
        
        if (!freeVoice) {
            console.warn('⚠️ All voices busy! Stealing oldest voice');
            // Vol de voix : arrêter la plus ancienne
            const oldestVoice = this.voices.reduce((a, b) => 
                (a.startTime || Infinity) < (b.startTime || Infinity) ? a : b
            );
            oldestVoice.noteOff(this.adsr);
            oldestVoice.noteOn(midi, freq, this.adsr);
            this.heldNotes.set(midi, oldestVoice);
        } else {
            freeVoice.noteOn(midi, freq, this.adsr);
            this.heldNotes.set(midi, freeVoice);
        }

        console.log(`🎵 Note ON: MIDI ${midi} (${this.getNoteName(midi)}) - Active voices: ${this.getActiveVoiceCount()}`);
    }

    /**
     * Arrête une note
     */
    noteOff(midi) {
        const voice = this.heldNotes.get(midi);
        if (voice) {
            voice.noteOff(this.adsr);
            this.heldNotes.delete(midi);
            console.log(`🔇 Note OFF: MIDI ${midi} (${this.getNoteName(midi)}) - Active voices: ${this.getActiveVoiceCount()}`);
        }
    }

    /**
     * Met à jour les paramètres ADSR
     */
    setADSR(attack, decay, sustain, release) {
        this.adsr = {
            attack: Math.max(0, attack),
            decay: Math.max(0, decay),
            sustain: Math.max(0, Math.min(1, sustain)),
            release: Math.max(0, release)
        };
        console.log('⚙️ ADSR Updated:', this.adsr);
    }

    /**
     * Met à jour les paramètres des oscillateurs
     */
    setOscillatorSettings(settings) {
        this.oscSettings = { ...this.oscSettings, ...settings };
        
        // Appliquer aux voix existantes
        this.voices.forEach(voice => {
            voice.updateSettings(this.oscSettings);
        });
    }

    /**
     * Obtient le nombre de voix actives
     */
    getActiveVoiceCount() {
        return this.voices.filter(v => v.isActive).length;
    }

    /**
     * Convertit MIDI à fréquence
     */
    midiToFreq(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    /**
     * Obtient le nom de la note
     */
    getNoteName(midi) {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midi / 12) - 1;
        return notes[midi % 12] + octave;
    }

    /**
     * Arrête toutes les notes
     */
    allNotesOff() {
        this.heldNotes.forEach((voice, midi) => {
            voice.noteOff(this.adsr);
        });
        this.heldNotes.clear();
        console.log('🛑 All notes OFF');
    }

    /**
     * Obtient le statut de toutes les voix
     */
    getStatus() {
        return {
            totalVoices: this.numVoices,
            activeVoices: this.getActiveVoiceCount(),
            heldNotes: Array.from(this.heldNotes.keys()).map(midi => this.getNoteName(midi)),
            adsr: this.adsr
        };
    }
}

// Export pour utilisation externe
// À inclure dans index.html AVANT oscillateur.js
console.log('✅ adsr.js loaded');
