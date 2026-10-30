/* Zuordnungs-Engine für MP und MT (Quelle: bzwu/.claude/skills/lerntool/basis/zuordnung.js, verteilt mit sync_basis.py).

   Zuordnung.init({
     gruppen: [{ key, label, farbe?, keys? }, ...],      // farbe: Akzent links (z. B. Hygienezone), keys: Stichworte für «eintippen»
     karten:  [{ text?, img?, alt?, gruppe }, ...],      // gruppe: key der richtigen Gruppe
     stufen:  ['zuordnen', 'anklicken', 'eintippen'],    // optional, Standard nur 'zuordnen'; erscheinen als Einfach / Mittel / Schwer
     intro:   'Ordnen Sie …' oder { zuordnen, anklicken, eintippen }   // optional, ersetzt den Standard-Aufgabentext
   });
   Tabelle mit Lücken statt gruppen/karten (erste Spalte fest, alle übrigen Zellen sind Lücken):
     tabellen: [{ titel?, spalten: ['Methode', 'Temperatur', …], zeilen: [['Kühlung', '1–5 °C', …] | ['…', { text, keys }, …], …] }, ...]
     Gleicher Text in mehreren Lücken ist erlaubt (zählt in jeder davon). Mittel: pro Lücke aus höchstens 4 Begriffen derselben Spalte wählen.
   Lückentext statt gruppen/karten: lueckentext: 'Sauermilch entsteht durch die [Milchsäuregärung]. …\n\nNeuer Absatz …'
     [Begriff] ist eine Lücke, [Begriff|Stichwort|Stichwort] mit Stichworten für «eintippen». Einfach: Begriffe in die Lücken im Text legen,
     Mittel/Schwer: pro Lücke der Satz mit ____ und Auswahl bzw. Eingabe.
   Beschriften statt gruppen/karten:
     beschriften: { bild, bildLeer?, quelle?, treffer?: 0.25, teile: [{ n, name, keys?, zonen: [{ cx, cy }] }] }   // cx/cy in % des Bildes
     Stufen meist ['zuordnen', 'zeigen', 'eintippen']: Namen zu Nummern legen / Bauteil im Bild (bildLeer) antippen / Namen eintippen.
     zeigen trifft, wenn der nächste Punkt aller Zonen zum gesuchten Teil gehört und höchstens treffer × Bildbreite entfernt ist.
   Zuordnen: die oberste Karte im Stapel liegt unten bereit, Antippen einer Gruppe legt sie dorthin, Ziehen geht auch.
   Abgelegte Karte antippen = zurück auf den Stapel. Bild-Paare (Piktogramm → Bedeutung): Bild als Karte, Bedeutung als Gruppe.
   Markup entsteht in <div id="zuordnung">, Aussehen nur aus style.css (.z-*, Stufen, Knopf und Feedback wie Quiz).
   Testschnittstelle für pruefe_tools.js: window.LerntoolTest. */
