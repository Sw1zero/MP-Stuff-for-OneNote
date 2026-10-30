/* Quiz-Engine für MP und MT (Quelle: bzwu/.claude/skills/lerntool/basis/quiz.js, verteilt mit sync_basis.py).

   Quiz.init({
     questions: [...],                     // ODER levels: { einfach: [...], schwer: [...] }
     badge: 'Thema',                        // optional, wenn Fragen kein eigenes badge haben
     categories: { labels: {k: 'Text'}, colors: {k: {bg, fg}} },  // optional, Frage hat cat: k
     messages: { excellent, good, poor },   // optional, Unterzeile im Endbildschirm (MT: subMessages {excellent, retry})
   });
   Frage: { question | q, answers | options, correct, explanation, badge?, cat? }
   Antworten werden gemischt, ausser bei ['Wahr', 'Falsch'].
   Markup entsteht in <div id="quiz">, Aussehen nur aus style.css (.q-*).
   Testschnittstelle für pruefe_tools.js: window.LerntoolTest. */
var Quiz = (function () {
  var OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  var NOK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  var cfg, pool, deck, pos, results, level, root;

  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function norm(q) {
    var answers = q.answers || q.options, order = answers.map(function (_, i) { return i; });
    var wf = answers.length === 2 && answers[0] === 'Wahr' && answers[1] === 'Falsch';
    if (!wf) order = shuffle(order);
    var cat = cfg.categories && q.cat;
    return {
      text: q.question || q.q,
      answers: order.map(function (i) { return answers[i]; }),
      correct: order.indexOf(q.correct),
      explanation: q.explanation || '',
      badge: q.badge || (cat ? cfg.categories.labels[q.cat] : cfg.badge) || '',
      color: cat ? cfg.categories.colors[q.cat] : null,
      raw: q
    };
  }

  function build() {
    var levels = cfg.levels ? Object.keys(cfg.levels) : [];
    root.innerHTML =
      (levels.length ? '<div class="q-levels" role="group" aria-label="Stufe">' + levels.map(function (l) {
        return '<button class="q-level" data-level="' + esc(l) + '">' + esc(l.charAt(0).toUpperCase() + l.slice(1)) + '</button>';
      }).join('') + '</div>' : '') +
      '<div class="q-meta"><strong id="qNum"></strong><span id="qScore"></span></div>' +
      '<div class="q-steps" id="qSteps" aria-hidden="true"></div>' +
      '<section class="q-card" id="qCard"><span class="q-badge" id="qBadge"></span><h2 class="q-text" id="qText"></h2>' +
      '<div class="q-answers" id="qAnswers"></div><div class="q-feedback" id="qFeedback" role="status" aria-live="polite"></div></section>' +
      '<section class="q-card q-end" id="qEnd"><div class="q-ring" id="qRing"><div id="qRingText"></div></div>' +
      '<h2 id="qEndTitle"></h2><p id="qEndText"></p><ul class="q-review" id="qReview"></ul>' +
      '<button class="q-btn" id="qRetryWrong">Nur die falschen nochmals</button>' +
      '<button class="q-btn ghost" id="qRestart">Ganzes Quiz neu starten</button></section>' +
      '<div class="q-next" id="qNext"><button class="q-btn" id="qNextBtn">Weiter</button></div>';
    [].forEach.call(root.querySelectorAll('.q-level'), function (b) { b.onclick = function () { setLevel(b.dataset.level); }; });
    el('qNextBtn').onclick = function () { pos++; if (pos < deck.length) show(); else end(); };
    el('qRestart').onclick = function () { start(pool); };
    if (levels.length) setLevel(levels[0]); else start(cfg.questions);
  }

  function setLevel(l) {
    level = l;
    [].forEach.call(root.querySelectorAll('.q-level'), function (b) {
      b.classList.toggle('active', b.dataset.level === l);
      b.setAttribute('aria-pressed', b.dataset.level === l);
    });
    start(cfg.levels[l]);
  }

  function start(list) {
    pool = list;
    deck = shuffle(list).map(norm);
    pos = 0; results = [];
    el('qEnd').classList.remove('show');
    el('qCard').style.display = '';
    show();
  }

  function steps() {
    el('qSteps').innerHTML = deck.map(function (_, i) {
      var c = i < results.length ? (results[i] ? 'ok' : 'nok') : (i === pos ? 'now' : '');
      return '<span class="' + c + '"></span>';
    }).join('');
    var r = results.filter(Boolean).length;
    el('qScore').textContent = results.length ? r + ' von ' + results.length + ' richtig' : '';
  }

  function show() {
    var q = deck[pos], b = el('qBadge');
    el('qNum').textContent = 'Frage ' + (pos + 1) + ' von ' + deck.length;
    b.textContent = q.badge;
    b.style.display = q.badge ? '' : 'none';
    b.style.background = q.color ? q.color.bg : '';
    b.style.color = q.color ? q.color.fg : '';
    el('qText').textContent = q.text;
    el('qFeedback').className = 'q-feedback';
    el('qNext').classList.remove('show');
    el('qAnswers').innerHTML = q.answers.map(function (a, i) {
      return '<button class="q-answer" data-i="' + i + '"><span class="q-letter">' + 'ABCDEF'[i] + '</span><span class="q-answer-text">' + esc(a) +
        '</span><span class="q-icon q-icon-ok">' + OK + '</span><span class="q-icon q-icon-nok">' + NOK + '</span></button>';
    }).join('');
    [].forEach.call(root.querySelectorAll('.q-answer'), function (btn) { btn.onclick = function () { answer(+btn.dataset.i); }; });
    steps();
  }

  function answer(i) {
    var q = deck[pos], ok = i === q.correct, fb = el('qFeedback');
    [].forEach.call(root.querySelectorAll('.q-answer'), function (btn, j) {
      btn.disabled = true;
      btn.classList.add(j === q.correct ? 'is-correct' : j === i ? 'is-wrong' : 'is-dimmed');
    });
    results.push(ok);
    fb.className = 'q-feedback show ' + (ok ? 'ok' : 'nok');
    fb.innerHTML = (ok ? OK : NOK) + '<div><b>' + (ok ? 'Richtig!' : 'Nicht ganz. Richtig ist ' + 'ABCDEF'[q.correct] + '.') +
      '</b><span>' + esc(q.explanation) + '</span></div>';
    el('qNextBtn').textContent = pos === deck.length - 1 ? 'Ergebnis anzeigen' : 'Weiter';
    el('qNext').classList.add('show');
    el('qNextBtn').focus({ preventScroll: true });
    // Erklärung nicht unter dem fixierten Weiter-Knopf verstecken
    fb.scrollIntoView({ block: 'end', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    steps();
  }

  function end() {
    var r = results.filter(Boolean).length, p = Math.round(r / deck.length * 100);
    var m = cfg.messages || {}, sub = cfg.subMessages || {};
    var wrong = deck.filter(function (_, i) { return !results[i]; }).map(function (q) { return q.raw; });
    el('qCard').style.display = 'none';
    el('qNext').classList.remove('show');
    el('qRing').style.setProperty('--p', p);
    el('qRingText').textContent = r + '/' + deck.length;
    el('qEndTitle').textContent = p === 100 ? 'Ausgezeichnet!' : p >= 70 ? 'Gut gemacht!' : 'Noch etwas üben';
    el('qEndText').textContent = p === 100 ? (m.excellent || sub.excellent || 'Alle Fragen richtig.')
      : (p >= 70 ? m.good : m.poor || sub.retry) || 'Diese Fragen lohnen sich nochmals:';
    el('qReview').innerHTML = deck.filter(function (_, i) { return !results[i]; }).map(function (q) { return '<li>' + esc(q.text) + '</li>'; }).join('');
    el('qRetryWrong').style.display = wrong.length ? '' : 'none';
    el('qRetryWrong').onclick = function () { start(wrong); };
    el('qEnd').classList.add('show');
    el('qNum').textContent = 'Ergebnis';
    steps();
  }

  window.LerntoolTest = {
    typ: 'quiz',
    stufen: function () { return cfg.levels ? Object.keys(cfg.levels) : []; },
    setzeStufe: function (l) { setLevel(l); },
    anzahlFragen: function () { return deck.length; },
    anzahlAntworten: function () { return deck[pos].answers.length; },
    richtig: function () { return deck[pos].correct; }
  };

  return {
    init: function (c) {
      cfg = c;
      root = el('quiz');
      build();
    }
  };
})();
