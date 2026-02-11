const audioCtx = new AudioContext();
let oscillator;
const filter = audioCtx.createBiquadFilter();
filter.type = 'lowpass';
filter.frequency.value = 800;
filter.Q.value = 1;
filter.connect(audioCtx.destination);

const freqControl = document.getElementById('freq');
const qControl = document.getElementById('q');
const freqValue = document.getElementById('freq-value');
const qValue = document.getElementById('q-value');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');

freqControl.addEventListener('input', () => {
  const freq = Number(freqControl.value);
  filter.frequency.value = freq;
  freqValue.textContent = freq;
});

qControl.addEventListener('input', () => {
  const q = Number(qControl.value);
  filter.Q.value = q;
  qValue.textContent = q.toFixed(1);
});

startBtn.addEventListener('click', () => {
  if (oscillator) return; // éviter plusieurs oscillateurs simultanés
  oscillator = audioCtx.createOscillator();
  oscillator.type = 'sawtooth';
  oscillator.connect(filter);
  oscillator.start();
});

stopBtn.addEventListener('click', () => {
  if (!oscillator) return;
  oscillator.stop();
  oscillator.disconnect();
  oscillator = null;
});
