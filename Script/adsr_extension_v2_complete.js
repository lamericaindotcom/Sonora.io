 // Connecter les oscillateurs aux analyseurs
  if (this.analyser1 && this.osc1) {
    this.osc1.connect(this.analyser1);
  }
  if (this.analyser2 && this.osc2) {
    this.osc2.connect(this.analyser2);
  }
;

// ===== EXTEND ADSRManager - ANALYSERS + VISUALISATION =====

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
  setInterval(() => {
    const activeVoices = this.getActiveVoiceCount();
    
    if (activeVoices === 0) {
      if (scopeRunning1 || scopeRunning2) {
        console.log('⏹️ No active voices - stopping scopes');
        stopScope(1);
        stopScope(2);
      }
    } else {
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
  if (!canvas) {
    console.warn('⚠️ Canvas #' + canvasId + ' not found');
    return;
  }
  
  const ctx = adsrDprCanvas(canvas);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const padding = 30;
  const graphW = w - 2 * padding;
  const graphH = h - 2 * padding;
  
  // Background
  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 0, w, h);
  
  // Border
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1;
  ctx.strokeRect(padding, padding, graphW, graphH);
  
  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    const x = padding + (graphW / 4) * i;
    ctx.moveTo(x, padding);
    ctx.lineTo(x, h - padding);
    
    const y = padding + (graphH / 4) * i;
    ctx.moveTo(padding, y);
    ctx.lineTo(w - padding, y);
  }
  ctx.stroke();
  
  // ===== CALCULATE ADSR CURVE POINTS =====
  
  const attack = this.adsr.attack;
  const decay = this.adsr.decay;
  const sustain = this.adsr.sustain;
  const release = this.adsr.release;
  const holdTime = 0.3;
  
  const totalTime = attack + decay + holdTime + release;
  const points = [];
  
  // Attack phase (0 → 1)
  const attackSteps = Math.max(10, Math.ceil(attack * 100));
  for (let i = 0; i <= attackSteps; i++) {
    const t = (i / attackSteps) * attack;
    const norm = t / totalTime;
    const x = padding + norm * graphW;
    const level = t / attack;
    const y = h - padding - level * graphH;
    points.push({ x, y, phase: 'A' });
  }
  
  // Decay phase (1 → sustain)
  const decaySteps = Math.max(10, Math.ceil(decay * 100));
  for (let i = 1; i <= decaySteps; i++) {
    const t = attack + (i / decaySteps) * decay;
    const norm = t / totalTime;
    const x = padding + norm * graphW;
    const progress = i / decaySteps;
    const level = 1 - progress * (1 - sustain);
    const y = h - padding - level * graphH;
    points.push({ x, y, phase: 'D' });
  }
  
  // Sustain phase (hold level)
  const sustainSteps = Math.max(10, Math.ceil(holdTime * 100));
  for (let i = 1; i <= sustainSteps; i++) {
    const t = attack + decay + (i / sustainSteps) * holdTime;
    const norm = t / totalTime;
    const x = padding + norm * graphW;
    const level = sustain;
    const y = h - padding - level * graphH;
    points.push({ x, y, phase: 'S' });
  }
  
  // Release phase (sustain → 0)
  const releaseSteps = Math.max(10, Math.ceil(release * 100));
  for (let i = 1; i <= releaseSteps; i++) {
    const t = attack + decay + holdTime + (i / releaseSteps) * release;
    const norm = t / totalTime;
    const x = padding + norm * graphW;
    const progress = i / releaseSteps;
    const level = sustain * (1 - progress);
    const y = h - padding - level * graphH;
    points.push({ x, y, phase: 'R' });
  }
  
  // ===== DRAW CURVE =====
  
  ctx.strokeStyle = '#32b8c6';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  points.forEach((point, i) => {
    i === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
  
  // ===== DRAW POINTS AT TRANSITIONS =====
  
  const transitionPoints = [
    { x: padding, y: h - padding, label: '0' },
    { 
      x: padding + (attack / totalTime) * graphW, 
      y: h - padding - graphH,
      label: '1'
    },
    { 
      x: padding + ((attack + decay) / totalTime) * graphW, 
      y: h - padding - sustain * graphH,
      label: 'S'
    },
    { 
      x: w - padding, 
      y: h - padding,
      label: '0'
    }
  ];
  
  ctx.fillStyle = '#32b8c6';
  transitionPoints.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // ===== DRAW AXIS LABELS =====
  
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  ctx.fillText('A', padding + (attack / totalTime / 2) * graphW, h - padding + 20);
  ctx.fillText('D', padding + ((attack + decay / 2) / totalTime) * graphW, h - padding + 20);
  ctx.fillText('S', padding + ((attack + decay + holdTime / 2) / totalTime) * graphW, h - padding + 20);
  ctx.fillText('R', padding + ((attack + decay + holdTime + release / 2) / totalTime) * graphW, h - padding + 20);
  
  ctx.textAlign = 'right';
  ctx.fillText('1.0', padding - 10, h - padding - graphH);
  ctx.fillText('0.5', padding - 10, h - padding - graphH / 2);
  ctx.fillText('0.0', padding - 10, h - padding);
  
  // ===== DRAW VALUE DISPLAYS =====
  
  ctx.fillStyle = '#32b8c6';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  const values = [
    `A: ${(attack * 1000).toFixed(0)}ms`,
    `D: ${(decay * 1000).toFixed(0)}ms`,
    `S: ${(sustain * 100).toFixed(0)}%`,
    `R: ${(release * 1000).toFixed(0)}ms`
  ];
  
  values.forEach((val, i) => {
    ctx.fillText(val, padding + 8, padding + 8 + i * 14);
  });
};

// ===== REDRAW CURVE WHEN PARAMETERS CHANGE =====

const originalSetADSR = ADSRManager.prototype.setADSR;

ADSRManager.prototype.setADSR = function(attack, decay, sustain, release) {
  originalSetADSR.call(this, attack, decay, sustain, release);
  
  // Redraw curve immediately
  if (this.drawADSRCurve) {
    this.drawADSRCurve('adsr-curve');
  }
};

// ===== AUTO REDRAW ON WINDOW LOAD =====

window.addEventListener('load', () => {
  setTimeout(() => {
    if (adsr && adsr.drawADSRCurve) {
      adsr.drawADSRCurve('adsr-curve');
      console.log('✅ ADSR curve initialized');
    }
  }, 500);
});

// ===== REDRAW ON WINDOW RESIZE =====

window.addEventListener('resize', () => {
  if (adsr && adsr.drawADSRCurve) {
    adsr.drawADSRCurve('adsr-curve');
  }
});

console.log('✅ adsr_extension_v2.js loaded - Full ADSR visualization + Smart scopes enabled');