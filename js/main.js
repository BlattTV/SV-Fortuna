'use strict';

/* ---------- Year ---------- */
document.querySelectorAll('#year, .year-placeholder').forEach(el => {
  el.textContent = new Date().getFullYear();
});

/* ---------- Cookie Banner ---------- */
(function () {
  const banner = document.getElementById('cookie-banner');
  const btn    = document.getElementById('cookie-accept');
  if (!banner) return;

  if (localStorage.getItem('cookie_consent') === 'accepted') {
    banner.classList.add('hidden');
    return;
  }
  banner.classList.remove('hidden');

  btn && btn.addEventListener('click', () => {
    localStorage.setItem('cookie_consent', 'accepted');
    banner.classList.add('hidden');
  });
})();

/* ---------- Navbar scroll ---------- */
(function () {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 60);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ---------- Mobile nav toggle ---------- */
(function () {
  const toggle = document.getElementById('nav-toggle');
  const menu   = document.getElementById('nav-menu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });

  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });
})();

/* ---------- Scroll reveal ---------- */
(function () {
  const observer = new IntersectionObserver(
    (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); } }),
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
})();

/* ---------- Animated counters ---------- */
(function () {
  const counters = document.querySelectorAll('.stat-num[data-target]');
  if (!counters.length) return;

  const animate = (el) => {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1800;
    const step = 16;
    const increment = target / (duration / step);
    let current = 0;

    const timer = setInterval(() => {
      current = Math.min(current + increment, target);
      el.textContent = Math.floor(current);
      if (current >= target) {
        el.textContent = target;
        clearInterval(timer);
      }
    }, step);
  };

  const observer = new IntersectionObserver(
    (entries) => entries.forEach(e => {
      if (e.isIntersecting) {
        animate(e.target);
        observer.unobserve(e.target);
      }
    }),
    { threshold: 0.5 }
  );
  counters.forEach(el => observer.observe(el));
})();

/* ---------- Hero particles ---------- */
(function () {
  const container = document.getElementById('particles');
  if (!container) return;

  const count = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 25;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 30 + 8;
    const left = Math.random() * 100;
    const delay = Math.random() * 12;
    const duration = Math.random() * 15 + 10;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${left}%;
      bottom:-${size}px;
      animation-duration:${duration}s;
      animation-delay:-${delay}s;
    `;
    container.appendChild(p);
  }
})();

/* ---------- Sport card staggered reveal ---------- */
(function () {
  document.querySelectorAll('.sport-card[data-delay]').forEach(card => {
    const delay = parseInt(card.dataset.delay, 10) || 0;
    card.style.transitionDelay = delay + 'ms';
  });
})();

/* ---------- Active nav link on scroll ---------- */
(function () {
  const sections = document.querySelectorAll('section[id]');
  const links = document.querySelectorAll('.nav-link');
  if (!sections.length || !links.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          links.forEach(l => l.classList.remove('active'));
          const active = document.querySelector(`.nav-link[href="#${e.target.id}"]`);
          if (active) active.classList.add('active');
        }
      });
    },
    { rootMargin: '-40% 0px -55% 0px' }
  );
  sections.forEach(s => observer.observe(s));
})();
