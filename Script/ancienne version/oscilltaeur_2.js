// Utilitaire : knob rotatif
function createKnob(el, {min, max, value, step, onChange, units=''}) {
  let angleMin = 45, angleMax = 315, dragging = false, rect;
  let knobVal = value, lastY = 0;

  function draw() {
    let ctx = el.getContext('2d');
    ctx.clearRect(0, 0, el.width, el.height);
    let r = el.width / 2, cx = r, cy = r;
    let perc = (knobVal - min) / (max - min);
    let a = angleMin + (angleMax - angleMin) * perc;

    ctx.save();
    ctx.translate(cx, cy);

    // arc jauge
    ctx.beginPath();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 8;
    ctx.arc(0, 0, r - 8, (Math.PI / 180) * angleMin, (Math.PI / 180) * a, false);
    ctx.stroke();

    // Curseur
    ctx.beginPath();
    ctx.rotate((Math.PI / 180) * a);
    ctx.strokeStyle = '#df711dff'; 
    ctx.lineWidth = 4;
    ctx.moveTo(0, 0); 
    ctx.lineTo(0, -r + 18); 
    ctx.stroke();

    ctx.restore();

    // Valeur
    ctx.fillStyle = "#fff";
    ctx.font = "700 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText((knobVal + " " + units).trim(), cx, cy + 28);
  }

  function calcValFromY(e) {
    let y = e.touches ? e.touches[0].clientY : e.clientY;
    let delta = lastY - y;
    lastY = y;
    knobVal = Math.max(min, Math.min(max, knobVal + step * delta * 0.3));
    knobVal = Math.round(knobVal / step) * step; // snap
    onChange(knobVal);
    draw();
  }

  el.addEventListener('mousedown', e => {
    rect = el.getBoundingClientRect(); 
    dragging = true; 
    lastY = e.clientY; 
  });

  el.addEventListener('touchstart', e => {
    rect = el.getBoundingClientRect(); 
    dragging = true; 
    lastY = e.touches[0].clientY; 
  });

  window.addEventListener('mousemove', e => dragging && calcValFromY(e));
  window.addEventListener('touchmove', e => dragging && calcValFromY(e));
  window.addEventListener('mouseup', () => dragging = false);
  window.addEventListener('touchend', () => dragging = false);

  draw();

  return {
    setValue: v => { 
      knobVal = v; 
      draw(); 
    }
  };
}

/* =========================
   Web Audio : 2 oscillateurs + filtre
   ========================= */

const AudioContext = window.AudioContext;
const ctx = new AudioContext();

// 2 oscillateurs + gain global + filtre + analyseur
let osc1 = null;
let osc2 = null;
let playing = false;

const gain = ctx.createGain();
const filter = ctx.createBiquadFilter();
const analyser = ctx.createAnalyser();

// routing : (osc1 + osc2) -> filter -> gain -> analyser -> dest
filter.connect(gain);
gain.connect(analyser);
analyser.connect(ctx.destination);

gain.gain.value = 0.3;
analyser.fftSize = 1024;

// paramètres communs d'accordage (Osc1) + décalage Osc2
let param = {
  type: 'sine',    // forme pour osc1 (et base pour osc2 si tu veux)
  octave: 0,
  semi: 0,
  fine: 0,
  detuneOsc2: 7    // décalage en demi-tons pour osc2 (ex: 7 = quinte)
};

// Mise en place des boutons radio forme d'onde
document.querySelectorAll('input[name="waveform"]').forEach(radio => {
  radio.addEventListener('change', e => {
    param.type = e.target.value;
    if (osc1) osc1.type = param.type;
    if (osc2) osc2.type = param.type; // ou une autre forme si tu préfères
  });
});

// Knobs octave / semi / fine pour osc1
createKnob(document.getElementById("octaveKnob"), {
  min: -2, max: 2, value: 0, step: 1, units: 'oct',
  onChange: v => {
    param.octave = v;
    if (osc1 || osc2) updateFreqs();
  }
});

