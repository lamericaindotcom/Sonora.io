/* =====================================================================
   OSCILLATEUR.JS - MOTEUR DE SYNTHÉTISEUR AVEC POLYPHONIE ADSR (FINAL)
   ===================================================================== 
   
   Dépendances : adsr_complete_fixed.js → adsr_extension_v2_complete_fixed.js → oscillateur_complete_fixed.js
   
   ✅ CORRECTIONS FINALES :
   - Les sliders ADSR changent vraiment les paramètres audio
   - La courbe ADSR s'affiche au démarrage
   - La courbe se redessine en temps réel
   - Les scopes s'allument/éteignent automatiquement
   
===================================================================== */

/* ===== UTILITAIRES & CANVAS DPR (Device Pixel Ratio) ===== */

function dprCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || +canvas.getAttribute('width') || 300;
  const cssH = canvas.clientHeight || +canvas.getAttribute('height') || 120;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/* Récupère la couleur locale du contrôle ADSR/OSC */
function localColorOf(el) {
  const card = el.closest('.card, .osc-card, .filter-card');
  if (!card) return '#fe8500';
  const style = getComputedStyle(card);
  const cssv = style.getPropertyValue('--card-color').trim();
  if (cssv) return cssv;
  const dc = card.dataset.color;
  if (dc === 'blue' || dc === 'green') return '#39caff';
  if (dc === 'purple') return '#a26bff';
  return '#fe8500';
}

/* ===== CONFIGURATION AUDIO ===== */

const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext({ latencyHint: 'interactive' });

/* Analyseurs pour les oscilloscopes (affichage des formes d'onde) */
const analyser1 = audioCtx.createAnalyser();
analyser1.fftSize = 2048;

const analyser2 = audioCtx.createAnalyser();
analyser2.fftSize = 2048;

const analyserFilter = audioCtx.createAnalyser();
analyserFilter.fftSize = 2048;

/* Nœud filtre lowpass (passe-bas) */
const filterNode = audioCtx.createBiquadFilter();
filterNode.type = 'lowpass';
filterNode.frequency.value = 800;
filterNode.Q.value = 1.2;

/* Splitter pour le bypass du filtre (chemin sec vs chemin humide) */
const dryGain = audioCtx.createGain();
const wetGain = audioCtx.createGain();
dryGain.gain.value = 0;
wetGain.gain.value = 1;

filterNode.connect(analyserFilter);
filterNode.connect(wetGain);
wetGain.connect(audioCtx.destination);
dryGain.connect(audioCtx.destination);

/* Nœud de sortie principal pour le gestionnaire ADSR */
const masterOutput = audioCtx.createGain();
masterOutput.connect(dryGain);
masterOutput.connect(filterNode);

/* États globaux */
let syncOn = false;
let filterBypassed = false;

/* État des paramètres des oscillateurs */
const state = {
  vol1: 0.5, fine1: 0, semi1: 0, tune1: 0,
  vol2: 0.5, fine2: 0, semi2: 0, tune2: 0,
  octave1: 0, octave2: 0,
  filterFreq: 800,
  filterQ: 1.2
};

/* Initialiser le gestionnaire ADSR avec 4 voix polyphoniques */
window.adsr = new ADSRManager(audioCtx, masterOutput, 4);
const adsr = window.adsr;
adsr.setAnalysers(analyser1, analyser2);
if (adsr.startScopeMonitor) adsr.startScopeMonitor();
if (adsr.drawADSRCurve) adsr.drawADSRCurve('adsr-curve');

console.log('✅ ADSRManager initialisé avec surveillance intelligente des scopes');

/* ===== FONCTIONS AUXILIAIRES ===== */

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function triggerNoteOn(midi) {
  const freq = midiToFreq(midi);
  adsr.noteOn(midi, freq);
}

function triggerNoteOff(midi) {
  adsr.noteOff(midi);
}

/* ===== CONTRÔLE DES OSCILLOSCOPES ===== */

let scopeRunning1 = false;
let scopeRunning2 = false;
let scopeReqId1 = null;
let scopeReqId2 = null;

