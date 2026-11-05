import { createSky } from './sky.js';
import { createPacer } from './pacer.js';
import { startSchedule } from './schedule.js';
import { startPasses } from './passes.js';

const root = document.documentElement;
const hasGsap = Boolean(window.gsap && window.ScrollTrigger && window.SplitText);
const stillPage = matchMedia('(prefers-reduced-motion: reduce)').matches;
const animate = hasGsap && !stillPage;
const narrow = () => matchMedia('(max-width: 960px)').matches;
const $ = id => document.getElementById(id);

let lenis = null;

const sky = createSky($('sky'), { still: stillPage });
if (!sky.ok) root.classList.add('sky-off');

const skyIsNight = () => root.dataset.sky === 'night';
sky.state.night = skyIsNight() ? 1 : 0;

startSchedule({ animate });
startPasses({ animate });

if (hasGsap) {
  gsap.registerPlugin(ScrollTrigger, SplitText);
  gsap.config({ nullTargetWarn: false });
  whenFontsAreIn().then(() => {
    if (animate) lenis = startSmoothScroll();
    startMobileMenu();
    startActionBar();
    startSunPath();
    startBreathing();
    if (animate) {
      playIntro();
      startScrollEffects();
      startRhythms();
    }
    root.classList.add('vdoh-ready');
    window.vdohReady = true;
    ScrollTrigger.refresh();
  });
} else {
  root.classList.remove('js');
  startMobileMenu();
}

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
  const hour = new Date().getHours();
  root.dataset.sky = event.matches || hour >= 21 || hour < 6 ? 'night' : 'day';
  const target = skyIsNight() ? 1 : 0;
  if (animate) gsap.to(sky.state, { night: target, duration: 2, ease: 'sine.inOut' });
  else {
    sky.state.night = target;
    sky.redraw();
  }
});

function whenFontsAreIn() {
  const patience = new Promise(resolve => setTimeout(resolve, 1600));
  return Promise.race([document.fonts?.ready ?? Promise.resolve(), patience]);
}

function startSmoothScroll() {
  // A long, soft scroll. Nothing on this site should feel in a hurry.
  const smooth = new Lenis({ lerp: .065, wheelMultiplier: .85, anchors: false });
  smooth.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => smooth.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    event.preventDefault();
    smooth.scrollTo(target, { duration: 2.2, easing: t => (1 - Math.cos(Math.PI * t)) / 2 });
  });

  const header = $('header');
  smooth.on('scroll', ({ scroll, direction }) => {
    header.classList.toggle('is-away', direction === 1 && scroll > 240);
  });
  return smooth;
}

function startMobileMenu() {
  const nav = $('nav');
  const burger = document.querySelector('.burger');
  const setOpen = open => {
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) lenis?.stop(); else lenis?.start();
    root.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  nav.addEventListener('click', event => { if (event.target.closest('a')) setOpen(false); });
  addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) {
      setOpen(false);
      burger.focus();
    }
  });
}

function startActionBar() {
  const bar = document.querySelector('.actionbar');
  ScrollTrigger.create({
    trigger: '#schedule',
    start: 'top 60%',
    end: 'bottom 50%',
    onToggle: self => bar.classList.toggle('is-away', self.isActive),
  });
}

// The sun crosses the sky as the page scrolls: high on the first screen, faint behind
// the reading, then down to the horizon for the last offer.
function startSunPath() {
  const phone = narrow();
  const home = phone ? { x: .7, y: .2, radius: .17 } : { x: .7, y: .41, radius: .38 };
  Object.assign(sky.state, home);
  sky.state.glow = 1;
  sky.redraw();
  if (!animate) {
    // Without motion the sun simply fades behind whatever is being read.
    const fade = () => {
      sky.state.glow = Math.max(.3, 1 - scrollY / innerHeight);
      sky.redraw();
    };
    addEventListener('scroll', fade, { passive: true });
    return;
  }
  const journey = gsap.timeline({
    defaults: { ease: 'sine.inOut' },
    scrollTrigger: { trigger: '#main', start: 'top top', end: 'bottom bottom', scrub: 1.2 },
  });
  journey
    .to(sky.state, { x: phone ? .78 : .12, y: .34, radius: home.radius * .8, glow: skyIsNight() ? .3 : .42, duration: 1 }, 0)
    .to(sky.state, { x: phone ? .2 : .88, y: .58, radius: home.radius * .92, duration: 1.6 }, 1)
    .to(sky.state, { x: .5, y: phone ? .76 : .9, radius: home.radius * (phone ? 1.5 : 1.3), glow: 1, duration: 1 }, 2.6)
    .to(sky.state, { depth: 1, duration: 3.6, ease: 'none' }, 0);
}

