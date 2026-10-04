/* UI wiring – calculation lives in calc.js */
(function () {
  'use strict';

  const { parseTime, formatClock, formatDuration, calculate } = window.Calc;

  // Program presets (defaults to be defined later). Example: { name: 'Cotton 60°', minutes: 215 }
  const PRESETS = [];

  const $ = (id) => document.getElementById(id);
  const els = {
    now: $('now'),
    nowReset: $('now-reset'),
    preset: $('preset'),
    progH: $('prog-h'),
    progM: $('prog-m'),
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
      opt.textContent = `${p.name} (${formatDuration(p.minutes)} h)`;
      els.preset.insertBefore(opt, els.preset.lastElementChild);
    }
    els.preset.hidden = false;
    els.preset.addEventListener('change', () => {
      const min = Number(els.preset.value);
      if (min > 0) {
        els.progH.value = Math.floor(min / 60);
        els.progM.value = min % 60;
      }
      update();
    });
  }

  function programMinutes() {
    const h = Number(els.progH.value || 0);
    const m = Number(els.progM.value || 0);
    if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || m < 0) return null;
    const total = Math.round(h * 60 + m);
    return total > 0 ? total : null;
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
        <div class="delay"><span class="value">${o.delayHours}</span> h</div>
        <div class="details">
          Start ${clock(o.start)} · Finish ${clock(o.finish)}<br>
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
  for (const el of [els.progH, els.progM]) {
    el.addEventListener('input', () => { els.preset.value = ''; update(); });
  }
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
