/* Rechentrainer-Engine für MP und MT (Quelle: bzwu/.claude/skills/lerntool/basis/rechner.js, verteilt mit sync_basis.py).

   Rechner.init({
     kategorien: [{ name: 'Prozentwert', aufgaben: [genA, genB] }, ...],  // ab 2 Kategorien Chips mit «Alle»
     hilfe: { titel: 'Formeln', html: '…' },                              // optional, aufklappbar unter der Aufgabe
     intro: '…'                                                           // optional
   });
   Ein Generator liefert pro Aufruf eine neue Aufgabe:
     { text: 'html', felder: [{ label?, einheit, wert, tol?, mehrstufig? }], weg: ['Schritt 1 html', …], bild?: 'html', nachher?: 'html' }
   tol fehlt: Rundungstoleranz der Einheit (RUNDUNG), mehrstufig: true gibt 0.1 % vom Wert dazu. tol: 0 heisst exakt (Einheiten umrechnen).
   bild steht bei der Aufgabe, nachher erscheint erst nach «Prüfen» vor dem Rechenweg (z. B. ausgefülltes Mischungskreuz).
   Eingabe mit Komma oder Punkt. Nach «Prüfen» Rückmeldung mit Symbol und Wort, richtige Werte und immer der Rechenweg.
   Hilfen für Generatoren: Rechner.pick(liste), Rechner.zahl(n, stellen) (Dezimalpunkt und Tausender mit ' wie in den LS).
   Rechner.umschalter('uebenId', 'rechnerId'): Tabs «Üben» / «Freier Rechner» vor zwei vorhandene Elemente.
   Rechner.frei('elementId', { rechner: [{ name, intro?, felder: [{ id, label, einheit? | einheiten?: ['m', 'dm'], wert? }], rechne(w) }], hilfe? })
     rechne bekommt { id: Zahl, idEinheit: 'm' } und gibt { ergebnis: 'html', weg: [...], nachher? } oder { fehler: 'Text' } zurück.
     Gerechnet wird bei jeder Eingabe, sobald alle Felder eine Zahl enthalten.
   Testschnittstelle für pruefe_tools.js: window.LerntoolTest. */
