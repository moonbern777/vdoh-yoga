// Weekly timetable and booking. Index matches Date.getDay(): 0 is Sunday.
const entry = (t, n, dir, who, min) => ({ t, n, dir, who, min });
export const WEEK = [
  [entry('10:00', 'Воскресная хатха', 'hatha', 'Марина', 75), entry('12:00', 'Основы для новичков', 'new', 'Алина', 60), entry('18:00', 'Инь-йога', 'yin', 'Алина', 75)],
  [entry('07:30', 'Утренняя виньяса', 'vinyasa', 'Даниил', 60), entry('12:30', 'Йога для спины', 'hatha', 'Марина', 60), entry('19:00', 'Основы для новичков', 'new', 'Алина', 60), entry('20:15', 'Инь-йога', 'yin', 'Алина', 45)],
  [entry('08:00', 'Мягкая хатха', 'hatha', 'Марина', 60), entry('18:00', 'Виньяса', 'vinyasa', 'Даниил', 75), entry('20:00', 'Инь-йога', 'yin', 'Алина', 60)],
  [entry('07:30', 'Утренняя виньяса', 'vinyasa', 'Даниил', 60), entry('12:30', 'Йога для спины', 'hatha', 'Марина', 60), entry('19:00', 'Хатха', 'hatha', 'Марина', 75)],
  [entry('08:00', 'Мягкая хатха', 'hatha', 'Марина', 60), entry('18:00', 'Основы для новичков', 'new', 'Алина', 60), entry('19:30', 'Виньяса', 'vinyasa', 'Даниил', 75)],
  [entry('07:30', 'Утренняя виньяса', 'vinyasa', 'Даниил', 60), entry('18:30', 'Хатха', 'hatha', 'Марина', 75), entry('20:00', 'Инь-йога перед выходными', 'yin', 'Алина', 60)],
  [entry('09:30', 'Виньяса выходного дня', 'vinyasa', 'Даниил', 90), entry('11:30', 'Йога для спины', 'hatha', 'Марина', 60), entry('13:00', 'Основы для новичков', 'new', 'Алина', 60)],
];

// Free spots are a fixed pattern in the demo. A real site reads them from the studio's booking system.
export const spotsLeft = (date, i) => (date.getDate() * 3 + i * 5) % 9 + 1;

export function isPast(date, time, now) {
  const [hours, minutes] = time.split(':').map(Number);
  return date.getDate() === now.getDate() && date.getMonth() === now.getMonth()
    && hours * 60 + minutes <= now.getHours() * 60 + now.getMinutes();
}

const $ = id => document.getElementById(id);

export function startSchedule({ animate }) {
  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });
  let dayIndex = 0;
  let filter = 'all';

  $('days').append(...dates.map((date, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'day';
    button.setAttribute('role', 'tab');
    button.dataset.i = i;
    button.innerHTML = `${i === 0 ? 'Сегодня' : date.toLocaleDateString('ru-RU', { weekday: 'short' })}<small>${date.getDate()}</small>`;
    return button;
  }));

  const sun = $('day-sun');

  // The little sun rests on the chosen day and glides over to the next.
  function placeSun(instant) {
    const button = $('days').querySelector(`[data-i="${dayIndex}"]`);
    const x = button.offsetLeft + button.offsetWidth / 2 - 34;
    const y = button.offsetTop + button.offsetHeight / 2 - 34;
    if (animate && !instant) gsap.to(sun, { x, y, duration: 1.1, ease: 'sine.inOut', overwrite: true });
    else if (window.gsap) gsap.set(sun, { x, y });
    else sun.style.transform = `translate(${x}px, ${y}px)`;
  }

  function render(enter = true) {
    const date = dates[dayIndex];
    const now = new Date();
    $('days').querySelectorAll('.day').forEach(button => button.setAttribute('aria-selected', +button.dataset.i === dayIndex));
    const list = WEEK[date.getDay()].filter(item => filter === 'all' || item.dir === filter);
    const rows = list.length ? list.map((item, i) => {
      const past = isPast(date, item.t, now);
      const row = document.createElement('li');
      row.className = `klass${past ? ' past' : ''}`;
      row.innerHTML = `<time>${item.t}</time><div><h3>${item.n}</h3><p>${item.who} · ${item.min} минут</p></div><span class="spots">${past ? 'Занятие прошло' : `Мест: ${spotsLeft(date, i)}`}</span>`;
      if (!past) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'link';
        button.textContent = 'Записаться';
        button.addEventListener('click', () => openBooking(item, date));
        row.append(button);
      }
      return row;
    }) : [Object.assign(document.createElement('li'), { className: 'no-classes', textContent: 'В этот день такого занятия нет. Выберите другой день.' })];
    $('classes').replaceChildren(...rows);
    if (animate && enter) gsap.from(rows, { autoAlpha: 0, y: 14, duration: 1.1, stagger: .09, ease: 'sine.out', clearProps: 'all' });
  }

  $('days').addEventListener('click', event => {
    const button = event.target.closest('.day');
    if (!button) return;
    dayIndex = +button.dataset.i;
    placeSun();
    render();
  });

  $('filters').addEventListener('click', event => {
    const button = event.target.closest('.filter');
    if (!button) return;
    filter = button.dataset.dir;
    $('filters').querySelectorAll('.filter').forEach(item => item.setAttribute('aria-pressed', item === button));
    render();
  });

  render(false);
  placeSun(true);
  addEventListener('resize', () => placeSun(true));

  // The demo only shows a confirmation. On a client's site the submit handler below is
  // where the booking goes to the studio's system.
  const dialog = $('book-dialog');
  const form = $('book-form');
  const done = $('book-done');
  let picked = '';

  function openBooking(item, date) {
    picked = `${item.n}, ${date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })} в ${item.t}`;
    $('book-info').textContent = `${picked}. Преподаватель: ${item.who}.`;
    form.hidden = false;
    done.hidden = true;
    dialog.showModal();
    if (animate) gsap.from(dialog, { autoAlpha: 0, y: 24, duration: 1, ease: 'sine.out', clearProps: 'all' });
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    $('book-done-text').textContent = `${data.get('name')}, вы записаны: ${picked}. Приходите за 15 минут, напомним на ${data.get('phone')}.`;
    form.hidden = true;
    done.hidden = false;
  });

  dialog.addEventListener('click', event => {
    if (event.target.closest('[data-close]')) {
      if (!done.hidden) form.reset();
      dialog.close();
    } else if (event.target === dialog) {
      dialog.close();
    }
  });
}
