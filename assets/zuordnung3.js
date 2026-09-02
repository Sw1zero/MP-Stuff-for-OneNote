/* assets/zuordnung3.js – MP-Lerntools gemeinsame 3-Stufen-Zuordnung-Engine
   ---------------------------------------------------------------------
   Stellt die "Einfach (zuordnen) / Mittel (anklicken) / Schwer (eintippen)"
   Logik für Beschriften-/Zuordnung-Tools bereit. Ersetzt die pro Tool
   kopierten setLevel/checkLevel/checkEinfach/checkSchwer-Funktionen.

   Erwartetes Markup (siehe frischkaese/beschriften-oelbrenner.html als Vorlage):
     #lvl-einfach / #lvl-mittel / #lvl-schwer   – Level-Buttons
     #instruction                               – Anleitungstext
     #imgStage > #hotspotLayer                  – Bildbühne + Klick-Layer
     #modeBody                                  – Aufnahme für Level-Inhalt
     #checkBtn, #resultBanner, #touchClone      – Steuerung/Feedback

   API:
     Zuordnung3.init(config)
       config = {
         parts: [{ n, name, keys:[...], zones:[{cx,cy,r}] }, ...]
           – zones in % der Bildbreite/-höhe. Statt zones ist auch ein
             flaches { cx, cy, r } pro Teil erlaubt (wird intern zu einer
             Zone normalisiert).
         itemLabel: 'Bauteil' | 'Bestandteil' (Singular, für Prompts/Platzhalter)
         itemLabelPlural: 'Bauteile' | 'Bestandteile' (für Ergebnis-Meldungen)
         instructions: { einfach, mittel, schwer } – exakte Anleitungstexte
         hitThreshold: optionale Zahl (Anteil der Bildbreite, z.B. 0.22)
           – ohne Angabe zählt der Radius der jeweils nächsten Zone (zone.r)
         onLevelChange: optionale function(level) – für Level-abhängige
           Bühnendarstellung (z.B. Bild tauschen oder SVG neu zeichnen),
           wird in setLevel() vor resetLevel() aufgerufen
       }
     Zuordnung3.setLevel(level)
     Zuordnung3.checkLevel()
     Zuordnung3.resetLevel()
   --------------------------------------------------------------------- */
