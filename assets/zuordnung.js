/* Zuordnungs-Engine für MP und MT (Quelle: bzwu/.claude/skills/lerntool/basis/zuordnung.js, verteilt mit sync_basis.py).

   Zuordnung.init({
     gruppen: [{ key, label, farbe?, keys? }, ...],      // farbe: Akzent links (z. B. Hygienezone), keys: Stichworte für «eintippen»
     karten:  [{ text?, img?, alt?, gruppe }, ...],      // gruppe: key der richtigen Gruppe
     stufen:  ['zuordnen', 'anklicken', 'eintippen'],    // optional, Standard nur 'zuordnen'; erscheinen als Einfach / Mittel / Schwer
     intro:   'Ordnen Sie …' oder { zuordnen, anklicken, eintippen }   // optional, ersetzt den Standard-Aufgabentext
   });
   Zuordnen: die oberste Karte im Stapel liegt unten bereit, Antippen einer Gruppe legt sie dorthin, Ziehen geht auch.
   Abgelegte Karte antippen = zurück auf den Stapel. Bild-Paare (Piktogramm → Bedeutung): Bild als Karte, Bedeutung als Gruppe.
   Markup entsteht in <div id="zuordnung">, Aussehen nur aus style.css (.z-*, Stufen, Knopf und Feedback wie Quiz).
   Testschnittstelle für pruefe_tools.js: window.LerntoolTest. */