/* Boucle d'affichage pour les oscilloscopes en temps réel */
function drawScopeLoop(canvas, analyser, which) {
  const ctx = dprCanvas(canvas);
  const buf = new Uint8Array(analyser.fftSize);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const color = localColorOf(canvas);

  function loop() {
    const running = which === 1 ? scopeRunning1 : scopeRunning2;
    if (!running) return;

    const reqId = requestAnimationFrame(loop);
    if (which === 1) scopeReqId1 = reqId;
    else scopeReqId2 = reqId;

    analyser.getByteTimeDomainData(buf);
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    const slice = w / buf.length;
    
    for (let i = 0; i < buf.length; i++) {
      const x = i * slice;
      const v = buf[i] / 255;
      const y = v * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  if (which === 1) {
    scopeRunning1 = true;
    scopeReqId1 = requestAnimationFrame(loop);
  } else {
    scopeRunning2 = true;
    scopeReqId2 = requestAnimationFrame(loop);
  }
}

/* Arrêter un oscilloscope */
function stopScope(which) {
  if (which === 1) {
    scopeRunning1 = false;
    if (scopeReqId1 != null) cancelAnimationFrame(scopeReqId1);
  } else {
    scopeRunning2 = false;
    if (scopeReqId2 != null) cancelAnimationFrame(scopeReqId2);
  }
}

/* ===== VISUALISATION DE LA RÉPONSE DU FILTRE ===== */

const filterCanvas = document.getElementById('filter-curve');
let filterCtx = filterCanvas ? dprCanvas(filterCanvas) : null;
let filterNeedsRedraw = true;

function innerDrawFilterResponse() {
  if (!filterCtx || !filterCanvas) return;
  const canvas = filterCanvas;
  filterCtx = dprCanvas(canvas);
  const ctx = filterCtx;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  /* Générer une courbe de réponse en fréquence */
  const N = 512;
  const freqs = new Float32Array(N);
  const mag = new Float32Array(N);
  const phase = new Float32Array(N);
  const fmin = 20;
  const fmax = audioCtx.sampleRate / 2;

  for (let i = 0; i < N; i++) {
    freqs[i] = fmin * Math.pow(fmax / fmin, i / (N - 1));
  }

  try {
    filterNode.getFrequencyResponse(freqs, mag, phase);
  } catch {
    mag.fill(1);
  }

  ctx.clearRect(0, 0, w, h);
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#050508');
  bgGrad.addColorStop(1, '#020204');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  /* Grille */
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  for (let g = 0; g <= 4; g++) {
    const x = (w * g) / 4;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    const y = (h * g) / 4;
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  /* Courbe du filtre */
  const color = localColorOf(canvas);
  ctx.beginPath();
  const topY = h * 0.33;
  const bottomY = h;
  
  for (let i = 0; i < N; i++) {
    const x = (Math.log(freqs[i] / fmin) / Math.log(fmax / fmin)) * w;
    const gain = Math.min(Math.max(0, mag[i]), 1);
    const y = bottomY - gain * (bottomY - topY);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.stroke();
  ctx.shadowBlur = 0;

  /* Marqueur de fréquence de coupure */
  const cutNorm = Math.log(filterNode.frequency.value / fmin) / Math.log(fmax / fmin);
  const cutX = Math.min(Math.max(0, cutNorm * w), w);
  ctx.fillStyle = color;
  ctx.fillRect(cutX - 1, h - 10, 2, 10);
}

function filterResponseLoop() {
  if (filterNeedsRedraw) {
    innerDrawFilterResponse();
    filterNeedsRedraw = false;
  }
  requestAnimationFrame(filterResponseLoop);
}

if (filterCanvas) filterResponseLoop();

/* ===== DESSIN DES KNOBS ===== */

function knobDrawer(canvas, normalized) {
  const ctx = dprCanvas(canvas);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;

  const baseColor = localColorOf(canvas);
  const ringColor = baseColor;
  const trackColor = 'rgba(0,0,0,0.20)';
  const knobColor = '#2b2a2aff';
  const borderColor = baseColor;

  const rOuter = Math.min(cx, cy) - 1;
  const rRing = rOuter - 4;
  const rKnob = rRing - 7;

  const startAngle = Math.PI * 0.75;
  const totalSpan = Math.PI * 1.5;
  const valueAngle = startAngle + normalized * totalSpan;

  /* Piste de base */
  ctx.lineWidth = 3;
  ctx.strokeStyle = trackColor;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, rRing, startAngle, startAngle + totalSpan, false);
  ctx.stroke();

  /* Arc de valeur */
  ctx.strokeStyle = ringColor;
  ctx.beginPath();
  ctx.arc(cx, cy, rRing, startAngle, valueAngle);
  ctx.stroke();

  /* Cercle du knob */
  ctx.fillStyle = knobColor;
  ctx.beginPath();
  ctx.arc(cx, cy, rKnob, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 1;
  ctx.strokeStyle = borderColor;
  ctx.beginPath();
  ctx.arc(cx, cy, rKnob, 0, Math.PI * 2);
  ctx.stroke();

  /* Indicateur */
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(valueAngle - Math.PI / 2);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = baseColor;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -rKnob * -0.9);
  ctx.stroke();
  ctx.restore();
}

/* Attacher un knob interactif à un canvas et un range input */
function attachKnob(canvasId, rangeId, onChange) {
  const c = document.getElementById(canvasId);
  const r = document.getElementById(rangeId);
  if (!c || !r) return;

  const min = parseFloat(r.min);
  const max = parseFloat(r.max);
  const span = max - min;

  const normInit = (parseFloat(r.value) - min) / span;
  knobDrawer(c, normInit);

  let isDragging = false;
  let startY = 0;
  let startVal = 0;

  function updateKnob(value) {
    const clamped = Math.max(min, Math.min(max, value));
    r.value = clamped;
    const norm = (clamped - min) / span;
    knobDrawer(c, norm);
    onChange(clamped);
  }

  function start(e) {
    e.preventDefault();
    isDragging = true;
    startY = e.touches ? e.touches[0].clientY : e.clientY;
    startVal = parseFloat(r.value);

    document.addEventListener('mousemove', move, { passive: false });
    document.addEventListener('mouseup', end, { passive: false });
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', end, { passive: false });
  }

  function move(e) {
    if (!isDragging) return;
    e.preventDefault();

    const curY = e.touches ? e.touches[0].clientY : e.clientY;
    const deltaY = startY - curY;
    const sensitivity = span / 300;
    const newVal = startVal + deltaY * sensitivity;
    updateKnob(newVal);
  }

  function end(e) {
    if (!isDragging) return;
    isDragging = false;
    e?.preventDefault();

    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', end);
    document.removeEventListener('touchmove', move);
    document.removeEventListener('touchend', end);
  }

  c.addEventListener('mousedown', start);
  c.addEventListener('touchstart', start, { passive: false });

  c.addEventListener('wheel', (e) => {
    e.preventDefault();
    const step = span * 0.02;
    const direction = e.deltaY > 0 ? -1 : 1;
    const newVal = parseFloat(r.value) + direction * step;
    updateKnob(newVal);
  }, { passive: false });

  c.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      updateKnob(parseFloat(r.value) + span * 0.01);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      updateKnob(parseFloat(r.value) - span * 0.01);
    }
  });
  c.setAttribute('tabindex', '0');
}

