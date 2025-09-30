// Utilitaire : knob rotatif
function createKnob(el, {min, max, value, step, onChange, units=''}){
  let angleMin=45, angleMax=315, dragging=false, rect;
  let knobVal=value, lastY=0;

  function draw(){
    let ctx = el.getContext('2d');
    ctx.clearRect(0,0,el.width,el.height);

    let r = el.width/2, cx = r, cy = r;
    let perc = (knobVal-min)/(max-min);
    let a = angleMin+(angleMax-angleMin)*perc;

    ctx.save();
    ctx.translate(cx, cy);

    // arc jauge

    ctx.beginPath(); 
    ctx.strokeStyle='#555'; 
    ctx.lineWidth=8;
    ctx.arc(0, 0, r-8, (Math.PI/180)*angleMin, (Math.PI/180)*a, false);
    ctx.stroke();
    
    // Curseur
    ctx.beginPath(); 
    ctx.rotate((Math.PI/180)*a);
    ctx.strokeStyle='#df711dff'; ctx.lineWidth=4;
    ctx.moveTo(0,0); ctx.lineTo(0,-r+18); ctx.stroke();
    ctx.restore();

    // Valeur
    
    ctx.fillStyle="#fff";
    ctx.font="700 14px sans-serif";
    ctx.textAlign="center";
    ctx.fillText((knobVal+" "+units).trim(), cx, cy+28);
  }
  function calcValFromY(e){
    let y = e.touches?e.touches[0].clientY:e.clientY;
    let delta = lastY-y;
    lastY = y;
    knobVal = Math.max(min, Math.min(max, knobVal + step * delta * 0.3));
    knobVal = Math.round(knobVal/step)*step; 
    
    // snap

    onChange(knobVal);
    draw();
  }

  el.addEventListener('mousedown', e=>{
    rect=el.getBoundingClientRect(); dragging=true; lastY=e.clientY; });
  el.addEventListener('touchstart', e=>{
    rect=el.getBoundingClientRect(); dragging=true; lastY=e.touches[0].clientY; });
  window.addEventListener('mousemove', e=>dragging&&calcValFromY(e));
  window.addEventListener('touchmove', e=>dragging&&calcValFromY(e));
  window.addEventListener('mouseup', ()=>dragging=false);
  window.addEventListener('touchend', ()=>dragging=false);
  draw();
  return {setValue:v=>{ knobVal=v; draw(); }};
}

// Web Audio setup
const AudioContext = window.AudioContext;
const ctx=new AudioContext();
let oscillator, gain=ctx.createGain(), analyser=ctx.createAnalyser(), playing=false;

gain.connect(analyser); 
analyser.connect(ctx.destination); 
analyser.fftSize=1024;

// Paramètres avec knobs
let param = {
  type: 'sine',  // sine,square,triangle,sawtooth
  octave: 0,
  semi: 0,
  fine: 0
};

const types=['sine','square','sawtooth','triangle'];

// Suppression du knob pour le type d'onde (remplacé par boutons radio)
// createKnob(...) pour "waveformTypeKnob" est supprimé

// Nouveau : écoute les boutons radio
document.querySelectorAll('input[name="waveform"]').forEach(radio => {
  radio.addEventListener('change', e => {
    param.type = e.target.value;
    if (oscillator) oscillator.type = param.type;
  });
});
createKnob(document.getElementById("octaveKnob"), {
  min: -2, max: 2, value: 0, step: 1, units:'oct', onChange: v=>{
    param.octave=v; 
    if (oscillator) updateFreq();
  }
});
createKnob(document.getElementById("semiKnob"), {
  min: -12, max: 12, value: 0, step: 1, units:'semi', onChange: v=>{
    param.semi=v; 
    if (oscillator) updateFreq();
  }
});
createKnob(document.getElementById("fineKnob"), {
  min: -100, max: 100, value: 0, step: 1, units:'ct', onChange: v=>{
    param.fine=v; 
    if (oscillator) updateFreq();
  }
});

function getDetune(){
  return param.semi*100 + param.fine + param.octave*1200;
}
function updateFreq(){
  let baseFreq = 440;
  oscillator.frequency.value = baseFreq;
  oscillator.detune.value = getDetune();
}

// Oscilloscope

function drawScope(){
  let canvas=document.getElementById('oscilloscope');
  let ctx2d=canvas.getContext('2d');
  let buf=new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(buf);
  ctx2d.clearRect(0,0,canvas.width,canvas.height);
  ctx2d.strokeStyle="#3fd";
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


// Toggle audio

document.getElementById('playBtn').addEventListener('click', async () => {
  if (!playing) {
    await ctx.resume(); // pour activer l'audio
    oscillator = ctx.createOscillator();
    oscillator.type = param.type;
    updateFreq();
    oscillator.connect(gain);
    oscillator.start();
    gain.gain.value = 0.3;
    playing = true;
    drawScope();
  } else {
    oscillator.stop();
    playing = false;
    oscillator.disconnect();
  }
});