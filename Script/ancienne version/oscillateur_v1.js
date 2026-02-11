/* =====================
   Utilities & Canvas DPR
   ===================== */
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

/* =====================
       Audio Setup 
   ===================== */
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext({ latencyHint: 'interactive' });

const filterNode = audioCtx.createBiquadFilter();
filterNode.type = 'lowpass';
filterNode.frequency.value = 800;
filterNode.Q.value = 1.2;
filterNode.connect(audioCtx.destination);

let adsr = new ADSRManager (audioCtx, filterNode, 4);
console.log('ADSRManager initialized');

let osc1, osc2, gain1, gain2;
let syncOn = false;
let filterBypassed = false;

// fréquences de base des deux oscillateurs
let baseFreq1 = 220; // Hz
let baseFreq2 = 110; // Hz

/* knob state */
const state = {
  vol1: 0.5, fine1: 0, semi1: 0, tune1: 0,
  vol2: 0.5, fine2: 0, semi2: 0, tune2: 0,
  octave1: 0, octave2: 0,
  filterFreq: 800,
  filterQ: 1.2
};

/* =====================
   Oscillator Creation (voix unique globale)
   ===================== */
function createOscs() {
  osc1 = audioCtx.createOscillator();
  osc2 = audioCtx.createOscillator();
  gain1 = audioCtx.createGain();
  gain2 = audioCtx.createGain();

  // Oscillateurs -> gains
  osc1.connect(gain1);
  osc2.connect(gain2);

  // démarrage en mute
  gain1.gain.value = 0;
  gain2.gain.value = 0;

  updateWaveforms();
  updateOscFreqs();

  // (par sécurité) s'assurer que rien n'est relié avant de re-router
  gain1.disconnect();
  gain2.disconnect();

  // Gains -> filtre ou sortie
  if (filterBypassed) {
    gain1.connect(audioCtx.destination);
    gain2.connect(audioCtx.destination);
  } else {
    gain1.connect(filterNode);
    gain2.connect(filterNode);
    filterNode.connect(audioCtx.destination);
  }

  // démarrer les osc une seule fois, synchronisés
  const t = audioCtx.currentTime;
  osc1.start(t);
  osc2.start(t);
}

/* === Note & clavier virtuel / PC (monophonique) === */
function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function noteToName(midi){
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'E#', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  return notes[midi % 12] + octave;
}

function setNoteFromMidi(midi) {
  const f = midiToFreq(midi);
  baseFreq1 = f;
  baseFreq2 = f / 2; // osc2 une octave en dessous par exemple
  updateOscFreqs();
}

/* =====================
   Update oscillator frequencies
   ===================== */
function updateOscFreqs() {
  if (!osc1 && !osc2) return;

  const semitoneFactor1 = Math.pow(2, (state.semi1 + state.tune1) / 12);
  const octaveFactor1 = Math.pow(2, state.octave1);
  const base1 = baseFreq1 * semitoneFactor1 * octaveFactor1;

  if (osc1) {
    osc1.frequency.value = base1;
    osc1.detune.value = state.fine1;
  }

  if (osc2) {
    if (syncOn && osc1) {
      osc2.frequency.value = base1;
      osc2.detune.value = state.fine2;
    } else {
      const semitoneFactor2 = Math.pow(2, (state.semi2 + state.tune2) / 12);
      const octaveFactor2 = Math.pow(2, state.octave2);
      const base2 = baseFreq2 * semitoneFactor2 * octaveFactor2;
      osc2.frequency.value = base2;
      osc2.detune.value = state.fine2;
    }
  }
}

/* =====================
   Update waveforms
   ===================== */
function updateWaveforms() {
  if (!osc1 && !osc2) return;

  const w1 = document.querySelector('input[name="wave1"]:checked');
  const w2 = document.querySelector('input[name="wave2"]:checked');

  if (w1 && osc1) osc1.type = w1.value;
  if (w2 && osc2) osc2.type = w2.value;
}

/* =====================
   Analysers & Scopes
   ===================== */
const analyser1 = audioCtx.createAnalyser();
analyser1.fftSize = 2048;
const analyser2 = audioCtx.createAnalyser();
analyser2.fftSize = 2048;
const analyserFilter = audioCtx.createAnalyser();
analyserFilter.fftSize = 2048;

function connectAnalysers() {
  if (!osc1 || !osc2 || !filterNode) return;
  osc1.connect(analyser1);
  osc2.connect(analyser2);
  filterNode.connect(analyserFilter);
}

// contrôle des scopes
let scopeRunning1 = false;
let scopeRunning2 = false;
let scopeReqId1 = null;
let scopeReqId2 = null;

