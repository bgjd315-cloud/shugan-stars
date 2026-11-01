// 數感小鎮：畫面與互動
const $app = document.getElementById('app');
const ROUND = 6;
const GAMES = {
  port: { name: '萬數大港', tip: '數到一萬', sem: '三上', need: 0 },
  ship: { name: '千里航道', tip: '四位數加減', sem: '三上', need: 0 },
  fact: { name: '倍數工廠', tip: '拆開來乘', sem: '三上・三下', need: 0 },
  mm: { name: '毫米裁縫島', tip: '量得更準', sem: '三上', need: 0 },
  angle: { name: '角角山', tip: '角和長方形', sem: '三上', need: 0 },
  div: { name: '分分海灘', tip: '除法與餘數', sem: '三上・三下', need: 0 },
  rule: { name: '規律花園', tip: '找出規律', sem: '三上', need: 0 },
  frac: { name: '分數烘焙坊', tip: '幾分之幾', sem: '三上・三下', need: 0 },
  circle: { name: '圓圓天文台', tip: '圓心和半徑', sem: '三上', need: 0 },
  area: { name: '面積牧場', tip: '平方公分', sem: '三下', need: 0 },
  deci: { name: '小數碼頭', tip: '認識 0.1', sem: '三下', need: 0 },
  meas: { name: '量量市集', tip: '公升、公斤、時間', sem: '三下', need: 0 },
};
const availKeys = () => Object.keys(GAMES).filter(k => S.unit >= GAMES[k].need);
const ROUNDS_TO_SAVE = 3; // 每個地方玩幾回合就把居民救回來
const BOSS_ORDER = ['port', 'ship', 'fact', 'div', 'rule', 'frac'];
const ART = ['liang', 'liang_cheer', 'liang_think', 'mimi', 'mimi_happy', 'wanwan', 'piece', 'chest', 'sky_dark', 'sky_bright', 'finale', 'seal', 'turtle', 'octopus', 'crab', 'goat', 'otter', 'bee', 'rabbit', 'fox', 'sheep', 'pelican', 'raccoon', 'isl_port', 'isl_ship', 'isl_fact', 'isl_mm', 'isl_angle', 'isl_div', 'isl_rule', 'isl_frac', 'isl_circle', 'isl_area', 'isl_deci', 'isl_meas'];
const HAS = {}; // 圖還沒收齊時，畫面照樣能玩
const artUrl = n => `assets/${n}.webp`;
const artImg = (n, cls) => HAS[n] ? `<img class="${cls || ''}" src="${artUrl(n)}" alt="">` : '';
const bgStyle = n => HAS[n] ? `background-image:url(${artUrl(n)})` : '';
function preloadArt() {
  return Promise.all(ART.map(n => new Promise(ok => { const i = new Image(); i.onload = () => { HAS[n] = true; ok(); }; i.onerror = () => ok(); i.src = artUrl(n); })));
}

/* ---------- 存檔 ---------- */
const SAVE_KEY = 'shugan3-v1';
function load() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s) return s; } catch (e) {}
  return null;
}
const PIECE_KEYS = ['port', 'ship', 'fact', 'mm', 'angle', 'div', 'rule', 'frac', 'circle']; // 九塊碎片的島，集滿才開最後一關
const S = Object.assign({ stars: 0, unit: 5, sound: true, rec: {}, log: [], opened: false, prog: {}, bossDone: false, bossSeen: false, stamps: {}, fast: {}, learned: {} }, load() || {});
S.unit = 20; // 全部單元開放
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
const rec = g => S.rec[g] || (S.rec[g] = { lv: 0, up: 0, down: 0 });

/* ---------- 小工具 ---------- */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const N = x => `<span class="num">${x}</span>`;
function nums(s) { return String(s).replace(/\d+/g, m => N(m)); } // 文字裡的數字換成數字字型
const sgn = h => (h > 0 ? '+' : '−') + Math.abs(h);
let audio;
function beep(notes) {
  if (!S.sound) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    notes.forEach(([f, t]) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(.12, audio.currentTime + t);
      g.gain.exponentialRampToValueAtTime(.001, audio.currentTime + t + .22);
      o.connect(g).connect(audio.destination);
      o.start(audio.currentTime + t); o.stop(audio.currentTime + t + .24);
    });
  } catch (e) {}
}
const sfx = { good: () => beep([[523, 0], [659, .1], [784, .2]]), ok: () => beep([[523, 0], [659, .1]]), hop: () => beep([[440, 0]]), retry: () => beep([[330, 0]]) };
function speak(text) {
  try {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g, '').replace(/×/g, '乘以').replace(/＋/g, '加').replace(/－/g, '減').replace(/□/g, '多少'));
    u.lang = 'zh-TW'; u.rate = .9;
    speechSynthesis.speak(u);
  } catch (e) {}
}

/* ---------- 注音：直排在國字右邊，家長頁不加 ---------- */
const HAN = /[\u4e00-\u9fff]/;
function bp(r) {
  let s = r || '', top = '', tone = '';
  if (s[0] === '˙') { top = '<i class="qing">˙</i>'; s = s.slice(1); }
  if (/[ˊˇˋ]$/.test(s)) { tone = `<i class="tone">${s.slice(-1)}</i>`; s = s.slice(0, -1); }
  return `<span class="bp" aria-hidden="true">${top}${[...s].map(x => `<span>${x}</span>`).join('')}${tone}</span>`;
}
// 把文字切成一組一組：國字連同注音、緊跟的標點黏在一起，換行才不會讓標點跑到行首
function zyGroups(text) {
  const chars = [...text], rd = new Array(chars.length).fill(null);
  for (let i = 0; i < chars.length; i++) {
    if (rd[i] || !HAN.test(chars[i])) continue;
    const hit = ZY_PHRASE.find(([w]) => chars.slice(i, i + [...w].length).join('') === w);
    if (hit) {
      let k = 0;
      [...hit[0]].forEach((c, j) => { if (HAN.test(c)) rd[i + j] = hit[1][k++]; });
    } else rd[i] = ZY_CHAR[chars[i]] || '';
  }
  const out = [];
  chars.forEach((c, i) => {
    if (HAN.test(c)) out.push(`<span class="zc">${c}${bp(rd[i])}</span>`);
    else if (/[，。！？、：；）」⋯…]/.test(c) && out.length && out[out.length - 1].endsWith('</span>')) out[out.length - 1] = out[out.length - 1].replace(/<\/span>$/, esc(c) + '</span>');
    else out.push(esc(c));
  });
  return out;
}
function annotate(root) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [];
  while (w.nextNode()) {
    const n = w.currentNode, el = n.parentElement;
    if (HAN.test(n.nodeValue) && !el.closest('.zc, .parent, text')) nodes.push(n);
  }
  nodes.forEach(n => {
    const t = document.createElement('template');
    t.innerHTML = zyGroups(n.nodeValue).join('');
    n.replaceWith(t.content);
  });
}
const plainText = el => { const c = el.cloneNode(true); c.querySelectorAll('.bp').forEach(b => b.remove()); return c.textContent; };

/* ---------- 回合 ---------- */
let R = null; // 目前這一回合
function startRound(game, opts) {
  const boss = game === 'boss', daily = game === 'daily';
  const order = boss ? BOSS_ORDER : daily ? dailyOrder() : null;
  R = { game: order ? order[0] : game, chapter: game, boss, daily, order, fixedLv: opts && opts.lv, i: 0, grades: [], earned: 0, q: null, tries: 0 };
  nextQ();
}
function nextQ() {
  if (!R) return go('');
  if (R.i >= ROUND) return endRound();
  if (R.order) R.game = R.order[R.i];
  let q, guard = 0;
  do { q = Logic.gen(R.game, R.fixedLv !== undefined ? R.fixedLv : rec(R.game).lv, S.unit); } while (R.lastKey === JSON.stringify(q) && guard++ < 8);
  R.lastKey = JSON.stringify(q);
  R.q = q; R.tries = 0;
  VIEWS[R.game](q);
}
// 一題結束：grade 2 第一次就很棒、1 第二次或差一點、0 沒答出來
const reveal = sel => setTimeout(() => { const e = document.querySelector(sel); if (e) e.scrollIntoView({ block: 'nearest' }); }, 40); // 等注音排好才捲動，字變高才不會又把按鈕擠出去
function finish(grade, detail, msgHtml) {
  const r = rec(R.game);
  if (R.fixedLv === undefined) Logic.adjust(r, grade, Logic.maxLevel(R.game, S.unit)); // 練習場不動等級
  if (R.q && (R.q.kind === 'frac' || R.q.kind === 'deci')) { const fk = R.q.kind + ':' + R.q.mode; S.fast[fk] = grade === 2 ? (S.fast[fk] || 0) + 1 : 0; } // 熟練紀錄
  R.grades.push(grade); R.earned += grade * 25; S.stars += grade * 25;
  S.log.push({ g: R.game, lv: r.lv, gr: grade, d: detail, t: Date.now() });
  if (S.log.length > 300) S.log = S.log.slice(-300);
  save();
  if (grade === 2) sfx.good(); else if (grade === 1) sfx.ok();
  setMsg(msgHtml, grade ? 'good' : 'hint');
  R.i++;
  const a = document.getElementById('actions');
  a.innerHTML = `<button class="btn" id="next">${R.i >= ROUND ? '看成果' : '下一題'}</button>`;
  document.getElementById('next').onclick = nextQ;
  document.querySelectorAll('.keypad, .entry').forEach(x => { x.style.display = 'none'; }); // 答完收起鍵盤，下一題才不會被擠到畫面外
  reveal('#actions');
}
function setMsg(html, cls) {
  const m = document.getElementById('msg');
  if (m) { m.className = 'msg ' + (cls || ''); m.innerHTML = html; }
}
function semOf(q) { // 這一題屬於哪一學期
  if (!q) return '';
  if (['area', 'deci', 'meas'].includes(q.kind)) return '三下';
  if ((q.kind === 'fact' && q.mode === 'two') || (q.kind === 'div' && ['split', 'missing'].includes(q.mode)) || (q.kind === 'frac' && ['cmp', 'add', 'sub'].includes(q.mode))) return '三下';
  return '三上';
}
function frame(promptHtml, stageHtml, extra) {
  const dots = Array.from({ length: ROUND }, (_, i) => `<i class="${i < R.grades.length ? 'g' + R.grades[i] : i === R.i ? 'now' : ''}"></i>`).join('');
  $app.innerHTML = `
    <div class="top">
      <button class="icon-btn" id="home" aria-label="回小鎮">⌂</button>
      <div class="dots">${dots}</div><span class="sem">${semOf(R.q)}</span>
      <button class="icon-btn" id="say" aria-label="唸題目">🔊</button>
    </div>
    <div class="say-row">${artImg(R.boss ? 'mimi' : R.daily ? 'liang' : STORY[R.game].who, 'say-who')}<div class="prompt" id="prompt">${promptHtml}</div></div>
    <div class="stage" id="stage">${stageHtml}</div>
    <div class="msg" id="msg"></div>
    ${extra || ''}
    <div class="actions" id="actions"></div>`;
  document.getElementById('home').onclick = () => { R = null; go(''); };
  document.getElementById('say').onclick = () => speak(plainText(document.getElementById('prompt')));
}
function endRound() {
  const ch = R.chapter, boss = R.boss;
  let beat = null;
  if (R.daily) S.stamps[today()] = 1;
  if (boss) { if (!S.bossDone) { S.bossDone = true; S.stars = Math.max(S.stars, 10000); beat = 'ending'; } }
  else if (STORY[ch] && R.fixedLv === undefined) {
    const before = S.prog[ch] || 0;
    if (before < ROUNDS_TO_SAVE) { S.prog[ch] = before + 1; beat = STORY[ch].beats[before + 1]; }
  }
  save();
  const praise = boss ? '你陪萬萬算完了最後一次。' : R.daily ? '今天的任務完成了，蓋一個章！' : R.fixedLv !== undefined ? '多練一次，就更有感覺。' : '這座島又亮了一點。';
  $app.innerHTML = `<div class="end pop">
    ${artImg('liang_cheer', 'end-hero')}
    <h2>夜空多亮了 ${N(R.earned)} 顆星</h2>
    <p>${praise}</p>
    <div class="actions" id="endActs"></div></div>`;
  const a = document.getElementById('endActs');
  if (beat) {
    a.innerHTML = '<button class="btn" id="cont">看故事</button>';
    document.getElementById('cont').onclick = () => {
      if (beat === 'ending') return playEnding();
      const n = S.prog[ch], after = () => { R = null; if (n >= ROUNDS_TO_SAVE) return showClue(ch); go(''); };
      comic(STORY[ch].bg, beat, after);
    };
    return;
  }
  a.innerHTML = '<button class="btn" id="again">再玩一回</button><button class="btn alt" id="back">回小鎮</button>';
  document.getElementById('again').onclick = () => startRound(ch, R.fixedLv !== undefined ? { lv: R.fixedLv } : undefined);
  document.getElementById('back').onclick = () => { R = null; go(''); };
}

