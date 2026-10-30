/* Sortierer-Engine für MP und MT (Quelle: bzwu/.claude/skills/lerntool/basis/sortierer.js, verteilt mit sync_basis.py).

   Sortierer.init({
     steps: [{ text, detail?, img?, alt? }, ...],   // in der richtigen Reihenfolge, oben = zuerst
     intro: 'Bringen Sie …',                         // optional, ersetzt den Standard-Aufgabentext
   });
   Verschieben: am Griff ziehen (Maus und Finger) oder mit ▲ ▼ (auch Tastatur).
   Markup entsteht in <div id="sortierer">, Aussehen nur aus style.css (.s-*, Knopf und Feedback wie Quiz).
   Testschnittstelle für pruefe_tools.js: window.LerntoolTest. */
var Sortierer = (function () {
  var OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  var NOK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  var GRIP = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';
  var cfg, list, solved;

  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function items() { return [].slice.call(list.children); }
  function order() { return items().map(function (li) { return +li.dataset.i; }); }
  function shuffled(n) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(i);
    do {
      for (i = n - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    } while (n > 1 && a.every(function (v, k) { return v === k; }));
    return a;
  }

  function build() {
    var root = el('sortierer');
    root.innerHTML =
      '<p class="s-intro">' + esc(cfg.intro || 'Bringen Sie die Schritte in die richtige Reihenfolge (oben = zuerst).') +
      ' Ziehen Sie am Griff oder verschieben Sie mit ▲ ▼.</p>' +
      '<ol class="s-list" id="sList"></ol>' +
      '<div class="q-feedback" id="sFeedback" role="status" aria-live="polite"></div>' +
      '<div class="q-next show"><button class="q-btn" id="sCheck">Überprüfen</button></div>';
    list = el('sList');
    el('sCheck').onclick = function () { if (solved) start(); else check(); };
    start();
  }

  function start() {
    solved = false;
    list.innerHTML = shuffled(cfg.steps.length).map(function (i) {
      var s = cfg.steps[i];
      return '<li class="s-item' + (s.detail ? ' has-detail' : '') + '" data-i="' + i + '">' +
        '<button class="s-handle" aria-label="Ziehen" tabindex="-1"><span class="s-num"></span>' + GRIP + '</button>' +
        '<div class="s-body">' + (s.img ? '<img class="s-img" src="' + esc(s.img) + '" alt="' + esc(s.alt || '') + '">' : '') +
        '<span class="s-text">' + esc(s.text) + '</span>' +
        (s.detail ? '<span class="s-detail">' + esc(s.detail) + '</span>' : '') + '</div>' +
        '<div class="s-move"><button class="s-up" aria-label="Nach oben">▲</button><button class="s-down" aria-label="Nach unten">▼</button></div></li>';
    }).join('');
    items().forEach(function (li) {
      li.querySelector('.s-up').onclick = function () { move(li, -1, this); };
      li.querySelector('.s-down').onclick = function () { move(li, 1, this); };
      drag(li);
    });
    el('sCheck').textContent = 'Überprüfen';
    changed();
  }

  function move(li, d, btn) {
    var other = d < 0 ? li.previousElementSibling : li.nextElementSibling;
    if (!other) return;
    list.insertBefore(d < 0 ? li : other, d < 0 ? other : li);
    btn.focus({ preventScroll: true });
    btn.scrollIntoView({ block: 'nearest' });
    changed();
  }

  // Ziehen mit Pointer Events: eine Logik für Maus und Finger, Griff hat touch-action: none.
  // Bewegung am document abhören: insertBefore löst eine Pointer-Capture auf.
  function drag(li) {
    li.querySelector('.s-handle').onpointerdown = function (e) {
      if (e.button) return;
      e.preventDefault();
      li.classList.add('dragging');
      function mv(e) {
        // shortcut: Rand-Scrollen nur bei Bewegung, reicht für Listen bis rund 15 Schritte
        if (e.clientY < 70) scrollBy(0, -12); else if (e.clientY > innerHeight - 110) scrollBy(0, 12);
        var t = document.elementFromPoint(e.clientX, e.clientY);
        t = t && t.closest('.s-item');
        if (!t || t === li || t.parentNode !== list) return;
        var r = t.getBoundingClientRect();
        list.insertBefore(li, e.clientY < r.top + r.height / 2 ? t : t.nextElementSibling);
        changed();
      }
      function up() {
        li.classList.remove('dragging');
        document.removeEventListener('pointermove', mv);
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointercancel', up);
      }
      document.addEventListener('pointermove', mv);
      document.addEventListener('pointerup', up);
      document.addEventListener('pointercancel', up);
    };
  }

  function changed() {
    items().forEach(function (li, k) {
      li.classList.remove('is-correct', 'is-wrong');
      li.querySelector('.s-num').textContent = k + 1;
    });
    el('sFeedback').className = 'q-feedback';
  }

  function check() {
    var o = order(), n = o.length, r = 0;
    items().forEach(function (li, k) {
      var ok = o[k] === k;
      if (ok) r++;
      li.classList.add(ok ? 'is-correct' : 'is-wrong');
      li.querySelector('.s-num').innerHTML = ok ? OK : NOK;
    });
    solved = r === n;
    var fb = el('sFeedback');
    fb.className = 'q-feedback show ' + (solved ? 'ok' : 'nok');
    fb.innerHTML = (solved ? OK : NOK) + '<div><b>' + (solved ? 'Richtig!' : 'Nicht ganz.') + '</b><span>' +
      (solved ? 'Alle ' + n + ' Schritte stehen in der richtigen Reihenfolge.'
        : r + ' von ' + n + ' Schritten stehen am richtigen Platz. Verschieben Sie die rot markierten und prüfen Sie nochmals.') +
      '</span></div>';
    if (solved) el('sCheck').textContent = 'Neu mischen';
    fb.scrollIntoView({ block: 'end', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  window.LerntoolTest = {
    typ: 'sortierer',
    reihenfolge: order   // aktuelle Reihenfolge als Indizes in steps, richtig ist 0, 1, 2 …
  };

  return {
    init: function (c) {
      cfg = c;
      build();
    }
  };
})();
