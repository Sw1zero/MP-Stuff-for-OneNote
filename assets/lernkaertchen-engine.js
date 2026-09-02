/* assets/lernkaertchen-engine.js – gemeinsame Lernkärtchen-Engine
   ------------------------------------------------------------------
   Übernimmt Karte-umdrehen, Vorne/Hinten, Mischen, Fortschrittsbalken
   und die Richtig/Falsch-Bestätigung ("Wusste ich" / "Wusste ich nicht").
   Wird von allen lernkaertchen-*.html-Tools eingebunden, jede Seite
   liefert nur ihre Kartendaten + eine render()-Funktion.

   Erwartetes Markup (ids):
     #scene         – klickbare Karten-Bühne (onclick="LK.flip()")
     #card          – bekommt die Klasse "flipped"
     #progressText  – Fortschrittstext
     #progressBar   – Fortschrittsbalken-Füllung
     #confirmRow    – Bestätigungs-Buttons, hidden bis Karte umgedreht
     #doneMessage   – Abschlussmeldung, hidden bis Durchgang fertig

   API:
     var LK = LKEngine.init({
       cards:  ALL_CARDS,          // Array der aktuellen Kartenmenge
       render: function(card) {}   // füllt Vorder-/Rückseite (seitenspezifisch)
     });
     LK.flip() / LK.next() / LK.prev() / LK.shuffle()
     LK.markKnown() / LK.markDontKnow() / LK.restart()
     LK.setCards(newCards)         // z.B. nach Kategoriefilter-Wechsel

   Regel für "Wusste ich nicht": die Karte wird ans Ende des aktuellen
   Stapels angehängt (nicht neu gemischt). Der Durchgang endet erst,
   wenn alle Karten als "gewusst" markiert wurden.
   ------------------------------------------------------------------ */
(function (win) {

  function shuffleArray(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function init(config) {
    var render = config.render;
    var sourceCards = config.cards;

    var els = {
      scene:        document.getElementById('scene'),
      card:         document.getElementById('card'),
      progressText: document.getElementById('progressText'),
      progressBar:  document.getElementById('progressBar'),
      confirmRow:   document.getElementById('confirmRow'),
      doneMessage:  document.getElementById('doneMessage')
    };

    var queue = [];      // { data: card, repeat: bool } – aktueller Stapel
    var pos = 0;
    var isFlipped = false;
    var roundSize = 0;   // Kartenzahl bei Rundenstart, für den Fortschrittsbalken
    var fadeTimer = null; // verhindert Race, wenn schnell mehrfach geklickt wird

    function wrap(cards) {
      return cards.map(function (c) { return { data: c, repeat: false }; });
    }

    function setFlipped(v) {
      isFlipped = v;
      if (els.card) els.card.classList.toggle('flipped', v);
      if (els.confirmRow) els.confirmRow.hidden = !(v && queue.length > 0);
    }

    function updateProgress() {
      if (!els.progressText) return;
      var repeats = 0;
      for (var i = 0; i < queue.length; i++) if (queue[i].repeat) repeats++;
      var txt = 'Karte ' + (pos + 1) + ' von ' + queue.length;
      if (repeats > 0) txt += ' · noch ' + repeats + ' zu wiederholen';
      els.progressText.textContent = txt;
      if (els.progressBar) {
        var learned = roundSize - queue.length;
        var pct = roundSize > 0 ? (learned / roundSize * 100) : 0;
        els.progressBar.style.width = pct + '%';
      }
    }

    function renderCurrent() {
      setFlipped(false);
      render(queue[pos].data);
      updateProgress();
    }

    function showCurrent(animate) {
      if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
      if (queue.length === 0) { complete(); return; }
      if (animate && els.scene) {
        els.scene.style.transition = 'opacity 0.15s';
        els.scene.style.opacity = '0';
        fadeTimer = setTimeout(function () {
          fadeTimer = null;
          renderCurrent();
          els.scene.style.opacity = '1';
        }, 150);
      } else {
        renderCurrent();
      }
    }

    function complete() {
      if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
      setFlipped(false);
      if (els.scene) els.scene.style.display = 'none';
      if (els.confirmRow) els.confirmRow.hidden = true;
      if (els.doneMessage) els.doneMessage.hidden = false;
      if (els.progressText) els.progressText.textContent = 'Alle Karten gewusst.';
      if (els.progressBar) els.progressBar.style.width = '100%';
    }

    function startRound(cards) {
      queue = wrap(cards);
      roundSize = queue.length;
      pos = 0;
      if (els.doneMessage) els.doneMessage.hidden = true;
      if (els.scene) els.scene.style.display = '';
      showCurrent(false);
    }

    function flip() {
      if (queue.length === 0) return;
      setFlipped(!isFlipped);
    }

    function next() {
      if (pos < queue.length - 1) { pos++; showCurrent(true); }
    }

    function prev() {
      if (pos > 0) { pos--; showCurrent(true); }
    }

    function markKnown() {
      if (queue.length === 0) return;
      queue.splice(pos, 1);
      if (queue.length === 0) { complete(); return; }
      if (pos >= queue.length) pos = 0;
      showCurrent(true);
    }

    function markDontKnow() {
      if (queue.length === 0) return;
      var wasLast = pos === queue.length - 1;
      var rec = queue.splice(pos, 1)[0];
      rec.repeat = true;
      queue.push(rec);
      if (wasLast) pos = 0;
      showCurrent(true);
    }

    function shuffle() {
      startRound(shuffleArray(sourceCards));
    }

    function restart() {
      startRound(sourceCards);
    }

    function setCards(cards) {
      sourceCards = cards;
      startRound(cards);
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft')  prev();
      if (e.key === 's' || e.key === 'S') shuffle();
    });

    startRound(sourceCards);

    return {
      flip: flip,
      next: next,
      prev: prev,
      shuffle: shuffle,
      markKnown: markKnown,
      markDontKnow: markDontKnow,
      restart: restart,
      setCards: setCards
    };
  }

  win.LKEngine = { init: init };

})(window);
