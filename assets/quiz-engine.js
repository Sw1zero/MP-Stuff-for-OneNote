/* assets/quiz-engine.js – MP-Lerntools gemeinsame Quiz-Engine
   ---------------------------------------------------------------
   Multiple-Choice-Quiz mit Sofortfeedback, Score/Serie, Fortschrittsbalken
   und Ergebnis-Bildschirm. Ersetzt den in jedem quiz-*.html duplizierten Skriptblock.

   Jede Quiz-Datei behält nur: Fragen-Array(e) + Markup + diesen Aufruf am
   Skript-Ende:

     QuizEngine.init({
       questions: ALL_QUESTIONS,          // einfacher Modus (ein Fragenpool)
       // ODER
       levels: { einfach: EASY_QUESTIONS, schwer: HARD_QUESTIONS },  // Level-Modus
       defaultLevel: 'einfach',           // optional, Default 'einfach'
       // ODER zusätzlich zu questions:
       categories: { colors: CATEGORY_COLORS, labels: CATEGORY_LABELS }, // Filter-Modus
       messages: { excellent, good, ok, poor }  // Endtexte je nach Prozentsatz
     });

   Modi (anhand der übergebenen Optionen erkannt):
     - Level-Modus:  config.levels vorhanden -> Level-Buttons (#lvl-einfach/#lvl-schwer)
       schalten zwischen zwei Fragenpools um (setLevel, global für onclick).
     - Filter-Modus: config.categories vorhanden -> Kategorie-Badge pro Frage
       (#questionBadge) wird eingefärbt, Filter-Buttons (.filter-btn, #f-<key>)
       schränken den Fragenpool ein (setFilter, global für onclick).
     - Einfacher Modus: weder levels noch categories -> ein Fragenpool, statischer
       Badge-Text bleibt im Markup der jeweiligen Datei.

   Global (für onclick-Attribute im Markup): setLevel, setFilter, nextQuestion,
   restartQuiz.
   --------------------------------------------------------------- */