/* ---------- 故事畫面 ---------- */
function typeInto(el, text) {
  // 一個字一個字出現；再按一次就全部顯示
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.innerHTML = zyGroups(text).map(g => `<span class="${/^\d$/.test(g) ? 'num ' : ''}ch">${g}</span>`).join('');
  const chars = [...el.children];
  let i = 0, timer = null;
  const finish = () => { clearInterval(timer); timer = null; chars.forEach(c => c.classList.add('on')); };
  if (reduce) finish(); else timer = setInterval(() => { if (i >= chars.length) return finish(); chars[i++].classList.add('on'); }, 42);
  return { typing: () => timer !== null, finish };
}
function comic(bg, lines, then, opts) {
  let i = 0, typer = null;
  function next() {
    if (typer && typer.typing()) return typer.finish();
    try { speechSynthesis.cancel(); } catch (e) {}
    if (++i < lines.length) show(); else leave();
  }
  function leave() { document.body.classList.remove('in-cine'); then(); }
  function show() {
    const [who, name, text, lineBg] = lines[i];
    const b = lineBg && HAS[lineBg] ? lineBg : bg, misty = b === 'town_fog' || b === 'fog_cave';
    document.body.classList.add('in-cine');
    $app.innerHTML = `<div class="cine" id="cine">
      <div class="cine-blur" style="${bgStyle(b)}"></div>
      <div class="scene" style="${bgStyle(b)}">${misty ? '<div class="drift d1"></div><div class="drift d2"></div>' : ''}${who ? artImg(who, 'scene-who rise') : ''}</div>
      <div class="bubble ${who ? '' : 'narr'}">${name ? `<b>${name}</b>` : ''}<p id="line"></p></div>
      <div class="cine-acts">
        <button class="icon-btn" id="say" aria-label="唸出來">🔊</button>
        <button class="btn" id="go">${i + 1 < lines.length ? '繼續' : (opts && opts.last) || '好！'}</button>
        ${opts && opts.skip ? '<button class="skip" id="skip">跳過</button>' : ''}
      </div></div>`;
    typer = typeInto(document.getElementById('line'), text);
    document.getElementById('say').onclick = e => { e.stopPropagation(); speak(text); };
    document.getElementById('go').onclick = e => { e.stopPropagation(); next(); };
    if (opts && opts.skip) document.getElementById('skip').onclick = e => { e.stopPropagation(); leave(); };
    document.getElementById('cine').onclick = next;
  }
  show();
}
function playEnding() {
  let i = 0;
  (function step() {
    if (i >= BOSS.ending.length) { R = null; return go(''); }
    const e = BOSS.ending[i++];
    comic(e.bg, [e.who], step);
  })();
}
function showClue(ch) {
  const c = STORY[ch].clue;
  $app.innerHTML = `<div class="end pop">
    ${artImg('piece', 'clue-big')}
    <h2>找到了！</h2><p><b>${c.name}</b><br>${c.text}</p>
    <div class="actions"><button class="btn" id="ok">收進星星本</button></div></div>`;
  document.getElementById('ok').onclick = () => go('');
}
function viewClues() {
  $app.innerHTML = `<div class="top"><button class="icon-btn" id="home" aria-label="回小鎮">⌂</button><h2 class="page-h">星星本</h2></div>
    <p class="tag">碎片上的字，排起來是什麼？</p>
    <div class="clues">${availKeys().map(k => {
      const has = (S.prog[k] || 0) >= ROUNDS_TO_SAVE, c = STORY[k].clue;
      return `<div class="clue ${has ? '' : 'off'}">${has ? artImg('piece', 'clue-img') : '<div class="clue-q">？</div>'}<div><b>${has ? c.name : '還沒找到'}</b><small>${has ? c.text : `幫${STORY[k].whoName}的忙就會找到`}</small></div></div>`;
    }).join('')}</div>`;
  document.getElementById('home').onclick = () => go('');
}
const today = () => new Date().toLocaleDateString('sv');
// 每日任務：挑最近最常卡住的遊戲，再混入其他遊戲複習
function dailyOrder() {
  const keys = availKeys();
  const miss = k => S.log.filter(x => x.g === k).slice(-12).filter(x => x.gr < 2).length;
  const sorted = keys.slice().sort((a, b) => miss(b) - miss(a) || Math.random() - .5);
  return Logic.shuffle([sorted[0], sorted[0], sorted[1], sorted[1], ...Logic.shuffle(sorted.slice(2)).slice(0, 2)]);
}
function practiceTopics() {
  const u = S.unit, T = [
    ['port', 1, '數線：幾千幾百', 1], ['port', 2, '讀寫四位數', 1], ['port', 3, '比大小', 1], ['port', 4, '位值換算', 1], ['port', 5, '數線：四位數', 1],
    ['ship', 1, '加 1999 想成加 2000', 1], ['ship', 2, '減 1999 想成減 2000', 1], ['ship', 3, '算式心算', 2], ['ship', 4, '整百估算', 2],
    ['fact', 0, '幾十乘以一位數', 3], ['fact', 2, '二位數拆開乘', 3], ['fact', 3, '三位數拆開乘', 3], ['fact', 4, '乘法估算', 3], ['fact', 5, '兩步驟', 14],
    ['mm', 1, '讀毫米', 4], ['mm', 2, '剪出毫米', 4], ['mm', 3, '公分換毫米', 4], ['mm', 4, '毫米換公分', 4], ['mm', 5, '長度量感', 4],
    ['angle', 0, '比角的大小', 1], ['angle', 2, '銳角、直角、鈍角', 5], ['angle', 3, '正方形和長方形', 5],
    ['div', 1, '除法', 6], ['div', 2, '有餘數的除法', 6], ['div', 3, '偶數和奇數', 6], ['div', 5, '先分大的再分小的', 11], ['div', 6, '找出 □', 18],
    ['rule', 0, '每次多多少', 1], ['rule', 1, '每次少多少', 1], ['rule', 3, '相差會變', 7], ['rule', 4, '花瓣規律', 7],
    ['frac', 1, '幾分之幾', 8], ['frac', 2, '做出分數', 8], ['frac', 3, '分數累加', 8], ['frac', 4, '同分母比大小', 17], ['frac', 5, '分數加法', 17], ['frac', 6, '分數減法', 17],
    ['circle', 1, '半徑和直徑', 9], ['circle', 2, '半徑的 2 倍', 9],
    ['area', 1, '數格子', 15], ['area', 3, '缺一角的面積', 15], ['area', 4, '三角形是一半', 15],
    ['deci', 1, '幾個 0.1', 19], ['deci', 2, '小數比大小', 19], ['deci', 4, '小數加減', 19],
    ['meas', 0, '公升和毫升', 12], ['meas', 2, '容量、時間、重量換算', 13],
  ];
  return T.filter(t => u >= t[3]);
}
function viewPractice() {
  const groups = availKeys().map(k => {
    const ts = practiceTopics().filter(t => t[0] === k);
    return ts.length ? `<h3 class="pg-h">${GAMES[k].name}<span class="sem">${GAMES[k].sem}</span></h3><div class="pg">${ts.map(t => `<button class="pg-btn" data-g="${t[0]}" data-l="${t[1]}"><span class="sem">${t[3] >= 11 ? '三下' : '三上'}</span>${nums(t[2])}</button>`).join('')}</div>` : '';
  }).join('');
  $app.innerHTML = `<div class="top"><button class="icon-btn" id="home" aria-label="回小鎮">⌂</button><h2 class="page-h">練習場</h2></div><p class="tag">想多練哪一個？</p><h3 class="pg-h">單位的量感</h3><div class="pg">${Object.entries(LESSONS).map(([k, L]) => `<button class="pg-btn" data-ud="${k}"><span class="sem">${L.sem}</span>${L.title}</button>`).join("")}</div>${groups}`;
  document.getElementById('home').onclick = () => go('');
  document.querySelectorAll('.pg-btn[data-g]').forEach(b => b.onclick = () => startRound(b.dataset.g, { lv: +b.dataset.l }));
  document.querySelectorAll('[data-ud]').forEach(b => b.onclick = () => runDrill(b.dataset.ud, viewPractice));
}
function enter(ch) {
  if (ch === 'boss') {
    if (!S.bossSeen) { S.bossSeen = true; save(); return comic(BOSS.bg, BOSS.intro, () => startRound('boss')); }
    return startRound('boss');
  }
  lessonsThen(ch, () => {
    if (!S.prog[ch]) return comic(STORY[ch].bg, STORY[ch].beats[0], () => startRound(ch));
    startRound(ch);
  });
}

/* ---------- 鍵盤 ---------- */
function keypadHtml() {
  return `<div class="entry num" id="entry"><span class="blank">？</span></div><div class="keypad">
    ${[1, 2, 3, 4, 5].map(d => `<button class="num" data-k="${d}">${d}</button>`).join('')}<button data-k="del" aria-label="刪除">⌫</button>
    ${[6, 7, 8, 9, 0].map(d => `<button class="num" data-k="${d}">${d}</button>`).join('')}<button class="go" data-k="ok" aria-label="確定">✓</button></div>`;
}
function bindKeypad(onOk) {
  let val = '';
  const show = () => { document.getElementById('entry').innerHTML = val || '<span class="blank">？</span>'; };
  document.querySelectorAll('.keypad button').forEach(b => {
    b.onclick = () => {
      const k = b.dataset.k;
      if (k === 'del') val = val.slice(0, -1);
      else if (k === 'ok') { if (val) onOk(+val, () => { val = ''; show(); }); else { setMsg('先按數字，再按打勾。', 'hint'); sfx.retry(); } return; }
      else if (val.length < 5) val = (val + k).replace(/^0+(?=\d)/, '');
      show();
    };
  });
}
function lockKeypad() { document.querySelectorAll('.keypad button').forEach(b => { b.disabled = true; b.style.opacity = .35; }); }

/* ---------- 尋寶數線 ---------- */
const LX0 = 30, LX1 = 610;
function lineSvg(a, b, s, labels) {
  const X = v => LX0 + (v - a) / (b - a) * (LX1 - LX0);
  let ticks = '';
  for (let v = a; v <= b; v += s) {
    const big = labels.includes(v) || v % (s * 5) === 0;
    ticks += `<path d="M${X(v)} ${big ? 90 : 96}v${big ? 26 : 14}" stroke="#33405a" stroke-width="${big ? 3 : 2}"/>`;
  }
  const size = labels.length > 6 ? (labels[labels.length - 1] >= 1000 ? 15 : 20) : 27;
  const text = labels.map(m => `<text x="${X(m)}" y="146" text-anchor="middle" font-size="${size}">${m}</text>`).join('');
  return `<div class="line-wrap" id="lw"><svg viewBox="0 0 640 160"><g id="seg"></g>
    <path d="M${LX0} 103H${LX1}" stroke="#33405a" stroke-width="5" stroke-linecap="round"/>${ticks}${text}
    <g id="truth"></g><g id="pin" style="display:none"></g></svg></div>`;
}
function viewLine(q) {
  if (q.mode === 'read') return viewLineRead(q);
  let st = { a: q.a, b: q.b, s: q.steps[0], first: true }, stageWrong = 0;
  const X = v => LX0 + (v - st.a) / (st.b - st.a) * (LX1 - LX0);
  function labels() {
    if (!st.first || (st.b - st.a) / st.s <= 10) { const out = []; for (let v = st.a; v <= st.b; v += st.s) out.push(v); return out; }
    if (!q.labelAll) return q.marks;
    const out = []; for (let v = q.a; v <= q.b; v += st.s) out.push(v); return out;
  }
  function stage() {
    const exact = q.v % st.s === 0;
    const prompt = exact ? `貨櫃編號 ${N(q.v)}！<br>點 ${N(q.v)} 的刻度。`
      : `貨櫃編號 ${N(q.v)}！<br>${st.first ? '先看千位，它在哪一段？' : '再看下一位，它在哪一段？'}`;
    frame(prompt, lineSvg(st.a, st.b, st.s, labels()) + (st.first ? '' : `<div class="trail">${nums(`放大看 ${st.a} 到 ${st.b}，一小格是 ${st.s}`)}</div>`));
    const wrap = document.getElementById('lw');
    let pick = null, active = true, down = false;
    const setFrom = e => {
      const r = wrap.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 640;
      const raw = st.a + (Math.max(LX0, Math.min(LX1, x)) - LX0) / (LX1 - LX0) * (st.b - st.a);
      if (exact) { pick = st.a + Math.round((raw - st.a) / st.s) * st.s; drawPin(X(pick), '#3b82c4'); }
      else {
        pick = Math.min(st.a + Math.floor((raw - st.a) / st.s) * st.s, st.b - st.s);
        document.getElementById('seg').innerHTML = `<rect x="${X(pick)}" y="78" width="${X(pick + st.s) - X(pick)}" height="50" rx="3" fill="#ffd65a"/>`;
      }
      document.getElementById('dig').disabled = false;
    };
    wrap.onpointerdown = e => { if (active) { down = true; setFrom(e); } };
    wrap.onpointermove = e => { if (active && down) setFrom(e); };
    window.onpointerup = () => { down = false; };
    const acts = document.getElementById('actions');
    acts.innerHTML = `<button class="btn" id="dig" disabled>${exact ? '放這裡' : '放大看看'}</button>`;
    const zoom = () => { const a = Math.floor(q.v / st.s) * st.s; st = { a, b: a + st.s, s: st.s / 10, first: false }; stageWrong = 0; stage(); };
    document.getElementById('dig').onclick = () => {
      const right = exact ? pick === q.v : pick === Math.floor(q.v / st.s) * st.s;
      if (right) {
        if (!exact) { sfx.ok(); return zoom(); }
        active = false;
        document.getElementById('pin').innerHTML = `<circle cx="${X(q.v)}" cy="103" r="8" fill="#3b82c4"/>`;
        drawTruth(X(q.v), q.v);
        return finish(R.tries === 0 ? 2 : R.tries === 1 ? 1 : 0, 'place', nums(`放對了！就是 ${q.v}！`));
      }
      R.tries++; stageWrong++; sfx.retry();
      const hint = exact ? nums(`你插在 ${pick}，${q.v} 比它${q.v > pick ? '大，再往右' : '小，再往左'}。一小格是 ${st.s}。`)
        : nums(`這一段是 ${pick} 到 ${pick + st.s}。${q.v} 比 ${q.v > pick ? pick + st.s : pick} ${q.v > pick ? '大，再往右' : '小，再往左'}。`);
      if (stageWrong < 2) return setMsg(hint, 'hint');
      active = false;
      if (exact) {
        document.getElementById('pin').innerHTML = `<circle cx="${X(pick)}" cy="103" r="8" fill="#3b82c4"/>`;
        drawTruth(X(q.v), q.v);
        return finish(0, { wrong: pick, ans: q.v }, nums(`貨櫃在這裡：${q.v}。`));
      }
      const a = Math.floor(q.v / st.s) * st.s;
      document.getElementById('seg').innerHTML = `<rect x="${X(a)}" y="78" width="${X(a + st.s) - X(a)}" height="50" rx="3" fill="#ffd65a"/>`;
      setMsg(nums(`${q.v} 在 ${a} 到 ${a + st.s} 這一段。`), 'hint');
      acts.innerHTML = '<button class="btn" id="dig">放大看看</button>';
      document.getElementById('dig').onclick = zoom;
    };
  }
  stage();
}
function viewLineRead(q) {
  const X = v => LX0 + (v - q.a) / (q.b - q.a) * (LX1 - LX0);
  frame(`船長的旗子插在這裡，<br>是多少？一小格是 ${N(q.unit)}。`, lineSvg(q.a, q.b, q.unit, q.marks));
  drawPin(X(q.v), '#d6476b');
  document.getElementById('actions').innerHTML = `<div class="choices">${q.options.map(o => `<button class="choice num" data-o="${o}">${o}</button>`).join('')}</div>`;
  document.querySelectorAll('.choice').forEach(b => {
    b.onclick = () => {
      const o = +b.dataset.o;
      if (o === q.v) return finish(R.tries === 0 ? 2 : R.tries === 1 ? 1 : 0, 'read', nums(`對了！就是 ${q.v}。`));
      R.tries++; b.classList.add('no'); b.disabled = true; sfx.retry();
      setMsg(nums(`${o} 應該在${o > q.v ? '更右邊' : '更左邊'}。從最近的標記開始，一格一格數。`), 'hint');
    };
  });
}
function nearestMark(q) {
  return q.marks.reduce((a, b) => Math.abs(b - q.v) < Math.abs(a - q.v) ? b : a);
}
function drawPin(x, color) {
  const p = document.getElementById('pin'); p.style.display = '';
  p.innerHTML = `<path d="M${x} 103V34" stroke="${color}" stroke-width="4"/><path d="M${x} 34l34 12-34 12z" fill="${color}"/><circle cx="${x}" cy="103" r="7" fill="${color}"/>`;
}
function drawTruth(x, v) {
  document.getElementById('truth').innerHTML = `<g class="pop" style="transform-box:fill-box;transform-origin:center">${HAS.chest ? `<image href="${artUrl('chest')}" x="${x - 32}" y="30" width="64" height="64"/>` : `<path d="M${x} 103l-13-30h26z" fill="#f5a524"/>`}<text x="${x}" y="26" text-anchor="middle" font-size="28" style="fill:#c9740c">${v}</text></g>`;
}

