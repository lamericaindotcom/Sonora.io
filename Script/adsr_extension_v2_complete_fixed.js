// =====================================================================
//  ADSR_EXTENSION_V2_COMPLETE_FIXED.JS - SCOPES + COURBE ADSR (DYNAMIQUE)
// =====================================================================
//
//  Suppose :
//  - class ADSRManager définie dans adsr_complete_fixed.js
//  - oscillateur_complete.js définit :
//      * analyser1, analyser2 (globaux)
//      * drawScopeLoop(canvas, analyser, which)
//      * scopeRunning1, scopeRunning2 (globaux / bindings globaux)
// =====================================================================

ADSRManager.prototype.startScopeMonitor = function () {
  const osc1c = document.getElementById('osc1-scope');
  const osc2c = document.getElementById('osc2-scope');

  if (osc1c && this.analyser1 && typeof drawScopeLoop === 'function' && !scopeRunning1) {
    drawScopeLoop(osc1c, this.analyser1, 1);
  }
  if (osc2c && this.analyser2 && typeof drawScopeLoop === 'function' && !scopeRunning2) {
    drawScopeLoop(osc2c, this.analyser2, 2);
  }
};

// ===== Canvas DPR helper =====
function adsrDprCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, rect.width);
  const h = Math.max(1, rect.height);

  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

// ===== Courbe ADSR dynamique =====
ADSRManager.prototype.drawADSRCurve = function (canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const { ctx, w, h } = adsrDprCanvas(canvas);

  // Fond
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, w, h);

  // Grille légère
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 5; i++) {
    const y = (h * i) / 5;
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  for (let i = 0; i <= 10; i++) {
    const x = (w * i) / 10;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  ctx.stroke();

  const padding = 14;

  // Valeurs ADSR (sec)
  const A = Math.max(0.001, this.adsr?.attack ?? 0.1);
  const D = Math.max(0.001, this.adsr?.decay ?? 0.3);
  const S = Math.max(0, Math.min(1, this.adsr?.sustain ?? 0.7));
  const R = Math.max(0.001, this.adsr?.release ?? 0.5);

  // On ajoute un “hold sustain” constant juste pour la lisibilité
  const hold = 0.25;
  const total = A + D + hold + R;

  const x0 = padding;
  const y0 = h - padding;
  const xA = x0 + ((A / total) * (w - 2 * padding));
  const xD = xA + ((D / total) * (w - 2 * padding));
  const xS = xD + ((hold / total) * (w - 2 * padding));
  const xR = xS + ((R / total) * (w - 2 * padding));

  const yPeak = padding;
  const ySustain = padding + (1 - S) * (h - 2 * padding);

  // Courbe
  ctx.strokeStyle = '#00ff88';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(x0, y0);        // départ
  ctx.lineTo(xA, yPeak);     // Attack
  ctx.lineTo(xD, ySustain);  // Decay
  ctx.lineTo(xS, ySustain);  // Sustain hold
  ctx.lineTo(xR, y0);        // Release
  ctx.stroke();

  // Labels
  ctx.fillStyle = '#00ff88';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('A', (x0 + xA) / 2, h - 6);
  ctx.fillText('D', (xA + xD) / 2, h - 6);
  ctx.fillText('S', (xD + xS) / 2, h - 6);
  ctx.fillText('R', (xS + xR) / 2, h - 6);
};

console.log('✅ adsr_extension_v2_complete_fixed.js loaded (scopes + ADSR curve)');