/* ===== INITIALISATION DE L'INTERFACE ===== */

function initUI() {
  ['osc1-scope', 'osc2-scope', 'filter-curve', 'adsr-curve'].forEach(id => {
    const el = document.getElementById(id);
    if (el) dprCanvas(el);
  });
  filterNeedsRedraw = true;
}

window.addEventListener('resize', initUI);

window.addEventListener('load', () => {
  /* ===== OSCILLATEUR 1 - KNOBS ===== */
  attachKnob('volume1', 'volume1-range', (v) => {
    state.vol1 = parseFloat(v);
    adsr.setOscillatorSettings({ vol1: state.vol1 });
    adsr.reapplyPitchToActiveVoices(midiToFreq);
  });
  attachKnob('fine1', 'fine1-range', (v) => {
    state.fine1 = parseFloat(v);
    adsr.setOscillatorSettings({ fine1: state.fine1 });
    adsr.reapplyPitchToActiveVoices(midiToFreq);
  });
  attachKnob('semi1', 'semi1-range', (v) => {
    state.semi1 = parseFloat(v);
    adsr.setOscillatorSettings({ semi1: state.semi1 });
    adsr.reapplyPitchToActiveVoices(midiToFreq);
  });
  attachKnob('tune1', 'tune1-range', (v) => {
    state.tune1 = parseFloat(v);
  });
  attachKnob('octave1', 'octave1-range', (v) => {
    state.octave1 = parseFloat(v);
    adsr.setOscillatorSettings({ octave1: state.octave1 });
    adsr.reapplyPitchToActiveVoices(midiToFreq);
  });

  /* ===== OSCILLATEUR 2 - KNOBS ===== */
  attachKnob('volume2', 'volume2-range', (v) => {
    state.vol2 = parseFloat(v);
    adsr.setOscillatorSettings({ vol2: state.vol2 });
    adsr.reapplyPitchToActiveVoices(midiToFreq);
  });
  attachKnob('fine2', 'fine2-range', (v) => {
    state.fine2 = parseFloat(v);
    adsr.setOscillatorSettings({ fine2: state.fine2 });
    adsr.reapplyPitchToActiveVoices(midiToFreq);
  });
  attachKnob('semi2', 'semi2-range', (v) => {
    state.semi2 = parseFloat(v);
    adsr.setOscillatorSettings({ semi2: state.semi2 });
    adsr.reapplyPitchToActiveVoices(midiToFreq);
  });
  attachKnob('tune2', 'tune2-range', (v) => {
    state.tune2 = parseFloat(v);
  });
  attachKnob('octave2', 'octave2-range', (v) => {
    state.octave2 = parseFloat(v);
    adsr.setOscillatorSettings({ octave2: state.octave2 });
    adsr.reapplyPitchToActiveVoices(midiToFreq);
  });

    /* ===== KNOBS FILTRE ===== */
  const freqValDisplay = document.getElementById('freq-val');
  const qValDisplay = document.getElementById('q-val');

  attachKnob('filterFreq', 'freq-range', (v) => {
    state.filterFreq = v;
    filterNode.frequency.value = v;
    filterNeedsRedraw = true;
    if (freqValDisplay) freqValDisplay.textContent = `${Math.round(v)} Hz`;
  });

  attachKnob('filterQ', 'q-range', (v) => {
    state.filterQ = v;
    filterNode.Q.value = v;
    filterNeedsRedraw = true;
    if (qValDisplay) qValDisplay.textContent = v.toFixed(1);
  });

  /* ===== SÉLECTEUR TYPE DE FILTRE ===== */
  const filterTypeSelect = document.getElementById('filter-type');
  if (filterTypeSelect) {
    filterTypeSelect.addEventListener('change', (e) => {
      filterNode.type = e.target.value;
      filterNeedsRedraw = true;
      console.log('🎛️ Type de filtre:', e.target.value);
    });
  }

  /* ===== BYPASS FILTRE ===== */
  const filterBypass = document.getElementById('filter-bypass');
  if (filterBypass) {
    filterBypass.addEventListener('change', (e) => {
      filterBypassed = e.target.checked;
      if (filterBypassed) {
        dryGain.gain.value = 1;
        wetGain.gain.value = 0;
        console.log('🚫 Bypass filtre: ACTIVÉ');
      } else {
        dryGain.gain.value = 0;
        wetGain.gain.value = 1;
        console.log('✓ Bypass filtre: DÉSACTIVÉ');
      }
    });
  }


    /* ===== ADSR - KNOBS ROTATIFS ===== */
  function updateADSRDisplay() {
    const attack = parseFloat(document.getElementById('attack-range')?.value || 100) / 1000;
    const decay = parseFloat(document.getElementById('decay-range')?.value || 300) / 1000;
    const sustain = parseFloat(document.getElementById('sustain-range')?.value || 0.7);
    const release = parseFloat(document.getElementById('release-range')?.value || 500) / 1000;
    
    adsr.setADSR(attack, decay, sustain, release);
    
    if (adsr.drawADSRCurve) {
      adsr.drawADSRCurve('adsr-curve');
    }
  }

  // Attack Knob
  attachKnob('attack-knob', 'attack-range', (v) => {
    const val = Math.round(parseFloat(v));
    const displayEl = document.getElementById('attack-display');
    if (displayEl) displayEl.textContent = val + ' ms';
    updateADSRDisplay();
  });

  // Decay Knob
  attachKnob('decay-knob', 'decay-range', (v) => {
    const val = Math.round(parseFloat(v));
    const displayEl = document.getElementById('decay-display');
    if (displayEl) displayEl.textContent = val + ' ms';
    updateADSRDisplay();
  });

  // Sustain Knob
  attachKnob('sustain-knob', 'sustain-range', (v) => {
    const val = parseFloat(v).toFixed(2);
    const displayEl = document.getElementById('sustain-display');
    if (displayEl) displayEl.textContent = val;
    updateADSRDisplay();
  });

  // Release Knob
  attachKnob('release-knob', 'release-range', (v) => {
    const val = Math.round(parseFloat(v));
    const displayEl = document.getElementById('release-display');
    if (displayEl) displayEl.textContent = val + ' ms';
    updateADSRDisplay();
  });

  // Initialiser l'affichage ADSR au démarrage
  updateADSRDisplay();

  /* ===== FILTER ENVELOPE ===== */
    const filterADSR = {
      attack: 0.05,
      decay: 0.2,
      sustain: 0.3,
      release: 0.3,
      amount: 2000,
      enabled: true
    };

    function updateFilterADSRDisplay() {
      const attack = parseFloat(document.getElementById('filter-attack-range')?.value || 50) / 1000;
      const decay = parseFloat(document.getElementById('filter-decay-range')?.value || 200) / 1000;
      const sustain = parseFloat(document.getElementById('filter-sustain-range')?.value || 0.3);
      const release = parseFloat(document.getElementById('filter-release-range')?.value || 300) / 1000;
      
      filterADSR.attack = attack;
      filterADSR.decay = decay;
      filterADSR.sustain = sustain;
      filterADSR.release = release;
      
      drawFilterADSRCurve();
    }

    function drawFilterADSRCurve() {
      const canvas = document.getElementById('filter-adsr-curve');
      if (!canvas) return;
      
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, w, h);
      
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
      const A = Math.max(0.001, filterADSR.attack);
      const D = Math.max(0.001, filterADSR.decay);
      const S = Math.max(0, Math.min(1, filterADSR.sustain));
      const R = Math.max(0.001, filterADSR.release);
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
      
      ctx.strokeStyle = '#39caff';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(xA, yPeak);
      ctx.lineTo(xD, ySustain);
      ctx.lineTo(xS, ySustain);
      ctx.lineTo(xR, y0);
      ctx.stroke();
      
      ctx.fillStyle = '#39caff';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('A', (x0 + xA) / 2, h - 6);
      ctx.fillText('D', (xA + xD) / 2, h - 6);
      ctx.fillText('S', (xD + xS) / 2, h - 6);
      ctx.fillText('R', (xS + xR) / 2, h - 6);
    }

    attachKnob('filter-attack-knob', 'filter-attack-range', (v) => {
      document.getElementById('filter-attack-display').textContent = Math.round(v) + ' ms';
      updateFilterADSRDisplay();
    });

    attachKnob('filter-decay-knob', 'filter-decay-range', (v) => {
      document.getElementById('filter-decay-display').textContent = Math.round(v) + ' ms';
    const displayEl = document.getElementById('filter-decay-display');
    if (displayEl) displayEl.textContent = Math.round(v) + ' ms';
    updateFilterADSRDisplay();
  });

  attachKnob('filter-sustain-knob', 'filter-sustain-range', (v) => {
    const displayEl = document.getElementById('filter-sustain-display');
    if (displayEl) displayEl.textContent = parseFloat(v).toFixed(2);
    updateFilterADSRDisplay();
  });

  attachKnob('filter-release-knob', 'filter-release-range', (v) => {
    const displayEl = document.getElementById('filter-release-display');
    if (displayEl) displayEl.textContent = Math.round(v) + ' ms';
    updateFilterADSRDisplay();
  });

  attachKnob('filter-amount-knob', 'filter-amount-range', (v) => {
    filterADSR.amount = parseFloat(v);
    const displayEl = document.getElementById('filter-amount-display');
    if (displayEl) displayEl.textContent = Math.round(v) + ' Hz';
  });

  const filterEnvToggle = document.getElementById('filter-env-toggle');
  if (filterEnvToggle) {
    filterEnvToggle.addEventListener('change', (e) => {
      filterADSR.enabled = e.target.checked;
      console.log('🎛️ Filter Envelope:', filterADSR.enabled ? 'ON' : 'OFF');
    });
  }

  updateFilterADSRDisplay();

  /* ===== SÉLECTION DES FORMES D'ONDE ===== */
  document.querySelectorAll('input[name="wave1"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      adsr.setOscillatorSettings({ waveform1: e.target.value });
    });
  });

  document.querySelectorAll('input[name="wave2"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      adsr.setOscillatorSettings({ waveform2: e.target.value });
    });
  });

  /* ===== TOGGLE SYNC ===== */
  const syncToggle = document.getElementById('sync-toggle');
  if (syncToggle) {
    syncToggle.addEventListener('change', () => {
      syncOn = syncToggle.checked;
      adsr.setOscillatorSettings({ sync: syncOn });
      console.log('🔄 Sync:', syncOn ? 'ON' : 'OFF');
    });
  }

  /* ===== AFFICHAGE DU NOMBRE DE VOIX ACTIVES ===== */
  setInterval(() => {
    const status = adsr.getStatus();
    const voiceCountEl = document.getElementById('voice-count');
    if (voiceCountEl) {
      voiceCountEl.textContent = `${status.activeVoices}/${status.totalVoices}`;
    }
  }, 100);

  initUI();
  
  /* ✅ INITIALISER LA COURBE ADSR AU DÉMARRAGE */
  setTimeout(() => {
    if (adsr && adsr.drawADSRCurve) {
      adsr.drawADSRCurve('adsr-curve');
      console.log('✅ Courbe ADSR initialisée au démarrage');
    }
  }, 100);
  
  console.log('✅ Interface initialisée - Système ADSR entièrement opérationnel!');
});
      

