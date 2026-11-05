// Pass advisor: how many visits a week, and which pass is cheapest for that.
export const PASSES = [
  { id: 'one', name: 'Single class', visits: 1, price: 20, note: 'No expiry' },
  { id: 'p4', name: '4 classes', visits: 4, price: 70, note: 'Valid for 30 days' },
  { id: 'p8', name: '8 classes', visits: 8, price: 120, note: 'Valid for 45 days, can be paused' },
  { id: 'p12', name: '12 classes', visits: 12, price: 165, note: 'Valid for 60 days, can be paused' },
  { id: 'all', name: 'Unlimited for a month', visits: Infinity, price: 190, note: 'Any class, can be paused' },
];

export const rub = n => `$${Math.round(n).toLocaleString('en-US')}`;

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
    item.innerHTML = `<h3>${pass.name}</h3><span class="price">${rub(pass.price)}</span><p>${pass.note}</p><span class="per">${Number.isFinite(pass.visits) ? `${rub(Math.round(pass.price / pass.visits))} per class` : 'no limits'}</span>`;
    return item;
  }));

  function render(enter) {
    const slider = $('visits');
    const result = bestPass(+slider.value);
    $('verdict-name').textContent = result.pass.name;
    $('verdict-note').textContent = `${result.need} classes a month come to ${rub(result.perClass)} each. You save ${rub(result.saved)} compared with single classes.`;
    $('pass-list').querySelectorAll('.pass').forEach(item => item.classList.toggle('best', item.dataset.id === result.pass.id));
    // the sun on the slider is bigger the more often you come
    slider.style.setProperty('--size', `${24 + +slider.value * 7}px`);
    if (animate && enter) gsap.from('#verdict-name, #verdict-note', { autoAlpha: .15, duration: .9, ease: 'sine.out', overwrite: true, clearProps: 'opacity,visibility' });
  }

  $('visits').addEventListener('input', () => render(true));
  render(false);
}
