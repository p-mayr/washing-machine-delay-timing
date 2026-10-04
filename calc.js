/*
 * Pure calculation functions for the washing machine delay timer.
 * All times are in minutes. Clock times are "minutes since midnight" (0–1439).
 * Works in the browser (window.Calc) and in Node (module.exports).
 */
(function (root) {
  'use strict';

  const DAY = 24 * 60;
  const MAX_DELAY_HOURS = 24;

  const pad = (n) => String(n).padStart(2, '0');

  /** 24h "HH:MM", "HMM", "HHMM", "HH", or "H" -> minutes since midnight, or null if invalid. */
  function parseTime(str) {
    let s = String(str ?? '').trim().replace('.', ':');
    let m = /^(\d{1,2}):?(\d{2})$/.exec(s) || /^(\d{1,2})()$/.exec(s);
    // Also handle "700" → "07:00", "1230" → "12:30"
    if (!m && /^\d{3,4}$/.test(s)) {
      const padded = s.padStart(4, '0');
      m = [padded, padded.slice(0, 2), padded.slice(2)];
    }
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h > 23 || min > 59) return null;
    return h * 60 + min;
  }

  /** Minutes (may exceed one day) -> { time: "HH:MM", dayOffset } */
  function formatClock(minutes) {
    const dayOffset = Math.floor(minutes / DAY);
    const t = ((minutes % DAY) + DAY) % DAY;
    return { time: `${pad(Math.floor(t / 60))}:${pad(t % 60)}`, dayOffset };
  }

  /** Duration in minutes -> "H:MM" */
  function formatDuration(minutes) {
    const sign = minutes < 0 ? '-' : '';
    const abs = Math.abs(minutes);
    return `${sign}${Math.floor(abs / 60)}:${pad(abs % 60)}`;
  }

  /**
   * Calculate the start-delay setting ("start in X h", full hours only).
   *
   * @param {object} p
   * @param {number} p.now      current clock time, minutes since midnight
   * @param {number} p.program  program duration in minutes (> 0)
   * @param {number} p.target   target finish clock time, minutes since midnight
   * @param {number} [p.maxDelayHours=24]
   * @returns {{
   *   status: 'ok' | 'too-soon' | 'too-far',
   *   targetAbs: number,      // target relative to today's midnight (may be next day)
   *   exactDelay: number,     // exact required delay in minutes (may be negative)
   *   options: Array<{ delayHours: number, start: number, finish: number, deviation: number }>
   * }}
   * options[0] is the recommendation. deviation = finish - target in minutes
   * (negative = finishes before target).
   */
  function calculate({ now, program, target, maxDelayHours = MAX_DELAY_HOURS }) {
    if (![now, program, target].every(Number.isFinite)) {
      throw new TypeError('now, program and target must be numbers');
    }
    if (program <= 0) throw new RangeError('program must be > 0');

    // Target earlier than or equal to now -> next day
    let untilTarget = target - now;
    if (untilTarget <= 0) untilTarget += DAY;
    const targetAbs = now + untilTarget;

    const exactDelay = untilTarget - program;

    const option = (h) => {
      const start = now + h * 60;
      const finish = start + program;
      return { delayHours: h, start, finish, deviation: finish - targetAbs };
    };

    if (exactDelay < 0) {
      // Even starting right away the program finishes after the target
      return { status: 'too-soon', targetAbs, exactDelay, options: [option(0)] };
    }

    const down = Math.floor(exactDelay / 60);
    const up = Math.ceil(exactDelay / 60);

    if (down > maxDelayHours) {
      return { status: 'too-far', targetAbs, exactDelay, options: [option(maxDelayHours)] };
    }

    // Rounded down = finishes at/before target -> recommended
    const options = [option(down)];
    if (up !== down && up <= maxDelayHours) options.push(option(up));

    return { status: 'ok', targetAbs, exactDelay, options };
  }

  const api = { DAY, MAX_DELAY_HOURS, parseTime, formatClock, formatDuration, calculate };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Calc = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
