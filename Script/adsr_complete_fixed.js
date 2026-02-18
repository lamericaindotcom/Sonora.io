/* =====================================================================
   ADSR_COMPLETE_FIXED.JS - GESTIONNAIRE ADSR AVEC POLYPHONIE + ANALYSEURS
   =====================================================================

   Objectifs du correctif :
   - Router un vrai signal vers analyser1/analyser2 (oscilloscope)
   - Appliquer ADSR sur chaque oscillateur (env1/env2)
   - Permettre setADSR() et setOscillatorSettings() robustes
===================================================================== */

class ADSRManager {
  constructor(audioCtx, outputNode, voiceCount = 4) {
    this.audioCtx = audioCtx;
    this.outputNode = outputNode;
    this.voiceCount = voiceCount;

    this.voices = [];
    this.activeVoices = new Map(); // midi -> voice

    // Paramètres ADSR (secondes)
    this.adsr = {
      attack: 0.1,
      decay: 0.3,
      sustain: 0.7,
      release: 0.5,
    };

    // Paramètres oscillateurs
    this.oscSettings = {
      waveform1: 'sine',
      waveform2: 'sine',
      vol1: 0.5,
      vol2: 0.5,
      fine1: 0,   // cents
      fine2: 0,   // cents
      semi1: 0,   // demi-tons
      semi2: 0,   // demi-tons
      octave1: 0, // octaves
      octave2: 0, // octaves
      sync: false,
    };

    // Analyseurs (scopes)
    this.analyser1 = null;
    this.analyser2 = null;
    this._analysersWired = false;
    this._tap1 = null;
    this._tap2 = null;

    for (let i = 0; i < voiceCount; i++) {
      this.voices.push(this.createVoice());
    }

    console.log('✅ ADSRManager créé avec', voiceCount, 'voix');
  }

  createVoice() {
    const v = {
      osc1: this.audioCtx.createOscillator(),
      osc2: this.audioCtx.createOscillator(),

      gain1: this.audioCtx.createGain(), // volume osc1
      gain2: this.audioCtx.createGain(), // volume osc2

      env1: this.audioCtx.createGain(),  // ADSR osc1
      env2: this.audioCtx.createGain(),  // ADSR osc2

      active: false,
      midi: null,
      startTime: 0,
    };

    // Routage : osc -> gain -> env -> output
    v.osc1.connect(v.gain1);
    v.gain1.connect(v.env1);
    v.env1.connect(this.outputNode);

    v.osc2.connect(v.gain2);
    v.gain2.connect(v.env2);
    v.env2.connect(this.outputNode);

    // Démarrage une fois (on réutilise les oscillateurs)
    v.osc1.start();
    v.osc2.start();

    // Valeurs initiales
    v.gain1.gain.value = this.oscSettings.vol1;
    v.gain2.gain.value = this.oscSettings.vol2;
    v.env1.gain.value = 0;
    v.env2.gain.value = 0;

    return v;
  }

  // --- Helpers pitch ---
  _applyPitch(osc, baseFreq, semi, octave, fineCents) {
    const freq = baseFreq * Math.pow(2, octave) * Math.pow(2, semi / 12);
    osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
    osc.detune.setValueAtTime(fineCents || 0, this.audioCtx.currentTime);
  }

  // --- Voice allocation ---
  _findFreeVoice() {
    return this.voices.find(v => !v.active) || null;
  }

  _stealVoice() {
    // vole la plus ancienne
    let oldest = this.voices[0];
    for (const v of this.voices) {
      if (v.active && v.startTime < oldest.startTime) oldest = v;
    }
    if (oldest?.midi != null) this.noteOff(oldest.midi);
    return oldest;
  }

  // --- ADSR scheduling ---
  _scheduleAttackDecay(envGain) {
    const now = this.audioCtx.currentTime;
    const { attack, decay, sustain } = this.adsr;

    envGain.cancelScheduledValues(now);
    envGain.setValueAtTime(0, now);
    envGain.linearRampToValueAtTime(1, now + attack);
    envGain.linearRampToValueAtTime(sustain, now + attack + decay);
  }

  _scheduleRelease(envGain) {
    const now = this.audioCtx.currentTime;
    const { release } = this.adsr;

    envGain.cancelScheduledValues(now);
    // sécurise la continuité
    envGain.setValueAtTime(envGain.value, now);
    envGain.linearRampToValueAtTime(0, now + release);
  }

