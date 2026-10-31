/* Memory-Engine für MP und MT (Quelle: bzwu/.claude/skills/lerntool/basis/memory.js, verteilt mit sync_basis.py).

   Memory.init({
     paare: [{ name, img, zusatz? }, ...],   // Bildkarte + Namenskarte, zusatz = kleine zweite Zeile auf der Namenskarte
     rueckseite: 'a.2',                       // Text auf der verdeckten Seite
     auswahl: [6, 9],                         // optional: Knöpfe für weniger Paare, «Alle n» kommt dazu
     intro: 'Finden Sie …'                    // optional
   });
   Bedienung: Karte antippen (oder Enter/Leertaste), zwei Karten bilden einen Versuch.
   Rückmeldung mit Rahmen, Symbol und Wort, auch als Statuszeile. Aussehen nur aus style.css (.m-*, Knöpfe und Endkarte wie Quiz).
   Testschnittstelle für pruefe_tools.js: window.LerntoolTest. */
var Memory = (function () {
  var OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  var NOK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  var cfg, anzahl, offen, gefunden, versuche, gesperrt;

  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mischen(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function karten() { return [].slice.call(el('mGrid').children); }
  function reduziert() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }

  function build() {
    var n = cfg.paare.length;
    var wahl = (cfg.auswahl || []).filter(function (k) { return k < n; }).concat(n);
    el('memory').innerHTML =
      '<p class="m-intro">' + esc(cfg.intro || 'Finden Sie zu jedem Bild den passenden Namen.') + ' Tippen Sie zwei Karten an.</p>' +
      (wahl.length > 1 ? '<div class="lk-filter" role="group" aria-label="Anzahl Paare">' + wahl.map(function (k) {
        return '<button type="button" class="lk-chip" data-n="' + k + '">' + (k === n ? 'Alle ' + k : k) + ' Paare</button>';
      }).join('') + '</div>' : '') +
      '<div class="q-meta"><span>Gefunden <strong id="mFound">0</strong> / <span id="mTotal"></span></span><span>Versuche <strong id="mTries">0</strong></span></div>' +
      '<div class="m-status" id="mStatus" role="status" aria-live="polite"></div>' +
      '<div class="m-grid" id="mGrid"></div>' +
      '<section class="q-card q-end" id="mEnd"><h2>Alle Paare gefunden!</h2><p id="mEndText"></p>' +
      '<button type="button" class="q-btn" id="mAgain">Nochmals spielen</button></section>' +
      '<button type="button" class="lk-mix" id="mMix">Neu mischen</button>';
    [].forEach.call(document.querySelectorAll('#memory .lk-chip'), function (b) {
      b.onclick = function () { anzahl = +b.dataset.n; start(); };
    });
    el('mAgain').onclick = el('mMix').onclick = start;
    anzahl = n;
    start();
  }

  function start() {
    offen = []; gefunden = 0; versuche = 0; gesperrt = false;
    [].forEach.call(document.querySelectorAll('#memory .lk-chip'), function (b) {
      b.classList.toggle('active', +b.dataset.n === anzahl);
      b.setAttribute('aria-pressed', +b.dataset.n === anzahl);
    });
    var stapel = [];
    mischen(cfg.paare.map(function (p, i) { return i; })).slice(0, anzahl).forEach(function (i) {
      stapel.push({ i: i, bild: true }, { i: i, bild: false });
    });
    el('mGrid').innerHTML = mischen(stapel).map(function (k) {
      var p = cfg.paare[k.i];
      var vorne = k.bild
        ? '<img src="' + esc(p.img) + '" alt="' + esc(p.name) + '">'
        : '<span class="m-name">' + esc(p.name) + '</span>' + (p.zusatz ? '<span class="m-zusatz">' + esc(p.zusatz) + '</span>' : '');
      return '<button type="button" class="m-card" data-i="' + k.i + '" data-bild="' + k.bild + '" aria-label="Verdeckte Karte">' +
        '<span class="m-inner"><span class="m-face m-back">' + esc(cfg.rueckseite || '') + '</span>' +
        '<span class="m-face m-front' + (k.bild ? ' is-img' : ' is-name') + '">' + vorne + '</span></span>' +
        '<span class="m-mark" aria-hidden="true"></span></button>';
    }).join('');
    karten().forEach(function (c) { c.onclick = function () { umdrehen(c); }; });
    el('mFound').textContent = '0';
    el('mTotal').textContent = anzahl;
    el('mTries').textContent = '0';
    el('mStatus').className = 'm-status';
    el('mStatus').textContent = '';
    el('mEnd').classList.remove('show');
  }

  function beschreibe(c) { return (c.dataset.bild === 'true' ? 'Bild: ' : 'Name: ') + cfg.paare[c.dataset.i].name; }

  function umdrehen(c) {
    if (gesperrt || offen.length > 1 || c.classList.contains('flipped')) return;
    c.classList.add('flipped');
    c.setAttribute('aria-label', beschreibe(c));
    offen.push(c);
    if (offen.length === 2) pruefen();
  }

  function status(ok, text) {
    var s = el('mStatus');
    s.className = 'm-status show ' + (ok ? 'ok' : 'nok');
    s.innerHTML = (ok ? OK : NOK) + '<span><b>' + (ok ? 'Paar gefunden' : 'Kein Paar') + '</b> ' + esc(text) + '</span>';
  }

  function pruefen() {
    var a = offen[0], b = offen[1];
    var paar = a.dataset.i === b.dataset.i && a.dataset.bild !== b.dataset.bild;
    versuche++;
    el('mTries').textContent = versuche;
    if (paar) {
      gefunden++;
      el('mFound').textContent = gefunden;
      [a, b].forEach(function (c) { c.classList.add('matched'); c.querySelector('.m-mark').innerHTML = OK; c.disabled = true; });
      status(true, cfg.paare[a.dataset.i].name);
      offen = [];
      if (gefunden === anzahl) setTimeout(ende, reduziert() ? 0 : 700);
      return;
    }
    gesperrt = true;
    [a, b].forEach(function (c) { c.classList.add('wrong'); c.querySelector('.m-mark').innerHTML = NOK; });
    status(false, 'Die Karten werden wieder verdeckt.');
    setTimeout(function () {
      [a, b].forEach(function (c) {
        c.classList.remove('flipped', 'wrong');
        c.querySelector('.m-mark').innerHTML = '';
        c.setAttribute('aria-label', 'Verdeckte Karte');
      });
      offen = []; gesperrt = false;
    }, 1400);
  }

  function ende() {
    el('mEndText').textContent = 'Alle ' + anzahl + ' Paare in ' + versuche + ' Versuchen gefunden. Die Paare bleiben zum Nachschauen offen.';
    el('mStatus').className = 'm-status';
    el('mEnd').classList.add('show');
    el('mAgain').focus();
  }

  window.LerntoolTest = {
    typ: 'memory',
    karten: function () { return karten().map(function (c) { return +c.dataset.i; }); }, // Paar-Index pro Karte in Anzeigereihenfolge
    gesperrt: function () { return gesperrt; }
  };

  return {
    init: function (c) {
      cfg = c;
      build();
    }
  };
})();