var Zuordnung = (function () {
  var OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  var NOK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  var NAME = { zuordnen: 'Einfach', anklicken: 'Mittel', eintippen: 'Schwer' };
  var INTRO = {
    zuordnen: 'Tippen Sie auf die Gruppe, zu der die Karte unten gehört, oder ziehen Sie die Karte dorthin.',
    anklicken: 'Wählen Sie zu jeder Karte die passende Gruppe.',
    eintippen: 'Schreiben Sie zu jeder Karte die passende Gruppe auf. Es genügt der Kernbegriff.'
  };
  var cfg, stufe, order, placed, pos, geprueft, solved, beantwortet;

  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function gruppe(key) { return cfg.gruppen.filter(function (g) { return g.key === key; })[0]; }
  function richtig(i, key) { return cfg.karten[i].gruppe === key; }
  function shuffled(n) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(i);
    for (i = n - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function fold(s) {
    return String(s).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
      .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function passt(eingabe, g) {
    var f = fold(eingabe);
    return !!f && (g.keys || [g.label]).some(function (k) { return f.indexOf(fold(k)) !== -1; });
  }
  function karte(i) {
    var k = cfg.karten[i];
    return (k.img ? '<img class="z-img" src="' + esc(k.img) + '" alt="' + esc(k.alt || '') + '">' : '') +
      (k.text ? '<span class="z-text">' + esc(k.text) + '</span>' : '');
  }
  function feedback(ok, titel, text) {
    var fb = el('zFeedback');
    fb.className = 'q-feedback show ' + (ok ? 'ok' : 'nok');
    fb.innerHTML = (ok ? OK : NOK) + '<div><b>' + titel + '</b><span>' + text + '</span></div>';
  }

  function build() {
    var stufen = cfg.stufen || ['zuordnen'];
    el('zuordnung').innerHTML =
      (stufen.length > 1 ? '<div class="q-levels" role="group" aria-label="Stufe">' + stufen.map(function (s) {
        return '<button class="q-level" data-level="' + s + '">' + NAME[s] + '</button>';
      }).join('') + '</div>' : '') +
      '<p class="z-intro" id="zIntro"></p><div id="zBody"></div>';
    [].forEach.call(document.querySelectorAll('#zuordnung .q-level'), function (b) {
      b.onclick = function () { setStufe(b.dataset.level); };
    });
    setStufe(stufen[0]);
  }

  function setStufe(s) {
    stufe = s;
    [].forEach.call(document.querySelectorAll('#zuordnung .q-level'), function (b) {
      b.classList.toggle('active', b.dataset.level === s);
      b.setAttribute('aria-pressed', b.dataset.level === s);
    });
    el('zIntro').textContent = (typeof cfg.intro === 'string' ? cfg.intro : (cfg.intro || {})[s]) || INTRO[s];
    start();
  }

  function start() {
    order = shuffled(cfg.karten.length);
    placed = {}; pos = 0; geprueft = solved = false; beantwortet = 0;
    ({ zuordnen: buildZuordnen, anklicken: buildAnklicken, eintippen: buildEintippen })[stufe]();
  }

  /* ---------- Einfach: zuordnen ---------- */
  function buildZuordnen() {
    var bilder = cfg.karten.some(function (k) { return k.img; });
    el('zBody').innerHTML =
      '<div class="z-groups' + (bilder ? ' has-img' : '') + '">' + cfg.gruppen.map(function (g) {
        return '<section class="z-group" data-g="' + esc(g.key) + '"' + (g.farbe ? ' style="--z-farbe:' + esc(g.farbe) + '"' : '') + '>' +
          '<button class="z-target" data-g="' + esc(g.key) + '">' + esc(g.label) + '</button><div class="z-slot"></div></section>';
      }).join('') + '</div>' +
      '<div class="z-dock"><div class="q-feedback" id="zFeedback" role="status" aria-live="polite"></div>' +
      '<div class="z-stack" id="zStack"></div><button class="q-btn" id="zCheck">Überprüfen</button></div>';
    [].forEach.call(document.querySelectorAll('.z-target'), function (b) {
      b.onclick = function () { var r = rest(); if (r.length) ablegen(r[pos], b.dataset.g); };
    });
    el('zCheck').onclick = function () {
      if (!geprueft) pruefeZuordnen();
      else if (solved) start();
      else { // falsch abgelegte zurück auf den Stapel
        Object.keys(placed).forEach(function (i) { if (!richtig(+i, placed[i])) delete placed[i]; });
        pos = 0; zeichne();
      }
    };
    zeichne();
  }

  function rest() { return order.filter(function (i) { return !(i in placed); }); }

  function ablegen(i, key) { placed[i] = key; pos = 0; geprueft = false; zeichne(); }

  function zeichne() {
    var r = rest();
    if (pos >= r.length) pos = 0;
    [].forEach.call(document.querySelectorAll('.z-group'), function (sec) {
      var drin = order.filter(function (i) { return placed[i] === sec.dataset.g; });
      sec.querySelector('.z-slot').innerHTML = drin.map(function (i) {
        var cls = geprueft ? (richtig(i, placed[i]) ? ' is-correct' : ' is-wrong') : '';
        return '<button class="z-card' + cls + '" data-i="' + i + '" aria-label="Zurück auf den Stapel: ' + esc(cfg.karten[i].text || cfg.karten[i].alt || '') + '">' +
          karte(i) + (geprueft ? '<span class="z-mark">' + (cls === ' is-correct' ? OK : NOK) + '</span>' : '') + '</button>';
      }).join('');
    });
    [].forEach.call(document.querySelectorAll('.z-slot .z-card'), function (b) {
      b.onclick = function () { delete placed[b.dataset.i]; geprueft = false; zeichne(); };
    });
    var st = el('zStack');
    st.innerHTML = r.length ?
      '<div class="z-current" id="zCurrent">' + karte(r[pos]) + '</div>' +
      '<div class="z-stack-meta"><span>Noch ' + r.length + (r.length === 1 ? ' Karte' : ' Karten') + '</span>' +
      (r.length > 1 ? '<span class="z-browse"><button id="zPrev" aria-label="Vorherige Karte">‹</button><button id="zNext" aria-label="Nächste Karte">›</button></span>' : '') + '</div>' : '';
    if (r.length) {
      if (r.length > 1) {
        el('zPrev').onclick = function () { pos = (pos + r.length - 1) % r.length; zeichne(); };
        el('zNext').onclick = function () { pos = (pos + 1) % r.length; zeichne(); };
      }
      ziehen(el('zCurrent'), r[pos]);
    }
    st.hidden = !r.length;
    el('zCheck').hidden = !!r.length;
    if (!geprueft) el('zFeedback').className = 'q-feedback';
  }

  function pruefeZuordnen() {
    var n = cfg.karten.length, k = Object.keys(placed).filter(function (i) { return richtig(+i, placed[i]); }).length;
    geprueft = true; solved = k === n;
    zeichne();
    if (solved) feedback(true, 'Richtig!', 'Alle ' + n + ' Karten liegen in der richtigen Gruppe.');
    else feedback(false, 'Nicht ganz.', k + ' von ' + n + ' Karten liegen richtig. Die rot markierten kommen zurück auf den Stapel.');
    el('zCheck').textContent = solved ? 'Neu mischen' : 'Falsche zurücklegen';
  }

  // Ziehen mit Pointer Events (Maus und Finger), die Karte hat touch-action: none.
  function ziehen(node, i) {
    node.onpointerdown = function (e) {
      if (e.button) return;
      var x0 = e.clientX, y0 = e.clientY, geist = null, ziel = null;
      function treffer(e) {
        var t = document.elementFromPoint(e.clientX, e.clientY);
        return t && t.closest('.z-group');
      }
      function mv(e) {
        if (!geist) {
          if (Math.abs(e.clientX - x0) + Math.abs(e.clientY - y0) < 8) return;
          geist = node.cloneNode(true);
          geist.className = 'z-current z-ghost';
          geist.style.width = node.offsetWidth + 'px';
          document.body.appendChild(geist);
        }
        geist.style.left = e.clientX - node.offsetWidth / 2 + 'px';
        geist.style.top = e.clientY - 24 + 'px';
        // shortcut: Rand-Scrollen nur bei Bewegung, reicht für bis rund 15 Gruppen
        if (e.clientY < 70) scrollBy(0, -12);
        if (ziel) ziel.classList.remove('is-over');
        geist.hidden = true; ziel = treffer(e); geist.hidden = false;
        if (ziel) ziel.classList.add('is-over');
      }
      function up() {
        document.removeEventListener('pointermove', mv);
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointercancel', up);
        if (geist) geist.remove();
        if (ziel) { ziel.classList.remove('is-over'); ablegen(i, ziel.dataset.g); }
      }
      document.addEventListener('pointermove', mv);
      document.addEventListener('pointerup', up);
      document.addEventListener('pointercancel', up);
    };
  }

  /* ---------- Mittel: pro Karte die Gruppe anklicken ---------- */
  function buildAnklicken() {
    solved = 0;
    el('zBody').innerHTML = '<ol class="z-list">' + order.map(function (i) {
      return '<li class="z-row" data-i="' + i + '"><div class="z-row-card">' + karte(i) + '</div><div class="z-choices">' +
        cfg.gruppen.map(function (g) {
          return '<button class="z-choice" data-g="' + esc(g.key) + '"><span>' + esc(g.label) + '</span><span class="z-mark"></span></button>';
        }).join('') + '</div></li>';
    }).join('') + '</ol>' + schluss('Neu mischen');
    el('zCheck').parentNode.classList.remove('show');
    el('zCheck').onclick = start;
    [].forEach.call(document.querySelectorAll('.z-row'), function (row) {
      var i = +row.dataset.i;
      [].forEach.call(row.querySelectorAll('.z-choice'), function (b) {
        b.onclick = function () {
          row.querySelectorAll('.z-choice').forEach(function (c) {
            c.disabled = true;
            if (richtig(i, c.dataset.g)) { c.classList.add('is-correct'); c.querySelector('.z-mark').innerHTML = OK; }
          });
          var ok = richtig(i, b.dataset.g);
          if (!ok) { b.classList.add('is-wrong'); b.querySelector('.z-mark').innerHTML = NOK; }
          row.classList.add(ok ? 'is-correct' : 'is-wrong');
          if (ok) solved++;
          if (++beantwortet === cfg.karten.length) ende(solved);
        };
      });
    });
  }

  /* ---------- Schwer: Gruppe eintippen ---------- */
  function buildEintippen() {
    el('zBody').innerHTML = '<ol class="z-list">' + order.map(function (i) {
      return '<li class="z-row" data-i="' + i + '"><div class="z-row-card">' + karte(i) + '</div>' +
        '<input class="z-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Gruppe">' +
        '<div class="z-solution"></div></li>';
    }).join('') + '</ol>' + schluss('Überprüfen');
    el('zCheck').onclick = function () {
      if (solved === true) return start();
      var k = 0;
      [].forEach.call(document.querySelectorAll('.z-row'), function (row) {
        var g = gruppe(cfg.karten[+row.dataset.i].gruppe), inp = row.querySelector('.z-input'), ok = passt(inp.value, g);
        if (ok) k++;
        row.classList.toggle('is-correct', ok);
        row.classList.toggle('is-wrong', !ok);
        row.querySelector('.z-solution').innerHTML = ok ? '' : NOK + '<span>Richtig: ' + esc(g.label) + '</span>';
      });
      ende(k);
      if (k === cfg.karten.length) { solved = true; el('zCheck').textContent = 'Neu mischen'; }
    };
  }

  function schluss(knopf) {
    return '<div class="q-feedback" id="zFeedback" role="status" aria-live="polite"></div>' +
      '<div class="q-next show"><button class="q-btn" id="zCheck">' + knopf + '</button></div>';
  }

  function ende(k) {
    var n = cfg.karten.length;
    if (k === n) feedback(true, 'Richtig!', 'Alle ' + n + ' Karten richtig zugeordnet.');
    else feedback(false, 'Nicht ganz.', k + ' von ' + n + ' richtig. ' + (stufe === 'eintippen'
      ? 'Korrigieren Sie die rot markierten und prüfen Sie nochmals.' : 'Die richtige Gruppe ist jeweils grün markiert.'));
    el('zCheck').parentNode.classList.add('show');
    el('zFeedback').scrollIntoView({ block: 'end', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  window.LerntoolTest = {
    typ: 'zuordnung',
    stufen: function () { return cfg.stufen || ['zuordnen']; },
    stufe: function () { return stufe; },
    // zuordnen: key der richtigen Gruppe für die bereitliegende Karte; anklicken/eintippen: pro Zeile in Anzeigereihenfolge
    ziel: function () { var r = rest(); return r.length ? cfg.karten[r[pos]].gruppe : null; },
    ziele: function () { return order.map(function (i) { return cfg.karten[i].gruppe; }); },
    eingabe: function (key) { var g = gruppe(key); return (g.keys || [g.label])[0]; }
  };

  return {
    init: function (c) {
      cfg = c;
      build();
    }
  };
})();
