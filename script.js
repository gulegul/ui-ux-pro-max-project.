(function () {
  var nav = document.getElementById('nav');
  var menuBtn = document.querySelector('.menu-btn');
  menuBtn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      nav.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  });

  var count = 0;
  var countEl = document.getElementById('cartCount');
  var cartBtn = document.querySelector('.cart');
  document.getElementById('products').addEventListener('click', function (e) {
    if (!e.target.classList.contains('add')) return;
    count += 1;
    countEl.textContent = count;
    cartBtn.classList.remove('bump'); void cartBtn.offsetWidth; cartBtn.classList.add('bump');
    cartBtn.setAttribute('aria-label', 'Cart, ' + count + ' items');
  });

  var chips = document.querySelectorAll('.chip');
  var items = document.querySelectorAll('.product');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      var f = chip.dataset.filter;
      items.forEach(function (p) { p.hidden = f !== 'all' && p.dataset.cat !== f; });
    });
  });

  document.querySelectorAll('[data-go]').forEach(function (a) {
    a.addEventListener('click', function () {
      var chip = document.querySelector('.chip[data-filter="' + a.dataset.go + '"]');
      if (chip) chip.click();
    });
  });

  var form = document.getElementById('nlForm');
  var msg = document.getElementById('nlMsg');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = document.getElementById('email');
    var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value);
    msg.textContent = ok ? 'Thanks — you are on the list.' : 'Please enter a valid email address.';
    if (ok) form.reset();
  });

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var header = document.querySelector('.site-header');
  window.addEventListener('scroll', function () {
    header.classList.toggle('scrolled', window.scrollY > 8);
  }, { passive: true });

  if ('IntersectionObserver' in window && !reduce) {
    var targets = document.querySelectorAll('.head, .strip-grid p, .card, .product, .split > *, .about-wrap > *, .nl > *, .foot > div');
    targets.forEach(function (el, i) {
      el.classList.add('rv');
      el.style.setProperty('--d', ((i % 4) * 0.09) + 's');
    });
    var scene = document.querySelector('.scene');
    scene.classList.add('draw');
    scene.querySelectorAll('*').forEach(function (n) {
      var len = n.getTotalLength ? Math.ceil(n.getTotalLength()) + 2 : 0;
      n.style.setProperty('--len', len);
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.rv, .scene').forEach(function (el) { io.observe(el); });
  }

  document.getElementById('yr').textContent = new Date().getFullYear();
})();
