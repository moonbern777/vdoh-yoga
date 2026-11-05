// Breathing pacer: 4 seconds in, 2 hold, 6 out, one cycle is 12 seconds.
export const PHASES = [
  { word: 'вдох', sec: 4, to: 1 },
  { word: 'пауза', sec: 2, to: 1 },
  { word: 'выдох', sec: 6, to: 0 },
];

export function createPacer({ word, count, onBreath, onCycle }) {
  let phase = 0;
  let left = 0;
  let timer = 0;
  let running = false;

  function tick() {
    if (!running) return;
    if (left === 0) {
      if (phase === 0 && onCycle && onCycle() === false) {
        running = false;
        return;
      }
      const current = PHASES[phase];
      onBreath(current.to, current.sec);
      word.textContent = current.word;
      left = current.sec;
      phase = (phase + 1) % PHASES.length;
    }
    count.textContent = left;
    left--;
    timer = setTimeout(tick, 1000);
  }

  return {
    start() {
      if (running) return;
      running = true;
      phase = 0;
      left = 0;
      tick();
    },
    stop() {
      running = false;
      clearTimeout(timer);
    },
  };
}