(function (win, doc) {
  var config = null;
  var level = null;
  var currentFilter = 'alle';
  var deck = [];
  var currentIndex = 0;
  var answered = false;
  var scoreCorrect = 0;
  var scoreWrong = 0;
  var scoreSerie = 0;

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function getPool() {
    if (config.levels) {
      return config.levels[level] || [];
    }
    var all = config.questions || [];
    if (config.categories) {
      return currentFilter === 'alle'
        ? all
        : all.filter(function (q) { return q.cat === currentFilter; });
    }
    return all;
  }

  function buildDeck() {
    deck = shuffle(getPool());
  }

  function setLevel(l) {
    level = l;
    doc.getElementById('lvl-einfach').classList.toggle('active', l === 'einfach');
    doc.getElementById('lvl-schwer').classList.toggle('active', l === 'schwer');
    resetQuiz();
  }

  function setFilter(f) {
    currentFilter = f;
    doc.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
    doc.getElementById('f-' + f).classList.add('active');
    resetQuiz();
  }

  function resetQuiz() {
    scoreCorrect = 0;
    scoreWrong = 0;
    scoreSerie = 0;
    updateScoreBar();
    buildDeck();
    currentIndex = 0;
    doc.getElementById('endScreen').classList.remove('visible');
    doc.getElementById('questionCard').style.display = '';
    doc.getElementById('progressText').style.display = '';
    doc.getElementById('progressBar').parentElement.style.display = '';
    showQuestion();
  }

  function restartQuiz() {
    resetQuiz();
  }

  function updateScoreBar() {
    doc.getElementById('scoreCorrect').textContent = scoreCorrect;
    doc.getElementById('scoreWrong').textContent = scoreWrong;
    doc.getElementById('scoreSerie').textContent = scoreSerie;
  }

  function showQuestion() {
    answered = false;
    doc.getElementById('feedback').className = 'feedback';
    doc.getElementById('quizNav').style.display = 'none';

    var q = deck[currentIndex];

    if (config.categories) {
      var col = config.categories.colors[q.cat];
      var badge = doc.getElementById('questionBadge');
      badge.textContent = config.categories.labels[q.cat];
      badge.style.background = col.bg;
      badge.style.color = col.fg;
    }

    doc.getElementById('questionText').textContent = q.q;

    var answersDiv = doc.getElementById('answers');
    answersDiv.innerHTML = '';

    var indices = shuffle([0, 1, 2, 3]);
    indices.forEach(function (optIdx) {
      var btn = doc.createElement('button');
      btn.className = 'answer-btn';
      btn.textContent = q.options[optIdx];
      btn.onclick = function () { checkAnswer(optIdx); };
      answersDiv.appendChild(btn);
    });

    var total = deck.length;
    doc.getElementById('progressText').textContent = 'Frage ' + (currentIndex + 1) + ' von ' + total;
    doc.getElementById('progressBar').style.width = ((currentIndex + 1) / total * 100) + '%';
  }

  function checkAnswer(selectedIdx) {
    if (answered) return;
    answered = true;

    var q = deck[currentIndex];
    var isCorrect = (selectedIdx === q.correct);

    doc.querySelectorAll('.answer-btn').forEach(function (b) {
      b.disabled = true;
      var idx = q.options.indexOf(b.textContent);
      if (idx === q.correct) {
        b.classList.add('correct');
      } else if (idx === selectedIdx && !isCorrect) {
        b.classList.add('wrong');
      }
    });

    if (isCorrect) {
      scoreCorrect++;
      scoreSerie++;
    } else {
      scoreWrong++;
      scoreSerie = 0;
    }
    updateScoreBar();

    var feedback = doc.getElementById('feedback');
    var feedbackTitle = doc.getElementById('feedbackTitle');

    if (isCorrect) {
      feedback.className = 'feedback correct';
      feedbackTitle.textContent = 'Richtig!';
    } else {
      feedback.className = 'feedback wrong';
      feedbackTitle.textContent = 'Falsch. Richtig wäre: ' + q.options[q.correct];
    }
    doc.getElementById('feedbackText').textContent = q.explanation;

    var nav = doc.getElementById('quizNav');
    nav.style.display = 'flex';
    doc.getElementById('nextBtn').textContent =
      (currentIndex >= deck.length - 1) ? 'Ergebnis anzeigen' : 'Weiter →';
  }

  function nextQuestion() {
    currentIndex++;
    if (currentIndex >= deck.length) {
      showEndScreen();
    } else {
      showQuestion();
    }
  }

  function showEndScreen() {
    doc.getElementById('questionCard').style.display = 'none';
    doc.getElementById('feedback').className = 'feedback';
    doc.getElementById('quizNav').style.display = 'none';
    doc.getElementById('progressText').style.display = 'none';
    doc.getElementById('progressBar').parentElement.style.display = 'none';

    var total = deck.length;
    var pct = Math.round(scoreCorrect / total * 100);

    doc.getElementById('endScore').textContent = scoreCorrect + ' von ' + total + ' richtig';

    var msg;
    if (pct >= 90) msg = config.messages.excellent;
    else if (pct >= 70) msg = config.messages.good;
    else if (pct >= 50) msg = config.messages.ok;
    else msg = config.messages.poor;

    doc.getElementById('endText').textContent = pct + ' % richtig. ' + msg;
    doc.getElementById('endScreen').classList.add('visible');
  }

  function init(cfg) {
    config = cfg;
    if (config.levels) {
      setLevel(config.defaultLevel || 'einfach');
    } else {
      buildDeck();
      showQuestion();
    }
  }

  win.QuizEngine = { init: init };
  win.nextQuestion = nextQuestion;
  win.restartQuiz = restartQuiz;
  win.setLevel = setLevel;
  win.setFilter = setFilter;
})(window, document);
