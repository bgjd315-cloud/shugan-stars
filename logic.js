// 數感星星島：題目產生與評分（南一三上，瀏覽器與 node 測試共用）
(function (root) {
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = arr => arr[ri(0, arr.length - 1)];
  const shuffle = arr => { const r = arr.slice(); for (let i = r.length - 1; i > 0; i--) { const j = ri(0, i); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  const uniqueOptions = (ans, makers, n = 3) => {
    const s = new Set([ans]); let g = 0;
    while (s.size < n && g++ < 80) { const v = makers(); if (v > 0 && v !== ans) s.add(v); }
    for (let k = 1; s.size < n; k++) s.add(ans + k);
    return shuffle([...s]);
  };

  /* ---------- 一：萬數大港（數到 10000） ---------- */
  const ZH = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  function toZh(n) { // 3807 → 三千八百零七
    if (n === 10000) return '一萬';
    const d = [Math.floor(n / 1000), Math.floor(n / 100) % 10, Math.floor(n / 10) % 10, n % 10], u = ['千', '百', '十', ''];
    let s = '', zero = false;
    d.forEach((x, i) => {
      if (x === 0) { if (s) zero = true; return; }
      if (zero) { s += '零'; zero = false; }
      s += ZH[x] + u[i];
    });
    return s || '零';
  }
  function genPort(lv) {
    const L = Math.min(lv, 5);
    const line = (v, steps, marks) => ({ kind: 'port', mode: 'place', a: 0, b: 10000, marks, v, steps, labelAll: false });
    if (L === 0) return line(ri(1, 9) * 1000, [1000], [0, 5000, 10000]);
    if (L === 1) return line(ri(1, 9) * 1000 + ri(1, 9) * 100, [1000, 100], [0, 5000, 10000]);
    if (L === 2) {
      const v = ri(1, 9) * 1000 + pick([ri(1, 9) * 100 + ri(1, 9), ri(1, 9) * 10, ri(1, 9), ri(1, 9) * 100 + ri(1, 9) * 10]);
      const opts = new Set([v]);
      const d = [Math.floor(v / 1000), Math.floor(v / 100) % 10, Math.floor(v / 10) % 10, v % 10];
      const alts = shuffle([[d[0], d[2], d[1], d[3]], [d[0], d[1], d[3], d[2]], [d[0], d[3], d[2], d[1]], [d[0] === 9 ? 8 : d[0] + 1, d[1], d[2], d[3]]]);
      alts.forEach(a => { const x = a[0] * 1000 + a[1] * 100 + a[2] * 10 + a[3]; if (opts.size < 3 && x !== v) opts.add(x); });
      return { kind: 'port', mode: 'word', v, word: toZh(v), options: shuffle([...opts]) };
    }
    if (L === 3) {
      const a = ri(1, 9) * 1000 + ri(0, 9) * 100 + ri(0, 99);
      const b = Math.random() < 0.6 ? a - a % 100 + ri(0, 99) : ri(1, 9) * 1000 + (a % 1000);
      return { kind: 'port', mode: 'cmp', l: a, r: b, ans: a > b ? 'L' : a < b ? 'R' : 'E' };
    }
    if (L === 4) { // 位值換算：32 個百是多少
      const t = pick(['百', '十', '千']);
      if (t === '百') { const n = ri(11, 58); return { kind: 'port', mode: 'trade', k: 0, h: n, t: 0, text: `${n} 個百`, ans: n * 100, why: `${n} 個百，就是 ${Math.floor(n / 10)} 個千和 ${n % 10} 個百。` }; }
      if (t === '十') { const n = ri(12, 96); return { kind: 'port', mode: 'trade', k: 0, h: 0, t: n, text: `${n} 個十`, ans: n * 10, why: `${n} 個十，就是 ${Math.floor(n / 10)} 個百和 ${n % 10} 個十。` }; }
      const k = ri(1, 8), h = ri(11, 19); return { kind: 'port', mode: 'trade', k, h, t: 0, text: `${k} 個千和 ${h} 個百`, ans: k * 1000 + h * 100, why: `${h} 個百，可以換成 1 個千和 ${h - 10} 個百。` };
    }
    return line(ri(1, 9) * 1000 + ri(1, 9) * 100 + ri(0, 9) * 10 + ri(1, 9), [1000, 100, 10, 1], [0, 5000, 10000]);
  }

  /* ---------- 二：貨船航線（四位數加減） ---------- */
  const HOPS = [1000, 100, 10, 1, -1, -10, -100, -1000];
  const MAXN = 11000;
  function bfs(s, t) {
    if (s === t) return [];
    const seen = new Int32Array(MAXN + 1).fill(-1), via = new Int16Array(MAXN + 1);
    seen[s] = s; let front = [s];
    while (front.length) {
      const next = [];
      for (const x of front) for (const h of HOPS) {
        const y = x + h;
        if (y < 0 || y > MAXN || seen[y] !== -1) continue;
        seen[y] = x; via[y] = h;
        if (y === t) { const p = []; for (let c = t; c !== s; c = seen[c]) p.unshift(via[c]); return p; }
        next.push(y);
      }
      front = next;
    }
    return null;
  }
  const shipQ = (s, t, extra) => { const best = bfs(s, t); return { kind: 'ship', mode: 'walk', s, t, par: best.length, best, ...extra }; };
  function genShip(lv) {
    const L = Math.min(lv, 4);
    if (L === 0) { const s = ri(1, 6) * 1000 + ri(1, 4) * 100 + ri(10, 40); return shipQ(s, s + ri(1, 2) * 1000 + ri(1, 3) * 100 + ri(1, 3) * 10); }
    if (L === 1) { const s = ri(1, 7) * 1000 + ri(1, 8) * 100 + ri(1, 89); return shipQ(s, s + pick([999, 1999, 990, 1100, 900, 1900, 2990])); }
    if (L === 2) { const s = ri(4, 9) * 1000 + ri(1, 8) * 100 + ri(1, 89); return shipQ(s, s - pick([999, 1999, 990, 1100, 900, 1900, 2990])); }
    if (L === 3) {
      const a = ri(12, 75) * 100 + pick([0, ri(1, 9) * 10, ri(1, 9)]), b = pick([998, 999, 1999, 1001, 2001, 2998, 990, 2010]);
      if (Math.random() < 0.5) return { ...shipQ(a, a + b), mode: 'expr', expr: `${a}＋${b}` };
      const big = a + 3000; return { ...shipQ(big, big - b), mode: 'expr', expr: `${big}－${b}` };
    }
    const near = x => x * 100 + pick([-2, -1, 1, 2, 8, -8, 9]);
    const x = ri(12, 45), y = ri(11, 40), a = near(x), b = near(y), add = Math.random() < 0.5;
    const big = near(x + y);
    const ans = add ? (x + y) * 100 : x * 100;
    const text = add ? `${a}＋${b}` : `${big}－${b}`;
    const why = add ? `${a} 大約是 ${x * 100}，${b} 大約是 ${y * 100}，想成 ${x * 100}＋${y * 100}。` : `${big} 大約是 ${(x + y) * 100}，${b} 大約是 ${y * 100}，想成 ${(x + y) * 100}－${y * 100}。`;
    return { kind: 'ship', mode: 'est', text, ans, why, options: shuffle([ans - 100, ans, ans + 100]) };
  }

  /* ---------- 三：倍數工廠（乘以一位數） ---------- */
  function genFact(lv, unit) {
    const L = Math.min(lv, maxLevel('fact', unit)), b = ri(2, 9);
    if (L === 5) { // 三下第 4 單元：兩步驟
      if (Math.random() < 0.5) { const p = pick([4, 6, 8, 12]), k = ri(2, 5), m = ri(2, 4); return { kind: 'fact', mode: 'two', head: `每盒 ${p} 顆，每箱 ${k} 盒，買 ${m} 箱。`, asks: ['1 箱有幾顆？', `${m} 箱有幾顆？`], steps: [p * k, p * k * m], why: `先算 1 箱：${p}×${k}，再算 ${m} 箱。` }; }
      const q = ri(3, 9), d = pick([3, 4, 5, 6]), plus = ri(4, 30), have = q * d - plus > 0 ? q * d - plus : null;
      if (have) return { kind: 'fact', mode: 'two', head: `原有 ${have} 顆，又買 ${plus} 顆，平分給 ${d} 個人。`, asks: ['全部有幾顆？', '每人幾顆？'], steps: [have + plus, q], why: `先加起來，再除以 ${d}。` };
      return { kind: 'fact', mode: 'two', head: `有 ${q * d + 5} 顆，吃掉 5 顆，平分給 ${d} 個人。`, asks: ['還剩幾顆？', '每人幾顆？'], steps: [q * d, q], why: `先減掉吃掉的，再除以 ${d}。` };
    }
    if (L === 0) { const t = ri(1, 9) * 10; return { kind: 'fact', mode: 'split', a: t, b, parts: [t], ans: t * b, why: `${t / 10} 個十乘以 ${b}，算 ${t / 10}×${b}，再補一個 0。` }; }
    if (L === 1) { const h = ri(1, 9) * 100; return { kind: 'fact', mode: 'split', a: h, b, parts: [h], ans: h * b, why: `${h / 100} 個百乘以 ${b}，算 ${h / 100}×${b}，再補兩個 0。` }; }
    if (L === 2) { const t = ri(1, 9) * 10, o = ri(1, 9); return { kind: 'fact', mode: 'split', a: t + o, b, parts: [t, o], ans: (t + o) * b, why: '十位和個位分開乘，再加起來。' }; }
    if (L === 3) { const h = ri(1, 7) * 100, t = ri(1, 9) * 10, o = ri(1, 9), bb = ri(2, 5); return { kind: 'fact', mode: 'split', a: h + t + o, b: bb, parts: [h, t, o], ans: (h + t + o) * bb, why: '百位、十位、個位分開乘，再全部加起來。' }; }
    const c = ri(1, 9) * 100, off = pick([-2, -1, 1, 2, 3]), a = c + off;
    return { kind: 'fact', mode: 'est', a, b, ans: c * b, options: shuffle([(c - 100 > 0 ? c - 100 : c + 200) * b, c * b, (c + 100) * b]), why: `${a} 大約是 ${c}，${c}×${b}＝${c * b}。` };
  }

  /* ---------- 四：毫米裁縫島 ---------- */
  function genMm(lv, unit) {
    const L = Math.min(lv, unit < 4 ? 0 : 5);
    if (L === 0) { const c = ri(2, 9); return { kind: 'mm', mode: 'read', mm: c * 10, unitText: '公分', ans: c, range: 100 }; }
    if (L === 1) { const mm = ri(11, 58); return { kind: 'mm', mode: 'read', mm, unitText: '毫米', ans: mm, range: 60 }; }
    if (L === 2) { const mm = ri(11, 58); return { kind: 'mm', mode: 'cut', mm, range: 60 }; }
    if (L === 3) { const c = ri(2, 15), m = ri(1, 9); return { kind: 'mm', mode: 'to', c, m, ans: c * 10 + m, text: `${c} 公分 ${m} 毫米`, why: `1 公分是 10 毫米，${c} 公分就是 ${c * 10} 毫米，再加 ${m} 毫米。` }; }
    if (L === 4) { const n = ri(23, 159); return { kind: 'mm', mode: 'from', n, steps: [Math.floor(n / 10), n % 10], why: `每 10 毫米是 1 公分，${n} 毫米是 ${Math.floor(n / 10)} 公分和 ${n % 10} 毫米。` }; }
    const u = unitQuestion('len');
    return { kind: 'mm', mode: 'guess', text: u.q, e: u.e, ans: u.a, options: shuffle(u.opts), why: u.why };
  }

  /* ---------- 五：角角山 ---------- */
  const angleKind = d => d === 90 ? 'right' : d < 90 ? 'acute' : 'obtuse';
  function genAngle(lv) {
    const L = Math.min(lv, 3);
    if (L === 0) {
      const a = ri(5, 15) * 10; let b; do { b = ri(5, 15) * 10; } while (Math.abs(a - b) < 20);
      return { kind: 'angle', mode: 'cmp', a, b, la: ri(40, 95), lb: ri(40, 95), ans: a > b ? 'L' : 'R', why: '角的大小看兩邊張開多少，和邊畫多長沒有關係。' };
    }
    if (L === 1 || L === 2) {
      const d = L === 1 ? pick([90, 90, ri(4, 7) * 10, ri(11, 15) * 10]) : pick([90, ri(70, 85), ri(95, 110), ri(4, 8) * 10]);
      return { kind: 'angle', mode: 'kind', d, ans: angleKind(d), tilt: pick([0, 20, 45, -20]) };
    }
    const shapes = [{ id: 'square', w: 90, h: 90, ans: 'square' }, { id: 'rect', w: 130, h: 70, ans: 'rect' }, { id: 'rect2', w: 70, h: 120, ans: 'rect' }, { id: 'none', w: 120, h: 80, skew: 26, ans: 'none' }];
    return { kind: 'angle', mode: 'shape', ...pick(shapes) };
  }

  /* ---------- 六：分分海灘（除法） ---------- */
  function genDiv(lv, unit) {
    const L = Math.min(lv, maxLevel('div', unit)), b = ri(2, 9), q = ri(2, 9);
    if (L === 5) { // 三下第 1 單元：先分大的，再分小的
      const d = ri(2, 5), big = pick([1, 2, 3]), small = ri(1, 4), hund = Math.random() < 0.4;
      const parts = hund ? [d * big * 100, d * small * 10] : [d * big * 10, d * small];
      return { kind: 'div', mode: 'split', d, parts, total: parts[0] + parts[1], ans: (parts[0] + parts[1]) / d, why: '先分大的，再分小的，最後加起來。' };
    }
    if (L === 6) { // 三下第 8 單元：乘除互逆
      const x = ri(2, 9), y = ri(2, 9), p = x * y;
      return pick([{ text: `□×${y}＝${p}`, ans: x, per: y, n: x, say: `每袋 ${y} 顆，要裝滿 ${p} 顆，要幾袋？`, why: `□ 可以用 ${p}÷${y} 算。` }, { text: `${x}×□＝${p}`, ans: y, per: x, n: y, say: `每袋 ${x} 顆，要裝滿 ${p} 顆，要幾袋？`, why: `□ 可以用 ${p}÷${x} 算。` }, { text: `□÷${y}＝${x}`, ans: p, per: x, n: y, say: `平分給 ${y} 個人，每人 ${x} 顆，原來有幾顆？`, why: `□ 可以用 ${x}×${y} 算。` }, { text: `${p}÷□＝${x}`, ans: y, per: x, n: y, say: `${p} 顆，每人分 ${x} 顆，可以分給幾個人？`, why: `□ 可以用 ${p}÷${x} 算。` }].map(o => ({ kind: 'div', mode: 'missing', ...o })));
    }
    if (L === 0) return { kind: 'div', mode: 'deal', total: b * q, b, q, r: 0, signless: unit < 6, steps: [q] };
    if (L === 1) return { kind: 'div', mode: 'deal', total: b * q, b, q, r: 0, steps: [q] };
    if (L === 2) { const r = ri(1, b - 1 || 1); const bb = Math.max(b, 3), rr = Math.min(r, bb - 1); return { kind: 'div', mode: 'deal', total: bb * q + rr, b: bb, q, r: rr, steps: [q, rr] }; }
    if (L === 3) { const n = ri(11, 49); return { kind: 'div', mode: 'odd', n, ans: n % 2 === 0 ? 'even' : 'odd' }; }
    return pick([{ kind: 'div', mode: 'rule', text: `0÷${b}`, ans: 0, why: '0 個東西分給幾個人，每人都是 0 個。' }, { kind: 'div', mode: 'rule', text: `${q}÷1`, ans: q, why: `全部分給 1 個人，他就有 ${q} 個。` }, (() => { const s = b * q, r = ri(1, b - 1); return { kind: 'div', mode: 'check', text: `${s + r}÷${b}`, b, q, r, s: s + r, ans: q * b + r, why: `商×除數＋餘數，就會變回被除數：${q}×${b}＋${r}＝${s + r}。` }; })()]);
  }

  /* ---------- 七：規律花園 ---------- */
  function genRule(lv, unit) {
    const L = Math.min(lv, unit < 7 ? 1 : 4);
    if (L === 0) { const d = pick([2, 3, 4, 5, 10]), s = ri(1, 20); return seqQ([0, 1, 2, 3, 4].map(i => s + d * i), `每次多 ${d}。`); }
    if (L === 1) { const d = pick([2, 3, 4, 5]), s = ri(30, 60); return seqQ([0, 1, 2, 3, 4].map(i => s - d * i), `每次少 ${d}。`); }
    if (L === 2) { const d = pick([100, 200, 500, 1000, 25, 50]), s = ri(1, 9) * 100; return seqQ([0, 1, 2, 3, 4].map(i => s + d * i), `每次多 ${d}。`); }
    if (L === 3) { // 差會變：1,3,6,10
      const s = ri(1, 5), st = ri(1, 3); const a = [s]; for (let i = 0; i < 4; i++) a.push(a[i] + st + i);
      return seqQ(a, `相差每次多 1：${st}、${st + 1}、${st + 2}、${st + 3}。`);
    }
    const unitN = pick([3, 4, 5]), k = ri(4, 7);
    return { kind: 'rule', mode: 'grow', unitN, k, ans: unitN * k, why: `每多一朵花，就多 ${unitN} 片花瓣，${k} 朵就是 ${unitN}×${k}。` };
  }
  function seqQ(a, why) { return { kind: 'rule', mode: 'seq', seq: a.slice(0, 4), ans: a[4], why }; }

  /* ---------- 八：分數烘焙坊 ---------- */
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  function genFrac(lv, unit) {
    const L = Math.min(lv, maxLevel('frac', unit)), n = ri(3, 12);
    if (L === 4) { let a, b; do { a = ri(1, n); b = ri(1, n); } while (a === b); return { kind: 'frac', mode: 'cmp', n, a, b, ans: a > b ? 'L' : 'R' }; }
    if (L === 5) { const a = ri(1, n - 1), b = ri(1, n); return { kind: 'frac', mode: 'add', n, a, b, ans: a + b, sum: true }; }
    if (L === 6) { const a = ri(2, n + 2), b = ri(1, a - 1); return { kind: 'frac', mode: 'sub', n, a, b, ans: a - b }; }
    if (L === 0) { const m = ri(2, 9); return { kind: 'frac', mode: 'unit', n: m, a: 1 }; }
    if (L === 1) { const a = ri(2, n - 1); return { kind: 'frac', mode: 'name', n, a }; }
    if (L === 2) { const a = ri(1, n - 1); return { kind: 'frac', mode: 'make', n, a }; }
    const a = ri(2, n); return { kind: 'frac', mode: 'accum', n, a, whole: a === n };
  }

  /* ---------- 九：圓圓天文台 ---------- */
  function genCircle(lv, unit) {
    const L = Math.min(lv, unit < 9 ? 0 : 3);
    if (L === 0) return { kind: 'circle', mode: 'center', cx: ri(70, 130), cy: ri(70, 130), r: ri(45, 60) };
    if (L === 1) { const t = pick(['radius', 'diameter', 'neither']); return { kind: 'circle', mode: 'name', line: t, turn: ri(0, 170), ans: t }; }
    if (L === 2) { const r = ri(2, 20); return Math.random() < 0.5 ? { kind: 'circle', mode: 'size', r, ask: 'd', ans: r * 2, why: `直徑是半徑的 2 倍，${r}×2＝${r * 2}。` } : { kind: 'circle', mode: 'size', r, ask: 'r', ans: r, why: `半徑是直徑的一半，${r * 2} 的一半是 ${r}。` }; }
    return { kind: 'circle', mode: 'long', turn: ri(0, 170), ans: 'd', why: '通過圓心的直徑，是圓裡面最長的直線。' };
  }

  /* ---------- 十：面積牧場（三下第 5 單元） ---------- */
  function genArea(lv) {
    if (Math.random() < 0.2) { const u = unitQuestion('area'); return { kind: 'area', mode: 'pick', text: u.q, e: u.e, ans: u.a, options: shuffle(u.opts), why: u.why }; }
    const L = Math.min(lv, 4), w = ri(2, 8), h = ri(2, 6);
    if (L === 0) return { kind: 'area', mode: 'count', w: ri(2, 4), h: ri(2, 3), lines: true };
    if (L === 1) return { kind: 'area', mode: 'count', w, h, lines: true, needMul: true };
    if (L === 2) { const a = pick([12, 16, 18, 24]), pairs = { 12: [[3, 4], [2, 6]], 16: [[4, 4], [2, 8]], 18: [[3, 6], [2, 9]], 24: [[4, 6], [3, 8]] }[a]; const [p, q2] = pairs; let o; do { o = [ri(2, 8), ri(2, 6)]; } while (o[0] * o[1] === a); const cards = shuffle([{ w: p[0], h: p[1], same: true }, { w: q2[0], h: q2[1], same: true }, { w: o[0], h: o[1], same: false }]); return { kind: 'area', mode: 'same', a, cards }; }
    if (L === 3) { const W = ri(4, 7), H = ri(3, 5), cw = ri(1, W - 2), ch = ri(1, H - 2); return { kind: 'area', mode: 'cut', W, H, cw, ch, ans: W * H - cw * ch }; }
    const a = pick([2, 4, 6, 8]), b = pick([3, 4, 5, 6]); return { kind: 'area', mode: 'half', w: a, h: b, ans: a * b / 2 };
  }

  /* ---------- 十一：小數碼頭（三下第 9 單元），一律用「十分之幾」整數計算 ---------- */
  const d1 = n => (n / 10).toFixed(1);
  function genDeci(lv) {
    const L = Math.min(lv, 4);
    if (L === 0) { const a = ri(1, 9); return { kind: 'deci', mode: 'color', a, ans: a }; }
    if (L === 1) { const n = ri(3, 29); return { kind: 'deci', mode: 'count', n, text: d1(n), ans: n }; }
    if (L === 2) { let a, b; do { a = ri(1, 39); b = ri(1, 39); } while (a === b); return { kind: 'deci', mode: 'cmp', a, b, l: d1(a), r: d1(b), ans: a > b ? 'L' : 'R' }; }
    if (L === 3) { const a = ri(1, 9), b = ri(1, 10 - a); return { kind: 'deci', mode: 'calc', text: `${d1(a)}＋${d1(b)}`, tenths: a + b, why: `${a} 個 0.1 和 ${b} 個 0.1，合起來 ${a + b} 個 0.1。` }; }
    const a = ri(11, 39), b = ri(1, 9), plus = Math.random() < 0.5;
    return { kind: 'deci', mode: 'calc', text: plus ? `${d1(a)}＋${d1(b)}` : `${d1(a)}－${d1(b)}`, tenths: plus ? a + b : a - b, why: `都想成幾個 0.1：${a} 個 ${plus ? '加' : '減'} ${b} 個。` };
  }

  /* ---------- 單位的量感題（單位教室與量量市集共用） ---------- */
  // 每樣東西：圖、名字、問法、數值、單位、最小單位的量（用來排大小）。皆為生活中的大約值
  const UNIT_FACTOR = { 毫米: 1, 公分: 10, 公尺: 1000, 毫升: 1, 公升: 1000, 公克: 1, 公斤: 1000, 秒: 1, 分鐘: 60, 小時: 3600, 平方公分: 1 };
  const it = (e, name, dim, v, u) => ({ e, name, dim, v, u, base: v * UNIT_FACTOR[u] });
  const UNIT_ITEMS = {
    len: [
      it('🪙', '十元硬幣的厚度', '多厚', 2, '毫米'), it('🐜', '一隻螞蟻', '多長', 4, '毫米'), it('🍚', '一粒米', '多長', 6, '毫米'), it('🔘', '襯衫的鈕扣', '多寬', 10, '毫米'), it('🟡', '一元硬幣', '多寬', 20, '毫米'),
      it('🧽', '一塊橡皮擦', '多長', 5, '公分'), it('✋', '手掌', '多寬', 7, '公分'), it('✏️', '一枝新鉛筆', '多長', 18, '公分'), it('📏', '一把長尺', '多長', 30, '公分'), it('🪑', '課桌', '多高', 70, '公分'),
      it('🚪', '教室的門', '多高', 2, '公尺'), it('🧑‍🏫', '黑板', '多長', 4, '公尺'), it('🏫', '教室', '多長', 9, '公尺'), it('🚌', '一輛公車', '多長', 10, '公尺'), it('🏃', '操場跑道一圈', '多長', 200, '公尺'),
    ],
    vol: [
      it('💊', '一小杯藥水', '裝多少', 10, '毫升'), it('🥄', '一湯匙水', '裝多少', 15, '毫升'), it('🧃', '一小瓶養樂多', '裝多少', 100, '毫升'), it('🥤', '一包鋁箔包飲料', '裝多少', 250, '毫升'), it('🥫', '一罐汽水', '裝多少', 330, '毫升'), it('🧴', '一瓶礦泉水', '裝多少', 600, '毫升'),
      it('🥛', '一大瓶鮮奶', '裝多少', 1, '公升'), it('🍾', '一大瓶汽水', '裝多少', 2, '公升'), it('🫖', '一壺熱水', '裝多少', 3, '公升'), it('🪣', '一個水桶', '裝多少', 10, '公升'), it('🛁', '一缸洗澡水', '裝多少', 200, '公升'),
    ],
    weight: [
      it('📎', '一根迴紋針', '多重', 1, '公克'), it('🟡', '一元硬幣', '多重', 4, '公克'), it('📄', '一張紙', '多重', 5, '公克'), it('🥚', '一顆雞蛋', '多重', 50, '公克'), it('🍎', '一顆蘋果', '多重', 200, '公克'), it('📖', '一本課本', '多重', 300, '公克'),
      it('🍚', '一包大砂糖', '多重', 1, '公斤'), it('🍾', '一大瓶汽水', '多重', 2, '公斤'), it('🎒', '裝滿書的書包', '多重', 3, '公斤'), it('🍉', '一顆大西瓜', '多重', 5, '公斤'), it('🧒', '三年級的孩子', '多重', 30, '公斤'), it('🧑', '一個大人', '多重', 60, '公斤'),
    ],
    time: [
      it('👏', '拍一下手', '要多久', 1, '秒'), it('🧢', '戴帽子', '要多久', 10, '秒'), it('🧼', '好好洗手', '要多久', 30, '秒'),
      it('🍜', '泡一碗泡麵', '要多久', 3, '分鐘'), it('🪥', '好好刷牙', '要多久', 4, '分鐘'), it('🔔', '一節下課', '有多久', 10, '分鐘'), it('🏫', '一節課', '有多久', 40, '分鐘'),
      it('🎬', '看一部電影', '要多久', 2, '小時'), it('🎒', '在學校上課一天', '大約多久', 7, '小時'), it('🛌', '晚上睡覺', '要多久', 9, '小時'),
    ],
    area: [
      it('👆', '食指的指腹', '多大', 1, '平方公分'), it('📮', '一張郵票', '多大', 6, '平方公分'), it('💳', '一張悠遊卡', '多大', 46, '平方公分'), it('🗒️', '一張便利貼', '多大', 56, '平方公分'), it('✋', '手掌', '多大', 100, '平方公分'), it('📖', '一本課本的封面', '多大', 500, '平方公分'),
    ],
  };
  const UNITS_OF = { len: ['毫米', '公分', '公尺'], vol: ['毫升', '公升'], weight: ['公克', '公斤'], time: ['秒', '分鐘', '小時'], area: ['平方公分'] };
  function unitQuestion(fam, item) { // 同一個數字配不同單位，感覺哪個才合理
    const x = item || pick(UNIT_ITEMS[fam]), right = `${x.v} ${x.u}`, others = UNITS_OF[fam].filter(u => u !== x.u);
    let opts;
    if (others.length >= 2) opts = [right, `${x.v} ${others[0]}`, `${x.v} ${others[1]}`];
    else if (others.length === 1) opts = [right, `${x.v} ${others[0]}`, `${x.v * 10} ${others[0]}`];
    else opts = [right, `${x.v * 100} ${x.u}`, `${x.v * 1000} ${x.u}`];
    return { e: x.e, q: `${x.name}大約${x.dim}？`, a: right, opts, why: `${x.name}大約 ${right}。` };
  }
  function orderQuestion(fam) { // 挑 3 樣差很多的東西，排大小
    const pool = shuffle(UNIT_ITEMS[fam]), got = [];
    for (const x of pool) { if (got.length < 3 && got.every(g => Math.max(g.base, x.base) / Math.min(g.base, x.base) >= 2)) got.push(x); }
    return got;
  }
  const UNIT_QUIZ = Object.fromEntries(Object.keys(UNIT_ITEMS).map(k => [k, UNIT_ITEMS[k].map(x => unitQuestion(k, x))]));

  /* ---------- 十二：量量市集（三下第 2、3、6、10 單元） ---------- */
  function genMeas(lv, unit) {
    const types = ['ml'];
    if (unit >= 13) types.push('time');
    if (unit >= 16) types.push('g', 'dial');
    if (unit >= 20) types.push('table');
    if (Math.random() < 0.3) { const u = unitQuestion(pick(['vol', 'weight', 'time'])); return { kind: 'meas', mode: 'pick', text: u.q, e: u.e, ans: u.a, options: shuffle(u.opts), why: u.why }; }
    const t = lv <= 0 ? 'ml' : pick(types), big = ri(1, 5), small = ri(1, 9) * 100 + pick([0, 0, 50]);
    if (t === 'ml') return Math.random() < 0.5 || lv === 0 ? { kind: 'meas', mode: 'to', big, small, per: 1000, u1: '公升', text: `${big} 公升 ${small} 毫升`, unit: '毫升', ans: big * 1000 + small, why: `1 公升是 1000 毫升。` } : { kind: 'meas', mode: 'from', per: 1000, text: `${big * 1000 + small} 毫升`, u1: '公升', u2: '毫升', steps: [big, small], why: '每 1000 毫升是 1 公升。' };
    if (t === 'g') return Math.random() < 0.5 ? { kind: 'meas', mode: 'to', big, small, per: 1000, u1: '公斤', text: `${big} 公斤 ${small} 公克`, unit: '公克', ans: big * 1000 + small, why: '1 公斤是 1000 公克。' } : { kind: 'meas', mode: 'from', per: 1000, text: `${big * 1000 + small} 公克`, u1: '公斤', u2: '公克', steps: [big, small], why: '每 1000 公克是 1 公斤。' };
    if (t === 'time') { const h = ri(1, 4), m = ri(5, 55); const min = ri(2, 5), s = ri(5, 55); return pick([{ kind: 'meas', mode: 'to', big: h, small: m, per: 60, u1: '小時', text: `${h} 小時 ${m} 分`, unit: '分', ans: h * 60 + m, why: '1 小時是 60 分鐘。' }, { kind: 'meas', mode: 'to', big: min, small: s, per: 60, u1: '分', text: `${min} 分 ${s} 秒`, unit: '秒', ans: min * 60 + s, why: '1 分鐘是 60 秒。' }, { kind: 'meas', mode: 'from', per: 60, text: `${h * 60 + m} 分`, u1: '小時', u2: '分', steps: [h, m], why: '每 60 分鐘是 1 小時。' }]); }
    if (t === 'dial') { const g = ri(1, 19) * 50; return { kind: 'meas', mode: 'dial', g, ans: g }; }
    const rows = ['一班', '二班', '三班'], cols = ['晴天', '雨天'], data = rows.map(() => cols.map(() => ri(3, 19))), r = ri(0, 2), c = ri(0, 1);
    return { kind: 'meas', mode: 'table', rows, cols, data, r, c, ans: data[r][c] };
  }

  // 單元 1–9 是三上，11–20 是三下第 1–10 單元；還沒教到的島先出二年級就學過的基礎題
  function maxLevel(game, unit) {
    if (game === 'port') return 5;
    if (game === 'ship') return unit >= 2 ? 4 : 2;
    if (game === 'fact') return unit >= 14 ? 5 : unit >= 3 ? 4 : 0;
    if (game === 'mm') return unit >= 4 ? 5 : 0;
    if (game === 'angle') return 3;
    if (game === 'div') return unit >= 18 ? 6 : unit >= 11 ? 5 : unit >= 6 ? 4 : 0;
    if (game === 'rule') return unit >= 7 ? 4 : 1;
    if (game === 'frac') return unit >= 17 ? 6 : unit >= 8 ? 3 : 0;
    if (game === 'area') return 4;
    if (game === 'deci') return 4;
    if (game === 'meas') return unit >= 13 ? 3 : 0;
    return unit >= 9 ? 3 : 0;
  }
  const GEN = { port: genPort, ship: genShip, fact: genFact, mm: genMm, angle: genAngle, div: genDiv, rule: genRule, frac: genFrac, circle: genCircle, area: genArea, deci: genDeci, meas: genMeas };
  function gen(game, lv, unit) { return GEN[game](Math.min(lv, maxLevel(game, unit)), unit); }
  function adjust(rec, grade, maxLv) {
    rec.up = grade === 2 ? (rec.up || 0) + 1 : 0;
    rec.down = grade === 0 ? (rec.down || 0) + 1 : 0;
    if (rec.up >= 3) { rec.lv = Math.min((rec.lv || 0) + 1, maxLv); rec.up = 0; }
    if (rec.down >= 2) { rec.lv = Math.max((rec.lv || 0) - 1, 0); rec.down = 0; }
    return rec;
  }
  const api = { UNIT_QUIZ, UNIT_ITEMS, UNIT_FACTOR, UNITS_OF, unitQuestion, orderQuestion, gen, GEN, toZh, bfs, adjust, maxLevel, angleKind, gcd, HOPS, ri, pick, shuffle, uniqueOptions };
  if (typeof module !== 'undefined') module.exports = api; else root.Logic = api;
})(this);
