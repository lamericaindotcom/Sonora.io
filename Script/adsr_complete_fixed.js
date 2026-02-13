/* =====================================================================
   ADSR_COMPLETE_FIXED.JS - GESTIONNAIRE ADSR AVEC POLYPHONIE
   ===================================================================== 
   
   ✅ NOUVELLES FONCTIONNALITÉS:
   - Classe ADSRManager avec gestion complète ADSR
   - Polyphonie 4 voix avec pool de voix
   - Méthode setADSR() pour mettre à jour les paramètres
   - Support des oscillateurs avec formes d'onde
   
===================================================================== */

class ADSRManager {
  constructor(audioCtx, outputNode, voiceCount = 4) {
    this.audioCtx = audioCtx;
    this.outputNode = outputNode;
    this.voiceCount = voiceCount;
    this.voices = [];
    this.activeVoices = new Map();
    this.oscPool = [];
    
    /* Paramètres ADSR (en secondes) */
    this.adsr = {
      attack: 0.1,
      decay: 0.3,
      sustain: 0.7,
      release: 0.5
    };
    
    /* Paramètres des oscillateurs */
    this.oscSettings = {
      waveform1: 'sine',
      waveform2: 'sine',
      vol1: 0.5,
      vol2: 0.5,
      fine1: 0,
      fine2: 0,
      semi1: 0,
      semi2: 0,
      octave1: 0,
      octave2: 0,
      sync: false
    };
    
    /* Initialiser les voix */
    for (let i = 0; i < voiceCount; i++) {
      this.voices.push(this.createVoice());
    }
    
    console.log('✅ ADSRManager créé avec', voiceCount, 'voix');
  }
  
  createVoice() {
    const voice = {
      osc1: this.audioCtx.createOscillator(),
      osc2: this.audioCtx.createOscillator(),
      gain1: this.audioCtx.createGain(),
      gain2: this.audioCtx.createGain(),
      gainEnvelope: this.audioCtx.createGain(),
      filterEnv: this.audioCtx.createGain(),
      active: false,
      midi: null,
      startTime: 0
    };
    
    voice.osc1.connect(voice.gain1);
    voice.osc2.connect(voice.gain2);
    voice.gain1.connect(voice.gainEnvelope);
    voice.gain2.connect(voice.gainEnvelope);
    voice.gainEnvelope.connect(this.outputNode);
    
    voice.osc1.start();
    voice.osc2.start();
    
    return voice;
  }
  
  noteOn(midi, frequency) {
    /* Trouver une voix libre */
    let voice = this.voices.find(v => !v.active);
    if (!voice) {
      voice = this.voices[0];
      this.noteOff(voice.midi);
    }
    
    voice.active = true;
    voice.midi = midi;
    voice.startTime = this.audioCtx.currentTime;
    
    const freq = frequency;
    
    /* Configurer les oscillateurs */
    voice.osc1.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
    voice.osc2.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
    
    voice.osc1.type = this.oscSettings.waveform1;
    voice.osc2.type = this.oscSettings.waveform2;
    
    voice.gain1.gain.setValueAtTime(this.oscSettings.vol1, this.audioCtx.currentTime);
    voice.gain2.gain.setValueAtTime(this.oscSettings.vol2, this.audioCtx.currentTime);
    
    /* Appliquer l'enveloppe ADSR */
    this.applyADSREnvelope(voice);
    
    this.activeVoices.set(midi, voice);
  }
  
  noteOff(midi) {
    const voice = this.activeVoices.get(midi);
    if (!voice) return;
    
    const now = this.audioCtx.currentTime;
    voice.gainEnvelope.gain.cancelScheduledValues(now);
    voice.gainEnvelope.gain.setValueAtTime(voice.gainEnvelope.gain.value, now);
    voice.gainEnvelope.gain.linearRampToValueAtTime(0, now + this.adsr.release);
    
    setTimeout(() => {
      voice.active = false;
    }, this.adsr.release * 1000);
    
    this.activeVoices.delete(midi);
  }
  
  applyADSREnvelope(voice) {
    const now = this.audioCtx.currentTime;
    const { attack, decay, sustain, release } = this.adsr;
    
    voice.gainEnvelope.gain.setValueAtTime(0, now);
    voice.gainEnvelope.gain.linearRampToValueAtTime(1, now + attack);
    voice.gainEnvelope.gain.linearRampToValueAtTime(sustain, now + attack + decay);
  }
  
  /* ✅ METTRE À JOUR LES PARAMÈTRES ADSR */
  setADSR(attack, decay, sustain, release) {
    this.adsr = {
      attack: Math.max(0, attack),
      decay: Math.max(0, decay),
      sustain: Math.max(0, Math.min(1, sustain)),
      release: Math.max(0, release)
    };
    console.log('⚙️ ADSR mis à jour:', this.adsr);
  }
  
  setOscillatorSettings(settings) {
    Object.assign(this.oscSettings, settings);
    console.log('🎚️ Paramètres oscillateur mis à jour:', this.oscSettings);
  }
  
  setAnalysers(analyser1, analyser2) {
    this.analyser1 = analyser1;
    this.analyser2 = analyser2;
  }
  
  getStatus() {
    return {
      activeVoices: this.activeVoices.size,
      totalVoices: this.voiceCount
    };
  }
}

console.log('✅ adsr_complete_fixed.js chargé');
