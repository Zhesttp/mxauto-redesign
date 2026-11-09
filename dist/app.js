'use strict';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const mobileMenu = matchMedia('(max-width: 820px)');
// Touch must clear emulated/sticky hover; keyboard focus stays accessible.
const inputRoot = document.documentElement;
inputRoot.dataset.input = matchMedia('(hover: hover) and (pointer: fine)').matches ? 'mouse' : 'touch';
addEventListener('pointerdown', event => {
  inputRoot.dataset.input = event.pointerType === 'mouse' ? 'mouse' : 'touch';
}, {passive:true,capture:true});
addEventListener('pointermove', event => {
  if (event.pointerType === 'mouse' && inputRoot.dataset.input !== 'mouse') inputRoot.dataset.input = 'mouse';
}, {passive:true});
addEventListener('keydown', event => {
  if (['Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) inputRoot.dataset.input = 'keyboard';
}, {capture:true});
const menu = $('.menu');
const nav = $('nav');
const menuBackdrop = $('.menu-backdrop');
function setMenu(open, restoreFocus = false) {
  nav.classList.toggle('open', open);
  menuBackdrop.classList.toggle('open', open);
  document.body.classList.toggle('menu-open', open);
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  nav.inert = mobileMenu.matches && !open;
  const background = [$('#main'), $('footer'), $('.mobile-dock')];
  background.forEach(element => { element.inert = open || document.body.classList.contains('intro-playing'); });
  if (restoreFocus) menu.focus();
}
menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
menuBackdrop.addEventListener('click', () => setMenu(false, true));
$$('a', nav).forEach(link => link.addEventListener('click', () => setMenu(false)));
mobileMenu.addEventListener('change', () => setMenu(false));
setMenu(false);
document.addEventListener('keydown', event => {
  if (menu.getAttribute('aria-expanded') !== 'true') return;
  if (event.key === 'Escape') setMenu(false, true);
  if (event.key === 'Tab') {
    const controls = [menu, ...$$('a', nav)];
    const index = controls.indexOf(document.activeElement);
    const next = (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
    event.preventDefault();
    controls[next].focus();
  }
});

// Native dialogs retain focus trapping and Escape support; only their exit is animated.
let returnFocus = null;
const dialogTimers = new WeakMap();
function openDialog(dialog) {
  setMenu(false);
  returnFocus = document.activeElement;
  clearTimeout(dialogTimers.get(dialog));
  dialog.classList.remove('closing');
  if (!dialog.open) dialog.showModal();
  document.body.classList.add('modal-open');
}
function closeDialog(dialog) {
  if (!dialog.open || dialog.classList.contains('closing')) return;
  const finish = () => {
    dialog.close();
    dialog.classList.remove('closing');
  };
  if (reducedMotion.matches) finish();
  else {
    dialog.classList.add('closing');
    dialogTimers.set(dialog, setTimeout(finish, 220));
  }
}
$$('dialog').forEach(dialog => {
  $('.close', dialog).addEventListener('click', () => closeDialog(dialog));
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(dialog); });
  let startedOnBackdrop = false;
  const isOutside = event => {
    const rect = dialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  };
  dialog.addEventListener('pointerdown', event => { startedOnBackdrop = event.target === dialog && isOutside(event); });
  dialog.addEventListener('click', event => {
    if (startedOnBackdrop && event.target === dialog && isOutside(event)) closeDialog(dialog);
    startedOnBackdrop = false;
  });
  dialog.addEventListener('close', () => {
    document.body.classList.toggle('modal-open', !!$('dialog[open]'));
    if (returnFocus?.isConnected) returnFocus.focus({preventScroll:true});

  });
});
const booking = $('#booking');
$$('[data-book], [data-service]').forEach(button => button.addEventListener('click', () => {
  $('#service').value = button.dataset.service || 'Нужна консультация';
  $('.form-status').replaceChildren();
  openDialog(booking);
}));
$('#request-form').addEventListener('submit', event => {
  event.preventDefault();
  const car = $('#car');
  car.setCustomValidity(car.value.trim() ? '' : 'Укажите модель вашего автомобиля.');
  if (!event.target.reportValidity()) return;
  const message = `Здравствуйте! Интересует ${$('#service').value.toLowerCase()}. Автомобиль: ${car.value.trim()}. Подскажите стоимость и ближайшее время для записи.`;
  const url = `https://t.me/mxautoby?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  const fallback = document.createElement('a');
  fallback.href = url; fallback.target = '_blank'; fallback.rel = 'noopener noreferrer';
  fallback.textContent = 'Открыть Telegram, если переход не сработал';
  $('.form-status').replaceChildren(fallback);
});
$('#car').addEventListener('input', event => event.target.setCustomValidity(''));

const workCards = $$('.work');
const works = $('.works');
// Keep native scrolling; block only the synthetic click following a swipe/hold.
let galleryGesture = null;
let suppressGalleryClick = false;
function galleryGestureIsTap(gesture, x, y, now) {
  return !gesture.moved && Math.abs(x - gesture.x) < 8 && Math.abs(y - gesture.y) < 8 && now - gesture.started < 450;
}
works.addEventListener('pointerdown', event => {
  suppressGalleryClick = false;
  if (event.pointerType === 'mouse' || !event.isPrimary) return;
  galleryGesture = {id:event.pointerId,x:event.clientX,y:event.clientY,started:performance.now(),moved:false};
}, {passive:true});
works.addEventListener('pointermove', event => {
  if (!galleryGesture || event.pointerId !== galleryGesture.id) return;
  if (Math.abs(event.clientX - galleryGesture.x) >= 8 || Math.abs(event.clientY - galleryGesture.y) >= 8) galleryGesture.moved = true;
}, {passive:true});
works.addEventListener('pointerup', event => {
  if (!galleryGesture || event.pointerId !== galleryGesture.id) return;
  suppressGalleryClick = !galleryGestureIsTap(galleryGesture, event.clientX, event.clientY, performance.now());
  galleryGesture = null;
}, {passive:true});
works.addEventListener('pointercancel', event => {
  if (!galleryGesture || event.pointerId !== galleryGesture.id) return;
  suppressGalleryClick = true;
  galleryGesture = null;
}, {passive:true});
works.addEventListener('click', event => {
  if (event.detail !== 0 && suppressGalleryClick && event.target.closest('.work')) event.preventDefault();
}, {capture:true});
const galleryFill = $('.gallery-progress span');
let galleryFrame = 0;
let galleryMax = 0;
let galleryStops = [];
let galleryIndex = -1;
function measureGallery() {
  const padding = parseFloat(getComputedStyle(works).paddingLeft) || 0;
  const left = works.getBoundingClientRect().left;
  galleryMax = Math.max(0, works.scrollWidth - works.clientWidth);
  galleryStops = workCards.map(card => Math.max(0, Math.min(galleryMax,
    card.getBoundingClientRect().left - left + works.scrollLeft - padding)));
  updateGallery();
}
function updateGallery() {
  galleryFrame = 0;
  const position = Math.max(0, Math.min(galleryMax, works.scrollLeft));
  const index = galleryStops.reduce((best, stop, i) => Math.abs(stop - position) < Math.abs(galleryStops[best] - position) ? i : best, 0);
  if (index !== galleryIndex) {
    galleryIndex = index;
    $('#gallery-count').textContent = `${String(index + 1).padStart(2, '0')} / ${String(workCards.length).padStart(2, '0')}`;
  }
  $('#gallery-prev').disabled = position < 4;
  $('#gallery-next').disabled = position >= galleryMax - 4;
  const progress = galleryMax ? (1 + position / galleryMax * (workCards.length - 1)) / workCards.length : 1;
  galleryFill.style.transform = `scaleX(${progress})`;
}
function moveGallery(direction) {
  const step = workCards[0].getBoundingClientRect().width + parseFloat(getComputedStyle(works).gap);
  works.scrollBy({left: direction * step, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
}
$('#gallery-prev').addEventListener('click', () => moveGallery(-1));
$('#gallery-next').addEventListener('click', () => moveGallery(1));
works.addEventListener('scroll', () => {
  if (!galleryFrame) galleryFrame = requestAnimationFrame(updateGallery);
}, {passive:true});
works.addEventListener('keydown', event => {
  if (event.target !== works || !['ArrowLeft','ArrowRight'].includes(event.key)) return;
  event.preventDefault(); moveGallery(event.key === 'ArrowLeft' ? -1 : 1);
});

// Animate measured answer heights while preserving native details semantics.
$$('.faq details').forEach(details => {
  const summary = $('summary', details);
  const answer = $('.faq-answer', details);
  let animation;
  let desiredOpen = details.open;
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches && animation) {
      animation.cancel(); animation = null; details.open = desiredOpen;
    }
  });
  summary.addEventListener('click', event => {
    if (reducedMotion.matches || !answer.animate) return;
    event.preventDefault();
    const from = details.open ? answer.getBoundingClientRect().height : 0;
    desiredOpen = animation ? !desiredOpen : !details.open;
    animation?.cancel();
    details.open = true;
    animation = answer.animate([{height:`${from}px`,opacity:from ? 1 : 0},{height:`${desiredOpen ? answer.scrollHeight : 0}px`,opacity:desiredOpen ? 1 : 0}],{duration:320,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});
    animation.onfinish = () => { details.open = desiredOpen; animation.cancel(); animation = null; };
  });
});

const meter = $('.scroll-meter');
let scrollFrame = 0;
function updateScroll() {
  scrollFrame = 0;
  const range = document.documentElement.scrollHeight - innerHeight;
  meter.style.transform = `scaleX(${range > 0 ? Math.min(1, Math.max(0, scrollY / range)) : 0})`;
  $('header').classList.toggle('scrolled', scrollY > 16);
}
addEventListener('scroll', () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll); }, {passive:true});
addEventListener('resize', () => { updateScroll(); measureGallery(); measureSteps(); }, {passive:true});
updateScroll(); measureGallery();
if ('IntersectionObserver' in window) {
  const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('in-view'); reveal.unobserve(entry.target); }
  }), {threshold:.08});
  if (!reducedMotion.matches) {
    $$('.section-head,.service,.selection,.steps article,.contact-grid').forEach(element => {
      if (element.getBoundingClientRect().top < innerHeight) return;
      element.classList.add('reveal-ready'); reveal.observe(element);
    });
  }
  const activeSection = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    $$('a', nav).forEach(link => {
      if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
  }), {rootMargin:'-15% 0px -55% 0px'});
  $$('main section[id]').forEach(section => activeSection.observe(section));
  const contactObserver = new IntersectionObserver(entries => $('.mobile-dock').classList.toggle('is-hidden', entries[0].isIntersecting), {threshold:.15});
  contactObserver.observe($('#contacts'));
}
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) {
    $$('.reveal-ready').forEach(element => element.classList.add('in-view'));
    $$('.steps article').forEach(article => article.classList.add('step-complete'));
    $('.steps-track span').style.transform = 'scaleY(1)';
    finishIntro();
  }
});

// Each process step is observed once; no per-frame scroll measurements.
const steps = $('.steps');
const stepArticles = $$('article', steps);
const stepTrack = $('.steps-track');
const stepFill = $('span', stepTrack);
let completedStep = -1;
function measureSteps() {
  const first = $('span', stepArticles[0]);
  const last = $('span', stepArticles.at(-1));
  const start = stepArticles[0].offsetTop + first.offsetTop + first.offsetHeight / 2;
  const end = stepArticles.at(-1).offsetTop + last.offsetTop + last.offsetHeight / 2;
  stepTrack.style.top = `${start}px`;
  stepTrack.style.height = `${Math.max(0, end - start)}px`;
}
measureSteps();
if ('ResizeObserver' in window) {
  const layoutObserver = new ResizeObserver(() => { measureGallery(); measureSteps(); });
  layoutObserver.observe(works);
  layoutObserver.observe(steps);
}
if (!reducedMotion.matches && 'IntersectionObserver' in window) {
  const stepObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const index = stepArticles.indexOf(entry.target);
    completedStep = Math.max(completedStep, index);
    stepFill.style.transform = `scaleY(${completedStep / Math.max(1, stepArticles.length - 1)})`;
    stepArticles.slice(0, completedStep + 1).forEach(article => article.classList.add('step-complete'));
    stepObserver.unobserve(entry.target);
  }), {threshold:.4});
  stepArticles.forEach(article => stepObserver.observe(article));
} else {
  stepFill.style.transform = 'scaleY(1)';
  stepArticles.forEach(article => article.classList.add('step-complete'));
}

// The intro remains bounded; background controls become available on completion.
let introTimer;
let currentIntro;
let introReturnFocus;
const introTemplate = $('.intro').cloneNode(true);
const introBackground = $$('header,main,footer,.mobile-dock,.skip-link');
function finishIntro() {
  clearTimeout(introTimer);
  if (!currentIntro) { document.body.classList.add('page-ready'); return; }
  const focusedInside = currentIntro.contains(document.activeElement);
  currentIntro?.remove();
  currentIntro = null;
  document.body.classList.remove('intro-playing');
  document.body.classList.add('page-ready');
  introBackground.forEach(element => { element.inert = false; });
  if (focusedInside) (introReturnFocus || $('.hero h1')).focus({preventScroll:true});
}
function armIntro(intro) {
  clearTimeout(introTimer);
  currentIntro = intro;
  if (!intro || reducedMotion.matches || getComputedStyle(intro).visibility === 'hidden') { finishIntro(); return; }
  document.body.classList.add('intro-playing');
  introBackground.forEach(element => { element.inert = true; });
  intro.addEventListener('animationstart', event => {
    if (event.target === intro && event.animationName === 'introOut') document.body.classList.add('page-ready');
  });
  intro.addEventListener('animationend', event => {
    if (event.target === intro && currentIntro === intro) finishIntro();
  });
  intro.addEventListener('click', () => intro.classList.add('leaving'));
  intro.addEventListener('keydown', event => {
    if (event.key === 'Escape') intro.classList.add('leaving');
  });
  introTimer = setTimeout(() => { if (currentIntro === intro) finishIntro(); }, 2600);
}
armIntro($('.intro'));
$('#replay').addEventListener('click', () => {
  finishIntro();
  introReturnFocus = $('#replay');
  const intro = introTemplate.cloneNode(true);
  document.body.append(intro); armIntro(intro);
  if (!reducedMotion.matches) $('.intro-skip', intro).focus({preventScroll:true});
});
