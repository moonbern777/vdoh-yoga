// Pass advisor: how many visits a week, and which pass is cheapest for that.
export const PASSES = [
  { id: 'one', name: 'Разовое', visits: 1, price: 700, note: 'Без срока' },
  { id: 'p4', name: '4 занятия', visits: 4, price: 2400, note: 'Действует 30 дней' },
  { id: 'p8', name: '8 занятий', visits: 8, price: 4000, note: 'Действует 45 дней, можно заморозить' },
  { id: 'p12', name: '12 занятий', visits: 12, price: 5400, note: 'Действует 60 дней, можно заморозить' },
  { id: 'all', name: 'Безлимит на месяц', visits: Infinity, price: 6900, note: 'Любые занятия, можно заморозить' },
];

export const rub = n => `${Math.round(n).toLocaleString('ru-RU')} ₽`;

export function bestPass(perWeek) {
  const need = perWeek * 4;
  const fit = PASSES.filter(pass => pass.visits >= need && pass.id !== 'one');
  const best = fit.reduce((a, b) => (b.price < a.price ? b : a));
  return { pass: best, need, perClass: Math.round(best.price / need), saved: need * PASSES[0].price - best.price };
}

const $ = id => document.getElementById(id);

export function startPasses({ animate }) {
  $('pass-list').append(...PASSES.map(pass => {
    const item = document.createElement('li');
    item.className = 'pass';
    item.dataset.id = pass.id;
    item.innerHTML = `<h3>${pass.name}</h3><span class="price">${rub(pass.price)}</span><p>${pass.note}</p><span class="per">${Number.isFinite(pass.visits) ? `${rub(Math.round(pass.price / pass.visits))} за занятие` : 'без ограничений'}</span>`;
    return item;
  }));

  function render(enter) {
    const slider = $('visits');
    const result = bestPass(+slider.value);
    $('verdict-name').textContent = result.pass.name;
    $('verdict-note').textContent = `${result.need} занятий в месяц выйдут по ${rub(result.perClass)}. Экономия ${rub(result.saved)} по сравнению с разовыми.`;
    $('pass-list').querySelectorAll('.pass').forEach(item => item.classList.toggle('best', item.dataset.id === result.pass.id));
    // the sun on the slider is bigger the more often you come
    slider.style.setProperty('--size', `${24 + +slider.value * 7}px`);
    if (animate && enter) gsap.from('#verdict-name, #verdict-note', { autoAlpha: .15, duration: .9, ease: 'sine.out', overwrite: true, clearProps: 'opacity,visibility' });
  }

  $('visits').addEventListener('input', () => render(true));
  render(false);
}
