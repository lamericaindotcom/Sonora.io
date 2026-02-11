function createKnob(el, {min, max, value, step, onChange, units = ''}) {
  let angleMin = 45, angleMax = 315, dragging = false;
  let knobVal = value, lastY = 0;

  function draw() {
    let ctx = el.getContext('2d');
    ctx.clearRect(0, 0, el.width, el.height);

    let r = el.width / 2, cx = r, cy = r;
    let perc = (knobVal - min) / (max - min);
    let a = angleMin + (angleMax - angleMin) * perc;

    ctx.save();
    ctx.translate(cx, cy);

    // Jauge de fond (gris)
    ctx.beginPath();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 8;
    ctx.arc(0, 0, r - 8, (Math.PI / 180) * angleMin, (Math.PI / 180) * angleMax, false);
    ctx.stroke();

    // Jauge de valeur (bleu)
    ctx.beginPath();
    ctx.strokeStyle = '#2dfc';
    ctx.lineWidth = 8;
    ctx.arc(0, 0, r - 8, (Math.PI / 180) * angleMin, (Math.PI / 180) * a, false);
    ctx.stroke();

    // Curseur
    ctx.rotate((Math.PI / 180) * a);
    ctx.beginPath();
    ctx.strokeStyle = '#fff';
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
    knobVal = Math.round(knobVal / step) * step;
    onChange(knobVal);
    draw();
  }

  el.addEventListener('mousedown', e => { dragging = true; lastY = e.clientY; });
  el.addEventListener('touchstart', e => { dragging = true; lastY = e.touches[0].clientY; });
  window.addEventListener('mousemove', e => dragging && calcValFromY(e));
  window.addEventListener('touchmove', e => dragging && calcValFromY(e));
  window.addEventListener('mouseup', () => dragging = false);
  window.addEventListener('touchend', () => dragging = false);

  draw();
  return {
    setValue: v => { knobVal = v; draw(); }
  };
}

// Initialisation
createKnob(document.getElementById("myKnob"), {
  min: 0,
  max: 100,
  value: 50,
  step: 1,
  units: '%',
  onChange: v => {
    console.log("Valeur du knob :", v);
  }
});