createKnob(document.getElementById("semiKnob"), {
  min: -12, max: 12, value: 0, step: 1, units: 'semi',
  onChange: v => {
    param.semi = v;
    if (osc1 || osc2) updateFreqs();
  }
});

createKnob(document.getElementById("fineKnob"), {
  min: -100, max: 100, value: 0, step: 1, units: 'ct',
  onChange: v => {
    param.fine = v;
    if (osc1 || osc2) updateFreqs();
  }
});

// Optionnel : un knob pour le detune d'osc2 (en demi-tons)
const detuneOsc2KnobCanvas = document.getElementById("detuneOsc2Knob");
if (detuneOsc2KnobCanvas) {
  createKnob(detuneOsc2KnobCanvas, {
    min: -12, max: 12, value: 7, step: 1, units: 'semi2',
    onChange: v => {
      param.detuneOsc2 = v;
      if (osc2) updateFreqs();
    }
  });
}

// calcul des detunes
function getDetuneCentsOsc1() {
  return param.semi * 100 + param.fine + param.octave * 1200;
}

function getDetuneCentsOsc2() {
  return getDetuneCentsOsc1() + param.detuneOsc2 * 100;
}

// applique fréquence / detune aux 2 oscillateurs
function updateFreqs() {
  const baseFreq = 440;

  if (osc1) {
    osc1.frequency.value = baseFreq;
    osc1.detune.value = getDetuneCentsOsc1();
  }
  if (osc2) {
    osc2.frequency.value = baseFreq;
    osc2.detune.value = getDetuneCentsOsc2();
  }
}

/* =========================
   Oscilloscope
   ========================= */

function drawScope() {
  const canvas = document.getElementById('oscilloscope');
  if (!canvas) return;
  const ctx2d = canvas.getContext('2d');
  const buf = new Uint8Array(analyser.fftSize);

  analyser.getByteTimeDomainData(buf);

  ctx2d.clearRect(0, 0, canvas.width, canvas.height);
  ctx2d.strokeStyle = "#3fd";
  ctx2d.beginPath();
  ctx2d.moveTo(0, (buf[0] / 255) * canvas.height);

  for (let i = 1; i < buf.length; i++) {
    let x = (i / buf.length) * canvas.width;
    let y = (buf[i] / 255) * canvas.height;
    ctx2d.lineTo(x, y);
  }

  ctx2d.stroke();

  if (playing) requestAnimationFrame(drawScope);
}

/* =========================
   Play / Stop : 2 oscillateurs
   ========================= */

document.getElementById('playBtn').addEventListener('click', async () => {
  if (!playing) {
    await ctx.resume(); // activer l'audio (gestes utilisateur)

    // Création des deux oscillateurs
    osc1 = ctx.createOscillator();
    osc2 = ctx.createOscillator();

    osc1.type = param.type;
    osc2.type = param.type;       // ou autre forme pour plus de contraste

    // routing vers filtre
    osc1.connect(filter);
    osc2.connect(filter);

    // fréquence / detune
    updateFreqs();

    // start
    osc1.start();
    osc2.start();

    playing = true;
    drawScope();

  } else {
    // stop des 2
    if (osc1) {
      osc1.stop();
      osc1.disconnect();
      osc1 = null;
    }
    if (osc2) {
      osc2.stop();
      osc2.disconnect();
      osc2 = null;
    }
    playing = false;
  }
});

/* =========================
   Contrôles du filtre
   ========================= */

// valeurs par défaut
filter.type = 'lowpass';
filter.frequency.value = 800;
filter.Q.value = 1;

const freqSlider = document.getElementById('freq');
const qSlider = document.getElementById('q');

if (freqSlider) {
  freqSlider.addEventListener('input', e => {
    filter.frequency.value = e.target.value;
  });
}

if (qSlider) {
  qSlider.addEventListener('input', e => {
    filter.Q.value = e.target.value;
  });
}
