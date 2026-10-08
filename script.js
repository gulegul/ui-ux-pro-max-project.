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

  var form = document.getElementById('nlForm');
  var msg = document.getElementById('nlMsg');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = document.getElementById('email');
    var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value);
    msg.textContent = ok ? 'Thanks — you are on the list.' : 'Please enter a valid email address.';
    if (ok) form.reset();
  });

  document.getElementById('yr').textContent = new Date().getFullYear();
})();