/* ---------- 共用：一步一步輸入、選一個 ---------- */
function stepKeypad(asks, steps, why, doneMsg, detail, onStep, opts) {
  // opts.shortcut：前面幾步只是幫忙拆解，直接答出最後答案也算對
  let step = 0;
  const many = steps.length > 1, last = steps.length - 1;
  const ask = () => { const a = document.getElementById('ask'); if (a) a.innerHTML = nums((many ? `第 ${step + 1} 步，共 ${steps.length} 步：` : '') + asks[step]); };
  ask();
  const done = () => { lockKeypad(); finish(R.tries === 0 ? 2 : R.tries === 1 ? 1 : 0, detail, nums(doneMsg)); };
  bindKeypad((val, clear) => {
    if (val === steps[step] || (opts && opts.shortcut && val === steps[last])) {
      sfx.ok(); clear();
      if (val === steps[last] && (step === last || (opts && opts.shortcut))) return done();
      step++; ask(); if (onStep) onStep(step);
      return setMsg(nums(`對了，是 ${val}。接著算下一步。`), 'good');
    }
    R.tries++; sfx.retry(); clear();
    const head = many ? `你按的 ${val} 不是這一步的答案。` : `你按的 ${val} 不對喔。`;
    if (R.tries <= 2) return setMsg(nums(`${head}${why}`), 'hint');
    lockKeypad();
    finish(0, { wrong: val, ans: steps[step] }, nums(`這一步是 ${steps[step]}，最後答案是 ${steps[last]}。${why}`));
  });
}
function pickOne(html, right, why, ok, detail) {
  document.getElementById('actions').innerHTML = `<div class="choices ${html[0].includes('class="pv"') ? 'col' : ''}">${html.map((h, i) => `<button class="choice" data-i="${i}">${h}</button>`).join('')}</div>`;
  document.querySelectorAll('[data-i]').forEach(b => {
    b.onclick = () => {
      if (+b.dataset.i === right) return finish(R.tries === 0 ? 2 : R.tries === 1 ? 1 : 0, detail, nums(ok));
      R.tries++; b.classList.add('no'); b.disabled = true; sfx.retry();
      if (R.tries >= 2) { document.querySelectorAll('[data-i]').forEach(x => x.disabled = true); return finish(0, { wrong: b.textContent.slice(0, 12), ans: right }, nums(ok)); }
      setMsg(nums(why), 'hint');
    };
  });
}
const numBtn = v => `<span class="num">${v}</span>`;

/* ---------- 看得到的數：定位板與積木 ---------- */
function placeBoard(n, cols) {
  const names = cols || ['千', '百', '十', '一'], ds = String(n).padStart(names.length, ' ').split('');
  return `<table class="pv"><tr>${names.map((x, i) => `<th class="c${i}">${x}</th>`).join('')}</tr><tr>${ds.map((d, i) => `<td class="num c${i}">${d === ' ' ? '' : d}</td>`).join('')}</tr></table>`;
}
function blocks(k, h, t, o) {
  const cap = (n, cls) => '<i class="' + cls + '"></i>'.repeat(1) + ('<i class="' + cls + '"></i>').repeat(Math.max(0, n - 1));
  return `<div class="blocks">${k ? `<span class="bgroup">${cap(k, 'k1000')}</span>` : ''}${h ? `<span class="bgroup">${cap(h, 'k100')}</span>` : ''}${t ? `<span class="bgroup">${cap(t, 'k10')}</span>` : ''}${o ? `<span class="bgroup">${cap(o, 'k1')}</span>` : ''}</div>`;
}

/* ---------- 一：萬數大港 ---------- */
function viewPort(q) {
  if (q.mode === 'place') return viewLine(q);
  if (q.mode === 'word') {
    frame(`貨櫃單上寫著「${q.word}」，<br>是哪一個號碼？`, `<div class="trail">幾千、幾百、幾十、幾，一段一段聽</div>`);
    return pickOne(q.options.map(o => placeBoard(o)), q.options.indexOf(q.v), '一位一位對：唸到「零」表示那一位是 0。', `對了！${q.word}就是 ${q.v}。`, 'word');
  }
  if (q.mode === 'cmp') {
    frame('哪一堆貨櫃比較多？<br>從最左邊的千位開始比。', `<div class="vs">${placeBoard(q.l)}<span>和</span>${placeBoard(q.r)}</div>`);
    const a = q.l > q.r ? '＞' : q.l < q.r ? '＜' : '＝';
    return pickOne(['＞', '＝', '＜'].map(numBtn), ['＞', '＝', '＜'].indexOf(a), '千位一樣再比百位，百位一樣再比十位。', `對了！${q.l} ${a} ${q.r}。`, 'cmp');
  }
  let k = q.k, h = q.h, t = q.t;
  frame(`碼頭上有 ${q.text} 的貨，<br>共有多少？`, `<div id="bk"></div><div class="trade" id="tr"></div><div class="trail" id="ask"></div>`, keypadHtml());
  const draw = () => {
    document.getElementById('bk').innerHTML = blocks(k, h, t, 0) + placeBoard(k * 1000 + h * 100 + t * 10).replace(/<td class="num c(\d)">[^<]*<\/td>/g, (m, i) => `<td class="num c${i}">${[k, h, t, 0][+i] > 9 ? [k, h, t, 0][+i] : ([k, h, t, 0][+i] || '')}</td>`);
    document.getElementById('tr').innerHTML = `<button id="t1" ${t >= 10 ? '' : 'disabled'}>${nums('10個十→1個百')}</button><button id="t2" ${h >= 10 ? '' : 'disabled'}>${nums('10個百→1個千')}</button>`;
    document.getElementById('t1').onclick = () => { t -= 10; h++; sfx.hop(); draw(); };
    document.getElementById('t2').onclick = () => { h -= 10; k++; sfx.hop(); draw(); };
  };
  draw();
  stepKeypad(['共有多少？'], [q.ans], `按黃色按鈕換一換，定位板每格都不超過 9，就讀得出來了。`, `對了！就是 ${q.ans}。`, 'trade');
}

/* ---------- 二：千里航道 ---------- */
function routeSvg(q, pos, hideEnd) {
  const pts = [q.s, pos, ...(hideEnd ? [] : [q.t])], lo = Math.min(...pts), hi = Math.max(...pts), pad = Math.max(40, (hi - lo) * .12);
  const X = v => 26 + (v - (lo - pad)) / (hi - lo + 2 * pad) * 588;
  return `<svg class="route" viewBox="0 0 640 92"><path d="M10 58H630" stroke="#3b82c4" stroke-width="10" stroke-linecap="round" opacity=".28"/>
    <circle cx="${X(q.s)}" cy="58" r="7" fill="#77809a"/><text x="${X(q.s)}" y="88" text-anchor="middle" font-size="20" style="fill:#77809a">${q.s}</text>
    ${hideEnd ? '' : `<path d="M${X(q.t)} 58V26l22 8-22 8" fill="#d6476b" stroke="#d6476b" stroke-width="3"/><text x="${X(q.t)}" y="88" text-anchor="middle" font-size="20" style="fill:#d6476b">${q.t}</text>`}
    <text x="${X(pos)}" y="56" text-anchor="middle" font-size="34">⛵</text></svg>`;
}
function viewShip(q) {
  if (q.mode === 'est') {
    const parts = q.text.split(/[＋－]/).map(Number), plus = q.text.includes('＋'), near = parts.map(x => Math.round(x / 100) * 100);
    frame('出海前先估一估：<br>答案大約是多少？', `<div class="fill-text num">${esc(q.text)}</div><div class="est">${parts.map((p, i) => `<span class="est-b"><b class="num">${p}</b><i>↓</i><b class="num near">？</b></span>`).join(`<em>${plus ? '＋' : '－'}</em>`)}</div><div class="trail">${nums('每個數先想成最接近的整百')}</div>`);
    return pickOne(q.options.map(numBtn), q.options.indexOf(q.ans), `${parts[0]} 最接近 ${near[0]}，${parts[1]} 最接近 ${near[1]}。`, `${q.why}大約是 ${q.ans}。`, 'est');
  }
  const expr = q.mode === 'expr', name = ['千', '百', '十', '一'];
  frame(expr ? `船要開到 ${N(q.expr)} 的答案那裡。` : `船在 ${N(q.s)} 號浮標，<br>開到 ${N(q.t)} 號，最少幾段？`,
    `<div id="rt"></div><div class="odo" id="odo"></div><div class="trail" id="trail">還沒出發</div>`);
  let pos = q.s, done = false; const path = [];
  const draw = () => {
    document.getElementById('rt').innerHTML = routeSvg(q, pos, expr);
    const ds = String(pos).padStart(4, '0').slice(-4);
    document.getElementById('odo').innerHTML = [1000, 100, 10, 1].map((h, i) => `<div class="wheel c${i}"><button class="num" data-h="${h}" aria-label="加 ${h}">+${h}</button><b class="num">${ds[i]}</b><small>${name[i]}</small><button class="num dn" data-h="${-h}" aria-label="減 ${h}">−${h}</button></div>`).join('');
    document.getElementById('trail').innerHTML = path.length ? nums(path.map(sgn).join(' ') + `（${path.length} 段）`) : '還沒出發';
    document.querySelectorAll('#odo [data-h]').forEach(b => { if (done) { b.disabled = true; b.style.opacity = .35; } b.onclick = () => go(+b.dataset.h); });
  };
  const settle = () => {
    if (pos !== q.t) return false;
    done = true; draw();
    const g = path.length <= q.par ? 2 : 1;
    finish(g, { extra: path.length - q.par, s: q.s, t: q.t }, g === 2 ? nums(`到了！${path.length} 段，已經最短了！`) : nums(`到了！還可以更短：${q.best.map(sgn).join(' ')}（${q.par} 段）。`));
    return true;
  };
  const go = h => {
    if (done) return;
    const n = pos + h;
    if (n < 0 || n > 11000) return setMsg('開太遠了，換一條航線。', 'hint');
    pos = n; path.push(h); sfx.hop(); setMsg(''); draw();
    if (!expr) settle();
  };
  draw();
  document.getElementById('actions').innerHTML = `<button class="btn alt" id="undo">退一步</button>${expr ? '<button class="btn" id="arrive">到了</button>' : ''}`;
  document.getElementById('undo').onclick = () => { if (done || !path.length) return; pos -= path.pop(); draw(); };
  if (expr) document.getElementById('arrive').onclick = () => {
    if (settle()) return;
    R.tries++; sfx.retry();
    if (R.tries === 1) return setMsg(nums(`現在在 ${pos}。看算式：要${q.expr.includes('＋') ? '加' : '減'}多少？可以先開整數，再退回來。`), 'hint');
    done = true; draw(); finish(0, { wrong: pos, ans: q.t }, nums(`${q.expr}＝${q.t}。可以這樣開：${q.best.map(sgn).join(' ')}。`));
  };
}

/* ---------- 三：倍數工廠 ---------- */
function viewFact(q) {
  if (q.mode === 'est') {
    frame(`${N(q.a + '×' + q.b)} 大約是多少？`, '<div class="trail">不用算到個位，估一估就好</div>');
    return pickOne(q.options.map(numBtn), q.options.indexOf(q.ans), '先把被乘數想成整百。', q.why, 'est');
  }
  if (q.mode === 'two') {
    frame(q.head, '<div class="trail" id="ask"></div>', keypadHtml());
    return stepKeypad(q.asks, q.steps, q.why, `對了！答案是 ${q.steps[q.steps.length - 1]}。`, 'two', null, { shortcut: true });
  }
  const row = q.parts.map((p, i) => `<span class="fbar p${i}" style="flex:${Math.max(p, q.a * .16)}">${'<span class="num">' + p + '</span>'}</span>`).join('');
  frame(`每條生產線做 ${N(q.a)} 個，<br>有 ${N(q.b)} 條，共幾個？`, `<div class="lines" id="lines">${Array.from({ length: q.b }, () => `<div class="fbars">${row}</div>`).join('')}</div><div class="trail" id="ask"></div>`, keypadHtml());
  const asks = q.parts.map(p => `${q.b} 條的 ${p}：${p}×${q.b}＝？`), steps = q.parts.map(p => p * q.b);
  if (q.parts.length > 1) { asks.push(`全部加起來：${steps.join('＋')}＝？`); steps.push(q.ans); }
  const lit = i => document.querySelectorAll('#lines .fbar').forEach(b => b.classList.toggle('lit', i >= q.parts.length || b.classList.contains('p' + i)));
  lit(0);
  stepKeypad(asks, steps, q.why, `對了！${q.a}×${q.b}＝${q.ans}。`, 'split', lit, { shortcut: true });
}

