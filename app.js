/* UI wiring – calculation lives in calc.js */
(function () {
  'use strict';

  const { parseTime, formatClock, formatDuration, calculate } = window.Calc;

  // Program presets from the machine manual ("Tabelle Waschprogramme"), durations in minutes
  const PRESETS = [
    { name: 'Baumwolle 90 °C', minutes: 187 },
    { name: 'Baumwolle mit Vorwäsche 60 °C', minutes: 165 },
    { name: 'Baumwolle Öko 60 °C', minutes: 215 },
    { name: 'ECO 20 °C', minutes: 95 },
    { name: 'Pflegeleicht 40 °C', minutes: 110 },
    { name: 'Wolle 30 °C', minutes: 43 },
    { name: 'Spülen', minutes: 42 },
    { name: 'Anti-Allergie 60 °C', minutes: 226 },
    { name: 'Schleudern', minutes: 17 },
    { name: 'Handwäsche 30 °C', minutes: 90 },
    { name: 'Sport 30 °C', minutes: 80 },
    { name: 'Textilmischung 30 °C', minutes: 81 },
    { name: 'Hemden/Blusen 40 °C', minutes: 112 },
    { name: 'Täglich 60 Min. 40 °C', minutes: 60 },
    { name: 'Express 15 Min. 30 °C', minutes: 15 },
  ];

  const $ = (id) => document.getElementById(id);
  const els = {
    now: $('now'),
    nowReset: $('now-reset'),
    preset: $('preset'),
    prog: $('prog'),
    target: $('target'),
    result: $('result'),
  };

  // --- Current time (auto-updates until the user edits it) ---------------
  let nowEdited = false;

  function currentClock() {
    const d = new Date();
    return formatClock(d.getHours() * 60 + d.getMinutes()).time;
  }

  function syncNow() {
    if (!nowEdited) els.now.value = currentClock();
  }

  // --- Presets -------------------------------------------------------------
  function initPresets() {
    if (PRESETS.length === 0) return;
    for (const p of PRESETS) {
      const opt = document.createElement('option');
      opt.value = String(p.minutes);
      opt.textContent = `${p.name} (${p.minutes} min)`;
      els.preset.insertBefore(opt, els.preset.lastElementChild);
    }
    els.preset.hidden = false;
    els.preset.addEventListener('change', () => {
      const min = Number(els.preset.value);
      if (min > 0) els.prog.value = min;
      update();
    });
  }

  function programMinutes() {
    const m = Math.round(Number(els.prog.value));
    return Number.isFinite(m) && m > 0 ? m : null;
  }

  // --- Rendering -----------------------------------------------------------
  function clock(minutes) {
    const { time, dayOffset } = formatClock(minutes);
    return dayOffset > 0 ? `${time} <small>(+${dayOffset}d)</small>` : time;
  }

  function deviationText(dev) {
    if (dev === 0) return 'exactly on target';
    const abs = Math.abs(dev);
    const txt = abs >= 60 ? `${formatDuration(abs)} h` : `${abs} min`;
    return dev < 0 ? `${txt} before target` : `${txt} after target`;
  }

  function optionHtml(o, primary) {
    return `
      <div class="option ${primary ? 'primary' : ''}">
        <div class="delay"><svg class="icon"><use href="#i-timer"/></svg><span class="value">${o.delayHours}</span> h</div>
        <div class="details">
          <span class="nowrap"><svg class="icon sm"><use href="#i-play"/></svg>Start ${clock(o.start)}</span>
          <span class="nowrap"><svg class="icon sm"><use href="#i-check"/></svg>Finish ${clock(o.finish)}</span><br>
          <span class="dev ${o.deviation > 0 ? 'late' : ''}">${deviationText(o.deviation)}</span>
        </div>
      </div>`;
  }

  function render(res) {
    let html = '';
    if (res.status === 'too-soon') {
      html += `<p class="warn">Target can't be reached – even starting now, the program finishes at ${clock(res.options[0].finish)}.</p>`;
      html += optionHtml(res.options[0], true);
    } else if (res.status === 'too-far') {
      html += `<p class="warn">Target is too far away – maximum delay is ${res.options[0].delayHours} h.</p>`;
      html += optionHtml(res.options[0], true);
    } else {
      html += '<h2>Set delay to</h2>';
      html += optionHtml(res.options[0], true);
      if (res.options[1]) {
        html += '<p class="alt-label">Alternative</p>';
        html += optionHtml(res.options[1], false);
      }
    }
    els.result.innerHTML = html;
  }

  function update() {
    const now = parseTime(els.now.value);
    const target = parseTime(els.target.value);
    const program = programMinutes();

    const missing = [];
    if (now === null) missing.push('current time');
    if (program === null) missing.push('program duration');
    if (target === null) missing.push('target finish time');

    if (missing.length) {
      els.result.innerHTML = `<p class="hint">Enter ${missing.join(', ')}.</p>`;
      return;
    }
    render(calculate({ now, program, target }));
  }

  // --- Events --------------------------------------------------------------
  els.now.addEventListener('input', () => { nowEdited = true; update(); });
  els.nowReset.addEventListener('click', () => { nowEdited = false; syncNow(); update(); });
  els.prog.addEventListener('input', () => { els.preset.value = ''; update(); });
  els.target.addEventListener('input', update);

  // Normalize 24h time input to "HH:MM" when leaving the field
  for (const el of [els.now, els.target]) {
    el.addEventListener('blur', () => {
      const min = parseTime(el.value);
      el.classList.toggle('invalid', el.value !== '' && min === null);
      if (min !== null) el.value = formatClock(min).time;
    });
  }

  setInterval(() => { if (!nowEdited) { syncNow(); update(); } }, 15000);

  initPresets();
  syncNow();
  update();
})();