var Rechner = (function () {
  var OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  var NOK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  // Rundungstoleranz: kg, g, l auf 1 Stelle, % und CHF auf 2 Stellen genau. Andere Einheiten: 0.05
  var RUNDUNG = { kg: 0.05, g: 0.05, l: 0.05, L: 0.05, t: 0.0005, '%': 0.005, CHF: 0.01 };
  var cfg, kat, aufgabe, letzterGen, letzterText, geprueft;

  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function zahl(n, stellen) {
    var s = stellen === undefined ? String(parseFloat(n.toFixed(3))) : n.toFixed(stellen);  // ohne Angabe höchstens 3 Stellen wie im LS
    var teile = s.split('.');
    teile[0] = teile[0].replace(/\B(?=(\d{3})+(?!\d))/g, "'");
    return teile.join('.');
  }
  function lesen(s) {
    s = String(s).trim().replace(/['\s]/g, '').replace(',', '.');
    return s === '' || isNaN(s) ? NaN : parseFloat(s);
  }
  function toleranz(f) {
    if (f.tol !== undefined) return f.tol || Math.abs(f.wert) * 1e-9 + 1e-9;
    var r = (f.einheit in RUNDUNG ? RUNDUNG[f.einheit] : 0.05) + 1e-9;
    return f.mehrstufig ? r + Math.abs(f.wert) * 0.001 : r;  // gerundete Zwischenresultate nicht bestrafen
  }
  function generatoren() {
    if (kat >= 0) return cfg.kategorien[kat].aufgaben;
    return cfg.kategorien.reduce(function (a, k) { return a.concat(k.aufgaben); }, []);
  }
  function katName(gen) {
    for (var i = 0; i < cfg.kategorien.length; i++) if (cfg.kategorien[i].aufgaben.indexOf(gen) >= 0) return cfg.kategorien[i].name;
    return '';
  }

  function build() {
    var mehrere = cfg.kategorien.length > 1;
    el('rechner').innerHTML =
      (cfg.intro ? '<p class="r-intro">' + esc(cfg.intro) + '</p>' : '') +
      (mehrere ? '<div class="lk-filter" role="group" aria-label="Aufgabentyp"><button type="button" class="lk-chip" data-k="-1">Alle</button>' +
        cfg.kategorien.map(function (k, i) { return '<button type="button" class="lk-chip" data-k="' + i + '">' + esc(k.name) + '</button>'; }).join('') + '</div>' : '') +
      '<section class="q-card r-card"><span class="q-badge" id="rBadge"></span><div class="r-text" id="rText"></div><div id="rBild"></div>' +
      '<form class="r-felder" id="rFelder" novalidate></form>' +
      '<div class="q-feedback" id="rFeedback" role="status" aria-live="polite"></div>' +
      '<div id="rNachher"></div><div class="r-weg" id="rWeg" hidden><b>Rechenweg</b><ol id="rWegListe"></ol></div></section>' +
      (cfg.hilfe ? '<details class="r-hilfe"><summary>' + esc(cfg.hilfe.titel || 'Formeln') + '</summary><div>' + cfg.hilfe.html + '</div></details>' : '') +
      '<div class="q-next show"><button type="button" class="q-btn" id="rBtn">Prüfen</button></div>';
    [].forEach.call(document.querySelectorAll('#rechner .lk-chip'), function (b) {
      b.onclick = function () { kat = +b.dataset.k; chips(); neu(); };
    });
    el('rFelder').onsubmit = function (e) { e.preventDefault(); knopf(); };
    el('rBtn').onclick = knopf;
    kat = -1;
    chips();
    neu();
  }

  function chips() {
    [].forEach.call(document.querySelectorAll('#rechner .lk-chip'), function (b) {
      b.classList.toggle('active', +b.dataset.k === kat);
      b.setAttribute('aria-pressed', +b.dataset.k === kat);
    });
  }

  function knopf() { if (geprueft) neu(); else pruefen(); }

  function neu() {
    var gens = generatoren(), gen, n = 0;
    do {
      do { gen = pick(gens); } while (gens.length > 1 && gen === letzterGen);
      aufgabe = gen();
    } while (aufgabe.text === letzterText && ++n < 20);
    letzterGen = gen; letzterText = aufgabe.text; geprueft = false;
    el('rBadge').textContent = katName(gen);
    el('rBadge').hidden = cfg.kategorien.length < 2;
    el('rText').innerHTML = aufgabe.text;
    el('rBild').innerHTML = aufgabe.bild || '';
    el('rFelder').innerHTML = aufgabe.felder.map(function (f, i) {
      return '<label class="r-feld"><span class="r-label">' + esc(f.label || 'Ergebnis') + '</span>' +
        '<span class="r-eingabe"><input type="text" inputmode="decimal" autocomplete="off" id="rIn' + i + '" aria-describedby="rHin' + i + '">' +
        '<span class="r-einheit">' + esc(f.einheit || '') + '</span></span>' +
        '<span class="r-hinweis" id="rHin' + i + '"></span></label>';
    }).join('') + '<button type="submit" hidden></button>';
    el('rFeedback').className = 'q-feedback';
    el('rFeedback').innerHTML = '';
    el('rWeg').hidden = true;
    el('rNachher').innerHTML = '';
    el('rBtn').textContent = 'Prüfen';
    var erstes = el('rIn0');
    if (erstes && document.activeElement && document.activeElement.id !== 'rBtn') erstes.focus({ preventScroll: true });
  }

  function pruefen() {
    var leer = false, richtig = 0;
    var werte = aufgabe.felder.map(function (f, i) {
      var v = lesen(el('rIn' + i).value);
      el('rHin' + i).textContent = isNaN(v) ? 'Bitte eine Zahl eingeben.' : '';
      if (isNaN(v)) leer = true;
      return v;
    });
    if (leer) { el('rFelder').querySelector('.r-hinweis:not(:empty)').previousElementSibling.querySelector('input').focus(); return; }
    aufgabe.felder.forEach(function (f, i) {
      var ok = Math.abs(werte[i] - f.wert) <= toleranz(f);
      if (ok) richtig++;
      var inp = el('rIn' + i);
      inp.closest('.r-feld').className = 'r-feld ' + (ok ? 'ok' : 'nok');
      inp.readOnly = true;
      el('rHin' + i).innerHTML = (ok ? OK + ' Richtig' : NOK + ' Richtig wäre ' + zahl(f.wert) + ' ' + esc(f.einheit || ''));
    });
    var alle = richtig === aufgabe.felder.length;
    var fb = el('rFeedback');
    fb.className = 'q-feedback show ' + (alle ? 'ok' : 'nok');
    fb.innerHTML = (alle ? OK : NOK) + '<div><b>' + (alle ? 'Richtig!' : 'Nicht ganz.') + '</b>' +
      (aufgabe.felder.length > 1 ? '<span>' + richtig + ' von ' + aufgabe.felder.length + ' Werten stimmen.</span>' : '') + '</div>';
    el('rWegListe').innerHTML = (aufgabe.weg || []).map(function (s) { return '<li>' + s + '</li>'; }).join('');
    el('rWeg').hidden = !(aufgabe.weg && aufgabe.weg.length);
    el('rNachher').innerHTML = aufgabe.nachher || '';
    geprueft = true;
    el('rBtn').textContent = 'Nächste Aufgabe';
  }

  window.LerntoolTest = {
    typ: 'rechner',
    kategorien: function () { return cfg.kategorien.map(function (k) { return k.name; }); },
    loesung: function () { return aufgabe.felder.map(function (f) { return f.wert; }); },
    // Stichprobe aller Generatoren: meldet Aufgaben mit ungültigem Wert, ohne Rechenweg oder mit leerem Text
    stichprobe: function (n) {
      var fehler = [];
      cfg.kategorien.forEach(function (k) {
        k.aufgaben.forEach(function (g) {
          for (var i = 0; i < n; i++) {
            var a = g();
            if (!a.text || !a.felder.length || !(a.weg && a.weg.length)) fehler.push(k.name + ': Aufgabe ohne Text, Feld oder Rechenweg');
            a.felder.forEach(function (f) { if (!isFinite(f.wert) || f.wert < 0) fehler.push(k.name + ': Wert ' + f.wert + ' in «' + String(a.text).replace(/<[^>]+>/g, '').slice(0, 60) + '»'); });
          }
        });
      });
      return fehler.filter(function (f, i) { return fehler.indexOf(f) === i; }).slice(0, 5);
    }
  };

  // Umschalter «Üben» / «Freier Rechner»: setzt die Tabs vor die zwei Teile und zeigt zuerst «Üben»
  function umschalter(uebenId, rechnerId) {
    var u = el(uebenId), r = el(rechnerId), tabs = document.createElement('div');
    tabs.className = 'mk-tabs'; tabs.setAttribute('role', 'tablist');
    tabs.innerHTML = '<button type="button" role="tab" aria-selected="true">Üben</button><button type="button" role="tab" aria-selected="false">Freier Rechner</button>';
    u.parentNode.insertBefore(tabs, u);
    u.className += ' mk-teil'; r.className += ' mk-teil'; r.hidden = true;
    [].forEach.call(tabs.children, function (b, i) {
      b.onclick = function () {
        tabs.children[0].setAttribute('aria-selected', i === 0); tabs.children[1].setAttribute('aria-selected', i === 1);
        u.hidden = i !== 0; r.hidden = i !== 1;
      };
    });
  }

  // Freie Rechner: Felder eingeben, Ergebnis und Rechenweg erscheinen sofort (gleiches Aussehen wie «Üben»)
  function frei(id, c) {
    var root = el(id), akt = 0;
    root.innerHTML = (c.rechner.length > 1 ? '<div class="lk-filter" role="group" aria-label="Rechner">' + c.rechner.map(function (r, i) {
      return '<button type="button" class="lk-chip" data-f="' + i + '">' + esc(r.name) + '</button>'; }).join('') + '</div>' : '') +
      '<section class="q-card"><p class="r-intro" id="' + id + 'Intro"></p><div class="r-felder" id="' + id + 'Felder"></div>' +
      '<p class="r-hinweis" id="' + id + 'Fehler" role="status"></p></section><div id="' + id + 'Aus" aria-live="polite"></div>' +
      (c.hilfe ? '<details class="r-hilfe"><summary>' + esc(c.hilfe.titel || 'Formeln') + '</summary><div>' + c.hilfe.html + '</div></details>' : '');
    function zeige(i) {
      akt = i;
      var r = c.rechner[i];
      [].forEach.call(root.querySelectorAll('[data-f]'), function (b) { b.classList.toggle('active', +b.dataset.f === i); b.setAttribute('aria-pressed', +b.dataset.f === i); });
      el(id + 'Intro').textContent = r.intro || '';
      el(id + 'Intro').hidden = !r.intro;
      el(id + 'Felder').innerHTML = r.felder.map(function (f) {
        return '<label class="r-feld"><span class="r-label">' + esc(f.label) + '</span><span class="r-eingabe">' +
          '<input type="text" inputmode="decimal" autocomplete="off" data-id="' + f.id + '" value="' + (f.wert === undefined ? '' : f.wert) + '">' +
          (f.einheiten ? '<select data-id="' + f.id + 'Einheit" aria-label="Einheit ' + esc(f.label) + '">' + f.einheiten.map(function (e) { return '<option>' + e + '</option>'; }).join('') + '</select>'
            : '<span class="r-einheit">' + esc(f.einheit || '') + '</span>') + '</span></label>';
      }).join('');
      [].forEach.call(el(id + 'Felder').querySelectorAll('input, select'), function (x) { x.oninput = x.onchange = rechnen; });
      rechnen();
    }
    function rechnen() {
      var r = c.rechner[akt], w = {}, leer = false;
      [].forEach.call(el(id + 'Felder').querySelectorAll('[data-id]'), function (x) {
        w[x.dataset.id] = x.tagName === 'SELECT' ? x.value : lesen(x.value);
        if (x.tagName !== 'SELECT' && isNaN(w[x.dataset.id])) leer = true;
      });
      var e = leer ? null : r.rechne(w);
      el(id + 'Fehler').textContent = e && e.fehler ? e.fehler : '';
      el(id + 'Aus').innerHTML = !e || e.fehler ? '' : '<section class="q-card r-aus"><div class="r-ergebnis">' + e.ergebnis + '</div>' + (e.nachher || '') +
        '<div class="r-weg"><b>Rechenweg</b><ol>' + e.weg.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol></div></section>';
    }
    [].forEach.call(root.querySelectorAll('[data-f]'), function (b) { b.onclick = function () { zeige(+b.dataset.f); }; });
    zeige(0);
  }

  return {
    frei: frei,
    umschalter: umschalter,
    pick: pick,
    zahl: zahl,
    init: function (c) {
      cfg = c;
      build();
    }
  };
})();