/* ---------- 四：毫米裁縫島 ---------- */
function rulerSvg(range, mm, showBar) {
  const X = v => 20 + v / range * 600;
  let t = '';
  for (let i = 0; i <= range; i++) {
    const c = i % 10 === 0, f = i % 5 === 0;
    t += `<path d="M${X(i)} 62v${c ? 30 : f ? 22 : 13}" stroke="#33405a" stroke-width="${c ? 3 : 1.4}"/>`;
    if (c) t += `<text x="${X(i)}" y="118" text-anchor="middle" font-size="26">${i / 10}</text>`;
  }
  return `<div class="line-wrap" id="lw"><svg viewBox="0 0 640 126"><rect id="ribbon" x="${X(0)}" y="26" width="${showBar ? X(mm) - X(0) : 0}" height="30" rx="2" fill="#e47f96"/>
    <rect x="${X(0) - 8}" y="60" width="${X(range) - X(0) + 16}" height="62" rx="4" fill="#f5deb3" opacity=".45"/>${t}</svg></div>`;
}
function viewMm(q) {
  if (q.mode === 'read') {
    frame(`這條緞帶多長？<br>答案用${q.unitText}。`, rulerSvg(q.range, q.mm, true) + '<div class="trail" id="ask"></div>', keypadHtml());
    return stepKeypad([`幾${q.unitText}？（尺上的數字是公分）`], [q.ans], q.unitText === '毫米' ? '大格一格是 1 公分，就是 10 毫米，小格一格是 1 毫米。' : '從 0 開始看，緞帶的尾巴對到幾？', `對了！是 ${q.ans} ${q.unitText}。`, 'read');
  }
  if (q.mode === 'cut') {
    frame(`剪一條 ${N(q.mm)} 毫米的緞帶！<br>拖到正確的刻度。`, rulerSvg(q.range, 0, true));
    const wrap = document.getElementById('lw'); let pick = 0, down = false;
    const setFrom = e => {
      const r = wrap.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 640;
      pick = Math.max(0, Math.min(q.range, Math.round((x - 20) / 600 * q.range)));
      document.getElementById('ribbon').setAttribute('width', pick / q.range * 600);
      document.getElementById('dig').disabled = false;
    };
    wrap.onpointerdown = e => { down = true; setFrom(e); };
    wrap.onpointermove = e => { if (down) setFrom(e); };
    window.onpointerup = () => { down = false; };
    document.getElementById('actions').innerHTML = '<button class="btn" id="dig" disabled>喀嚓</button>';
    document.getElementById('dig').onclick = () => {
      if (pick === q.mm) return finish(R.tries === 0 ? 2 : R.tries === 1 ? 1 : 0, 'cut', nums(`剛剛好！${q.mm} 毫米就是 ${Math.floor(q.mm / 10)} 公分 ${q.mm % 10} 毫米。`));
      R.tries++; sfx.retry();
      if (R.tries === 1) return setMsg(nums(`這是 ${pick} 毫米，${q.mm > pick ? '還要再長一點' : '太長了'}。`), 'hint');
      document.getElementById('dig').disabled = true; wrap.onpointerdown = null;
      document.getElementById('ribbon').setAttribute('width', q.mm / q.range * 600);
      finish(0, { wrong: pick, ans: q.mm }, nums(`${q.mm} 毫米在這裡：${Math.floor(q.mm / 10)} 大格再 ${q.mm % 10} 小格。`));
    };
    return;
  }
  if (q.mode === 'to') {
    const mm = q.ans, range = Math.min(160, (q.c + 1) * 10);
    frame(`緞帶長 ${nums(q.text)}，<br>是幾毫米？`, rulerSvg(range, mm, true) + '<div class="trail" id="ask"></div>', keypadHtml());
    return stepKeypad([`${q.c} 公分是幾毫米？`, `再加 ${q.m} 毫米是多少？`], [q.c * 10, q.ans], q.why, `對了！是 ${q.ans} 毫米。`, 'to', null, { shortcut: true });
  }
  if (q.mode === 'from') {
    const range = Math.min(170, (q.steps[0] + 1) * 10);
    frame(`緞帶長 ${N(q.n)} 毫米，<br>是幾公分幾毫米？`, rulerSvg(range, q.n, true) + '<div class="trail" id="ask"></div>', keypadHtml());
    return stepKeypad(['尺上走了幾大格？（幾公分）', '還多幾小格？（幾毫米）'], q.steps, q.why, `對了！${q.steps[0]} 公分 ${q.steps[1]} 毫米。`, 'from');
  }
  frame(q.text, `<div class="u-big">${q.e}</div><div class="trail">想想看真的東西有多大</div>`);
  pickOne(q.options.map(o => nums(o)), q.options.indexOf(q.ans), '1 毫米很小很小，1 公分大約是小指頭的寬，1 公尺大約是張開雙手。', q.why, 'guess');
}