/* ===== CLAVIER VIRTUEL (SOURIS) ===== */

const keys = document.querySelectorAll('.keyboard .key');
keys.forEach(key => {
  key.addEventListener('mousedown', async () => {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    if (adsr.startScopeMonitor) adsr.startScopeMonitor();
    if (adsr.drawADSRCurve) adsr.drawADSRCurve('adsr-curve');

    const midi = parseInt(key.dataset.midi, 10);
    triggerNoteOn(midi);
    key.classList.add('active');
  });

  key.addEventListener('mouseup', () => {
    const midi = parseInt(key.dataset.midi, 10);
    triggerNoteOff(midi);
    key.classList.remove('active');
  });

  key.addEventListener('mouseleave', () => {
    const midi = parseInt(key.dataset.midi, 10);
    triggerNoteOff(midi);
    key.classList.remove('active');
  });
});

/* ===== CLAVIER PC (AZERTY) ===== */

const keyToMidi = {
  KeyQ: 60, KeyS: 61, KeyD: 62, KeyF: 63, KeyG: 64,
  KeyH: 65, KeyJ: 66, KeyK: 67, KeyL: 68, KeyM: 69,
  Comma: 70, Semicolon: 71, Quote: 72
};

let heldKeys = new Set();

function handleKey(event) {
  const { code, type } = event;
  const midi = keyToMidi[code];
  if (!midi) return;

  if (type === 'keydown') {
    if (event.repeat) return;
    heldKeys.add(code);
    if (audioCtx.state === 'suspended') audioCtx.resume();
    triggerNoteOn(midi);
    const keyEl = document.querySelector(`.keyboard .key[data-midi="${midi}"]`);
    if (keyEl) keyEl.classList.add('active');
  } else if (type === 'keyup') {
    if (!heldKeys.has(code)) return;
    heldKeys.delete(code);
    triggerNoteOff(midi);
    const keyEl = document.querySelector(`.keyboard .key[data-midi="${midi}"]`);
    if (keyEl) keyEl.classList.remove('active');
  }

  event.preventDefault();
}

window.addEventListener('keydown', handleKey);
window.addEventListener('keyup', handleKey);
