/* Mischungskreuz-Baustein für MP und MT (Quelle: bzwu/.claude/skills/lerntool/basis/mischungskreuz.js, verteilt mit sync_basis.py).
   Braucht rechner.js (Zahlformat). Rechenweg wie im AB Hartkäse (EBA): über Kreuz, grosse minus kleine Zahl, Teile, Gesamtteile, Menge.

   Mischungskreuz.aufgabe({ nameA, a, nameB, b, c, einheit: '%', text, gesucht: 'mengen' | 'anteile', menge, gegeben?: 'A' | 'B', probe? })
     → Aufgabe für Rechner.init. gesucht 'mengen': menge = Gesamtmenge (kg), oder mit gegeben die bekannte Menge von A bzw. B.
     probe: true hängt die Probe über den Fettgehalt an (EFZ).
   Mischungskreuz.rechner('elementId', { vorlagen: [{ titel, nameA, a, nameB, b, c, menge }], einheit: '%', probe? })
     → freier Rechner: rechnet bei jeder Eingabe neu, zeigt Kreuz, Tabelle und Rechenweg.
   Mischungskreuz.seite({ uebung: <Config für Rechner.init>, rechner: <Config für rechner> })
     → ganze Seite in <div id="mischungskreuz">: Umschalter «Üben» / «Freier Rechner», Üben zuerst. */