(function (win, doc) {
  var cfg = null;
  var level = 'einfach';

  var dragWord = null, dragSource = null, selectedWord = null;
  var touchWord = null, touchSource = null;
  var touchOffX = 0, touchOffY = 0;
  var touchCloneEl = null;
  var listenersBound = false;

  var hsOrder = [], hsIndex = 0, hsMiss = 0;

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function fold(s) {
    return String(s).toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function matchPart(input, part) {
    var f = fold(input);
    if (!f) return false;
    if (f === fold(part.name)) return true;
    for (var i = 0; i < part.keys.length; i++) {
      if (f.indexOf(fold(part.keys[i])) !== -1) return true;
    }
    return false;
  }

  /* ---- init ---- */
  function init(config) {
    cfg = config;
    cfg.parts.forEach(function (p) {
      if (!p.zones) p.zones = [{ cx: p.cx, cy: p.cy, r: p.r }];
    });
    touchCloneEl = doc.getElementById('touchClone');
    if (!listenersBound) {
      doc.addEventListener('touchmove', onTouchMove, { passive: false });
      doc.addEventListener('touchend', onTouchEnd);
      listenersBound = true;
    }
    setLevel('einfach');
  }

  /* ---- Level-Steuerung ---- */
  function setLevel(l) {
    level = l;
    ['einfach', 'mittel', 'schwer'].forEach(function (k) {
      doc.getElementById('lvl-' + k).classList.toggle('active', k === l);
    });
    if (cfg.onLevelChange) cfg.onLevelChange(l);
    doc.getElementById('resultBanner').className = 'result-banner';
    resetLevel();
  }

  function resetLevel() {
    var hl = doc.getElementById('hotspotLayer');
    hl.innerHTML = ''; hl.classList.remove('active'); hl.onclick = null;
    doc.getElementById('resultBanner').className = 'result-banner';
    var body = doc.getElementById('modeBody');
    body.innerHTML = '';
    var checkBtn = doc.getElementById('checkBtn');
    var instr = doc.getElementById('instruction');
    if (level === 'einfach') {
      checkBtn.style.display = '';
      instr.textContent = cfg.instructions.einfach;
      buildEinfach(body);
    } else if (level === 'mittel') {
      checkBtn.style.display = 'none';
      instr.textContent = cfg.instructions.mittel;
      buildMittel(body);
    } else {
      checkBtn.style.display = '';
      instr.textContent = cfg.instructions.schwer;
      buildSchwer(body);
    }
  }

  /* ---- EINFACH (Drag & Drop / Antippen) ---- */
  function buildEinfach(body) {
    body.innerHTML = '<div class="word-bank" id="wordBank"></div><div class="slots-grid" id="slotsGrid"></div>';
    dragWord = dragSource = selectedWord = touchWord = touchSource = null;
    var bank = doc.getElementById('wordBank');
    shuffle(cfg.parts.map(function (p) { return p.name; })).forEach(function (word) {
      var chip = doc.createElement('span');
      chip.className = 'word-chip'; chip.textContent = word; chip.dataset.word = word; chip.setAttribute('draggable', 'true');
      chip.addEventListener('dragstart', function (e) { dragWord = word; dragSource = chip; e.dataTransfer.effectAllowed = 'move'; });
      chip.addEventListener('touchstart', function (e) { onTouchStart(e, chip, word, false); }, { passive: false });
      chip.addEventListener('click', function () { selectChip(chip, word); });
      bank.appendChild(chip);
    });
    var grid = doc.getElementById('slotsGrid');
    cfg.parts.forEach(function (p) {
      var row = doc.createElement('div'); row.className = 'slot-row';
      var badge = doc.createElement('div'); badge.className = 'slot-num'; badge.textContent = p.n;
      var box = doc.createElement('div'); box.className = 'slot-box'; box.dataset.slot = p.n; box.textContent = '—';
      box.addEventListener('dragover', function (e) { e.preventDefault(); if (!box.classList.contains('correct') && !box.classList.contains('wrong')) box.classList.add('over'); });
      box.addEventListener('dragleave', function () { box.classList.remove('over'); });
      box.addEventListener('drop', function (e) { e.preventDefault(); box.classList.remove('over'); dropOnSlot(box); });
      box.setAttribute('draggable', 'false');
      box.addEventListener('dragstart', function (e) { if (!box.dataset.filled) { e.preventDefault(); return; } dragWord = box.dataset.filled; dragSource = box; e.dataTransfer.effectAllowed = 'move'; });
      box.addEventListener('touchstart', function (e) { if (!box.dataset.filled) return; onTouchStart(e, box, box.dataset.filled, true); }, { passive: false });
      box.addEventListener('click', function () { clickBox(box); });
      row.appendChild(badge); row.appendChild(box); grid.appendChild(row);
    });
  }

  function selectChip(chip, word) {
    if (chip.classList.contains('selected')) { chip.classList.remove('selected'); selectedWord = null; clearReady(); return; }
    doc.querySelectorAll('.word-chip.selected').forEach(function (c) { c.classList.remove('selected'); });
    chip.classList.add('selected'); selectedWord = word;
    doc.querySelectorAll('.slot-box').forEach(function (b) { b.classList.remove('ready'); if (!b.dataset.filled && !b.classList.contains('correct') && !b.classList.contains('wrong')) b.classList.add('ready'); });
  }
  function clickBox(box) {
    if (box.classList.contains('correct') || box.classList.contains('wrong')) return;
    if (box.dataset.filled) { returnWord(box.dataset.filled); clearSlot(box); if (selectedWord) box.classList.add('ready'); return; }
    if (!selectedWord) return;
    fillSlot(box, selectedWord); markUsed(selectedWord); selectedWord = null;
    doc.querySelectorAll('.word-chip.selected').forEach(function (c) { c.classList.remove('selected'); });
    clearReady();
  }
  function clearReady() { doc.querySelectorAll('.slot-box').forEach(function (b) { b.classList.remove('ready'); }); }
  function dropOnSlot(box) {
    if (!dragWord) return;
    if (box.classList.contains('correct') || box.classList.contains('wrong')) return;
    var displaced = box.dataset.filled || null;
    if (dragSource && dragSource.classList.contains('slot-box')) { clearSlot(dragSource); if (displaced) fillSlot(dragSource, displaced); }
    else { markUsed(dragWord); if (displaced) returnWord(displaced); }
    fillSlot(box, dragWord); dragWord = dragSource = null;
  }
  function fillSlot(box, word) { box.dataset.filled = word; box.textContent = word; box.className = 'slot-box filled'; box.setAttribute('draggable', 'true'); }
  function clearSlot(box) { delete box.dataset.filled; box.textContent = '—'; box.className = 'slot-box'; box.setAttribute('draggable', 'false'); }
  function markUsed(word) { doc.querySelectorAll('.word-chip').forEach(function (c) { if (c.dataset.word === word) c.classList.add('used'); }); }
  function returnWord(word) { doc.querySelectorAll('.word-chip').forEach(function (c) { if (c.dataset.word === word) c.classList.remove('used'); }); }

  function onTouchStart(e, el, word, isSlot) {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    var t = e.touches[0], rect = el.getBoundingClientRect();
    touchWord = word; touchSource = { el: el, isSlot: isSlot };
    touchOffX = t.clientX - rect.left; touchOffY = t.clientY - rect.top;
    touchCloneEl.textContent = word;
    touchCloneEl.style.left = (t.clientX - touchOffX) + 'px';
    touchCloneEl.style.top = (t.clientY - touchOffY) + 'px';
    touchCloneEl.style.display = 'block';
    el.style.opacity = '0.25';
  }
  function onTouchMove(e) {
    if (!touchWord) return;
    e.preventDefault();
    var t = e.touches[0];
    touchCloneEl.style.left = (t.clientX - touchOffX) + 'px';
    touchCloneEl.style.top = (t.clientY - touchOffY) + 'px';
  }
  function onTouchEnd(e) {
    if (!touchWord) return;
    var t = e.changedTouches[0];
    touchCloneEl.style.display = 'none';
    touchSource.el.style.opacity = '';
    var under = doc.elementFromPoint(t.clientX, t.clientY);
    var box = under ? under.closest('.slot-box') : null;
    if (box && !box.classList.contains('correct') && !box.classList.contains('wrong')) {
      var displaced = box.dataset.filled || null;
      if (touchSource.isSlot) { clearSlot(touchSource.el); if (displaced) fillSlot(touchSource.el, displaced); }
      else { markUsed(touchWord); if (displaced) returnWord(displaced); }
      fillSlot(box, touchWord);
    }
    touchWord = touchSource = null;
  }

  function checkEinfach() {
    var correct = 0, filled = 0;
    doc.querySelectorAll('.slot-box').forEach(function (box) {
      var val = box.dataset.filled; if (!val) return;
      filled++;
      var n = parseInt(box.dataset.slot);
      var part = cfg.parts[n - 1];
      box.classList.remove('filled');
      if (val === part.name) { box.classList.add('correct'); correct++; }
      else box.classList.add('wrong');
    });
    showResult(correct, filled);
  }

  /* ---- MITTEL (Hotspot) ---- */
  function buildMittel(body) {
    hsOrder = shuffle(cfg.parts.slice()); hsIndex = 0; hsMiss = 0;
    body.innerHTML = '<div class="hs-prompt" id="hsPrompt"></div>';
    var hl = doc.getElementById('hotspotLayer');
    hl.classList.add('active'); hl.onclick = onHotspotClick;
    renderPrompt();
  }
  function renderPrompt() {
    var prompt = doc.getElementById('hsPrompt');
    if (!prompt) return;
    if (hsIndex >= hsOrder.length) {
      prompt.innerHTML = '<span class="hs-progress">Fertig</span>Alle ' + hsOrder.length + ' ' + cfg.itemLabelPlural + ' gefunden!';
      showResult(hsOrder.length, hsOrder.length, hsMiss);
      return;
    }
    prompt.innerHTML =
      '<span class="hs-progress">' + cfg.itemLabel + ' ' + (hsIndex + 1) + ' von ' + hsOrder.length + '</span>' +
      'Klicken Sie auf: <b>' + hsOrder[hsIndex].name + '</b>';
  }
  function onHotspotClick(e) {
    var hl = doc.getElementById('hotspotLayer');
    var rect = hl.getBoundingClientRect();
    var W = rect.width, H = rect.height;
    var cx = e.clientX - rect.left;
    var cy = e.clientY - rect.top;
    if (hsIndex >= hsOrder.length) return;
    var target = hsOrder[hsIndex];
    var nearest = null, nearestZone = null, nd = Infinity;
    cfg.parts.forEach(function (p) {
      p.zones.forEach(function (z) {
        var dx = cx - z.cx / 100 * W, dy = cy - z.cy / 100 * H;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < nd) { nd = d; nearest = p; nearestZone = z; }
      });
    });
    var thresh = (typeof cfg.hitThreshold === 'number') ? cfg.hitThreshold * W : nearestZone.r / 100 * W;
    if (nearest === target && nd <= thresh) {
      var m = doc.createElement('div');
      m.className = 'hs-marker'; m.style.left = nearestZone.cx + '%'; m.style.top = nearestZone.cy + '%';
      m.textContent = target.n; m.title = target.name;
      hl.appendChild(m);
      hsIndex++; renderPrompt();
    } else {
      hsMiss++;
      var miss = doc.createElement('div');
      miss.className = 'hs-miss';
      miss.style.left = (cx / W * 100) + '%'; miss.style.top = (cy / H * 100) + '%';
      miss.textContent = '✗';
      hl.appendChild(miss);
      setTimeout(function () { if (miss.parentNode) miss.parentNode.removeChild(miss); }, 600);
    }
  }

  /* ---- SCHWER (Eintippen) ---- */
  function buildSchwer(body) {
    var grid = doc.createElement('div'); grid.className = 'slots-grid';
    cfg.parts.forEach(function (p) {
      var row = doc.createElement('div'); row.className = 'slot-row';
      row.innerHTML =
        '<div class="slot-num">' + p.n + '</div>' +
        '<div class="type-cell">' +
          '<input class="type-input" id="ti-' + p.n + '" type="text" autocomplete="off" placeholder="' + cfg.itemLabel + ' ' + p.n + ' …">' +
          '<div class="type-sol" id="sol-' + p.n + '" style="display:none;"></div>' +
        '</div>';
      grid.appendChild(row);
    });
    body.appendChild(grid);
    cfg.parts.forEach(function (p) {
      doc.getElementById('ti-' + p.n).addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        var nx = doc.getElementById('ti-' + (p.n + 1));
        if (nx) nx.focus(); else checkLevel();
      });
    });
  }
  function checkSchwer() {
    var correct = 0;
    cfg.parts.forEach(function (p) {
      var inp = doc.getElementById('ti-' + p.n);
      var sol = doc.getElementById('sol-' + p.n);
      inp.classList.remove('correct', 'wrong');
      if (matchPart(inp.value, p)) { inp.classList.add('correct'); sol.style.display = 'none'; correct++; }
      else { inp.classList.add('wrong'); sol.textContent = '→ ' + p.name; sol.style.display = 'block'; }
    });
    showResult(correct, cfg.parts.length);
  }

  /* ---- gemeinsam ---- */
  function checkLevel() {
    if (level === 'einfach') checkEinfach();
    else if (level === 'schwer') checkSchwer();
  }
  function showResult(correct, total, misses) {
    var banner = doc.getElementById('resultBanner');
    if (correct === total) {
      var extra = (misses !== undefined && misses > 0) ? ' (' + misses + ' Fehlklick' + (misses === 1 ? '' : 's') + ')' : '';
      banner.textContent = 'Perfekt! Alle ' + total + ' ' + cfg.itemLabelPlural + ' richtig' + extra + '.';
      banner.className = 'result-banner show perfect';
    } else {
      banner.textContent = correct + ' von ' + total + ' richtig. Schauen Sie sich die markierten nochmals an.';
      banner.className = 'result-banner show partial';
    }
  }

  win.Zuordnung3 = {
    init: init,
    setLevel: setLevel,
    checkLevel: checkLevel,
    resetLevel: resetLevel
  };
})(window, document);
