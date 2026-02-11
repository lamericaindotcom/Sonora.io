// =====================================================================
//  ADSR_EXTENSION_V2_COMPLETE.JS - SCOPES + COURBE ADSR (CORRIGÉ FINAL)
// =====================================================================
//
//  Suppose :
//  - class ADSRManager définie dans adsr_complete_fixed.js
//  - oscillateur_complete.js définit :
//      * analyser1, analyser2 (globaux)
//      * drawScopeLoop(canvas, analyser, which)
//      * scopeRunning1, scopeRunning2 (globaux)
//      * adsr.setAnalysers(analyser1, analyser2) appelé



ADSRManager.prototype.startScopeMonitor = function() {
  const osc1c = document.getElementById('osc1-scope');
  const osc2c = document.getElementById('osc2-scope');

  if (osc1c && this.analyser1 && !scopeRunning1) {
    drawScopeLoop(osc1c, this.analyser1, 1);
  }
  if (osc2c && this.analyser2 && !scopeRunning2) {
    drawScopeLoop(osc2c, this.analyser2, 2);
  }
};

// ===== 2. CANVAS ADSR STABLE (taille fixe HTML, DPR adaptatif) =====

function adsrDprCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return ctx;
}

// ===== 3. DESSIN COURBE ADSR =====

ADSRManager.prototype.drawADSRCurve = function(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = adsrDprCanvas(canvas);
  
  // Fond + grille
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 5; i++) {
    const y = (canvas.clientHeight * i) / 5;
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.clientWidth, y);
  }
  for (let i = 0; i <= 10; i++) {
    const x = (canvas.clientWidth * i) / 10;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.clientHeight);
  }
  ctx.stroke();

  // Courbe ADSR
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const padding = 20;
  
  ctx.strokeStyle = '#00ff88';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();

  // ATTACK
  ctx.moveTo(padding, h - padding);
  ctx.lineTo(padding + w * 0.2, padding);

  // DECAY
  ctx.lineTo(padding + w * 0.5, h * 0.4);

  // SUSTAIN
  ctx.lineTo(padding + w * 0.8, h * 0.4);

  // RELEASE
  ctx.lineTo(w - padding, h - padding);

  ctx.stroke();

  // Labels
  ctx.fillStyle = '#00ff88';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('A', padding + w * 0.1, h - 8);
  ctx.fillText('D', padding + w * 0.35, h - 8);
  ctx.fillText('S', padding + w * 0.65, h - 8);
  ctx.fillText('R', w - padding - w * 0.1, h - 8);
};

// ===== 4. AUTO REDRAW (géré par oscillateur_complete.js) =====

// Initialisation au chargement
window.addEventListener('load', () => {
  setTimeout(() => {
    if (window.adsr && adsr.drawADSRCurve) {
      adsr.drawADSRCurve('adsr-curve');
      console.log('✅ ADSR curve initialized');
    }
  }, 300);
});

// Redraw au resize
window.addEventListener('resize', () => {
  if (window.adsr && adsr.drawADSRCurve) {
    adsr.drawADSRCurve('adsr-curve');
  }
});

console.log('✅ adsr_extension_v2_complete_fixed.js loaded (scopes + stable ADSR curve)');