  // --- Public API ---
  noteOn(midi, baseFrequency) {
    let v = this._findFreeVoice();
    if (!v) v = this._stealVoice();

    v.active = true;
    v.midi = midi;
    v.startTime = this.audioCtx.currentTime;

    // formes d’onde
    v.osc1.type = this.oscSettings.waveform1;
    v.osc2.type = this.oscSettings.waveform2;

    // volumes
    v.gain1.gain.setValueAtTime(this.oscSettings.vol1, this.audioCtx.currentTime);
    v.gain2.gain.setValueAtTime(this.oscSettings.vol2, this.audioCtx.currentTime);

    // pitch
    this._applyPitch(v.osc1, baseFrequency, this.oscSettings.semi1, this.oscSettings.octave1, this.oscSettings.fine1);

    // “sync” simplifié : osc2 un peu plus haut si activé (évite un mode “vide”)
    const osc2Base = this.oscSettings.sync ? baseFrequency * 2 : baseFrequency;
    this._applyPitch(v.osc2, osc2Base, this.oscSettings.semi2, this.oscSettings.octave2, this.oscSettings.fine2);

    // enveloppe
    this._scheduleAttackDecay(v.env1.gain);
    this._scheduleAttackDecay(v.env2.gain);

    this.activeVoices.set(midi, v);

    // scopes auto (si extension chargée)
    if (this.startScopeMonitor) this.startScopeMonitor();
  }

  noteOff(midi) {
    const v = this.activeVoices.get(midi);
    if (!v) return;

    this._scheduleRelease(v.env1.gain);
    this._scheduleRelease(v.env2.gain);

    const relMs = Math.max(0, this.adsr.release) * 1000;

    // libération de la voix après release
    window.setTimeout(() => {
      // évite de libérer une voix réutilisée entre-temps
      if (v.midi === midi) {
        v.active = false;
        v.midi = null;
      }
    }, relMs + 10);

    this.activeVoices.delete(midi);
  }

  setADSR(attack, decay, sustain, release) {
    this.adsr = {
      attack: Math.max(0, +attack || 0),
      decay: Math.max(0, +decay || 0),
      sustain: Math.max(0, Math.min(1, +sustain || 0)),
      release: Math.max(0, +release || 0),
    };
  }

  setOscillatorSettings(settings) {
    Object.assign(this.oscSettings, settings);

    // Applique à chaud (utile pour waveform/vol)
    const now = this.audioCtx.currentTime;
    for (const v of this.voices) {
      v.osc1.type = this.oscSettings.waveform1;
      v.osc2.type = this.oscSettings.waveform2;
      v.gain1.gain.setValueAtTime(this.oscSettings.vol1, now);
      v.gain2.gain.setValueAtTime(this.oscSettings.vol2, now);
    }


    reapplyPitchToActiveVoices(midiToFreqFn); {
    const now = this.audioCtx.currentTime;

    for (const v of this.voices) {
      if (!v.active || v.midi == null) continue;

      const base = midiToFreqFn(v.midi);

      // osc1
      const f1 = base * Math.pow(2, this.oscSettings.octave1) * Math.pow(2, this.oscSettings.semi1 / 12);
      v.osc1.frequency.setValueAtTime(f1, now);
      v.osc1.detune.setValueAtTime(this.oscSettings.fine1 || 0, now);

      // osc2 (+ sync)
      const base2 = this.oscSettings.sync ? base * 2 : base;
      const f2 = base2 * Math.pow(2, this.oscSettings.octave2) * Math.pow(2, this.oscSettings.semi2 / 12);
      v.osc2.frequency.setValueAtTime(f2, now);
      v.osc2.detune.setValueAtTime(this.oscSettings.fine2 || 0, now);
    }
  }


  }

  setAnalysers(analyser1, analyser2) {
    this.analyser1 = analyser1;
    this.analyser2 = analyser2;

    if (this._analysersWired) return;
    if (!this.analyser1 || !this.analyser2) return;

    this._analysersWired = true;

    // Tap silencieux : les analyseurs doivent appartenir à un graphe audio “vivant”
    this._tap1 = this.audioCtx.createGain();
    this._tap2 = this.audioCtx.createGain();
    this._tap1.gain.value = 0;
    this._tap2.gain.value = 0;

    this.analyser1.connect(this._tap1);
    this.analyser2.connect(this._tap2);
    this._tap1.connect(this.audioCtx.destination);
    this._tap2.connect(this.audioCtx.destination);

    // Alimente les analyseurs avec un signal réel (post-ADSR, séparé par osc)
    for (const v of this.voices) {
      // évite double-connexion
      if (!v._a1) {
        v.env1.connect(this.analyser1);
        v._a1 = true;
      }
      if (!v._a2) {
        v.env2.connect(this.analyser2);
        v._a2 = true;
      }
    }

    // scopes auto si extension chargée
    if (this.startScopeMonitor) this.startScopeMonitor();
  }

  getStatus() {
    return {
      activeVoices: this.activeVoices.size,
      totalVoices: this.voiceCount,
    };
  }
}

console.log('✅ adsr_complete_fixed.js chargé');