// Breathing drives the sun, the logo and the word on the first screen.
function startBreathing() {
  const dot = $('logo-dot');
  const footerWord = document.querySelector('.footer-word');

  const setBreath = (to, seconds) => {
    if (!animate) return;
    gsap.to(sky.state, { breath: to, duration: seconds, ease: 'sine.inOut', overwrite: 'auto' });
    gsap.to(dot, { scale: 1 + to * .5, duration: seconds, ease: 'sine.inOut', overwrite: 'auto' });
    gsap.to(footerWord, { scaleY: 1 + to * .06, duration: seconds, ease: 'sine.inOut', overwrite: 'auto' });
  };

  const hero = createPacer({ word: $('word'), count: $('count'), onBreath: setBreath });
  if (animate) hero.start();
  else {
    $('word').textContent = 'in · out';
    $('count').hidden = true;
  }

  // The minute: the page fades, the sun takes the screen.
  const minute = $('minute');
  let cycle = 0;

  const moveFocus = (to, seconds) => {
    if (animate) gsap.to(sky.state, { focus: to, duration: seconds, ease: 'sine.inOut' });
    else {
      sky.state.focus = to;
      sky.redraw();
    }
  };

  const pacer = createPacer({
    word: $('m-word'),
    count: $('m-count'),
    onBreath: setBreath,
    onCycle: () => {
      cycle++;
      if (cycle > 5) {
        $('minute-stage').hidden = true;
        $('minute-end').hidden = false;
        $('minute-progress').textContent = 'That was a minute';
        $('minute-close').textContent = 'Back to the site';
        return false;
      }
      $('minute-progress').textContent = `Cycle ${cycle} of 5`;
      return true;
    },
  });

  $('start-minute').addEventListener('click', () => {
    cycle = 0;
    $('minute-stage').hidden = false;
    $('minute-end').hidden = true;
    $('minute-close').textContent = 'Finish';
    $('minute-progress').textContent = 'Cycle 1 of 5';
    hero.stop();
    lenis?.stop();
    document.body.classList.add('is-breathing');
    minute.showModal();
    sky.state.focusRadius = narrow() ? .27 : .4;
    moveFocus(1, 2.4);
    pacer.start();
  });

  minute.addEventListener('close', () => {
    pacer.stop();
    document.body.classList.remove('is-breathing');
    lenis?.start();
    moveFocus(0, 2.2);
    if (animate) hero.start();
  });
  $('minute-close').addEventListener('click', () => minute.close());
}

// Things here arrive the way a breath does: slowly, out of a little mist.
function mist(target, vars = {}) {
  return gsap.from(target, { autoAlpha: 0, filter: 'blur(14px)', y: 16, duration: 2.1, ease: 'sine.out', clearProps: 'filter', ...vars });
}

function playIntro() {
  const title = SplitText.create('[data-hero-title]', { type: 'words', wordsClass: 'word' });
  gsap.timeline()
    .fromTo(sky.state, { intro: .05 }, { intro: 1, duration: 3.2, ease: 'sine.inOut' }, 0)
    .add(mist(title.words, { stagger: .22 }), .3)
    .add(mist('.breath-word', { duration: 1.8 }), 1.2)
    .add(mist('.hero-copy > :not(h1)', { stagger: .22, duration: 1.8 }), 1.1)
    .add(mist('.horizon > li', { stagger: .16, duration: 1.6 }), 1.7);
}

function startScrollEffects() {
  gsap.utils.toArray('[data-mist]').forEach(element => {
    const split = SplitText.create(element, { type: 'words', wordsClass: 'word' });
    mist(split.words, { stagger: .12, scrollTrigger: { trigger: element, start: 'top 86%', once: true } });
  });

  // Quotes come up word by word, at reading pace, tied to the scroll.
  gsap.utils.toArray('[data-words]').forEach(quote => {
    const split = SplitText.create(quote, { type: 'words', wordsClass: 'word' });
    gsap.fromTo(split.words, { opacity: .1 }, {
      opacity: 1, stagger: .05, ease: 'none',
      scrollTrigger: { trigger: quote, start: 'top 82%', end: 'bottom 56%', scrub: 1 },
    });
  });

  gsap.utils.toArray('.dir-name, .dir > p, .power').forEach(element => {
    mist(element, { duration: 1.6, scrollTrigger: { trigger: element, start: 'top 90%', once: true } });
  });

  gsap.utils.toArray('.teacher').forEach((teacher, i) => {
    mist(teacher, { delay: i * .18, duration: 1.8, scrollTrigger: { trigger: '.teachers', start: 'top 84%', once: true } });
  });

  mist('.pass-list .pass', { stagger: .1, duration: 1.4, y: 10, scrollTrigger: { trigger: '#pass-list', start: 'top 84%', once: true } });
  mist('.sched-bar', { duration: 1.5, scrollTrigger: { trigger: '.sched-bar', start: 'top 90%', once: true } });
  mist('#classes', { duration: 1.5, scrollTrigger: { trigger: '#classes', start: 'top 92%', once: true } });
  mist('.first p, .first .btn', { stagger: .2, duration: 1.6, scrollTrigger: { trigger: '.first p', start: 'top 92%', once: true } });
}

// Every direction draws its own rhythm: Yin is long and low, Vinyasa is quick and tall.
function startRhythms() {
  const rows = gsap.utils.toArray('.dir').map(row => ({
    path: row.querySelector('.wave path'),
    rate: +row.dataset.rate,
    height: +row.dataset.height,
    energy: 1,
    target: 1,
    row,
    onScreen: false,
  }));

  rows.forEach(item => {
    item.row.addEventListener('pointerenter', () => { item.target = 1.25; });
    item.row.addEventListener('pointerleave', () => { item.target = 1; });
    new IntersectionObserver(([entry]) => { item.onScreen = entry.isIntersecting; }).observe(item.row);
  });

  const POINTS = 90;
  gsap.ticker.add(time => {
    for (const item of rows) {
      if (!item.onScreen) continue;
      item.energy += (item.target - item.energy) * .04;
      let d = '';
      for (let i = 0; i <= POINTS; i++) {
        const x = i / POINTS;
        const envelope = Math.sin(x * Math.PI);
        const y = 60 - Math.sin(x * 6.283 * (1 + item.rate * 2.2) - time * item.rate * .9) * 50 * item.height * item.energy * envelope;
        d += `${i ? 'L' : 'M'}${(x * 1000).toFixed(1)} ${y.toFixed(2)}`;
      }
      item.path.setAttribute('d', d);
    }
  });
}
