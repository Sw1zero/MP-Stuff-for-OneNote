// Startseite: Modul › Thema › Tools. Einzige Quelle sind die Kacheln in index.html:
// .module-section (Modul), darin a.tool-card mit data-thema. Reihenfolge der Themen = Reihenfolge der Kacheln.
// Link pro Stufe: index.html#<modul> und index.html#<modul>/<thema>. Ohne JavaScript bleibt die alte Liste sichtbar.
(function () {
  var MERKEN = 'ltStartseite';
  var slug = function (t) {
    return t.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
      .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };
  // eigener Pfad vor dem #, damit ein <base>-Tag (Testseite) die Links nicht umleitet
  var hier = function (h) { return location.pathname + location.search + '#' + h; };
  var anzahl = function (n, eins, mehr) { return n + ' ' + (n === 1 ? eins : mehr); };

  var sektionen = Array.prototype.slice.call(document.querySelectorAll('.module-section'));
  var module = [];
  sektionen.forEach(function (s) {
    s.hidden = true;
    var karten = Array.prototype.slice.call(s.querySelectorAll('a.tool-card:not(.disabled)'));
    if (!karten.length) return;
    var themen = [];
    karten.forEach(function (k) {
      var name = k.dataset.thema || '';
      var t = themen.filter(function (x) { return x.name === name; })[0];
      if (!t) themen.push(t = { name: name, id: slug(name), karten: [] });
      t.karten.push(k);
    });
    module.push({
      id: s.id.replace(/^section-/, ''),
      name: s.querySelector('.section-title').textContent.trim(),
      karten: karten, themen: themen,
      // kleine Module oder nur ein Thema: gleich die Tools zeigen
      direkt: karten.length <= 4 || themen.length < 2
    });
  });

  var ansicht = document.createElement('section');
  ansicht.className = 'sn-ansicht';
  sektionen[0].parentNode.insertBefore(ansicht, sektionen[0]);

  function kachel(href, titel, meta) {
    var a = document.createElement('a');
    a.className = 'tool-card sn-stufe';
    a.href = hier(href);
    a.innerHTML = '<div class="card-title"></div><div class="card-meta"></div><span class="sn-pfeil" aria-hidden="true">›</span>';
    a.children[0].textContent = titel;
    a.children[1].textContent = meta;
    return a;
  }
  function typen(karten) {
    var t = [];
    karten.forEach(function (k) {
      var b = k.querySelector('.badge-type');
      var x = b ? b.textContent.trim() : '';
      if (x && t.indexOf(x) < 0) t.push(x);
    });
    return t.join(', ');
  }

  function zeige(fokus) {
    var teile = decodeURIComponent(location.hash.slice(1)).split('/');
    var m = module.filter(function (x) { return x.id === teile[0]; })[0];
    var t = m && !m.direkt && m.themen.filter(function (x) { return x.id === teile[1]; })[0];
    try { localStorage.setItem(MERKEN, m ? location.hash.slice(1) : ''); } catch (e) {}

    var pfad = [['', 'Alle Module']];
    var titel, inhalt = [];
    if (!m) {
      titel = 'Module';
      pfad = [];
      module.forEach(function (x) {
        inhalt.push(kachel(x.id, x.name,
          anzahl(x.karten.length, 'Lerntool', 'Lerntools') + (x.direkt ? '' : ' · ' + anzahl(x.themen.length, 'Thema', 'Themen'))));
      });
    } else if (m.direkt || t) {
      titel = t ? t.name : m.name;
      if (t) pfad.push([m.id, m.name]);
      inhalt = (t ? t.karten : m.karten);
    } else {
      titel = m.name;
      m.themen.forEach(function (x) {
        inhalt.push(kachel(m.id + '/' + x.id, x.name, anzahl(x.karten.length, 'Lerntool', 'Lerntools') + ' · ' + typen(x.karten)));
      });
    }

    ansicht.innerHTML = '';
    if (pfad.length) {
      var nav = document.createElement('nav');
      nav.className = 'sn-pfad';
      nav.setAttribute('aria-label', 'Sie sind hier');
      pfad.forEach(function (p) {
        var a = document.createElement('a');
        a.href = hier(p[0]);
        a.textContent = p[1];
        nav.appendChild(a);
        nav.appendChild(document.createTextNode(' › '));
      });
      var aktuell = document.createElement('span');
      aktuell.setAttribute('aria-current', 'page');
      aktuell.textContent = titel;
      nav.appendChild(aktuell);
      ansicht.appendChild(nav);
    }
    var h = document.createElement('h2');
    h.className = 'sn-titel';
    h.tabIndex = -1;
    h.textContent = titel;
    ansicht.appendChild(h);
    var grid = document.createElement('div');
    grid.className = 'tool-grid';
    inhalt.forEach(function (k) { grid.appendChild(k); });   // Tool-Kacheln werden verschoben, nicht kopiert
    ansicht.appendChild(grid);
    if (fokus) { h.focus({ preventScroll: true }); ansicht.scrollIntoView({ block: 'start' }); }
  }

  // Zurück von einem Tool («← Alle Lerntools» ohne #): dort weitermachen, wo man war
  if (!location.hash) {
    try { var alt = localStorage.getItem(MERKEN); if (alt) history.replaceState(null, '', hier(alt)); } catch (e) {}
  }
  addEventListener('hashchange', function () { zeige(true); });
  zeige(false);

  window.LerntoolTest = {
    typ: 'startseite',
    module: function () {
      return module.map(function (m) {
        return { id: m.id, name: m.name, direkt: m.direkt, themen: m.themen.map(function (t) { return { id: t.id, name: t.name, n: t.karten.length }; }) };
      });
    }
  };
})();