function drawScopeLoop(canvas, analyser, which) {
  console.log('start scope', which);
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

function stopScope(which) {
  console.log('stop scope' , which);
  if (which === 1) {
    scopeRunning1 = false;
    if (scopeReqId1 != null) cancelAnimationFrame(scopeReqId1);
  } else {
    scopeRunning2 = false;
    if (scopeReqId2 != null) cancelAnimationFrame(scopeReqId2);
  }
}

/* =====================
   Filter Response Drawing
   ===================== */
const filterCanvas = document.getElementById('filter-curve');
let filterCtx = filterCanvas ? dprCanvas(filterCanvas) : null;
let filterNeedsRedraw = true;

function innerDrawFilterResponse() {
  if (!filterCtx || !filterCanvas) return;
  const canvas = filterCanvas;
  dprCanvas(canvas);
  const ctx = filterCtx;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

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

  ctx.lineWidth = 0.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  for (let g = 0; g <= 4; g++) {
    const x = (w * g) / 4;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let g = 0; g <= 4; g++) {
    const y = (h * g) / 4;
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

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

/* =====================
   Knob Drawing
   ===================== */
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

  ctx.lineWidth = 3;
  ctx.strokeStyle = trackColor;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, rRing, startAngle, startAngle + totalSpan, false);
  ctx.stroke();

  ctx.strokeStyle = ringColor;
  ctx.beginPath();
  ctx.arc(cx, cy, rRing, startAngle, valueAngle);
  ctx.stroke();

  ctx.fillStyle = knobColor;
  ctx.beginPath();
  ctx.arc(cx, cy, rKnob, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 1;
  ctx.strokeStyle = borderColor;
  ctx.beginPath();
  ctx.arc(cx, cy, rKnob, 0, Math.PI * 2);
  ctx.stroke();

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

/* =====================
   Attach knobs
   ===================== */
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

/* =====================
   Initialize canvases and UI
   ===================== */
function initUI() {
  ['osc1-scope', 'osc2-scope', 'filter-curve'].forEach(id => {
    const el = document.getElementById(id);
    if (el) dprCanvas(el);
  });
  filterNeedsRedraw = true;
}

window.addEventListener('resize', initUI);

/* =====================
   Initialization after DOM loaded
   ===================== */
window.addEventListener('load', () => {
  // Knobs osc1
  attachKnob('volume1', 'volume1-range', (v) => {
    state.vol1 = parseFloat(v);
    if (gain1) gain1.gain.value = state.vol1;
  });
  attachKnob('fine1', 'fine1-range', (v) => {
    state.fine1 = parseFloat(v);
    updateOscFreqs();
  });
  attachKnob('semi1', 'semi1-range', (v) => {
    state.semi1 = parseFloat(v);
    updateOscFreqs();
  });
  attachKnob('tune1', 'tune1-range', (v) => {
    state.tune1 = parseFloat(v);
    updateOscFreqs();
  });
  attachKnob('octave1', 'octave1-range', (v) => {
    state.octave1 = parseFloat(v);
    updateOscFreqs();
  });

  // Knobs osc2
  attachKnob('volume2', 'volume2-range', (v) => {
    state.vol2 = parseFloat(v);
    if (gain2) gain2.gain.value = state.vol2;
  });
  attachKnob('fine2', 'fine2-range', (v) => {
    state.fine2 = parseFloat(v);
    updateOscFreqs();
  });
  attachKnob('semi2', 'semi2-range', (v) => {
    state.semi2 = parseFloat(v);
    updateOscFreqs();
  });
  attachKnob('tune2', 'tune2-range', (v) => {
    state.tune2 = parseFloat(v);
    updateOscFreqs();
  });
  attachKnob('octave2', 'octave2-range', (v) => {
    state.octave2 = parseFloat(v);
    updateOscFreqs();
  });

  // Knobs filtre
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

  // Waves
  document
    .querySelectorAll('input[name="wave1"], input[name="wave2"]')
    .forEach(radio => {
      radio.addEventListener('change', updateWaveforms);
    });

  // Sync
  const syncToggle = document.getElementById('sync-toggle');
  if (syncToggle) {
    syncToggle.addEventListener('change', () => {
      syncOn = syncToggle.checked;
      updateOscFreqs();
    });
  }

  // Bypass filtre
  const filterBypass = document.getElementById('filter-bypass');
  if (filterBypass) {
    filterBypass.addEventListener('change', (e) => {
      filterBypassed = e.target.checked;
      if (!gain1 || !gain2) return;
      gain1.disconnect();
      gain2.disconnect();
      if (filterBypassed) {
        gain1.connect(audioCtx.destination);
        gain2.connect(audioCtx.destination);
      } else {
        gain1.connect(filterNode);
        gain2.connect(filterNode);
        filterNode.connect(audioCtx.destination);
      }
              // ===== ADSR CONTROLS =====
        // Puisque les sliders ADSR sont déjà dans index.html,
        // on les connecte maintenant au ADSRManager
        
        // Helper pour mettre à jour l'affichage des paramètres
        function updateADSRDisplay() {
            const attack = parseFloat(document.getElementById('attack-range')?.value || 100) / 1000;
            const decay = parseFloat(document.getElementById('decay-range')?.value || 300) / 1000;
            const sustain = parseFloat(document.getElementById('sustain-range')?.value || 0.7);
            const release = parseFloat(document.getElementById('release-range')?.value || 500) / 1000;
            
            adsr.setADSR(attack, decay, sustain, release);
        }

        const attackInput = document.getElementById('attack-range');
        if (attackInput) {
            attackInput.addEventListener('input', (e) => {
                document.getElementById('attack-display').textContent = Math.round(parseFloat(e.target.value)) + ' ms';
                updateADSRDisplay();
            });
        }

        const decayInput = document.getElementById('decay-range');
        if (decayInput) {
            decayInput.addEventListener('input', (e) => {
                document.getElementById('decay-display').textContent = Math.round(parseFloat(e.target.value)) + ' ms';
                updateADSRDisplay();
            });
        }

        const sustainInput = document.getElementById('sustain-range');
        if (sustainInput) {
            sustainInput.addEventListener('input', (e) => {
                document.getElementById('sustain-display').textContent = parseFloat(e.target.value).toFixed(2);
                updateADSRDisplay();
            });
        }

        const releaseInput = document.getElementById('release-range');
        if (releaseInput) {
            releaseInput.addEventListener('input', (e) => {
                document.getElementById('release-display').textContent = Math.round(parseFloat(e.target.value)) + ' ms';
                updateADSRDisplay();
            });
        }

        // Initialiser les valeurs ADSR une première fois
        updateADSRDisplay();

        // ===== UPDATE OSCILLATOR SETTINGS WHEN KNOBS CHANGE =====
        // Mettre à jour les settings oscillateur quand on change les knobs
        document.getElementById('volume1-range')?.addEventListener('input', (e) => {
            adsr.setOscillatorSettings({ vol1: parseFloat(e.target.value) });
        });

        document.getElementById('volume2-range')?.addEventListener('input', (e) => {
            adsr.setOscillatorSettings({ vol2: parseFloat(e.target.value) });
        });

        document.getElementById('fine1-range')?.addEventListener('input', (e) => {
            adsr.setOscillatorSettings({ fine1: parseFloat(e.target.value) });
        });

        document.getElementById('fine2-range')?.addEventListener('input', (e) => {
            adsr.setOscillatorSettings({ fine2: parseFloat(e.target.value) });
        });

        document.getElementById('semi1-range')?.addEventListener('input', (e) => {
            adsr.setOscillatorSettings({ semi1: parseFloat(e.target.value) });
        });

        document.getElementById('semi2-range')?.addEventListener('input', (e) => {
            adsr.setOscillatorSettings({ semi2: parseFloat(e.target.value) });
        });

        document.getElementById('octave1-range')?.addEventListener('input', (e) => {
            adsr.setOscillatorSettings({ octave1: parseFloat(e.target.value) });
        });

        document.getElementById('octave2-range')?.addEventListener('input', (e) => {
            adsr.setOscillatorSettings({ octave2: parseFloat(e.target.value) });
        });

        // Waveforms
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

        // ===== VOICE COUNT DISPLAY =====
        setInterval(() => {
            const status = adsr.getStatus();
            const voiceCountEl = document.getElementById('voice-count');
            if (voiceCountEl) {
                voiceCountEl.textContent = `${status.activeVoices}/${status.totalVoices}`;
            }
        }, 100);

        console.log('✅ ADSR controls initialized');

    });
  }

  initUI();

  /* =====================
CLAVIER VIRTUEL (souris)
===================== */

const keys = document.querySelectorAll('.keyboard .key');
keys.forEach(key => {
    key.addEventListener('mousedown', async () => {
        if (audioCtx.state === 'suspended') await audioCtx.resume();
        
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


  /* =====================
CLAVIER PC (AZERTY) → NOTES MIDI
===================== */

const keyToMidi = {
    KeyQ: 60, // C4
    KeyS: 61, // C#4
    KeyD: 62, // D4
    KeyF: 63, // D#4
    KeyG: 64, // E4
    KeyH: 65, // F4
    KeyJ: 66, // F#4
    KeyK: 67, // G4
    KeyL: 68, // G#4
    KeyM: 69, // A4
    Comma: 70, // A#4
    Semicolon: 71, // B4
    Quote: 72 // C5
};

let heldKeys = new Set();

function handleKey(event) {
    const { code, type } = event;
    const midi = keyToMidi[code];
    if (!midi) return;

    if (type === 'keydown') {
        if (event.repeat) return; // Ignorer les répétitions
        
        heldKeys.add(code);
        
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

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

})