/* ---------- 五：角角山 ---------- */
function angleSvg(d, len, tilt, ref) {
  const cx = 44, cy = 92, rad = a => (a - (tilt || 0)) * Math.PI / 180;
  const p = (a, r) => [cx + r * Math.cos(rad(a)), cy - r * Math.sin(rad(a))];
  const [x1, y1] = p(0, len), [x2, y2] = p(d, len), [a1, b1] = p(0, 20), [a2, b2] = p(d, 20);
  const large = d > 180 ? 1 : 0;
  let over = '';
  if (ref === 'right') { const [r1, s1] = p(0, 92), [r2, s2] = p(90, 92), [m1, n1] = p(0, 16), [m2, n2] = p(90, 16), [c1, c2] = p(45, 16 * Math.SQRT2); over = `<polygon points="${cx},${cy} ${r1},${s1} ${r2},${s2}" fill="#3b82c4" fill-opacity=".18" stroke="#3b82c4" stroke-width="2" stroke-dasharray="5 4"/><path d="M${m1} ${n1}L${c1} ${c2}L${m2} ${n2}" fill="none" stroke="#3b82c4" stroke-width="2"/>`; }
  else if (typeof ref === 'number') { const [o1, o2] = p(ref, len + 12); over = `<path d="M${cx} ${cy}L${o1} ${o2}" stroke="#d9772b" stroke-width="4" stroke-dasharray="6 4" stroke-linecap="round"/>`; }
  return `<svg class="ang" viewBox="-20 -30 180 150">${over}<path d="M${a1} ${b1}A20 20 0 ${large} 0 ${a2} ${b2}" fill="none" stroke="#d6476b" stroke-width="3"/><path d="M${x1} ${y1}L${cx} ${cy}L${x2} ${y2}" fill="none" stroke="#33405a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function viewAngle(q) {
  if (q.mode === 'cmp') {
    frame('哪一個角比較大？<br>可以疊起來比比看。', `<div class="vs" id="av">${angleSvg(q.a, q.la)}${angleSvg(q.b, q.lb)}</div><div class="trade"><button id="lay">把兩個角疊起來</button></div>`);
    document.getElementById('lay').onclick = () => { document.getElementById('av').innerHTML = angleSvg(q.a, 85, 0, q.b); document.getElementById('lay').disabled = true; setMsg('黑線是左邊的角，橘色虛線是右邊的角。看誰張得比較開。'); sfx.hop(); };
    return pickOne(['左邊的角', '右邊的角'], q.ans === 'L' ? 0 : 1, '不要看邊多長，看兩條邊張開多少。', `對了！${q.why}`, 'cmp');
  }
  if (q.mode === 'kind') {
    frame('這是什麼角？<br>拿三角板的直角來比一比。', `<div class="cake-wrap" id="av">${angleSvg(q.d, 85, q.tilt)}</div><div class="trade"><button id="lay">放上三角板</button></div>`);
    document.getElementById('lay').onclick = () => { document.getElementById('av').innerHTML = angleSvg(q.d, 85, q.tilt, 'right'); document.getElementById('lay').disabled = true; setMsg('藍色是三角板的直角。紅色的角比它小、一樣，還是大？'); sfx.hop(); };
    const ks = ['acute', 'right', 'obtuse'];
    return pickOne(['銳角', '直角', '鈍角'], ks.indexOf(q.ans), '拿直角來比：比直角小是銳角，比直角大是鈍角。', { acute: '對了！比直角小，是銳角。', right: '對了！剛好是直角。', obtuse: '對了！比直角大，是鈍角。' }[q.ans], 'kind');
  }
  const s = q.skew || 0, W = q.w, H = q.h;
  const pts = `${10 + s},10 ${10 + s + W},10 ${10 + W},${10 + H} 10,${10 + H}`;
  frame('這個圖形是什麼？', `<div class="cake-wrap"><svg class="ang" viewBox="0 0 ${W + s + 20} ${H + 20}"><polygon points="${pts}" fill="#fde8c8" stroke="#33405a" stroke-width="4"/></svg></div>`);
  const ks = ['square', 'rect', 'none'];
  pickOne(['正方形', '長方形', '都不是'], ks.indexOf(q.ans), '四個角都要是直角。再看四個邊是不是一樣長。', { square: '對了！四個角都是直角，四個邊一樣長。', rect: '對了！四個角都是直角，兩雙對邊一樣長。', none: '對了！它的角不是直角，所以都不是。' }[q.ans], 'shape');
}

/* ---------- 六：分分海灘 ---------- */
function shellDots(n) { return '<span class="sh"></span>'.repeat(n); }
function viewDiv(q) {
  if (q.mode === 'deal') {
    const sign = q.signless ? `${q.total} 個貝殼，平分給 ${q.b} 個人` : `${q.total}÷${q.b}`;
    frame(`${N(sign).replace('class="num"', 'class="num small"')}<br>每人幾個？${q.r ? '還剩幾個？' : ''}`, `<div class="pile-c" id="pile"></div><div class="boxes" id="boxes"></div><div class="trade"><button id="deal">每人發一個</button></div><div class="trail" id="ask"></div>`, keypadHtml());
    let left = q.total, rounds = 0;
    const draw = () => {
      document.getElementById('pile').innerHTML = left ? shellDots(left) : '<span class="note">分完了！</span>';
      document.getElementById('boxes').innerHTML = Array.from({ length: q.b }, () => `<div class="box">${shellDots(rounds)}</div>`).join('');
      const more = left >= q.b;
      document.getElementById('deal').style.display = more ? '' : 'none';
      if (!more && !R.tries) { setMsg(q.r ? '分不夠一輪了！按數字回答。' : '分完了！按數字回答。', 'good'); reveal('.keypad'); }
    };
    document.getElementById('deal').onclick = () => { if (left >= q.b) { left -= q.b; rounds++; sfx.hop(); draw(); } };
    draw();
    const asks = q.r ? ['每人幾個？（商）', '還剩幾個？（餘數）'] : ['每人幾個？'];
    return stepKeypad(asks, q.steps, '按按鈕真的分分看。分不夠一輪的，就是餘數。', q.r ? `${q.total}÷${q.b}＝${q.q}…${q.r}。` : `對了！${q.b}×${q.q}＝${q.total}。`, 'deal');
  }
  if (q.mode === 'odd') {
    const pairs = Math.floor(q.n / 2), rows = q.n <= 20;
    frame(`${N(q.n)} 是偶數還是奇數？`, rows ? `<div class="pairs">${'<span class="pair"><i></i><i></i></span>'.repeat(pairs)}${q.n % 2 ? '<span class="pair one"><i></i></span>' : ''}</div>` : `<div class="trail">${nums(`看個位：${q.n % 10}`)}</div>`);
    return pickOne(['偶數', '奇數'], q.ans === 'even' ? 0 : 1, '兩個兩個一組，剛好分完是偶數；個位是 0、2、4、6、8。', q.ans === 'even' ? '對了！兩個兩個分得完，是偶數。' : '對了！兩個兩個分，會多一個，是奇數。', 'odd');
  }
  if (q.mode === 'split') {
    frame(`${N(q.total)} 個貝殼分給 ${N(q.d)} 個人（${N(q.total + '÷' + q.d)}），<br>先分大包，再分小包。`, `<div class="fbars"><span class="fbar p0" style="flex:3"><span class="num">${q.parts[0]}</span></span><span class="fbar p1" style="flex:1"><span class="num">${q.parts[1]}</span></span></div><div class="boxes">${Array.from({ length: q.d }, () => '<div class="box person">🙂</div>').join('')}</div><div class="trail" id="ask"></div>`, keypadHtml());
    const [a, b] = q.parts.map(p => p / q.d);
    return stepKeypad([`${q.parts[0]}÷${q.d}＝？`, `${q.parts[1]}÷${q.d}＝？`, `${a}＋${b}＝？`], [a, b, q.ans], q.why, `對了！${q.total}÷${q.d}＝${q.ans}。`, 'split', null, { shortcut: true });
  }
  if (q.mode === 'missing') {
    frame(`${q.say}`, `<div class="fill-text num">${esc(q.text)}</div><div class="groups">${Array.from({ length: q.n }, () => `<span class="box">${shellDots(q.per)}</span>`).join('')}</div><div class="trail" id="ask"></div>`, keypadHtml());
    return stepKeypad(['□＝？'], [q.ans], q.why, `對了！${q.why}`, 'missing');
  }
  frame(q.mode === 'check' ? `${N(q.text)}＝${N(q.q)}…${N(q.r)}<br>驗算：${N(q.q + '×' + q.b + '＋' + q.r)} 是多少？` : `□ 是多少？`, `<div class="fill-text num">${q.mode === 'check' ? '' : esc(q.text)}</div><div class="trail" id="ask"></div>`, keypadHtml());
  stepKeypad([q.mode === 'rule' ? `${q.text}＝？` : q.mode === 'check' ? '算算看' : '□＝？'], [q.ans], q.why, `對了！${q.why}`, q.mode);
}

/* ---------- 七：規律花園 ---------- */
function viewRule(q) {
  if (q.mode === 'grow') {
    const flower = n => `<span class="flower">${'<i></i>'.repeat(n)}</span>`;
    frame(`一朵花 ${N(q.unitN)} 片花瓣，<br>${N(q.k)} 朵共有幾片？`, `<div class="pairs">${flower(q.unitN).repeat(3)}<b class="dots">⋯⋯</b></div><table class="seq-t"><tr><th>朵</th><td>1</td><td>2</td><td>3</td><td>${q.k}</td></tr><tr><th>片</th><td>${q.unitN}</td><td>${q.unitN * 2}</td><td>${q.unitN * 3}</td><td>？</td></tr></table><div class="trail" id="ask"></div>`, keypadHtml());
    return stepKeypad([`${q.k} 朵是幾片？`], [q.ans], q.why, `對了！${q.why}`, 'grow');
  }
  const diff = (x, y) => (y > x ? '＋' : '－') + Math.abs(y - x);
  const chain = q.seq.map((x, i) => `<b class="num">${x}</b>${i < q.seq.length - 1 ? `<em class="hop num">${diff(x, q.seq[i + 1])}</em>` : '<em class="hop q num">？</em>'}`).join('');
  frame('花盆上的號碼有規律，<br>下一盆是幾號？', `<div class="seq">${chain}<b class="num q">？</b></div><div class="trail">看看每一步多了或少了多少</div><div class="trail" id="ask"></div>`, keypadHtml());
  stepKeypad(['下一個數？'], [q.ans], '先看相鄰兩個數差多少。', `對了！${q.why}`, 'seq');
}

/* ---------- 八：分數烘焙坊 ---------- */
const fracHtml = (a, n) => `<span class="frac num"><i>${a}</i><i>${n}</i></span>`;
function fbar(n, a, id) {
  return `<div class="fcells" ${id ? `id="${id}"` : ''}>${Array.from({ length: n }, (_, i) => `<button class="fcell ${i < a ? 'on' : ''}" data-c="${i}" aria-label="第 ${i + 1} 塊"></button>`).join('')}</div>`;
}
const SLICE = { a: '#d6476b', b: '#f0a03c', g: '#ffffff', '': '#fff0cf' };
function pieSvg(n, states, from, nums2) { // states：每塊的狀態；每一塊都可以點
  const P = i => { const t = i / n * 2 * Math.PI - Math.PI / 2; return `${60 + 54 * Math.cos(t)} ${60 + 54 * Math.sin(t)}`; };
  let s = '<svg class="pie" viewBox="0 0 120 120"><circle cx="60" cy="60" r="57" fill="#c98f4a"/>';
  for (let i = 0; i < n; i++) {
    const st = states[i] || '', idx = (from || 0) + i;
    if (n === 1) { s += `<circle cx="60" cy="60" r="54" data-s="${idx}" fill="${SLICE[st]}" stroke="#a9702a" stroke-width="2"/>`; continue; }
    s += `<path data-s="${idx}" d="M60 60L${P(i)}A54 54 0 0 1 ${P(i + 1)}Z" fill="${SLICE[st]}" stroke="#a9702a" stroke-width="2" ${st === 'g' ? 'stroke-dasharray="4 3"' : ''}/>`;
    if (nums2 && nums2[i]) { const t = (i + .5) / n * 2 * Math.PI - Math.PI / 2; s += `<text x="${60 + 34 * Math.cos(t)}" y="${60 + 34 * Math.sin(t) + 6}" text-anchor="middle" font-size="17" style="fill:#33405a;pointer-events:none">${nums2[i]}</text>`; }
  }
  return s + '</svg>';
}
function piesHtml(n, states) { // 超過一個派就畫下一個
  const out = [], count = Math.max(1, Math.ceil(states.length / n));
  for (let k = 0; k < count; k++) out.push(pieSvg(n, states.slice(k * n, k * n + n), k * n));
  return out.join('');
}
const pieWith = (n, a) => `<span class="pie-w">${pieSvg(n, Array.from({ length: n }, (_, i) => i < a ? 'a' : ''))}${fracHtml(a, n)}</span>`;
// 同一種操作題連續 3 次第一次就對，就跳過操作；答錯一次就回到動手做
const isFast = q => ((S.fast || {})[q.kind + ':' + q.mode] || 0) >= 3;
function viewFrac(q) {
  const graded = () => R.tries === 0 ? 2 : R.tries === 1 ? 1 : 0, fast = isFast(q);
  if ((q.mode === 'unit' || q.mode === 'name') && fast) {
    const set = new Set([q.n]); for (const x of Logic.shuffle([q.a + 1, q.a + 2, q.a + 3, q.a + 4])) if (set.size < 3) set.add(x); // 分母一定比分子大，不可用隨機重抽，11/12 會卡死
    const opts = Logic.shuffle([...set]);
    frame('紅色是幾分之幾個派？', `<div class="cake-wrap">${pieSvg(q.n, Array.from({ length: q.n }, (_, i) => i < q.a ? 'a' : ''))}</div>`);
    return pickOne(opts.map(x => fracHtml(q.a, x)), opts.indexOf(q.n), '數數看全部幾塊，那就是分母。', `對了！平分成 ${q.n} 塊，紅色 ${q.a} 塊。`, 'name');
  }
  if (q.mode === 'accum' && fast) {
    const alts = [[q.a, q.n], [q.a < q.n ? q.a + 1 : q.a - 1, q.n], [1, q.n]], opts = Logic.shuffle(alts);
    frame(`${N(q.a)} 個 ${fracHtml(1, q.n)} 是多少？`, `<div class="cake-wrap">${pieSvg(q.n, Array.from({ length: q.n }, (_, i) => i < q.a ? 'a' : ''))}</div>`);
    return pickOne(opts.map(o => fracHtml(o[0], o[1])), opts.indexOf(alts[0]), '分母不變，幾個 1/幾，分子就是幾。', q.whole ? `對了！${q.n} 個 1/${q.n} 就是 1 個完整的派。` : `對了！就是 ${q.a}/${q.n}。`, 'accum');
  }
  if (q.mode === 'unit' || q.mode === 'name') {
    // 一塊一塊點著數，再自己組出分數
    frame('紅色是幾分之幾個派？<br>點派一塊一塊數，再調整分數。', `<div class="pie-row"><div id="pp"></div><div class="fb">
      <div class="fb-row"><button data-fb="a-">−</button><b class="num" id="fa">1</b><button data-fb="a+">＋</button><small>紅色幾塊</small></div>
      <hr><div class="fb-row"><button data-fb="d-">−</button><b class="num" id="fd">1</b><button data-fb="d+">＋</button><small>全部幾塊</small></div></div></div>`);
    let a = 1, d = 1, tally = 0; const marks = new Array(q.n).fill(0);
    const states = Array.from({ length: q.n }, (_, i) => i < q.a ? 'a' : '');
    const drawPie = () => {
      document.getElementById('pp').innerHTML = pieSvg(q.n, states, 0, marks);
      document.querySelectorAll('#pp [data-s]').forEach(s => s.onclick = () => { const i = +s.dataset.s; if (!marks[i]) { marks[i] = ++tally; sfx.hop(); setMsg(nums(`數到第 ${tally} 塊了。`)); drawPie(); } });
    };
    drawPie();
    document.querySelectorAll('[data-fb]').forEach(b => b.onclick = () => {
      const k = b.dataset.fb; if (k === 'a+') a = Math.min(12, a + 1); if (k === 'a-') a = Math.max(1, a - 1); if (k === 'd+') d = Math.min(12, d + 1); if (k === 'd-') d = Math.max(1, d - 1);
      document.getElementById('fa').textContent = a; document.getElementById('fd').textContent = d; sfx.hop();
    });
    document.getElementById('actions').innerHTML = '<button class="btn" id="ok">上菜</button>';
    document.getElementById('ok').onclick = () => {
      if (a === q.a && d === q.n) return finish(graded(), 'name', nums(`對了！平分成 ${q.n} 塊，紅色 ${q.a} 塊，就是 ${q.a}/${q.n} 個派。`));
      R.tries++; sfx.retry();
      if (R.tries >= 3) return finish(0, { wrong: `${a}/${d}`, ans: `${q.a}/${q.n}` }, nums(`答案是 ${q.a}/${q.n}：全部 ${q.n} 塊在下面，紅色 ${q.a} 塊在上面。`));
      setMsg(d !== q.n ? '下面的數是全部幾塊。把每一塊都點一遍數數看。' : '上面的數是紅色有幾塊。', 'hint');
    };
    return;
  }
  if (q.mode === 'make') {
    // 自己切派、自己拿
    frame(`客人要 ${fracHtml(q.a, q.n)} 個派。<br>${fast ? '派切好了，' : '先切好，再'}點要給客人的塊。`, `<div class="cake-wrap" id="pp"></div>${fast ? '' : '<div class="trade"><button id="less">少切一刀</button><button id="more">多切一刀</button></div>'}<div class="trail num" id="now"></div>`);
    let n = fast ? q.n : 1; const on = new Set();
    const draw = () => {
      document.getElementById('pp').innerHTML = pieSvg(n, Array.from({ length: n }, (_, i) => on.has(i) ? 'a' : ''));
      document.getElementById('now').innerHTML = nums(`切成 ${n} 塊，拿了 ${on.size} 塊`);
      document.querySelectorAll('#pp [data-s]').forEach(s => s.onclick = () => { const i = +s.dataset.s; on.has(i) ? on.delete(i) : on.add(i); sfx.hop(); draw(); });
    };
    if (!fast) {
      document.getElementById('more').onclick = () => { if (n < 12) { n++; on.clear(); sfx.hop(); draw(); } };
      document.getElementById('less').onclick = () => { if (n > 1) { n--; on.clear(); sfx.hop(); draw(); } };
    }
    draw();
    document.getElementById('actions').innerHTML = '<button class="btn" id="ok">端給客人</button>';
    document.getElementById('ok').onclick = () => {
      if (n === q.n && on.size === q.a) return finish(graded(), 'make', nums(`對了！切成 ${q.n} 塊（分母），拿 ${q.a} 塊（分子）。`));
      R.tries++; sfx.retry();
      if (R.tries >= 3) return finish(0, { wrong: `${on.size}/${n}`, ans: `${q.a}/${q.n}` }, nums(`要切成 ${q.n} 塊，拿 ${q.a} 塊。`));
      setMsg(n !== q.n ? nums(`分數下面是 ${q.n}，所以要切成 ${q.n} 塊。`) : nums(`分數上面是 ${q.a}，所以要拿 ${q.a} 塊。`), 'hint');
    };
    return;
  }
  if (q.mode === 'accum') {
    // 一塊一塊放進盤子，分數跟著長大
    frame(`每塊是 ${fracHtml(1, q.n)} 個派，<br>放 ${N(q.a)} 塊到盤子上。`, `<div class="cake-wrap" id="pp"></div><div class="trail num" id="now"></div><div class="trade"><button id="back">拿回一塊</button><button id="put">再放一塊</button></div>`);
    let k = 0;
    const draw = () => {
      document.getElementById('pp').innerHTML = pieSvg(q.n, Array.from({ length: q.n }, (_, i) => i < k ? 'a' : ''));
      document.getElementById('now').innerHTML = k ? `${N(k)} 個 ${fracHtml(1, q.n)} 是 ${fracHtml(k, q.n)}${k === q.n ? '，就是 1 個派！' : ''}` : '盤子是空的';
    };
    document.getElementById('put').onclick = () => { if (k < q.n) { k++; sfx.hop(); draw(); } };
    document.getElementById('back').onclick = () => { if (k > 0) { k--; sfx.hop(); draw(); } };
    draw();
    document.getElementById('actions').innerHTML = '<button class="btn" id="ok">放好了</button>';
    document.getElementById('ok').onclick = () => {
      if (k === q.a) return finish(graded(), 'accum', nums(q.whole ? `對了！${q.n} 個 1/${q.n} 就是 1 個完整的派。` : `對了！${q.a} 個 1/${q.n} 就是 ${q.a}/${q.n}。`));
      R.tries++; sfx.retry();
      if (R.tries >= 3) return finish(0, { wrong: k, ans: q.a }, nums(`要放 ${q.a} 塊。`));
      setMsg(nums(`現在 ${k} 塊，要 ${q.a} 塊。`), 'hint');
    };
    return;
  }
  if (q.mode === 'cmp') {
    frame('每塊一樣大，<br>點派比較多的那一盤。', '<div class="trail">分母一樣，數紅色幾塊就好</div>');
    return pickOne([pieWith(q.n, q.a), pieWith(q.n, q.b)], q.ans === 'L' ? 0 : 1, '每塊一樣大，數數看哪一盤的紅色比較多。', '對了！分母一樣，分子大的比較多。', 'cmp');
  }
  // 加法：一塊一塊放進去；減法：一塊一塊吃掉；動手做完才回答
  const add = q.mode === 'add', st = Array.from({ length: add ? q.a : q.a }, () => 'a');
  frame(`${fracHtml(q.a, q.n)} ${add ? '＋' : '－'} ${fracHtml(q.b, q.n)}<br>${fast ? '算算看，現在有幾塊？' : add ? `再放 ${N(q.b)} 塊上去。` : `點派，吃掉 ${N(q.b)} 塊。`}`,
    `<div class="vs" id="pp"></div>${add && !fast ? '<div class="trade"><button id="put">再放一塊</button></div>' : ''}<div class="trail num" id="now"></div><div id="kp" hidden>${keypadHtml()}</div><div class="trail" id="ask" hidden></div>`);
  let done = 0, opened = false;
  const pad = arr => { const out = arr.slice(); while (out.length % q.n) out.push(''); return out; };
  const open = () => {
    if (opened) return; opened = true;
    document.getElementById('kp').hidden = false; document.getElementById('ask').hidden = false;
    setMsg('數一數，按數字回答。', 'good'); reveal('#kp');
    stepKeypad([`現在有幾塊？（答案是 □/${q.n}）`], [q.ans], `數一數${add ? '紅色和橘色' : '還留著的紅色'}共幾塊。`, `對了！答案是 ${q.ans}/${q.n}${q.ans === q.n ? '，剛好 1 個派' : q.ans > q.n ? `，比 1 個派多 ${q.ans - q.n} 塊` : ''}。`, q.mode);
  };
  const draw = () => {
    document.getElementById('pp').innerHTML = piesHtml(q.n, pad(st));
    const left = q.b - done;
    document.getElementById('now').innerHTML = left > 0 ? nums(add ? `還要放 ${left} 塊` : `還要吃 ${left} 塊`) : nums(add ? '放好了！' : '吃完了！');
    if (!add) document.querySelectorAll('#pp [data-s]').forEach(s => s.onclick = () => { const i = +s.dataset.s; if (st[i] === 'a' && done < q.b) { st[i] = 'g'; done++; sfx.hop(); draw(); if (done === q.b) open(); } });
  };
  if (fast) {
    for (let i = 0; i < q.b; i++) { if (add) st.push('b'); else st[q.a - 1 - i] = 'g'; }
    done = q.b; draw(); document.getElementById('now').innerHTML = ''; open();
    return;
  }
  if (add) document.getElementById('put').onclick = () => { if (done < q.b) { st.push('b'); done++; sfx.hop(); draw(); if (done === q.b) { document.getElementById('put').disabled = true; open(); } } };
  draw();
}

/* ---------- 九：圓圓天文台 ---------- */
function viewCircle(q) {
  if (q.mode === 'center') {
    frame('點一點，找到圓的正中間。', `<div class="cake-wrap" id="cw"><svg class="ang big" id="cs" viewBox="0 0 200 200"><circle cx="${q.cx}" cy="${q.cy}" r="${q.r}" fill="#dfeafa" stroke="#3b82c4" stroke-width="4"/><g id="mark"></g></svg></div>`);
    const svg = document.getElementById('cs'); let px = null;
    svg.onclick = e => { const r = svg.getBoundingClientRect(); px = [(e.clientX - r.left) / r.width * 200, (e.clientY - r.top) / r.height * 200]; document.getElementById('mark').innerHTML = `<circle cx="${px[0]}" cy="${px[1]}" r="5" fill="#d6476b"/>`; document.getElementById('ok').disabled = false; };
    document.getElementById('actions').innerHTML = '<button class="btn" id="ok" disabled>就是這裡</button>';
    document.getElementById('ok').onclick = () => {
      const d = Math.hypot(px[0] - q.cx, px[1] - q.cy);
      if (d <= q.r * .28) { document.getElementById('mark').innerHTML = `<circle cx="${q.cx}" cy="${q.cy}" r="5" fill="#2f9e6a"/>`; return finish(R.tries === 0 ? 2 : R.tries === 1 ? 1 : 0, 'center', '找到了！這個點到圓周上每一點都一樣遠。'); }
      R.tries++; sfx.retry();
      if (R.tries === 1) return setMsg('看看這個點到圓邊的距離，每個方向要一樣長。', 'hint');
      document.getElementById('mark').innerHTML = `<circle cx="${q.cx}" cy="${q.cy}" r="5" fill="#2f9e6a"/>`;
      finish(0, { wrong: 'center', ans: 'center' }, '圓心在這裡，到圓周每一點都一樣遠。');
    };
    return;
  }
  const seg = (turn, type) => {
    const t = turn * Math.PI / 180, c = 100, r = 80, P = a => [c + r * Math.cos(a), c - r * Math.sin(a)];
    const [x1, y1] = P(t);
    const [x2, y2] = type === 'radius' ? [c, c] : type === 'diameter' ? P(t + Math.PI) : P(t + 2);
    return `<svg class="ang big" viewBox="0 0 200 200"><circle cx="100" cy="100" r="80" fill="#dfeafa" stroke="#3b82c4" stroke-width="4"/><circle cx="100" cy="100" r="4" fill="#33405a"/><path d="M${x1} ${y1}L${x2} ${y2}" stroke="#d6476b" stroke-width="5" stroke-linecap="round"/></svg>`;
  };
  if (q.mode === 'name') {
    frame('紅色的線是什麼？', `<div class="cake-wrap">${seg(q.turn, q.line)}</div>`);
    const ks = ['radius', 'diameter', 'neither'];
    return pickOne(['半徑', '直徑', '都不是'], ks.indexOf(q.ans), '看它有沒有碰到圓心：半徑從圓心到圓周，直徑通過圓心。', { radius: '對了！從圓心到圓周，是半徑。', diameter: '對了！通過圓心的直線，是直徑。', neither: '對了！它沒有碰到圓心，都不是。' }[q.ans], 'name');
  }
  if (q.mode === 'size') {
    frame(q.ask === 'd' ? `半徑是 ${N(q.r)} 公分，<br>直徑是幾公分？` : `直徑是 ${N(q.r * 2)} 公分，<br>半徑是幾公分？`, `<div class="cake-wrap">${seg(30, q.ask === 'd' ? 'radius' : 'diameter')}</div><div class="trail" id="ask"></div>`, keypadHtml());
    return stepKeypad(['幾公分？'], [q.ans], q.why, `對了！${q.why}`, 'size');
  }
  frame('哪一條線最長？', `<div class="vs">${seg(q.turn, 'neither')}${seg(q.turn, 'diameter')}</div>`);
  pickOne(['左邊的線', '右邊的線'], 1, '看哪一條通過圓心。', q.why, 'long');
}

/* ---------- 十：面積牧場 ---------- */
function gridSvg(w, h, cut) {
  const S = 28; let r = '';
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const gone = cut && x >= w - cut.w && y < cut.h;
    if (!gone) r += `<rect x="${x * S + 2}" y="${y * S + 2}" width="${S}" height="${S}" fill="#bfe3b4" stroke="#3d9970" stroke-width="1.5"/>`;
  }
  return `<svg class="grid-a" viewBox="0 0 ${w * S + 4} ${h * S + 4}" style="width:${Math.min(w * S + 4, 300)}px">${r}</svg>`;
}
function viewArea(q) {
  if (q.mode === 'pick') {
    frame(q.text, `<div class="u-big">${q.e}</div>`);
    return pickOne(q.options.map(o => nums(o)), q.options.indexOf(q.ans), '食指的指腹大約 1 平方公分，手掌大約 100 平方公分。', q.why, 'pick');
  }
  if (q.mode === 'count') {
    frame(`這塊草地有幾平方公分？<br>一格是 1 平方公分。`, `<div class="cake-wrap">${gridSvg(q.w, q.h)}</div><div class="trail" id="ask"></div>`, keypadHtml());
    return stepKeypad(['幾平方公分？'], [q.w * q.h], `一排 ${q.w} 格，有 ${q.h} 排。`, `對了！${q.w}×${q.h}＝${q.w * q.h} 平方公分。`, 'count');
  }
  if (q.mode === 'same') {
    frame(`哪一塊面積不是<br>${N(q.a)} 平方公分？`, `<div class="vs wrap">${q.cards.map(c => gridSvg(c.w, c.h)).join('')}</div>`);
    return pickOne(['第一塊', '第二塊', '第三塊'], q.cards.findIndex(c => !c.same), '每一塊都用「一排幾格×幾排」算算看。', '對了！其他兩塊形狀不同，面積卻一樣。', 'same');
  }
  if (q.mode === 'cut') {
    frame('缺了一角的草地，<br>有幾平方公分？', `<div class="cake-wrap">${gridSvg(q.W, q.H, { w: q.cw, h: q.ch })}</div><div class="trail" id="ask"></div>`, keypadHtml());
    return stepKeypad(['完整的長方形有幾格？', '缺的那一塊有幾格？', '剩下幾平方公分？'], [q.W * q.H, q.cw * q.ch, q.ans], '先算完整的，再減掉缺的那一塊。', `對了！${q.W * q.H}－${q.cw * q.ch}＝${q.ans}。`, 'cut', null, { shortcut: true });
  }
  const S = 28, W = q.w * S, H = q.h * S;
  frame(`長方形切一半變三角形，<br>三角形有幾平方公分？`, `<div class="cake-wrap"><svg class="grid-a" viewBox="0 0 ${W + 4} ${H + 4}" style="width:${Math.min(W + 4, 240)}px"><rect x="2" y="2" width="${W}" height="${H}" fill="none" stroke="#3d9970" stroke-width="2"/><polygon points="2,2 2,${H + 2} ${W + 2},${H + 2}" fill="#bfe3b4" stroke="#3d9970" stroke-width="2"/></svg></div><div class="trail">${nums(`長方形一排 ${q.w} 格，有 ${q.h} 排`)}</div><div class="trail" id="ask"></div>`, keypadHtml());
  stepKeypad(['長方形有幾平方公分？', '三角形是一半，幾平方公分？'], [q.w * q.h, q.ans], '三角形是長方形的一半。', `對了！${q.w * q.h}÷2＝${q.ans}。`, 'half', null, { shortcut: true });
}

/* ---------- 十一：小數碼頭 ---------- */
function fishBars(states) { // 每 10 段一條；a 原本、b 加上去、g 吃掉
  const rows = []; for (let i = 0; i < Math.max(states.length, 1); i += 10) rows.push(states.slice(i, i + 10));
  return `<div class="tenbars">${rows.map(r => `<div class="tenbar fish">${Array.from({ length: 10 }, (_, i) => `<i class="${r[i] || ''}"></i>`).join('')}</div>`).join('')}</div>`;
}
const fishState = (n, s) => Array.from({ length: n }, () => s || 'a');
function viewDeci(q) {
  const d1 = n => (n / 10).toFixed(1), graded = () => R.tries === 0 ? 2 : R.tries === 1 ? 1 : 0, fast = isFast(q);
  if (q.mode === 'color' && fast) {
    frame(`${N(d1(q.a))} 條魚乾是幾段？`, `${fishBars([])}<div class="trail">一段是 0.1</div><div class="trail" id="ask"></div>`, keypadHtml());
    return stepKeypad(['幾段？'], [q.a], '小數點後面的數字就是幾段。', `對了！${d1(q.a)} 就是 ${q.a} 個 0.1。`, 'color');
  }
  if (q.mode === 'count' && fast) {
    frame(`${N(q.text)} 裡面有幾個 ${N('0.1')}？`, `<div class="trail">一整條是 10 段</div><div class="trail" id="ask"></div>`, keypadHtml());
    return stepKeypad(['幾個？'], [q.n], `${Math.floor(q.n / 10)} 整條是 ${Math.floor(q.n / 10) * 10} 段，再加 ${q.n % 10} 段。`, `對了！${q.text} 是 ${q.n} 個 0.1。`, 'count');
  }
  if (q.mode === 'color') {
    // 點到第幾段就拿到第幾段，小數跟著變
    frame(`一條魚乾平分成 10 段，<br>一段是 ${N('0.1')}。拿出 ${N(d1(q.a))} 條。`, `<div class="fcells" id="cells">${Array.from({ length: 10 }, (_, i) => `<button class="fcell" data-c="${i}" aria-label="拿到第 ${i + 1} 段"></button>`).join('')}</div><div class="trail num" id="now"></div>`);
    let k = 0;
    const draw = () => { document.querySelectorAll('.fcell').forEach((c, i) => c.classList.toggle('on', i < k)); document.getElementById('now').innerHTML = k ? nums(`${k} 段，就是 ${k} 個 0.1，寫成 ${d1(k)}`) : '點魚乾，拿到第幾段'; };
    document.querySelectorAll('.fcell').forEach(c => c.onclick = () => { const i = +c.dataset.c; k = k === i + 1 ? i : i + 1; sfx.hop(); draw(); });
    draw();
    document.getElementById('actions').innerHTML = '<button class="btn" id="ok">拿好了</button>';
    document.getElementById('ok').onclick = () => {
      if (k === q.a) return finish(graded(), 'color', nums(`對了！${d1(q.a)} 就是 ${q.a} 個 0.1。`));
      R.tries++; sfx.retry();
      if (R.tries >= 3) return finish(0, { wrong: k, ans: q.a }, nums(`要 ${q.a} 段。`));
      setMsg(nums(`小數點後面的數字是幾段：${d1(q.a)} 要 ${q.a} 段。`), 'hint');
    };
    return;
  }
  if (q.mode === 'count') {
    // 用整條和段拼出小數
    frame(`幫大嘴拿 ${N(q.text)} 條魚乾。<br>小數點左邊是整條，右邊是幾段。`, `<div id="fb"></div><div class="trail num" id="now"></div><div class="trade"><button id="m1">拿回一條</button><button id="p1">加一整條</button></div><div class="trade"><button id="m2">拿回一段</button><button id="p2">加一段</button></div>`);
    let k = 0;
    const draw = () => { document.getElementById('fb').innerHTML = fishBars(fishState(k)); document.getElementById('now').innerHTML = nums(`現在：${Math.floor(k / 10)} 整條又 ${k % 10} 段`); };
    const change = d => { k = Math.max(0, Math.min(49, k + d)); sfx.hop(); draw(); };
    document.getElementById('p1').onclick = () => change(10); document.getElementById('m1').onclick = () => change(-10);
    document.getElementById('p2').onclick = () => change(1); document.getElementById('m2').onclick = () => change(-1);
    draw();
    document.getElementById('actions').innerHTML = '<button class="btn" id="ok">拿好了</button>';
    document.getElementById('ok').onclick = () => {
      if (k === q.n) return finish(graded(), 'count', nums(`對了！${q.text} 條就是 ${Math.floor(q.n / 10)} 整條又 ${q.n % 10} 段，一共 ${q.n} 個 0.1。`));
      R.tries++; sfx.retry();
      if (R.tries >= 3) return finish(0, { wrong: k, ans: q.n }, nums(`${q.text} 是 ${Math.floor(q.n / 10)} 整條又 ${q.n % 10} 段。`));
      setMsg(nums(`看小數點：左邊 ${Math.floor(q.n / 10)} 是整條，右邊 ${q.n % 10} 是段。`), 'hint');
    };
    return;
  }
  if (q.mode === 'cmp') {
    frame('點魚乾比較多的那一堆。', '<div class="trail">先比幾整條，再比多的段數</div>');
    const card = (t, n) => `<span class="fish-card"><b class="num">${t}</b>${fishBars(fishState(n))}</span>`;
    return pickOne([card(q.l, q.a), card(q.r, q.b)], q.ans === 'L' ? 0 : 1, '先比幾整條，再比多出來的段數。', '對了！', 'cmp');
  }
  // 加法：一段一段放上去；減法：一段一段吃掉；做完才選答案
  const m = q.text.match(/([\d.]+)([＋－])([\d.]+)/), x = Math.round(+m[1] * 10), y = Math.round(+m[3] * 10), add = m[2] === '＋';
  frame(`${N(q.text)}<br>${fast ? '現在有多少？' : add ? `再放 ${N(d1(y))} 條，就是 ${N(y)} 段。` : `吃掉 ${N(d1(y))} 條，就是 ${N(y)} 段。`}`, `<div id="fb"></div><div class="trail num" id="now"></div>${fast ? '' : `<div class="trade"><button id="step">${add ? '再放一段' : '吃掉一段'}</button></div>`}`);
  const st = fishState(x); let done = 0;
  const draw = () => {
    document.getElementById('fb').innerHTML = fishBars(st);
    const left = y - done;
    document.getElementById('now').innerHTML = left > 0 ? nums(add ? `還要放 ${left} 段` : `還要吃 ${left} 段`) : '做完了，現在有多少？';
  };
  const ask = () => {
    const opts = Logic.uniqueOptions(q.tenths, () => q.tenths + Logic.pick([-10, -2, -1, 1, 2, 10]));
    pickOne(opts.map(o => numBtn(d1(o))), opts.indexOf(q.tenths), '先數幾整條，再數多的段數。', `對了！${q.why}`, 'calc');
    setMsg('現在有多少？點答案。', 'good'); reveal('#actions');
  };
  if (fast) {
    for (let i = 0; i < y; i++) { if (add) st.push('b'); else st[x - 1 - i] = 'g'; }
    done = y; draw(); document.getElementById('now').innerHTML = ''; ask();
    return;
  }
  document.getElementById('step').onclick = () => {
    if (done >= y) return;
    if (add) st.push('b'); else { st[x - 1 - done] = 'g'; }
    done++; sfx.hop(); draw();
    if (done === y) { document.getElementById('step').disabled = true; ask(); }
  };
  draw();
}

/* ---------- 十二：量量市集 ---------- */
function viewMeas(q) {
  if (q.mode === 'pick') {
    frame(q.text, `<div class="u-big">${q.e}</div>`);
    return pickOne(q.options.map(o => nums(o)), q.options.indexOf(q.ans), q.why, `對了！${q.why}`, 'pick');
  }
  const crate = (u, n) => `<span class="crate"><b class="num">1</b>${u}<small class="num">＝${n}</small></span>`;
  if (q.mode === 'to') {
    frame(`${nums(q.text)}，<br>是幾${q.unit}？`, `<div class="crates">${Array.from({ length: q.big }, () => crate(q.u1, q.per)).join('')}<span class="crate small"><b class="num">${q.small}</b>${q.unit}</span></div><div class="trail" id="ask"></div>`, keypadHtml());
    return stepKeypad([`${q.big} ${q.u1}是幾${q.unit}？`, `再加 ${q.small} ${q.unit}是多少？`], [q.big * q.per, q.ans], q.why, `對了！是 ${q.ans} ${q.unit}。`, 'to', null, { shortcut: true });
  }
  if (q.mode === 'from') {
    frame(`${nums(q.text)}，<br>是幾${q.u1}幾${q.u2}？`, `<div class="crates"><span class="crate ghost">每裝滿 <b class="num">${q.per}</b> ${q.u2}<br>就是 <b class="num">1</b> ${q.u1}</span></div><div class="trail" id="ask"></div>`, keypadHtml());
    return stepKeypad([`可以裝滿幾個 ${q.per}？（幾${q.u1}）`, `還剩多少？（幾${q.u2}）`], q.steps, q.why, `對了！${q.steps[0]} ${q.u1} ${q.steps[1]} ${q.u2}。`, 'from');
  }
  if (q.mode === 'dial') {
    const a = q.g / 1000 * 360 * Math.PI / 180, x = 100 + 72 * Math.sin(a), y = 100 - 72 * Math.cos(a);
    let t = '';
    for (let i = 0; i < 20; i++) { const b = i * 18; t += `<path d="M100 18v${i % 2 ? 8 : 15}" transform="rotate(${b} 100 100)" stroke="#33405a" stroke-width="${i % 2 ? 1.5 : 3}"/>`; }
    [0, 250, 500, 750].forEach((v, i) => { const b = i * 90 * Math.PI / 180; t += `<text x="${100 + 60 * Math.sin(b)}" y="${100 - 60 * Math.cos(b) + 6}" text-anchor="middle" font-size="16">${v}</text>`; });
    frame('秤上的指針指著幾公克？<br>一小格是 50 公克。', `<div class="cake-wrap"><svg class="ang big" viewBox="0 0 200 200"><circle cx="100" cy="100" r="92" fill="#fffdf7" stroke="#d9772b" stroke-width="5"/>${t}<path d="M100 100L${x} ${y}" stroke="#d6476b" stroke-width="4" stroke-linecap="round"/><circle cx="100" cy="100" r="6" fill="#33405a"/></svg></div><div class="trail" id="ask"></div>`, keypadHtml());
    return stepKeypad(['幾公克？'], [q.ans], '從 0 開始，一小格一小格加 50。', `對了！是 ${q.ans} 公克。`, 'dial');
  }
  frame(`${q.rows[q.r]}${q.cols[q.c]}有幾個人來市集？`, `<table class="seq-t"><tr><th></th>${q.cols.map(c => `<th>${c}</th>`).join('')}</tr>${q.rows.map((r, i) => `<tr><th>${r}</th>${q.data[i].map(v => `<td class="num">${v}</td>`).join('')}</tr>`).join('')}</table><div class="trail" id="ask"></div>`, keypadHtml());
  stepKeypad(['幾個人？'], [q.ans], '先找橫列，再找直行，看交叉的那一格。', `對了！是 ${q.ans} 個人。`, 'table');
}

const VIEWS = { port: viewPort, ship: viewShip, fact: viewFact, mm: viewMm, angle: viewAngle, div: viewDiv, rule: viewRule, frac: viewFrac, circle: viewCircle, area: viewArea, deci: viewDeci, meas: viewMeas };

/* ---------- 單位教室：先認識單位，再建立數感 ---------- */
const LESSONS = {
  len: {
    title: '長度', sem: '三上', icon: '📏', who: 'crab', name: '夾夾',
    say: '做衣服要量得準。先來認識三個量長度的單位！',
    cards: [
      { e: '🐜', u: '毫米', t: '很小很小。一隻小螞蟻大約長 4 毫米，尺上最小的一格就是 1 毫米。' },
      { e: '☝️', u: '公分', t: '小指頭大約 1 公分寬。鉛筆、書本用公分量。' },
      { e: '🚪', u: '公尺', t: '張開雙手大約 1 公尺。教室、跑道用公尺量。' },
    ],
    labs: [
      { from: '毫米', each: 1, n: 10, to: '1 公分', btn: '再加 1 毫米', done: '10 毫米，剛好是 1 公分！' },
      { from: '公分', each: 10, n: 10, to: '1 公尺', btn: '再加 10 公分', done: '100 公分，剛好是 1 公尺！' },
    ],
  },
  vol: {
    title: '容量', sem: '三下', icon: '🥛', who: 'raccoon', name: '秤秤',
    say: '瓶子能裝多少水，就是容量。先來認識公升和毫升！',
    cards: [
      { e: '💧', u: '毫升', t: '很少很少。量藥的小杯用毫升，一小瓶養樂多大約 100 毫升。' },
      { e: '🧃', u: '公升', t: '一大瓶鮮奶大約 1 公升。水壺、水桶用公升量。' },
    ],
    labs: [{ from: '毫升', each: 100, n: 10, to: '1 公升', btn: '倒 100 毫升', done: '倒了 10 次，1000 毫升，剛好是 1 公升！', tall: true }],
  },
  weight: {
    title: '重量', sem: '三下', icon: '⚖️', who: 'raccoon', name: '秤秤',
    say: '東西有多重，用公克和公斤來說。拿起來感覺看看！',
    cards: [
      { e: '📎', u: '公克', t: '很輕很輕。一根迴紋針大約 1 公克。' },
      { e: '🍚', u: '公斤', t: '一包大砂糖大約 1 公斤。書包、體重用公斤量。' },
    ],
    labs: [{ from: '公克', each: 100, n: 10, to: '1 公斤', btn: '放 100 公克', done: '放了 10 次，1000 公克，剛好是 1 公斤！' }],
  },
  time: {
    title: '時間', sem: '三下', icon: '⏱️', who: 'liang', name: '亮亮',
    say: '時間看不到，但可以拍拍手感覺。先來認識秒、分、小時！',
    cards: [
      { e: '👏', u: '秒', t: '拍一下手大約 1 秒。戴帽子大約 10 秒。' },
      { e: '🪥', u: '分', t: '刷牙大約 4 分鐘。1 分鐘比想像中久喔。' },
      { e: '🏫', u: '小時', t: '比一節課長一些。1 小時是 60 分鐘。' },
      { e: '🌞', u: '日', t: '從今天早上到明天早上。1 日有 24 小時。' },
    ],
    labs: [
      { from: '秒', each: 10, n: 6, to: '1 分鐘', btn: '再過 10 秒', done: '60 秒，剛好是 1 分鐘！不是 100 喔。' },
      { from: '分', each: 10, n: 6, to: '1 小時', btn: '再過 10 分', done: '60 分，剛好是 1 小時！' },
    ],
  },
  area: {
    title: '面積', sem: '三下', icon: '🟩', who: 'sheep', name: '咩咩',
    say: '一塊草地有多大，就是面積。先認識平方公分！',
    cards: [
      { e: '👆', u: '平方公分', t: '你的食指指腹大約 1 平方公分。一張悠遊卡大約 46 平方公分。' },
    ],
    labs: [{ tiles: true, w: 4, h: 3, done: '鋪了 12 格，就是 12 平方公分！' }],
  },
};
function viewLessons() {
  window.scrollTo(0, 0);
  $app.innerHTML = `<div class="top"><button class="icon-btn" id="home" aria-label="回小鎮">⌂</button><h2 class="page-h">單位教室</h2></div>
    <p class="tag">先認識單位，再去島上用它。</p>
    <div class="lessons">${Object.entries(LESSONS).map(([k, L]) => `<div class="lesson-row"><button class="lesson" data-l="${k}"><span class="l-e">${L.icon}</span><span class="l-t"><b>${L.title}</b><small>${L.cards.map(c => c.u).join('、')}</small></span><em class="sem">${L.sem}</em>${(S.learned || {})[k] ? '<span class="badge in">✓</span>' : ''}</button><button class="drill-btn" data-d="${k}">練習</button></div>`).join('')}</div>`;
  document.getElementById('home').onclick = () => go('');
  document.querySelectorAll('[data-l]').forEach(b => b.onclick = () => runLesson(b.dataset.l, viewLessons));
  document.querySelectorAll('[data-d]').forEach(b => b.onclick = () => runDrill(b.dataset.d, viewLessons));
}
function lessonFrame(L, title, body) {
  window.scrollTo(0, 0);
  $app.innerHTML = `<div class="top"><button class="icon-btn" id="out" aria-label="離開">⌂</button><h2 class="page-h">${L.title}<span class="sem">${L.sem}</span></h2><button class="icon-btn" id="say" aria-label="唸出來">🔊</button></div>
    <div class="say-row">${artImg(L.who, 'say-who')}<div class="prompt" id="prompt">${title}</div></div><div class="stage" id="stage">${body}</div><div class="msg" id="msg"></div><div class="actions" id="actions"></div>`;
  document.getElementById('say').onclick = () => speak(plainText(document.getElementById('prompt')));
}
const FAM_UNIT = { 分: '分鐘' };
function exList(key, unit) { // 同單位的生活例子
  const ex = Logic.UNIT_ITEMS[key].filter(x => x.u === (FAM_UNIT[unit] || unit));
  return ex.length ? `<span class="u-ex">${ex.map(x => `<span>${x.e} ${x.name} ${x.v} ${x.u}</span>`).join('')}</span>` : '';
}
function runLesson(key, then) {
  const L = LESSONS[key];
  const leave = () => { document.body.classList.remove('in-cine'); then(); };
  // 第一步：一張一張看實物
  function cards() {
    lessonFrame(L, L.say, `<div class="u-cards">${L.cards.map((c, i) => `<button class="u-card" data-i2="${i}"><span class="u-e">${c.e}</span><b>${c.u}</b><small class="u-t" hidden>${nums(c.t)}${exList(key, c.u)}</small></button>`).join('')}</div>`);
    document.getElementById('out').onclick = leave;
    const seen = new Set();
    document.getElementById('actions').innerHTML = '<button class="btn" id="go2" disabled>動手試試</button>';
    setMsg('點每一張卡片，看看它有多大。');
    document.querySelectorAll('.u-card').forEach(b => b.onclick = () => {
      seen.add(b.dataset.i2); b.classList.add('seen'); b.querySelector('.u-t').hidden = false; sfx.hop();
      speak(L.cards[+b.dataset.i2].u + '。' + L.cards[+b.dataset.i2].t);
      if (seen.size === L.cards.length) { document.getElementById('go2').disabled = false; setMsg('都看過了！'); reveal('#actions'); }
    });
    document.getElementById('go2').onclick = () => lab(0);
  }
  // 第二步：動手裝滿，感覺單位之間的關係
  function lab(i) {
    const X = L.labs[i];
    if (!X) return quiz();
    if (X.tiles) return tiles(X, i);
    lessonFrame(L, `一直加，加到 ${X.to}。`, `<div class="${X.tall ? 'u-bottle' : 'u-bar'}" id="bar">${Array.from({ length: X.n }, () => '<i></i>').join('')}</div><div class="u-count" id="cnt"></div><div class="trade"><button id="add">${X.btn}</button></div>`);
    document.getElementById('out').onclick = leave;
    let k = 0;
    const draw = () => {
      document.querySelectorAll('#bar i').forEach((c, j) => c.classList.toggle('on', j < k));
      document.getElementById('cnt').innerHTML = `<b class="num">${k * X.each}</b> ${X.from}`;
    };
    draw();
    document.getElementById('add').onclick = () => {
      if (k >= X.n) return;
      k++; sfx.hop(); draw();
      if (k === X.n) {
        sfx.good(); document.getElementById('add').style.display = 'none'; setMsg(nums(X.done), 'good');
        document.getElementById('actions').innerHTML = '<button class="btn" id="go3">繼續</button>';
        document.getElementById('go3').onclick = () => lab(i + 1);
        reveal('#actions');
      }
    };
  }
  function tiles(X, i) {
    lessonFrame(L, `一格是 1 平方公分。<br>點格子，把草地鋪滿。`, `<div class="u-tiles" style="grid-template-columns:repeat(${X.w},1fr)">${Array.from({ length: X.w * X.h }, (_, j) => `<button class="u-tile" data-t="${j}" aria-label="第 ${j + 1} 格"></button>`).join('')}</div><div class="u-count" id="cnt"></div>`);
    document.getElementById('out').onclick = leave;
    const on = new Set();
    const draw = () => { document.getElementById('cnt').innerHTML = `<b class="num">${on.size}</b> 平方公分`; };
    draw();
    document.querySelectorAll('.u-tile').forEach(b => b.onclick = () => {
      if (on.has(b.dataset.t)) return;
      on.add(b.dataset.t); b.classList.add('on'); sfx.hop(); draw();
      if (on.size === X.w * X.h) {
        sfx.good(); setMsg(nums(X.done), 'good');
        document.getElementById('actions').innerHTML = '<button class="btn" id="go3">繼續</button>';
        document.getElementById('go3').onclick = () => lab(i + 1);
        reveal('#actions');
      }
    });
  }
  // 第三步：選單位、排大小、想一想
  function quiz() {
    const plan = key === 'area' ? ['order', 'quiz', 'quiz', 'quiz'] : ['sort', 'sort', 'order', 'quiz', 'quiz'];
    unitDrill(key, plan, leave, finishLesson);
  }
  function finishLesson() {
    S.learned = S.learned || {}; const first = !S.learned[key]; S.learned[key] = 1;
    if (first) S.stars += 100;
    save();
    lessonFrame(L, `${L.title}單位，你認識了！`, `<div class="u-big">${L.icon}</div><div class="u-sum">${L.cards.map(c => `<span>${c.e} ${c.u}</span>`).join('')}</div>${first ? `<div class="trail">${nums('夜空多亮了 100 顆星')}</div>` : ''}`);
    document.getElementById('out').onclick = leave;
    document.getElementById('actions').innerHTML = '<button class="btn" id="end">好！</button>';
    document.getElementById('end').onclick = leave;
  }
  cards();
}
// 單位練習：sort 替東西選單位、order 由小排到大、quiz 大約多少
function unitDrill(key, plan, leave, done) {
  const L = LESSONS[key], used = new Set(); let n = 0, firstTry = 0;
  const nextItem = () => { const pool = Logic.UNIT_ITEMS[key].filter(x => !used.has(x)), x = Logic.pick(pool.length ? pool : Logic.UNIT_ITEMS[key]); used.add(x); return x; };
  const passed = (clean, msg) => {
    if (clean) { firstTry++; S.stars += 25; save(); }
    setMsg(nums(msg), 'good'); sfx.ok(); n++;
    document.getElementById('actions').innerHTML = `<button class="btn" id="go4">${n < plan.length ? '下一題' : '完成'}</button>`;
    document.getElementById('go4').onclick = ask;
    reveal('#actions');
  };
  const count = () => nums(`第 ${n + 1} 題，共 ${plan.length} 題`);
  function choose(prompt, emoji, opts, right, why, okMsg) {
    lessonFrame(L, prompt, `<div class="u-big">${emoji}</div><div class="trail">${count()}</div>`);
    document.getElementById('out').onclick = leave;
    document.getElementById('actions').innerHTML = `<div class="choices col">${opts.map(o => `<button class="choice" data-o="${esc(o)}">${nums(o)}</button>`).join('')}</div>`;
    let clean = true;
    document.querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
      if (b.dataset.o === right) return passed(clean, okMsg);
      clean = false; sfx.retry(); b.classList.add('no'); b.disabled = true; setMsg(nums(why), 'hint');
    });
  }
  function order() {
    const items = Logic.orderQuestion(key), right = items.slice().sort((a, b) => a.base - b.base), show = Logic.shuffle(items), picked = [];
    lessonFrame(L, '由小到大排排看：<br>從最小的開始點。', `<div class="u-slots" id="slots"></div><div class="u-items">${show.map((x, i) => `<button class="u-item" data-x="${i}"><span class="u-e">${x.e}</span>${x.name}</button>`).join('')}</div><div class="trail">${count()}</div>`);
    document.getElementById('out').onclick = leave;
    let clean = true;
    const slots = () => { document.getElementById('slots').innerHTML = [0, 1, 2].map(i => `<span class="u-slot ${picked[i] ? 'on' : ''}">${picked[i] ? `${picked[i].e}<small>${nums(`${picked[i].v} ${picked[i].u}`)}</small>` : `<b class="num">${i + 1}</b>`}</span>`).join(''); };
    slots();
    document.querySelectorAll('[data-x]').forEach(b => b.onclick = () => {
      const x = show[+b.dataset.x];
      if (x === right[picked.length]) {
        picked.push(x); b.disabled = true; b.classList.add('no'); sfx.hop(); slots();
        if (picked.length === 3) passed(clean, `對了！由小到大：${right.map(r => `${r.name} ${r.v} ${r.u}`).join('，')}。`);
        return;
      }
      clean = false; sfx.retry();
      setMsg(`${x.name}還不是最小的，再想想看。`, 'hint');
    });
  }
  function ask() {
    if (n >= plan.length) return done(firstTry);
    const kind = plan[n];
    if (kind === 'order') return order();
    const x = nextItem();
    if (kind === 'sort') {
      const names = Logic.UNITS_OF[key].map(u => u);
      return choose(`${x.name}${x.dim}，<br>用哪個單位最合適？`, x.e, names, x.u, Logic.UNITS_OF[key].length === 3 ? '想想看：很小用小單位，很大用大單位。' : '很少或很輕用小單位，很多或很重用大單位。', `對了！${x.name}大約 ${x.v} ${x.u}。`);
    }
    const q = Logic.unitQuestion(key, x);
    choose(q.q, q.e, Logic.shuffle(q.opts), q.a, q.why, `對了！${q.why}`);
  }
  ask();
}
function runDrill(key, then) { // 單獨練習一輪
  const L = LESSONS[key], base = key === 'area' ? ['order', 'quiz', 'quiz', 'quiz', 'order', 'quiz'] : ['sort', 'quiz', 'order', 'sort', 'quiz', 'sort', 'order', 'quiz'];
  unitDrill(key, base, then, firstTry => {
    lessonFrame(L, `練習完成！`, `<div class="u-big">${L.icon}</div><div class="u-count"><b class="num">${firstTry}</b> ／ ${base.length} 題第一次就對</div><div class="trail">${nums(`夜空多亮了 ${firstTry * 25} 顆星`)}</div>`);
    document.getElementById('out').onclick = then;
    document.getElementById('actions').innerHTML = '<button class="btn" id="again">再練一輪</button><button class="btn alt" id="end">好了</button>';
    document.getElementById('again').onclick = () => runDrill(key, then);
    document.getElementById('end').onclick = then;
  });
}
// 哪座島第一次進去前要先上哪一課
const LESSON_BEFORE = { mm: ['len'], area: ['area'], meas: ['vol', 'time', 'weight'] };
function lessonsThen(ch, then) {
  const need = (LESSON_BEFORE[ch] || []).find(k => !(S.learned || {})[k]);
  if (!need) return then();
  const L = LESSONS[need];
  lessonFrame(L, `先認識${L.title}的單位，<br>等一下用起來就不怕了！`, `<div class="u-big">${L.icon}</div>`);
  document.getElementById('out').onclick = () => go('');
  document.getElementById('actions').innerHTML = '<button class="btn" id="yes">去上課</button><button class="btn alt" id="no">先跳過</button>';
  document.getElementById('yes').onclick = () => runLesson(need, () => lessonsThen(ch, then));
  document.getElementById('no').onclick = then;
}

/* ---------- 首頁 ---------- */
let titleShown = false;
function viewTitle() {
  titleShown = true;
  const flies = Array.from({ length: 12 }, (_, i) => `<i style="left:${8 + (i * 37) % 86}%;top:${22 + (i * 53) % 62}%;animation-delay:${(i * .6) % 4}s"></i>`).join('');
  document.body.classList.add('in-cine');
  $app.innerHTML = `<div class="title" style="${bgStyle(S.bossDone ? 'finale' : 'sky_dark')}">
    ${S.bossDone ? '' : '<div class="drift d1"></div><div class="drift d2"></div>'}
    <div class="flies">${flies}</div>
    <div class="title-top"><p class="kicker">星星船長出航</p><h1 class="logo">數感星星島</h1></div>
    ${artImg('liang_cheer', 'title-hero')}
    <div class="title-bottom">
      <button class="btn big" id="start">${S.opened ? '繼續冒險' : '開始冒險'}</button>
      <p class="title-note">${S.opened ? `船長，夜空已經亮了 ${Math.min(S.stars, S.bossDone ? 10000 : 9999)} 顆星` : '夜空需要一位星星船長'}</p>
    </div></div>`;
  document.getElementById('start').onclick = () => {
    document.body.classList.remove('in-cine');
    beep([[523, 0], [784, .12]]);
    viewHome();
  };
}
function viewHome() {
  window.scrollTo(0, 0);
  if (!S.opened) { S.opened = true; save(); return comic(OPENING.bg, OPENING.lines, viewHome, { skip: true, last: '出發！' }); }
  if (S.bossDone && !S.s2Seen) { S.s2Seen = true; save(); return comic(SEASON2.bg, SEASON2.lines, viewHome); }
  const keys = availKeys();
  const saved = k => (S.prog[k] || 0) >= ROUNDS_TO_SAVE;
  const allSaved = PIECE_KEYS.every(saved), nSaved = keys.filter(saved).length, nPieces = PIECE_KEYS.filter(saved).length;
  const bossNow = allSaved && !S.bossDone;
  const nextKey = bossNow ? null : keys.find(k => !saved(k) && S.prog[k]) || keys.find(k => !saved(k));
  const line = S.bossDone && !nextKey ? '夜空亮了！一萬顆星都在閃。' : S.bossDone ? `還有小星星迷路，下一站：${STORY[nextKey].place}！` : bossNow ? '碎片都到齊了，去找萬萬吧！' : nSaved === 0 && !S.prog[nextKey] ? `船長，先去${STORY[nextKey].place}！` : `下一站：${STORY[nextKey].place}，${STORY[nextKey].mission}！`;
  const ROW = 150, rows = keys.length + 1, pts = [];
  for (let i = 0; i < rows; i++) pts.push([i % 2 ? 70 : 30, ROW * i + 70]);
  const pathD = pts.map((q, i) => i === 0 ? `M${q[0]} ${q[1]}` : `C${pts[i - 1][0]} ${q[1] - 70} ${q[0]} ${pts[i - 1][1] + 70} ${q[0]} ${q[1]}`).join('');
  const stop = (k, i) => {
    const pr = Math.min(S.prog[k] || 0, ROUNDS_TO_SAVE), st = STORY[k], done = pr >= ROUNDS_TO_SAVE, now = k === nextKey && !done;
    const pips = Array.from({ length: ROUNDS_TO_SAVE }, (_, n) => `<i class="${n < pr ? 'on' : ''}"></i>`).join('');
    return `<button class="stop ${i % 2 ? 'right' : 'left'} ${done ? 'done' : ''} ${now ? 'now' : ''}" data-g="${k}" style="top:${ROW * i}px">
      <span class="medal" style="${bgStyle(st.bg)}"><span class="fog f${pr}"></span>${artImg(st.who, 'medal-who')}${done ? '<span class="badge">✓</span>' : ''}</span>
      <span class="plate"><b>${GAMES[k].name}</b><em class="sem">${GAMES[k].sem}</em><span class="lvl">${pips}</span></span>
      ${now ? artImg('liang', 'guide') : ''}
    </button>`;
  };
  $app.innerHTML = `
    <div class="map-bg"><div class="m1" style="${bgStyle('sky_dark')}"></div><div class="m2" style="${bgStyle('sky_bright')};opacity:${S.bossDone ? 1 : nSaved / keys.length * .85}"></div><div class="shade"></div></div>
    <header class="map-head">
      <div class="map-title"><h1 class="logo small">星星島</h1><div class="star-count">⭐ ${N(Math.min(S.stars, S.bossDone ? 10000 : 9999))}<small>／10000</small></div></div>
      <div class="hero-say">${artImg(S.bossDone ? 'liang_cheer' : 'liang', 'hero-liang')}<span>${line}</span></div>
    </header>
    <button class="lesson-entry" id="lessons"><span>📏🥛⚖️⏱️</span><b>單位教室</b><small>${Object.keys(S.learned || {}).length} / 5</small></button>
    <div class="map-trail" style="height:${ROW * rows + 8}px">
      <svg viewBox="0 0 100 ${ROW * rows}" preserveAspectRatio="none" aria-hidden="true"><path d="${pathD}" fill="none" stroke="#fff6e3" stroke-width="5" stroke-dasharray="3 11" stroke-linecap="round" vector-effect="non-scaling-stroke" opacity=".9"/></svg>
      ${keys.map(stop).join('')}
      <button class="stop ${keys.length % 2 ? 'right' : 'left'} cave ${allSaved && !S.bossDone ? 'now' : ''}" data-g="boss" ${allSaved ? '' : 'disabled'} style="top:${ROW * keys.length}px">
        <span class="medal" style="${bgStyle(BOSS.bg)}"><span class="fog ${S.bossDone ? 'f3' : allSaved ? 'f1' : 'f0'}"></span>${allSaved ? artImg(S.bossDone ? 'mimi_happy' : 'mimi', 'medal-who') : '<span class="lock">？</span>'}</span>
        <span class="plate"><b>${S.bossDone ? '和萬萬玩' : '找到萬萬'}</b><small>${allSaved ? (S.bossDone ? '再挑戰一次' : '把碎片拼回去') : `先找齊碎片（${nPieces}/9）`}</small></span>
      </button>
    </div>
    <nav class="dock">
      <button id="daily" class="${S.stamps[today()] ? 'stamped' : 'hot'}"><b>${S.stamps[today()] ? '✔' : '★'}</b>今日任務<small>${Object.keys(S.stamps).length} 個章</small></button>
      <button id="clues"><b>🌟</b>星星本<small>${nSaved} / ${keys.length}</small></button>
      <button id="practice"><b>✏️</b>練習場<small>自己選</small></button>
    </nav>`;
  document.querySelectorAll('[data-g]').forEach(b => b.onclick = () => enter(b.dataset.g));
  document.getElementById('daily').onclick = () => startRound('daily');
  document.getElementById('practice').onclick = viewPractice;
  document.getElementById('clues').onclick = viewClues;
  document.getElementById('lessons').onclick = viewLessons;
}

/* ---------- 家長頁 ---------- */
const UNITS = { 1: '三上1 數到10000', 2: '三上2 四位數的加減', 3: '三上3 乘法', 4: '三上4 幾毫米', 5: '三上5 角、正方形和長方形', 6: '三上6 除法', 7: '三上7 找規律', 8: '三上8 分數', 9: '三上9 圓', 11: '三下1 除法', 12: '三下2 公升和毫升', 13: '三下3 時間', 14: '三下4 兩步驟的計算', 15: '三下5 面積', 16: '三下6 公斤和公克', 17: '三下7 分數的加減', 18: '三下8 乘除的應用', 19: '三下9 小數', 20: '三下10 報讀表格' };
function summarize(g) {
  const L = S.log.filter(x => x.g === g), last = L.slice(-30);
  if (!last.length) return { n: 0, rate: '—', note: '還沒玩' };
  const first = last.filter(x => x.gr === 2).length, none = last.filter(x => x.gr === 0).length;
  let note = `最近 ${last.length} 題：第一次就對 ${first} 題，沒答出來 ${none} 題`;
  if (g === 'line') { const ds = last.filter(x => x.d && x.d.dist !== undefined).map(x => x.d.dist); if (ds.length) note += `；平均差全長的 ${Math.round(ds.reduce((a, b) => a + b, 0) / ds.length)}%`; }
  if (g === 'frog') { const ex = last.filter(x => x.d && x.d.extra !== undefined); if (ex.length) { note += `；${ex.filter(x => x.d.extra === 0).length}/${ex.length} 題跳到最少`; } }
  return { n: L.length, note };
}
function recentMisses() {
  return S.log.filter(x => x.gr === 0 && x.d && typeof x.d === 'object').slice(-8).reverse().map(x => {
    const d = x.d, n = GAMES[x.g].name;
    if (d.text) return `${n}：${d.text}，答 ${d.wrong}，正解 ${d.ans}`;
    if (d.l) return `${n}：${d.l} 和 ${d.r}`;
    if (d.a) return `${n}：每排 ${d.a} 顆、${d.b} 排（${{ count: '數全部', more: '多一排', less: '少一排', split: '切開', pack: '分裝', share: '平分' }[d.m]}），答 ${d.wrong}，正解 ${d.ans}`;
    if (d.dist !== undefined) return `${n}：差全長 ${d.dist}%`;
    if (d.ans !== undefined) return `${n}：答 ${d.wrong}，正解 ${d.ans}`;
    return n;
  });
}
function viewParent() {
  const rows = Object.entries(GAMES).map(([k, g]) => { const s = summarize(k); return `<tr><td>${g.name}</td><td>${Math.min(rec(k).lv, Logic.maxLevel(k, S.unit)) + 1} / ${Logic.maxLevel(k, S.unit) + 1}</td><td>${s.note}</td></tr>`; }).join('');
  const miss = recentMisses();
  $app.innerHTML = `<div class="parent">
    <h1>家長頁</h1>
    <h2>單元</h2><p>三上、三下所有單元都已開放，孩子可以自由選島。每座島和每一題都有標示是三上或三下。</p>
    <h2>各遊戲狀況</h2>
    <table><tr><th>遊戲</th><th>等級</th><th>紀錄</th></tr>${rows}</table>
    <h2>最近沒答出來的題目</h2>
    ${miss.length ? `<ul>${miss.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : '<p>目前沒有。</p>'}
    <h2>設定</h2>
    <p><label><input type="checkbox" id="snd" ${S.sound ? 'checked' : ''}> 音效</label></p>
    <button class="link" id="reset">清除這台裝置的紀錄</button><br>
    <button class="link" id="out">回小鎮</button>
    <p class="note" style="font-size:14px">紀錄只存在這台裝置的瀏覽器，不會傳到網路。題目皆為自編，非課本內容。</p>
  </div>`;
  document.getElementById('snd').onchange = e => { S.sound = e.target.checked; save(); };
  document.getElementById('reset').onclick = () => {
    if (confirm('確定清除所有星星和紀錄？')) { S.stars = 0; S.rec = {}; S.log = []; S.prog = {}; S.opened = false; S.bossDone = false; S.bossSeen = false; S.s2Seen = false; S.stamps = {}; S.fast = {}; S.learned = {}; save(); viewParent(); }
  };
  document.getElementById('out').onclick = () => go('');
}

/* ---------- 路由 ---------- */
function go(h) { if (location.hash.slice(1) === h) route(); else location.hash = h; }
function route() {
  window.onpointerup = null;
  document.body.classList.remove('in-cine');
  if (location.hash === '#parent') viewParent(); else if (!titleShown) viewTitle(); else viewHome();
}
window.addEventListener('hashchange', route);
new MutationObserver(() => annotate($app)).observe($app, { childList: true, subtree: true });
// 有新版就自動載入；進度存在瀏覽器裡，不受影響。正在答題時不打斷，下次切回來再檢查
async function checkUpdate() {
  if (!window.APP_V || R) return;
  try {
    const r = await fetch('version.txt?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return;
    const latest = (await r.text()).trim();
    if (!/^\d+$/.test(latest) || latest === window.APP_V || R) return;
    if (sessionStorage.getItem('shugan-updated-to') === latest) return; // 避免快取沒更新時一直重載
    sessionStorage.setItem('shugan-updated-to', latest);
    location.replace(location.pathname + '?v=' + latest + location.hash);
  } catch (e) {}
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkUpdate(); });
checkUpdate();
preloadArt().then(route);
