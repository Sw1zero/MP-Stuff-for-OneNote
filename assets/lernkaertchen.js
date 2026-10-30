/* Lernkärtchen-Engine für MP und MT (Quelle: bzwu/.claude/skills/lerntool/basis/lernkaertchen.js, verteilt mit sync_basis.py).

   Lernkaertchen.init({
     karten: [{ vorne, hinten, kategorie? }],   // hinten darf <strong>, <br>, <ul> enthalten
     hinweis: 'Antippen für die Antwort'          // optional, Text unten auf der Vorderseite
   });
   Mehrere Kategorien -> Filter oben. Karte antippen dreht sie um, danach «Wusste ich» oder
   «Wusste ich nicht». Nicht gewusste Karten kommen ans Ende des Stapels, bis alle gewusst sind.
   Lernkartei mit zwei Fächern: Der Browser merkt sich pro Seite, welche Karten zuletzt nicht gewusst
   waren (localStorage). Diese kommen beim nächsten Mal zuerst. Ohne Speicher läuft alles wie gewohnt.
   Markup entsteht in <div id="lernkaertchen">, Aussehen nur aus style.css (.lk-*, .q-*).
   Testschnittstelle für pruefe_tools.js: window.LerntoolTest. */
var Lernkaertchen = (function () {
  var cfg, root, kat, stapel, gewusst, ersterVersuch, wiederholt, umgedreht, schwach;
  var SPEICHER = 'lernkaertchen:' + location.pathname;

  function laden() { try { return JSON.parse(localStorage.getItem(SPEICHER)) || []; } catch (e) { return []; } }
  function merken() { try { localStorage.setItem(SPEICHER, JSON.stringify(schwach)); } catch (e) { /* privat oder blockiert */ } }

  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function kategorien() {
    var k = [];
    cfg.karten.forEach(function (c) { if (c.kategorie && k.indexOf(c.kategorie) < 0) k.push(c.kategorie); });
    return k;
  }
  function auswahl() { return cfg.karten.filter(function (c) { return !kat || c.kategorie === kat; }); }

  function build() {
    var k = kategorien();
    root.innerHTML =
      (k.length > 1 ? '<div class="lk-filter" role="group" aria-label="Kategorie">' + [''].concat(k).map(function (x) {
        var n = x ? cfg.karten.filter(function (c) { return c.kategorie === x; }).length : cfg.karten.length;
        return '<button class="lk-chip" data-kat="' + esc(x) + '">' + esc(x || 'Alle') + ' <span>' + n + '</span></button>';
      }).join('') + '</div>' : '') +
      '<div class="q-meta"><strong id="lkNum"></strong><span id="lkRest"></span></div>' +
      '<p class="lk-note" id="lkNote" hidden></p>' +
      '<div class="lk-bar" aria-hidden="true"><span id="lkBar"></span></div>' +
      '<div class="lk-card" id="lkCard" role="button" tabindex="0" aria-label="Karte umdrehen"><div class="lk-inner">' +
      '<div class="lk-face lk-front"><span class="q-badge" id="lkBadgeV"></span><div class="lk-text" id="lkFront"></div>' +
      '<span class="lk-hint">' + esc(cfg.hinweis || 'Antippen zum Umdrehen') + '</span></div>' +
      '<div class="lk-face lk-back" aria-live="polite"><span class="q-badge" id="lkBadgeH"></span><div class="lk-text" id="lkBack"></div></div>' +
      '</div></div>' +
      '<button class="lk-mix" id="lkMix">Karten mischen</button>' +
      '<section class="q-card q-end" id="lkEnd"><h2>Alle Karten gewusst</h2><p id="lkEndText"></p>' +
      '<button class="q-btn" id="lkRestart">Nochmals von vorne</button>' +
      '<button class="q-btn ghost" id="lkRestartMix">Gemischt von vorne</button></section>' +
      '<div class="q-next show lk-actions" id="lkActions">' +
      '<button class="q-btn" id="lkFlip">Umdrehen</button>' +
      '<div class="lk-rate" id="lkRate"><button class="q-btn lk-no" id="lkNo">Wusste ich nicht</button>' +
      '<button class="q-btn lk-yes" id="lkYes">Wusste ich</button></div></div>';
    [].forEach.call(root.querySelectorAll('.lk-chip'), function (b) { b.onclick = function () { kat = b.dataset.kat; start(auswahl()); }; });
    el('lkCard').onclick = drehen;
    el('lkCard').onkeydown = function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); drehen(); } };
    el('lkFlip').onclick = drehen;
    el('lkNo').onclick = function () { bewerten(false); };
    el('lkYes').onclick = function () { bewerten(true); };
    el('lkMix').onclick = function () { start(shuffle(auswahl())); };
    el('lkRestart').onclick = function () { start(auswahl()); };
    el('lkRestartMix').onclick = function () { start(shuffle(auswahl())); };
    document.addEventListener('keydown', function (e) {
      if (!umgedreht || e.target.tagName === 'BUTTON') return;
      if (e.key === 'ArrowLeft') bewerten(false);
      if (e.key === 'ArrowRight') bewerten(true);
    });
    kat = '';
    schwach = laden().filter(function (v) { return cfg.karten.some(function (c) { return c.vorne === v; }); });
    start(auswahl());
  }

  function start(liste) {
    var zuerst = liste.filter(function (c) { return schwach.indexOf(c.vorne) >= 0; });
    stapel = zuerst.concat(liste.filter(function (c) { return zuerst.indexOf(c) < 0; }));
    el('lkNote').hidden = !zuerst.length;
    el('lkNote').textContent = zuerst.length === 1 ? '1 Karte haben Sie beim letzten Mal nicht gewusst. Sie kommt zuerst.'
      : zuerst.length + ' Karten haben Sie beim letzten Mal nicht gewusst. Sie kommen zuerst.';
    gewusst = 0; ersterVersuch = 0; wiederholt = [];
    [].forEach.call(root.querySelectorAll('.lk-chip'), function (b) {
      b.classList.toggle('active', b.dataset.kat === kat);
      b.setAttribute('aria-pressed', b.dataset.kat === kat);
    });
    el('lkEnd').classList.remove('show');
    el('lkCard').style.display = el('lkMix').style.display = '';
    el('lkActions').classList.add('show');
    zeigen();
  }

  function zeigen() {
    var c = stapel[0], total = gewusst + stapel.length;
    umgedreht = false;
    el('lkCard').classList.remove('flipped');
    el('lkFront').textContent = c.vorne;
    el('lkBack').innerHTML = c.hinten;
    ['lkBadgeV', 'lkBadgeH'].forEach(function (id) { el(id).textContent = c.kategorie || ''; el(id).style.display = c.kategorie ? '' : 'none'; });
    el('lkNum').textContent = 'Karte ' + (gewusst + 1) + ' von ' + total;
    el('lkRest').textContent = wiederholt.length ? wiederholt.length + ' zum Wiederholen' : '';
    el('lkBar').style.width = (gewusst / total * 100) + '%';
    el('lkFlip').style.display = '';
    el('lkRate').style.display = 'none';
  }

  function drehen() {
    if (!stapel.length) return;
    umgedreht = !umgedreht;
    el('lkCard').classList.toggle('flipped', umgedreht);
    el('lkFlip').style.display = umgedreht ? 'none' : '';
    el('lkRate').style.display = umgedreht ? '' : 'none';
    if (umgedreht) el('lkYes').focus({ preventScroll: true });
  }

  function bewerten(ja) {
    if (!umgedreht) return;
    var c = stapel.shift(), schon = wiederholt.indexOf(c) >= 0, k = schwach.indexOf(c.vorne);
    // Fach wechselt nur beim ersten Versuch dieser Runde
    if (!schon) { if (ja && k >= 0) schwach.splice(k, 1); if (!ja && k < 0) schwach.push(c.vorne); merken(); }
    if (ja) {
      gewusst++;
      if (!schon) ersterVersuch++; else wiederholt.splice(wiederholt.indexOf(c), 1);
    } else {
      stapel.push(c);
      if (!schon) wiederholt.push(c);
    }
    if (stapel.length) zeigen(); else ende();
  }

  function ende() {
    umgedreht = false;
    el('lkCard').style.display = el('lkMix').style.display = 'none';
    el('lkActions').classList.remove('show');
    el('lkNum').textContent = 'Fertig';
    el('lkRest').textContent = '';
    el('lkBar').style.width = '100%';
    el('lkEndText').textContent = ersterVersuch + ' von ' + gewusst + ' Karten beim ersten Mal gewusst.';
    el('lkEnd').classList.add('show');
    el('lkNote').hidden = true;
  }

  window.LerntoolTest = {
    typ: 'lernkaertchen',
    kategorien: kategorien,
    anzahl: function () { return stapel.length; }
  };

  return {
    init: function (c) {
      cfg = c;
      root = el('lernkaertchen');
      build();
    }
  };
})();