var Zuordnung = (function () {
  var OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  var NOK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  var NAME = { zuordnen: 'Einfach', anklicken: 'Mittel', zeigen: 'Mittel', eintippen: 'Schwer' };
  var INTRO = {
    zuordnen: 'Tippen Sie auf die Gruppe, zu der die Karte unten gehört, oder ziehen Sie die Karte dorthin.',
    anklicken: 'Wählen Sie zu jeder Karte die passende Gruppe.',
    eintippen: 'Schreiben Sie zu jeder Karte die passende Gruppe auf. Es genügt der Kernbegriff.'
  };
  var INTRO_TAB = {
    zuordnen: 'Tippen Sie auf die Lücke, in die der Begriff unten gehört, oder ziehen Sie ihn dorthin.',
    anklicken: 'Wählen Sie für jede Lücke den passenden Begriff.',
    eintippen: 'Füllen Sie jede Lücke aus. Es genügt der Kernbegriff.'
  };
  var INTRO_BILD = {
    zuordnen: 'Tippen Sie auf die Nummer, zu der der Begriff unten gehört, oder ziehen Sie ihn dorthin.',
    anklicken: 'Wählen Sie zu jeder Nummer das passende Bauteil.',
    zeigen: 'Tippen Sie im Bild auf das gesuchte Bauteil.',
    eintippen: 'Schreiben Sie zu jeder Nummer das Bauteil auf. Es genügt der Kernbegriff.'
  };
  var cfg, tab, text, bes, stufe, zeigen, order, placed, pos, geprueft, solved, beantwortet;

  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function gruppe(key) { return cfg.gruppen.filter(function (g) { return g.key === key; })[0]; }
  function richtig(i, key) { return tab ? cfg.karten[i].text === gruppe(key).text : cfg.karten[i].gruppe === key; }
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
    el('zIntro').textContent = (typeof cfg.intro === 'string' ? cfg.intro : (cfg.intro || {})[s]) || (bes ? INTRO_BILD : tab ? INTRO_TAB : INTRO)[s];
    start();
  }

  function start() {
    order = shuffled(cfg.karten.length);
    placed = {}; pos = 0; geprueft = solved = false; beantwortet = 0; zeigen = null;
    ({ zuordnen: buildZuordnen, anklicken: buildAnklicken, zeigen: buildZeigen, eintippen: buildEintippen })[stufe]();
  }

  /* ---------- Einfach: zuordnen ---------- */
  function buildZuordnen() {
    var bilder = cfg.karten.some(function (k) { return k.img; });
    el('zBody').innerHTML = (bes ? '<div class="z-bes">' + bild(false) + nummern() + '</div>' : text ? lueckentext() : tab ? tabellen() :
      '<div class="z-groups' + (bilder ? ' has-img' : '') + '">' + cfg.gruppen.map(function (g) {
        return '<section class="z-group" data-g="' + esc(g.key) + '"' + (g.farbe ? ' style="--z-farbe:' + esc(g.farbe) + '"' : '') + '>' +
          '<button class="z-target" data-g="' + esc(g.key) + '">' + esc(g.label) + '</button><div class="z-slot"></div></section>';
      }).join('') + '</div>') +
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

  function ablegen(i, key) {
    // Tabelle: eine Karte pro Lücke, die bisherige geht zurück auf den Stapel
    if (tab) Object.keys(placed).forEach(function (j) { if (placed[j] === key) delete placed[j]; });
    placed[i] = key; pos = 0; geprueft = false; zeichne();
  }

  function tabellen() {
    return cfg.tabellen.map(function (t, ti) {
      return (t.titel ? '<h2 class="z-table-title">' + esc(t.titel) + '</h2>' : '') + '<table class="z-table"><thead><tr>' +
        t.spalten.map(function (s) { return '<th scope="col">' + esc(s) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        t.zeilen.map(function (z, zi) {
          return '<tr><th scope="row">' + esc(z[0]) + '</th>' + z.slice(1).map(function (_, si) {
            var key = ti + '-' + zi + '-' + si;
            return '<td class="z-cell" data-g="' + key + '" data-label="' + esc(t.spalten[si + 1]) + '">' +
              '<button class="z-target" data-g="' + key + '" aria-label="Lücke ' + esc(gruppe(key).label) + '"></button><div class="z-slot"></div></td>';
          }).join('') + '</tr>';
        }).join('') + '</tbody></table>';
    }).join('');
  }

  function bild(leer) {
    var b = cfg.beschriften;
    return '<figure class="z-figure"><div class="z-bild"><img src="' + esc(leer && b.bildLeer || b.bild) + '" alt="' + esc(b.alt || 'Schema mit nummerierten Bauteilen') + '">' +
      '<div class="z-hotspots" id="zHot"></div></div>' + (b.quelle ? '<figcaption>' + esc(b.quelle) + '</figcaption>' : '') + '</figure>';
  }
  function nummern() {
    return '<ol class="z-nums">' + cfg.gruppen.map(function (g) {
      return '<li><span class="z-num" aria-hidden="true">' + g.n + '</span><div class="z-cell" data-g="' + g.key + '">' +
        '<button class="z-target" data-g="' + g.key + '" aria-label="' + esc(g.label) + '"></button><div class="z-slot"></div></div></li>';
    }).join('') + '</ol>';
  }

  function lueckentext() {
    var n = 0;
    return '<div class="z-lt">' + cfg.lueckentext.split(/\n\s*\n/).map(function (absatz) {
      return '<p>' + absatz.split(/\[[^\]]+\]/).map(function (stueck, j, alle) {
        if (j === alle.length - 1) return esc(stueck);
        var key = 'l' + n++;
        return esc(stueck) + '<span class="z-cell z-gap" data-g="' + key + '"><button class="z-target" data-g="' + key + '" aria-label="' + esc(gruppe(key).label) + '"></button><span class="z-slot"></span></span>';
      }).join('') + '</p>';
    }).join('') + '</div>';
  }

  function zeichne() {
    var r = rest();
    if (pos >= r.length) pos = 0;
    [].forEach.call(document.querySelectorAll('.z-group, .z-cell'), function (sec) {
      var drin = order.filter(function (i) { return placed[i] === sec.dataset.g; });
      if (tab) sec.querySelector('.z-target').hidden = drin.length > 0;
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
      '<div class="z-stack-meta"><span>Noch ' + r.length + (tab ? (r.length === 1 ? ' Begriff' : ' Begriffe') : (r.length === 1 ? ' Karte' : ' Karten')) + '</span>' +
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
    if (solved) feedback(true, 'Richtig!', tab ? 'Alle ' + n + ' Lücken sind richtig ausgefüllt.' : 'Alle ' + n + ' Karten liegen in der richtigen Gruppe.');
    else feedback(false, 'Nicht ganz.', k + ' von ' + n + (tab ? ' Lücken sind richtig.' : ' Karten liegen richtig.') + ' Die rot markierten kommen zurück auf den Stapel.');
    el('zCheck').textContent = solved ? 'Neu mischen' : 'Falsche zurücklegen';
  }

  // Ziehen mit Pointer Events (Maus und Finger), die Karte hat touch-action: none.
  function ziehen(node, i) {
    node.onpointerdown = function (e) {
      if (e.button) return;
      var x0 = e.clientX, y0 = e.clientY, geist = null, ziel = null;
      function treffer(e) {
        var t = document.elementFromPoint(e.clientX, e.clientY);
        return t && t.closest('.z-group, .z-cell');
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
  // Zeilen für Mittel und Schwer: Karten gemischt, bei Tabellen die Lücken in Tabellenreihenfolge
  function zeilen() { return tab ? cfg.gruppen.map(function (g, j) { return j; }) : order; }
  function frage(i) {
    if (bes) return '<span class="z-num">' + cfg.gruppen[i].n + '</span>';
    if (text) return '<span class="z-text">' + cfg.gruppen[i].satz + '</span>';
    return tab ? '<span class="z-text">' + esc(cfg.gruppen[i].label) + '</span>' : karte(i);
  }
  function optionen(i) {
    if (!tab) return cfg.gruppen.map(function (g) { return { key: g.key, label: g.label }; });
    var g = cfg.gruppen[i], andere = [];
    cfg.gruppen.forEach(function (h) { if (h.spalte === g.spalte && h.text !== g.text && andere.indexOf(h.text) < 0) andere.push(h.text); });
    var wahl = shuffled(andere.length).slice(0, 3).map(function (j) { return andere[j]; }).concat(g.text);
    return shuffled(wahl.length).map(function (j) { return { key: wahl[j], label: wahl[j] }; });
  }
  function trifft(i, key) { return tab ? cfg.gruppen[i].text === key : richtig(i, key); }

  function buildAnklicken() {
    solved = 0;
    el('zBody').innerHTML = (bes ? '<div class="z-bes">' + bild(false) : '') + '<ol class="z-list">' + zeilen().map(function (i) {
      return '<li class="z-row" data-i="' + i + '"><div class="z-row-card">' + frage(i) + '</div><div class="z-choices">' +
        optionen(i).map(function (o) {
          return '<button class="z-choice" data-g="' + esc(o.key) + '"><span>' + esc(o.label) + '</span><span class="z-mark"></span></button>';
        }).join('') + '</div></li>';
    }).join('') + '</ol>' + (bes ? '</div>' : '') + schluss('Neu mischen');
    el('zCheck').parentNode.classList.remove('show');
    el('zCheck').onclick = start;
    [].forEach.call(document.querySelectorAll('.z-row'), function (row) {
      var i = +row.dataset.i;
      [].forEach.call(row.querySelectorAll('.z-choice'), function (b) {
        b.onclick = function () {
          row.querySelectorAll('.z-choice').forEach(function (c) {
            c.disabled = true;
            if (trifft(i, c.dataset.g)) { c.classList.add('is-correct'); c.querySelector('.z-mark').innerHTML = OK; }
          });
          var ok = trifft(i, b.dataset.g);
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
    el('zBody').innerHTML = (bes ? '<div class="z-bes">' + bild(false) : '') + '<ol class="z-list">' + zeilen().map(function (i) {
      return '<li class="z-row" data-i="' + i + '"><div class="z-row-card">' + frage(i) + '</div>' +
        '<input class="z-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Antwort">' +
        '<div class="z-solution"></div></li>';
    }).join('') + '</ol>' + (bes ? '</div>' : '') + schluss('Überprüfen');
    el('zCheck').onclick = function () {
      if (solved === true) return start();
      var k = 0;
      [].forEach.call(document.querySelectorAll('.z-row'), function (row) {
        var g = loesung(+row.dataset.i), inp = row.querySelector('.z-input'), ok = passt(inp.value, g);
        if (ok) k++;
        row.classList.toggle('is-correct', ok);
        row.classList.toggle('is-wrong', !ok);
        row.querySelector('.z-solution').innerHTML = ok ? '' : NOK + '<span>Richtig: ' + esc(g.label) + '</span>';
      });
      ende(k);
      if (k === cfg.karten.length) { solved = true; el('zCheck').textContent = 'Neu mischen'; }
    };
  }

  /* ---------- Mittel beim Beschriften: Bauteil im Bild antippen ---------- */
  function buildZeigen() {
    zeigen = { reihe: order.slice(), k: 0, fehl: 0 };
    el('zBody').innerHTML = bild(true) + '<div class="z-prompt" id="zPrompt" aria-live="polite"></div>' + schluss('Neu mischen');
    el('zCheck').onclick = start;
    el('zHot').classList.add('aktiv');
    el('zHot').onclick = function (e) {
      if (zeigen.k >= zeigen.reihe.length) return;
      var box = el('zHot').getBoundingClientRect(), x = (e.clientX - box.left) / box.width * 100, y = (e.clientY - box.top) / box.height * 100;
      var g = cfg.gruppen[zeigen.reihe[zeigen.k]], best = null, nd = Infinity;
      cfg.gruppen.forEach(function (h) {
        h.zonen.forEach(function (z) {
          var dx = (x - z.cx) / 100 * box.width, dy = (y - z.cy) / 100 * box.height, d = Math.sqrt(dx * dx + dy * dy);
          if (d < nd) { nd = d; best = { g: h, z: z }; }
        });
      });
      var m = document.createElement('span');
      if (best.g === g && nd <= (cfg.beschriften.treffer || 0.25) * box.width) {
        m.className = 'z-hs-mark'; m.style.left = best.z.cx + '%'; m.style.top = best.z.cy + '%'; m.textContent = g.n; m.title = g.text;
        zeigen.k++; frageZeigen();
      } else {
        zeigen.fehl++;
        m.className = 'z-hs-miss'; m.style.left = x + '%'; m.style.top = y + '%'; m.innerHTML = NOK;
        setTimeout(function () { m.remove(); }, 700);
      }
      el('zHot').appendChild(m);
    };
    frageZeigen();
  }
  function frageZeigen() {
    var n = zeigen.reihe.length;
    if (zeigen.k < n) {
      el('zPrompt').innerHTML = '<span>Bauteil ' + (zeigen.k + 1) + ' von ' + n + '</span>Tippen Sie auf: <b>' + esc(cfg.gruppen[zeigen.reihe[zeigen.k]].text) + '</b>';
      return;
    }
    el('zPrompt').innerHTML = '';
    if (!zeigen.fehl) feedback(true, 'Richtig!', 'Alle ' + n + ' Bauteile beim ersten Versuch gefunden.');
    else feedback(false, 'Alle gefunden.', zeigen.fehl + (zeigen.fehl === 1 ? ' Fehlklick' : ' Fehlklicks') + ' bei ' + n + ' Bauteilen. Mit «Neu mischen» üben Sie nochmals.');
    el('zCheck').parentNode.classList.add('show');
  }

  // Was bei «eintippen» passt: Gruppe der Karte bzw. Text der Lücke, je mit Stichworten
  function loesung(i) { return tab ? { label: cfg.gruppen[i].text, keys: cfg.gruppen[i].keys } : gruppe(cfg.karten[i].gruppe); }

  function schluss(knopf) {
    return '<div class="q-feedback" id="zFeedback" role="status" aria-live="polite"></div>' +
      '<div class="q-next show"><button class="q-btn" id="zCheck">' + knopf + '</button></div>';
  }

  function ende(k) {
    var n = cfg.karten.length;
    if (k === n) feedback(true, 'Richtig!', tab ? 'Alle ' + n + ' Lücken richtig ausgefüllt.' : 'Alle ' + n + ' Karten richtig zugeordnet.');
    else feedback(false, 'Nicht ganz.', k + ' von ' + n + ' richtig. ' + (stufe === 'eintippen'
      ? 'Korrigieren Sie die rot markierten und prüfen Sie nochmals.' : 'Die richtige Antwort ist jeweils grün markiert.'));
    el('zCheck').parentNode.classList.add('show');
    el('zFeedback').scrollIntoView({ block: 'end', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  window.LerntoolTest = {
    typ: 'zuordnung',
    stufen: function () { return cfg.stufen || ['zuordnen']; },
    stufe: function () { return stufe; },
    // zuordnen: richtiges Ziel der bereitliegenden Karte und ob sie in ein anderes Ziel auch passt (gleicher Text)
    ziel: function () { var r = rest(); return r.length ? cfg.karten[r[pos]].gruppe : null; },
    passt: function (key) { var r = rest(); return richtig(r[pos], key); },
    // anklicken: ob der Knopf (data-g) in Zeile i der Seite richtig ist; eintippen: passende Eingabe pro Zeile
    trifft: function (zeile, key) { return trifft(zeilen()[zeile], key); },
    // zeigen: Mitte der ersten Zone des gesuchten Teils (in % des Bildes) und eine Zone eines anderen Teils für den Fehlklick
    zeigeZiel: function () { return zeigen && zeigen.k < zeigen.reihe.length ? cfg.gruppen[zeigen.reihe[zeigen.k]].zonen[0] : null; },
    zeigeFalsch: function () { var g = cfg.gruppen[zeigen.reihe[zeigen.k]]; return cfg.gruppen.filter(function (h) { return h !== g; })[0].zonen[0]; },
    fehlklicks: function () { return zeigen.fehl; },
    eingaben: function () { return zeilen().map(function (i) { var g = loesung(i); return (g.keys || [g.label])[0]; }); }
  };

  return {
    init: function (c) {
      cfg = c;
      text = !!c.lueckentext;
      bes = !!c.beschriften;
      tab = !!c.tabellen || text || bes;
      if (bes) { // jede Nummer als Lücke mit genau einem Namen
        cfg.gruppen = c.beschriften.teile.map(function (t) {
          return { key: 'b' + t.n, n: t.n, label: 'Nummer ' + t.n, text: t.name, keys: t.keys, spalte: 'b', zonen: t.zonen || [] };
        });
        cfg.karten = cfg.gruppen.map(function (g) { return { text: g.text, gruppe: g.key }; });
      } else if (text) { // jede [Lücke] als Gruppe mit genau einer Karte, dazu der Satz mit ____ für Mittel und Schwer
        cfg.gruppen = []; cfg.karten = [];
        c.lueckentext.split(/\n\s*\n/).forEach(function (absatz) {
          var luecken = [], roh = absatz.replace(/\[([^\]]+)\]/g, function (_, l) { luecken.push(l.split('|')); return '\u0000'; });
          // Satzgrenze: Punkt, Frage- oder Ausrufezeichen mit Leerzeichen danach (Zahlen wie 4,5 bleiben ganz)
          var satz = 0, saetze = roh.split(/(?<=[.!?])\s+/);
          saetze.forEach(function (s) {
            var stellen = s.split('\u0000');
            for (var k = 0; k < stellen.length - 1; k++) {
              var a = luecken[satz++], key = 'l' + cfg.gruppen.length;
              var anzeige = stellen.map(function (t, m) { return esc(t) + (m < stellen.length - 1 ? (m === k ? '<span class="z-blank">____</span>' : '…') : ''); }).join('');
              cfg.gruppen.push({ key: key, label: 'Lücke ' + (cfg.gruppen.length + 1), text: a[0], keys: a.length > 1 ? a.slice(1) : undefined, spalte: 'text', satz: anzeige });
              cfg.karten.push({ text: a[0], gruppe: key });
            }
          });
        });
      } else if (tab) { // Lücken als Gruppen mit je genau einer Karte
        cfg.gruppen = []; cfg.karten = [];
        c.tabellen.forEach(function (t, ti) {
          t.zeilen.forEach(function (z, zi) {
            z.slice(1).forEach(function (zelle, si) {
              var a = typeof zelle === 'string' ? { text: zelle } : zelle, key = ti + '-' + zi + '-' + si;
              cfg.gruppen.push({ key: key, label: z[0] + ' · ' + t.spalten[si + 1], text: a.text, keys: a.keys, spalte: ti + '-' + si });
              cfg.karten.push({ text: a.text, gruppe: key });
            });
          });
        });
      }
      build();
    }
  };
})();