var Mischungskreuz = (function () {
  function z(n, st) { return Rechner.zahl(n, st); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function kurz(s) { return s.length > 16 ? s.slice(0, 15) + '…' : s; }
  function minus(x, y) { return z(Math.max(x, y)) + ' − ' + z(Math.min(x, y)); }   // immer grosse minus kleine Zahl

  function rechne(o) {
    var r = { tA: Math.abs(o.c - o.b), tB: Math.abs(o.a - o.c) };
    r.S = r.tA + r.tB;
    if (o.menge > 0) {
      if (o.gegeben === 'A') { r.mA = o.menge; r.mB = o.menge / r.tA * r.tB; }
      else if (o.gegeben === 'B') { r.mB = o.menge; r.mA = o.menge / r.tB * r.tA; }
      else { r.mA = r.tA / r.S * o.menge; r.mB = r.tB / r.S * o.menge; }
      r.M = r.mA + r.mB;
    }
    return r;
  }

  function svg(o, r) {
    var e = o.einheit === undefined ? ' %' : (o.einheit ? ' ' + o.einheit : '');
    function box(x, y, cls, titel, wert) {
      return '<rect class="mk-box ' + cls + '" x="' + x + '" y="' + y + '" width="124" height="46" rx="8"/>' +
        '<text class="mk-titel" x="' + (x + 10) + '" y="' + (y + 18) + '">' + esc(kurz(titel)) + '</text>' +
        '<text class="mk-wert" x="' + (x + 10) + '" y="' + (y + 37) + '">' + wert + '</text>';
    }
    return '<svg class="mk-svg" viewBox="0 0 344 176" role="img" aria-label="Mischungskreuz: ' + esc(o.nameA) + ' ' + z(o.a) + e +
      ', ' + esc(o.nameB) + ' ' + z(o.b) + e + ', Ziel ' + z(o.c) + e + ', Teile ' + z(r.tA) + ' und ' + z(r.tB) + '">' +
      '<line class="mk-linie" x1="124" y1="33" x2="220" y2="143"/><line class="mk-linie" x1="124" y1="143" x2="220" y2="33"/>' +
      box(0, 10, 'mk-a', o.nameA, z(o.a) + e) + box(0, 120, 'mk-b', o.nameB, z(o.b) + e) +
      box(220, 10, 'mk-a mk-teile', 'Teile ' + o.nameA, z(r.tA)) + box(220, 120, 'mk-b mk-teile', 'Teile ' + o.nameB, z(r.tB)) +
      '<circle class="mk-ziel" cx="172" cy="88" r="30"/>' +
      '<text class="mk-titel" x="172" y="82" text-anchor="middle">Ziel</text>' +
      '<text class="mk-wert" x="172" y="100" text-anchor="middle">' + z(o.c) + e + '</text></svg>';
  }

  function weg(o, r, gesucht) {
    var e = o.einheit === undefined ? ' %' : (o.einheit ? ' ' + o.einheit : '');
    var s = [
      'Über Kreuz rechnen, grosse minus kleine Zahl. Teile ' + esc(o.nameA) + ' = ' + minus(o.c, o.b) + ' = <strong>' + z(r.tA) + '</strong>',
      'Teile ' + esc(o.nameB) + ' = ' + minus(o.a, o.c) + ' = <strong>' + z(r.tB) + '</strong>',
      'Gesamtteile = ' + z(r.tA) + ' + ' + z(r.tB) + ' = <strong>' + z(r.S) + '</strong>'
    ];
    if (gesucht === 'anteile') {
      var pA = r.tA / r.S * 100, pB = r.tB / r.S * 100;
      s.push('Anteil ' + esc(o.nameA) + ' = ' + z(r.tA) + ' ÷ ' + z(r.S) + ' × 100 = <strong>' + z(pA) + ' %</strong>',
        'Anteil ' + esc(o.nameB) + ' = ' + z(r.tB) + ' ÷ ' + z(r.S) + ' × 100 = <strong>' + z(pB) + ' %</strong>',
        'Kontrolle: ' + z(pA) + ' % + ' + z(pB) + ' % = 100 %');
      return s;
    }
    if (r.M === undefined) return s;
    if (o.gegeben) {
      var gA = o.gegeben === 'A', mG = gA ? r.mA : r.mB, tG = gA ? r.tA : r.tB, tX = gA ? r.tB : r.tA, mX = gA ? r.mB : r.mA;
      var nX = gA ? o.nameB : o.nameA;
      s.push('1 Teil = ' + z(mG) + ' kg ÷ ' + z(tG) + ' = ' + z(mG / tG) + ' kg',
        esc(nX) + ' = ' + z(tX) + ' × ' + z(mG / tG) + ' kg = <strong>' + z(mX) + ' kg</strong>',
        'Gesamtmenge = ' + z(r.mA) + ' kg + ' + z(r.mB) + ' kg = <strong>' + z(r.M) + ' kg</strong>');
    } else {
      s.push(esc(o.nameA) + ' = ' + z(r.tA) + ' ÷ ' + z(r.S) + ' × ' + z(r.M) + ' kg = <strong>' + z(r.mA) + ' kg</strong>',
        esc(o.nameB) + ' = ' + z(r.tB) + ' ÷ ' + z(r.S) + ' × ' + z(r.M) + ' kg = <strong>' + z(r.mB) + ' kg</strong>',
        'Kontrolle: ' + z(r.mA) + ' kg + ' + z(r.mB) + ' kg = ' + z(r.M) + ' kg');
    }
    if (o.probe) s.push('Probe: (' + z(r.mA) + ' kg × ' + z(o.a) + ' + ' + z(r.mB) + ' kg × ' + z(o.b) + ') ÷ ' + z(r.M) + ' kg = ' +
      z((r.mA * o.a + r.mB * o.b) / r.M) + e + ', das ist der Zielwert');
    return s;
  }

  function aufgabe(o) {
    var r = rechne(o), felder;
    if (o.gesucht === 'anteile') felder = [
      { label: 'Anteil ' + o.nameA, einheit: '%', wert: r.tA / r.S * 100, tol: 0.05 },   // Anteile auf 1 Stelle genau
      { label: 'Anteil ' + o.nameB, einheit: '%', wert: r.tB / r.S * 100, tol: 0.05 }];
    else if (o.gegeben) felder = [
      { label: o.gegeben === 'A' ? o.nameB : o.nameA, einheit: 'kg', wert: o.gegeben === 'A' ? r.mB : r.mA, mehrstufig: true },
      { label: 'Gesamtmenge', einheit: 'kg', wert: r.M, mehrstufig: true }];
    else felder = [
      { label: o.nameA, einheit: 'kg', wert: r.mA, mehrstufig: true },
      { label: o.nameB, einheit: 'kg', wert: r.mB, mehrstufig: true }];
    return { text: o.text, felder: felder, weg: weg(o, r, o.gesucht), nachher: '<div class="mk-kreuz">' + svg(o, r) + '</div>' };
  }

  function rechner(id, cfg) {
    var root = document.getElementById(id), modus = '';
    var e = cfg.einheit === undefined ? '%' : cfg.einheit;
    function feld(fid, label, typ, einheit) {
      return '<label class="r-feld"><span class="r-label">' + label + '</span><span class="r-eingabe"><input id="' + fid + '" type="text" ' +
        (typ === 'zahl' ? 'inputmode="decimal" ' : '') + 'autocomplete="off">' + (einheit !== undefined ? '<span class="r-einheit">' + einheit + '</span>' : '') + '</span></label>';
    }
    root.innerHTML =
      (cfg.vorlagen && cfg.vorlagen.length ? '<p class="r-intro">Beispiel laden oder eigene Werte eingeben. Das Ergebnis erscheint sofort.</p><div class="lk-filter">' +
        cfg.vorlagen.map(function (v, i) { return '<button type="button" class="lk-chip" data-v="' + i + '">' + esc(v.titel) + '</button>'; }).join('') + '</div>' : '') +
      '<section class="q-card mk-eingabe"><div class="mk-paar">' + feld('mkNameA', 'Komponente A', 'text') + feld('mkA', 'Wert A', 'zahl', e) + '</div>' +
      '<div class="mk-paar">' + feld('mkC', 'Zielwert', 'zahl', e) + '</div>' +
      '<div class="mk-paar">' + feld('mkNameB', 'Komponente B', 'text') + feld('mkB', 'Wert B', 'zahl', e) + '</div>' +
      '<div class="lk-filter mk-modus" role="group" aria-label="Bekannte Menge">' +
      '<button type="button" class="lk-chip" data-m="">Gesamtmenge</button><button type="button" class="lk-chip" data-m="A">Menge A bekannt</button><button type="button" class="lk-chip" data-m="B">Menge B bekannt</button></div>' +
      feld('mkMenge', 'Gesamtmenge (freiwillig)', 'zahl', 'kg') +
      '<p class="r-hinweis" id="mkFehler" role="status"></p></section>' +
      '<div id="mkAusgabe" aria-live="polite"></div>';
    function wert(fid) { var s = document.getElementById(fid).value.trim().replace(',', '.'); return s === '' || isNaN(s) ? NaN : parseFloat(s); }
    function name(fid, std) { return document.getElementById(fid).value.trim() || std; }
    function setModus(m) {
      modus = m;
      [].forEach.call(root.querySelectorAll('.mk-modus .lk-chip'), function (b) { b.classList.toggle('active', b.dataset.m === m); b.setAttribute('aria-pressed', b.dataset.m === m); });
      root.querySelector('#mkMenge').closest('.r-feld').querySelector('.r-label').textContent =
        m ? 'Menge ' + name(m === 'A' ? 'mkNameA' : 'mkNameB', 'Komponente ' + m) : 'Gesamtmenge (freiwillig)';
    }
    function update() {
      var o = { nameA: name('mkNameA', 'Komponente A'), a: wert('mkA'), nameB: name('mkNameB', 'Komponente B'), b: wert('mkB'), c: wert('mkC'),
        einheit: e, menge: wert('mkMenge'), gegeben: modus, probe: cfg.probe };
      var fehler = '', aus = document.getElementById('mkAusgabe');
      if (isNaN(o.a) || isNaN(o.b) || isNaN(o.c)) fehler = 'Bitte Wert A, Wert B und Zielwert eingeben.';
      else if (o.a === o.b) fehler = 'Die beiden Werte dürfen nicht gleich sein.';
      else if (o.c <= Math.min(o.a, o.b) || o.c >= Math.max(o.a, o.b)) fehler = 'Der Zielwert muss zwischen ' + z(Math.min(o.a, o.b)) + ' und ' + z(Math.max(o.a, o.b)) + ' liegen.';
      document.getElementById('mkFehler').textContent = fehler;
      if (fehler) { aus.innerHTML = ''; return; }
      if (!(o.menge > 0)) o.menge = undefined;
      var r = rechne(o), mit = r.M !== undefined;
      aus.innerHTML = '<section class="q-card"><div class="mk-kreuz">' + svg(o, r) + '</div>' +
        '<div class="r-tabelle-wrap"><table class="r-tabelle"><tr><th>Komponente</th><th>Teile</th><th>Anteil</th>' + (mit ? '<th>Menge</th>' : '') + '</tr>' +
        '<tr><td>' + esc(o.nameA) + '</td><td>' + z(r.tA) + '</td><td>' + z(r.tA / r.S * 100, 1) + ' %</td>' + (mit ? '<td>' + z(r.mA, 2) + ' kg</td>' : '') + '</tr>' +
        '<tr><td>' + esc(o.nameB) + '</td><td>' + z(r.tB) + '</td><td>' + z(r.tB / r.S * 100, 1) + ' %</td>' + (mit ? '<td>' + z(r.mB, 2) + ' kg</td>' : '') + '</tr>' +
        '<tr><th>Total</th><td>' + z(r.S) + '</td><td>100 %</td>' + (mit ? '<td>' + z(r.M, 2) + ' kg</td>' : '') + '</tr></table></div>' +
        '<div class="r-weg"><b>Rechenweg</b><ol>' + weg(o, r, mit ? 'mengen' : 'teile').map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol></div></section>';
    }
    [].forEach.call(root.querySelectorAll('.mk-modus .lk-chip'), function (b) { b.onclick = function () { setModus(b.dataset.m); update(); }; });
    [].forEach.call(root.querySelectorAll('[data-v]'), function (b) {
      b.onclick = function () {
        var v = cfg.vorlagen[+b.dataset.v];
        document.getElementById('mkNameA').value = v.nameA; document.getElementById('mkA').value = v.a;
        document.getElementById('mkNameB').value = v.nameB; document.getElementById('mkB').value = v.b;
        document.getElementById('mkC').value = v.c; document.getElementById('mkMenge').value = v.menge || '';
        setModus(''); update();
      };
    });
    [].forEach.call(root.querySelectorAll('input'), function (i) { i.oninput = function () { if (i.id.indexOf('mkName') === 0) setModus(modus); update(); }; });
    setModus('');
    if (cfg.vorlagen && cfg.vorlagen.length) root.querySelector('[data-v="0"]').click();
  }

  function seite(cfg) {
    var root = document.getElementById('mischungskreuz');
    root.innerHTML = '<div class="mk-tabs" role="tablist"><button type="button" role="tab" id="mkTabU" aria-selected="true" aria-controls="mkTeilU">Üben</button>' +
      '<button type="button" role="tab" id="mkTabR" aria-selected="false" aria-controls="mkTeilR">Freier Rechner</button></div>' +
      '<div class="mk-teil" id="mkTeilU" role="tabpanel" aria-labelledby="mkTabU"><div id="rechner"></div></div>' +
      '<div class="mk-teil" id="mkTeilR" role="tabpanel" aria-labelledby="mkTabR" hidden><div id="mkRechner"></div></div>';
    function zeige(u) {
      document.getElementById('mkTabU').setAttribute('aria-selected', u);
      document.getElementById('mkTabR').setAttribute('aria-selected', !u);
      document.getElementById('mkTeilU').hidden = !u;
      document.getElementById('mkTeilR').hidden = u;
    }
    document.getElementById('mkTabU').onclick = function () { zeige(true); };
    document.getElementById('mkTabR').onclick = function () { zeige(false); };
    Rechner.init(cfg.uebung);
    rechner('mkRechner', cfg.rechner);
  }

  return { aufgabe: aufgabe, rechner: rechner, rechne: rechne, seite: seite };
})();
