const test = require('node:test');
const assert = require('node:assert/strict');
const { parseTime, formatClock, formatDuration, calculate } = require('../calc.js');

const t = parseTime;

test('parseTime', () => {
  assert.equal(t('00:00'), 0);
  assert.equal(t('07:30'), 450);
  assert.equal(t('7:05'), 425);
  assert.equal(t('23:59'), 1439);
  assert.equal(t('0730'), 450);
  assert.equal(t('730'), 450);
  assert.equal(t('700'), 420);
  assert.equal(t('7.30'), 450);
  assert.equal(t('18'), 1080);
  assert.equal(t('1800'), 1080);
  assert.equal(t('7:3'), null);
  assert.equal(t('24:00'), null);
  assert.equal(t('12:60'), null);
  assert.equal(t(''), null);
  assert.equal(t(undefined), null);
});

test('formatClock / formatDuration', () => {
  assert.deepEqual(formatClock(450), { time: '07:30', dayOffset: 0 });
  assert.deepEqual(formatClock(1440 + 65), { time: '01:05', dayOffset: 1 });
  assert.equal(formatDuration(135), '2:15');
  assert.equal(formatDuration(-5), '-0:05');
});

test('overnight: 22:00 now, 2:30 program, finish 07:00', () => {
  const r = calculate({ now: t('22:00'), program: 150, target: t('07:00') });
  assert.equal(r.status, 'ok');
  assert.equal(r.exactDelay, 390); // 6.5 h
  assert.equal(r.options.length, 2);
  assert.equal(r.options[0].delayHours, 6);
  assert.equal(r.options[0].deviation, -30);
  assert.deepEqual(formatClock(r.options[0].finish), { time: '06:30', dayOffset: 1 });
  assert.equal(r.options[1].delayHours, 7);
  assert.equal(r.options[1].deviation, 30);
});

test('exact full hour gives a single option', () => {
  const r = calculate({ now: t('08:00'), program: 120, target: t('15:00') });
  assert.equal(r.status, 'ok');
  assert.equal(r.options.length, 1);
  assert.equal(r.options[0].delayHours, 5);
  assert.equal(r.options[0].deviation, 0);
});

test('delay below one hour rounds down to 0', () => {
  const r = calculate({ now: t('10:00'), program: 90, target: t('12:00') });
  assert.equal(r.options[0].delayHours, 0);
  assert.equal(r.options[1].delayHours, 1);
});

test('target equal to now rolls over to next day', () => {
  const r = calculate({ now: t('10:00'), program: 60, target: t('10:00') });
  assert.equal(r.status, 'ok');
  assert.equal(r.options[0].delayHours, 23);
});

test('too soon: program cannot finish before target', () => {
  const r = calculate({ now: t('10:00'), program: 180, target: t('12:00') });
  assert.equal(r.status, 'too-soon');
  assert.equal(r.options[0].delayHours, 0);
  assert.equal(r.options[0].deviation, 60);
});

test('rounded-up option above max delay is dropped', () => {
  const r = calculate({ now: t('10:00'), program: 30, target: t('10:00'), maxDelayHours: 23 });
  // exact delay 23.5 h -> 23 allowed, 24 exceeds max
  assert.equal(r.status, 'ok');
  assert.equal(r.options.length, 1);
  assert.equal(r.options[0].delayHours, 23);
});

test('too far: exact delay beyond max', () => {
  const r = calculate({ now: t('10:00'), program: 30, target: t('09:00'), maxDelayHours: 12 });
  assert.equal(r.status, 'too-far');
  assert.equal(r.options[0].delayHours, 12);
});

test('invalid input throws', () => {
  assert.throws(() => calculate({ now: 0, program: 0, target: 60 }), RangeError);
  assert.throws(() => calculate({ now: null, program: 60, target: 60 }), TypeError);
});
