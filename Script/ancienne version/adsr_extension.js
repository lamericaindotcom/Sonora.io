/* =====================================================================
   ADSR EXTENSION - ANALYSER + VISUALISATION + SMART SCOPES
   ===================================================================== 
   
   À inclure APRÈS adsr.js et oscillateur.js
   - Connexion analyseurs pour scopes
   - Courbe ADSR en temps réel
   - Scopes intelligents (arrêt automatique)
   - Polyphonie optimisée
   
===================================================================== */

// ===== EXTEND ADSRVoice - ANALYSER CONNECTION =====

const originalADSRVoiceNoteOn = ADSRVoice.prototype.noteOn;

ADSRVoice.prototype.noteOn = function(midi, freq, adsr) {
  originalADSRVoiceNoteOn.call(this, midi, freq, adsr);
  
  // Connecter les oscillateurs aux analyseurs
  if (this.analyser1 && this.osc1) {
    this.osc1.connect(this.analyser1);
  }
  if (this.analyser2 && this.osc2) {
    this.osc2.connect(this.analyser2);
  }
};

// ===== EXTEND ADSRManager - ANALYSERS + SCOPES CONTROL =====

ADSRManager.prototype.setAnalysers = function(analyser1, analyser2) {
  console.log('📊 Setting up analysers for scopes');
  
  this.voices.forEach(voice => {
    voice.analyser1 = analyser1;
    voice.analyser2 = analyser2;
  });
  
  // Démarrer la vérification automatique des scopes
  this.startScopeMonitor();
  
  console.log('✅ Analysers connected - Smart scope monitoring enabled');
};

// ===== SMART SCOPE MONITORING =====

ADSRManager.prototype.startScopeMonitor = function() {
  // Vérifier l'état des scopes toutes les 100ms
  setInterval(() => {
    const activeVoices = this.getActiveVoiceCount();
    
    if (activeVoices === 0) {
      // Aucune voix active → arrêter les scopes
      if (scopeRunning1 || scopeRunning2) {
        console.log('⏹️ No active voices - stopping scopes');
        stopScope(1);
        stopScope(2);
      }
    } else {
      // Au moins une voix active → s'assurer que les scopes tournent
      const osc1c = document.getElementById('osc1-scope');
      const osc2c = document.getElementById('osc2-scope');
      
      if (osc1c && !scopeRunning1) {
        drawScopeLoop(osc1c, analyser1, 1);
      }
      if (osc2c && !scopeRunning2) {
        drawScopeLoop(osc2c, analyser2, 2);
      }
    }
  }, 100);
};

// ===== ADSR CURVE VISUALIZATION =====

ADSRManager.prototype.drawADSRCurve = function(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  
  const w = cssW;
  const h = cssH;
  const padding = 20;
  const graphW = w - 2 * padding;
  const graphH = h - 2 * padding;
  
  // Background
  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 0, w, h);
  
  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let i = 0; i <= 4; i++) {
    const x = padding + (graphW / 4) * i;
    ctx.moveTo(x, padding);
    ctx.lineTo(x, h - padding);
    
    const y = padding + (graphH / 4) * i;
    ctx.moveTo(padding, y);
    ctx.lineTo(w - padding, y);
  }
  ctx.stroke();
  
  // Calculer les points de la courbe ADSR
  const attack = this.adsr.attack;
  const decay = this.adsr.decay;
  const sustain = this.adsr.sustain;
  const release = this.adsr.release;
  
  // Total time (pour normalize à 100%)
  const totalTime = attack + decay + sustain + release;
  const holdTime = 0.3; // 30% du temps en sustain
  
  const points = [];
  
  // Attack: 0 → 1
  for (let t = 0; t <= attack; t += attack / 20) {
    const norm = t / (attack + decay + holdTime + release);
    const x = padding + norm * graphW;
    const y = h - padding - (t / attack) * graphH;
    points.push({ x, y, time: t });
  }
  
  // Decay: 1 → sustain
  for (let t = attack; t <= attack + decay; t += decay / 20) {
    const norm = t / (attack + decay + holdTime + release);
    const x = padding + norm * graphW;
    const progress = (t - attack) / decay;
    const level = 1 - progress * (1 - sustain);
    const y = h - padding - level * graphH;
    points.push({ x, y, time: t });
  }
  
  // Sustain (hold)
  const sustainTime = holdTime;
  for (let t = attack + decay; t <= attack + decay + sustainTime; t += sustainTime / 20) {
    const norm = t / (attack + decay + holdTime + release);
    const x = padding + norm * graphW;
    const y = h - padding - sustain * graphH;
    points.push({ x, y, time: t });
  }
  
  // Release: sustain → 0
  for (let t = attack + decay + sustainTime; t <= attack + decay + sustainTime + release; t += release / 20) {
    const norm = t / (attack + decay + holdTime + release);
    const x = padding + norm * graphW;
    const progress = (t - attack - decay - sustainTime) / release;
    const level = sustain * (1 - progress);
    const y = h - padding - level * graphH;
    points.push({ x, y, time: t });
  }
  
  // Draw curve
  ctx.strokeStyle = '#32b8c6';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  points.forEach((point, i) => {
    i === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
  
  // Draw phase labels
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  
  // Attack label
  const attackX = padding + (attack / (attack + decay + holdTime + release)) * graphW / 2;
  ctx.fillText('A', attackX, padding - 5);
  
  // Decay label
  const decayX = padding + ((attack + decay / 2) / (attack + decay + holdTime + release)) * graphW;
  ctx.fillText('D', decayX, padding - 5);
  
  // Sustain label
  const sustainX = padding + ((attack + decay + sustainTime / 2) / (attack + decay + holdTime + release)) * graphW;
  ctx.fillText('S', sustainX, h - padding + 15);
  
  // Release label
  const releaseX = padding + ((attack + decay + sustainTime + release / 2) / (attack + decay + holdTime + release)) * graphW;
  ctx.fillText('R', releaseX, padding - 5);
};

// ===== REDRAW ADSR CURVE WHEN PARAMETERS CHANGE =====

const originalSetADSR = ADSRManager.prototype.setADSR;

ADSRManager.prototype.setADSR = function(attack, decay, sustain, release) {
  originalSetADSR.call(this, attack, decay, sustain, release);
  
  // Redraw curve
  this.drawADSRCurve('adsr-curve');
};

// ===== AUTO REDRAW ON LOAD =====

window.addEventListener('load', () => {
  setTimeout(() => {
    if (adsr && adsr.drawADSRCurve) {
      adsr.drawADSRCurve('adsr-curve');
      console.log('✅ ADSR curve drawn');
    }
  }, 500);
});

// ===== CONTINUOUS MONITORING =====

setInterval(() => {
  if (adsr) {
    const status = adsr.getStatus();
    
    // Log pour debug (optionnel)
    if (status.activeVoices > 0) {
      // Silencieusement - on ne log que au changement
    }
  }
}, 500);

console.log('✅ adsr_extension.js loaded - Full ADSR visualization + Smart scopes enabled');
