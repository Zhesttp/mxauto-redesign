'use strict';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const mobileMenu = matchMedia('(max-width: 820px)');
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
    const links = $$('a', nav);
    if (event.shiftKey && document.activeElement === menu) {
      event.preventDefault(); links.at(-1).focus();
    } else if (!event.shiftKey && document.activeElement === links.at(-1)) {
      event.preventDefault(); menu.focus();
    }
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

const photo = $('#photo');
const workCards = $$('[data-photo]');
let photoIndex = 0;
function showPhoto(index) {
  photoIndex = (index + workCards.length) % workCards.length;
  const card = workCards[photoIndex];
  $('img', photo).src = card.dataset.photo;
  $('img', photo).alt = `${card.dataset.title} — работа студии MXauto`;
  $('h3', photo).textContent = card.dataset.title;
  $('.photo-count').textContent = `${photoIndex + 1} / ${workCards.length}`;
}
workCards.forEach((card, index) => card.addEventListener('click', () => { showPhoto(index); openDialog(photo); }));
$('#photo-prev').addEventListener('click', () => showPhoto(photoIndex - 1));
$('#photo-next').addEventListener('click', () => showPhoto(photoIndex + 1));
photo.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault(); showPhoto(photoIndex + (event.key === 'ArrowLeft' ? -1 : 1));
  }
});
const works = $('.works');
function updateGallery() {
  const index = workCards.reduce((best, card, i) => Math.abs(card.getBoundingClientRect().left - works.getBoundingClientRect().left - parseFloat(getComputedStyle(works).paddingLeft)) < Math.abs(workCards[best].getBoundingClientRect().left - works.getBoundingClientRect().left - parseFloat(getComputedStyle(works).paddingLeft)) ? i : best, 0);
  $('#gallery-count').textContent = `${String(index + 1).padStart(2, '0')} / ${String(workCards.length).padStart(2, '0')}`;
  $('#gallery-prev').disabled = works.scrollLeft < 4;
  $('#gallery-next').disabled = works.scrollLeft >= works.scrollWidth - works.clientWidth - 4;
}
function moveGallery(direction) {
  const step = workCards[0].getBoundingClientRect().width + parseFloat(getComputedStyle(works).gap);
  works.scrollBy({left: direction * step, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
}
$('#gallery-prev').addEventListener('click', () => moveGallery(-1));
$('#gallery-next').addEventListener('click', () => moveGallery(1));
works.addEventListener('scroll', updateGallery, {passive:true});
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
  summary.addEventListener('click', event => {
    if (reducedMotion.matches || !answer.animate) return;
    event.preventDefault();
    const from = details.open ? answer.getBoundingClientRect().height : 0;
    desiredOpen = !desiredOpen;
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
addEventListener('resize', () => { updateScroll(); updateGallery(); }, {passive:true});
updateScroll(); updateGallery();
if ('IntersectionObserver' in window) {
  const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('in-view'); reveal.unobserve(entry.target); }
  }), {threshold:.08});
  if (!reducedMotion.matches) {
    $$('.section-head,.service,.selection,.work,.steps article,.contact-grid').forEach(element => {
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
    $('.intro')?.remove();
  }
});

// Keep the headlight signature, with a bounded lifetime and immediate skip.
let introTimer;
function armIntro(intro) {
  if (!intro) return;
  clearTimeout(introTimer);
  if (reducedMotion.matches) { intro.remove(); return; }
  const finish = () => { clearTimeout(introTimer); intro.remove(); };
  intro.addEventListener('animationend', event => { if (event.target === intro) finish(); });
  intro.addEventListener('click', () => intro.classList.add('leaving'));
  introTimer = setTimeout(finish, 2600);
}
const introTemplate = $('.intro').cloneNode(true);
armIntro($('.intro'));
$('#replay').addEventListener('click', () => {
  $('.intro')?.remove();
  const intro = introTemplate.cloneNode(true);
  document.body.append(intro); armIntro(intro);
});
