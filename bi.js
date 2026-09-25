/* ===== BI da operação · Ben Hur Andrade ===== */
const BI_PAL = ['#b58c2e', '#3a78e0', '#d9702e', '#169aa6', '#c9456f', '#8a6de0']; // validado (dark, surface #121214): banda, croma, CVD ≥8, normal ≥15, contraste ≥3
const BI = { st: {} };
const ym = d => d.toISOString().slice(0, 7);
const addM = (m, k) => { const [y, mo] = m.split('-').map(Number); return ym(new Date(Date.UTC(y, mo - 1 + k, 15))); };
const mLbl = (m, long) => new Date(m + '-15T12:00:00').toLocaleDateString('pt-BR', long ? { month: 'long', year: 'numeric' } : { month: 'short' }).replace('.', '') + (!long && m.endsWith('-01') ? " '" + m.slice(2, 4) : '');
const kfmt = v => Math.abs(v) >= 1000 ? 'R$ ' + num(v / 1000, v >= 100000 ? 0 : 1) + 'k' : money(v);
const pct = (a, b) => b ? a / b * 100 : 0;
const monthsBetween = (a, b) => { const [y1, m1] = a.split('-').map(Number), [y2, m2] = b.split('-').map(Number); return (y2 - y1) * 12 + (m2 - m1); };

async function biPage() {
  const [{ data: inv }, { data: cts }, { data: clicks }, { data: nps }, { data: st }] = await Promise.all([
    sb.from('invoices').select('*'), sb.from('contracts').select('id,company_id,status,monthly_amount,due_day,start_date,end_date'),
    sb.from('offer_clicks').select('company_id,created_at'), sb.from('nps_responses').select('company_id,score'), sb.from('settings').select('*')]);
  const S = Object.fromEntries((st || []).map(x => [x.key, x.value]));
  const live = (inv || []).filter(i => i.status !== 'cancelled'); const now = new Date(); const mNow = ym(now); const t = now.toISOString().slice(0, 10);
  const lastComp = live.map(i => i.competence.slice(0, 7)).sort().pop() || mNow;
  const REF = window._biMes || (lastComp > mNow ? lastComp : mNow);
  const order = [...COS].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '')); const colorOf = id => BI_PAL[Math.max(0, order.findIndex(c => c.id === id)) % BI_PAL.length];
  const prof = c => { const k = (cts || []).find(x => x.company_id === c.id && x.status === 'signed'); return { fee: Number(k ? k.monthly_amount : (c.monthly_fee || 0)), due: (k ? k.due_day : c.due_day) || 10, start: ((k ? k.start_date : c.billing_start) || c.created_at || '2000-01-01').slice(0, 7), end: c.ended_at ? c.ended_at.slice(0, 7) : (k?.end_date ? k.end_date.slice(0, 7) : '9999-12'), contrato: !!k }; };
  const base = COS.map(c => ({ c, p: prof(c) })).filter(x => x.p.fee > 0);
  const activeIn = m => base.filter(x => x.p.start <= m && x.p.end > m && (x.c.active || (x.c.ended_at && x.c.ended_at.slice(0, 7) > m)));
  const mrrAt = m => activeIn(m).reduce((a, x) => a + x.p.fee, 0);
  const sum = a => a.reduce((x, i) => x + Number(i.amount), 0);
  const ofComp = m => live.filter(i => i.competence.slice(0, 7) === m);
  // ---- KPIs do mês de referência
  const mrr = mrrAt(REF), mrrPrev = mrrAt(addM(REF, -1)); const ativos = activeIn(REF), prevAtivos = activeIn(addM(REF, -1));
  const novos = ativos.filter(x => !prevAtivos.some(y => y.c.id === x.c.id)), churn = prevAtivos.filter(x => !ativos.some(y => y.c.id === x.c.id));
  const newMRR = novos.reduce((a, x) => a + x.p.fee, 0), churnMRR = churn.reduce((a, x) => a + x.p.fee, 0);
  const fat = sum(ofComp(REF)), rec = sum(ofComp(REF).filter(i => i.status === 'paid')), aberto = sum(ofComp(REF).filter(i => ['open', 'review'].includes(i.status)));
  const caixaMes = sum(live.filter(i => i.status === 'paid' && (i.paid_at || '').slice(0, 7) === REF));
  const atrasoAll = live.filter(i => i.status === 'open' && i.due_date < t); const fatAteHoje = sum(live.filter(i => i.due_date <= t));
  const inad = pct(sum(atrasoAll), fatAteHoje);
  const ticket = ativos.length ? mrr / ativos.length : 0;
  const year = REF.slice(0, 4); const ytd = sum(live.filter(i => i.status === 'paid' && i.competence.slice(0, 4) === year));
  const restoAno = []; for (let m = addM(REF, 1); m.slice(0, 4) === year; m = addM(m, 1)) restoAno.push(m);
  const fatAnoAteRef = sum(live.filter(i => i.competence.slice(0, 4) === year && i.competence.slice(0, 7) <= REF));
  const projAno = fatAnoAteRef + restoAno.reduce((a, m) => a + mrrAt(m), 0);
  const shares = ativos.map(x => x.p.fee).sort((a, b) => b - a); const top1 = pct(shares[0] || 0, mrr), top3 = pct(shares.slice(0, 3).reduce((a, b) => a + b, 0), mrr);
  const pagos = live.filter(i => i.status === 'paid' && i.paid_at); const pontuais = pagos.filter(i => i.paid_at.slice(0, 10) <= i.due_date);
  const prazo = pagos.length ? pagos.reduce((a, i) => a + (new Date(i.paid_at) - new Date(i.due_date + 'T12:00:00')) / 864e5, 0) / pagos.length : 0;
  const comContrato = pct(ativos.filter(x => x.p.contrato).reduce((a, x) => a + x.p.fee, 0), mrr);
  const casa = ativos.length ? ativos.reduce((a, x) => a + Math.max(1, monthsBetween(x.p.start, REF) + 1), 0) / ativos.length : 0;
  const npsV = (nps || []).length ? Math.round(pct(nps.filter(n => n.score >= 9).length - nps.filter(n => n.score <= 6).length, nps.length)) : null;
  const goal = Number(S.mrr_goal || 0);
  BI.st = { REF, mNow, t, live, base, activeIn, mrrAt, ofComp, sum, colorOf, mrr, ticket, goal, S, clicks: clicks || [], ativos };
  const tile = (l, v, sub, extra = '') => `<div class="stat bi-tile" ${extra}><small>${l}</small><b>${v}</b><small>${sub || ''}</small></div>`;
  const delta = (a, b) => b ? `<span class="${a >= b ? 'up' : 'dn'}">${a >= b ? '▲' : '▼'} ${num(Math.abs(pct(a - b, b)), 1)}%</span> vs mês anterior` : 'sem base anterior';
  const opts = []; for (let k = -9; k <= 6; k++) opts.push(addM(mNow, k)); if (!opts.includes(REF)) opts.push(REF);
  OUT.innerHTML = `<div class="toolbar"><div><div class="page-title">BI da operação</div><div class="page-sub" style="margin:0">Receita, recebimento, previsibilidade e escala. Valores por mês de competência da fatura.</div></div><span class="sp"></span>
    <label class="bi-filter"><span class="mono">Mês de referência</span><select onchange="window._biMes=this.value;route()">${opts.sort().map(m => `<option value="${m}" ${m === REF ? 'selected' : ''}>${mLbl(m, true)}${m === mNow ? ' (atual)' : ''}</option>`).join('')}</select></label>
    <label class="bi-filter"><span class="mono">Meta de MRR</span><input type="number" step="500" value="${goal}" style="width:130px" onchange="sb.from('settings').upsert({key:'mrr_goal',value:this.value}).then(route)"></label></div>
  <div class="bi-grid6">
    ${tile('MRR · receita recorrente', money(mrr), delta(mrr, mrrPrev), 'style="grid-column:span 2"')}
    ${tile('ARR · anualizado', money(mrr * 12), 'MRR × 12')}
    ${tile('Faturado em ' + mLbl(REF), money(fat), ofComp(REF).length + ' fatura(s) · ' + (fat ? num(pct(fat, mrr), 0) + '% do MRR' : 'mês não gerado'))}
    ${tile('Recebido de ' + mLbl(REF), money(rec), 'taxa de recebimento ' + num(pct(rec, fat), 0) + '%', `data-tone="${fat && rec >= fat ? 'ok' : ''}"`)}
    ${tile('Em aberto do mês', money(aberto), 'caixa que entrou no mês: ' + money(caixaMes))}
  </div>
  <div class="bi-grid6" style="margin-top:12px">
    ${tile('Clientes ativos', ativos.length, `${novos.length ? '+' + novos.length + ' novo(s) ' + kfmt(newMRR) : 'sem novos'}${churn.length ? ' · −' + churn.length + ' saída(s) ' + kfmt(churnMRR) : ''}`)}
    ${tile('Ticket médio', money(ticket), 'LTV estimado ' + money(ticket * casa) + ' (' + num(casa, 1) + ' meses de casa)')}
    ${tile('Receita ' + year, money(ytd), 'recebido no ano · projeção ' + kfmt(projAno))}
    ${tile('Inadimplência', num(inad, 1) + '%', atrasoAll.length ? money(sum(atrasoAll)) + ' em ' + atrasoAll.length + ' fatura(s) · ⚠' : 'nada em atraso · ✓', `data-tone="${atrasoAll.length ? 'bad' : 'ok'}"`)}
    ${tile('Pontualidade', num(pct(pontuais.length, pagos.length), 0) + '%', pagos.length ? 'pago em média ' + (prazo <= 0 ? num(-prazo, 0) + ' dia(s) antes' : num(prazo, 0) + ' dia(s) depois') + ' do vencimento' : 'sem pagamentos')}
    ${tile('Concentração', num(top1, 0) + '%', 'maior cliente · top 3 = ' + num(top3, 0) + '% do MRR', `data-tone="${top1 >= 40 ? 'warn' : ''}"`)}
  </div>
  <div class="bi-grid6" style="margin-top:12px">
    ${tile('Receita com contrato', num(comContrato, 0) + '%', 'previsibilidade jurídica da carteira', `data-tone="${comContrato < 50 ? 'warn' : 'ok'}"`)}
    ${tile('Meta de MRR', goal ? num(pct(mrr, goal), 0) + '%' : '–', goal ? 'faltam ' + money(Math.max(0, goal - mrr)) + ' · ' + Math.ceil(Math.max(0, goal - mrr) / (ticket || 1)) + ' cliente(s) no ticket atual' : 'defina a meta no topo')}
    ${tile('Interesse em upsell', BI.st.clicks.filter(c => c.created_at.slice(0, 7) === REF).length, 'cliques em "Quero contratar" no mês')}
    ${tile('NPS', npsV === null ? '–' : npsV, (nps || []).length ? (nps || []).length + ' resposta(s)' : 'sem respostas ainda')}
    ${tile('Receita perdida (churn)', money(churnMRR), churn.length ? churn.map(x => esc(x.c.name)).join(', ') : 'nenhuma saída no mês')}
    ${tile('Crescimento líquido', money(newMRR - churnMRR), 'novo MRR − MRR perdido')}
  </div>
  <div class="bi-row">
    <div class="card bi-card" style="flex:1.7"><h3>MRR: histórico e projeção <span class="mono" style="margin-left:auto">cenários do simulador</span></h3><div id="chMRR" class="bi-chart"></div><div class="bi-legend" id="lgMRR"></div><details class="bi-data"><summary>Ver dados</summary><div id="tbMRR"></div></details></div>
    <div class="card bi-card" style="flex:1"><h3>Simulador de escala</h3>
      <label class="bi-sl"><span>Novos clientes por mês <b id="v_new"></b></span><input type="range" min="0" max="10" step="1" id="s_new" value="${S.sim_new_clients || 2}"></label>
      <label class="bi-sl"><span>Ticket dos novos <b id="v_tk"></b></span><input type="range" min="500" max="10000" step="100" id="s_tk" value="${Math.round((ticket || 1500) / 100) * 100}"></label>
      <label class="bi-sl"><span>Churn mensal <b id="v_ch"></b></span><input type="range" min="0" max="20" step="0.5" id="s_ch" value="${S.sim_churn || 3}"></label>
      <label class="bi-sl"><span>Reajuste anual <b id="v_rj"></b></span><input type="range" min="0" max="20" step="1" id="s_rj" value="0"></label>
      <div id="simOut" class="bi-sim"></div></div>
  </div>
  <div class="bi-row">
    <div class="card bi-card" style="flex:1.7"><h3>Faturado × recebido por mês <span class="mono" style="margin-left:auto">por competência</span></h3><div id="chFat" class="bi-chart"></div><div class="bi-legend"><span><i style="background:rgba(181,140,46,.22);border:1px solid rgba(217,180,91,.55)"></i>Faturado</span><span><i style="background:var(--accent)"></i>Recebido</span><span><i style="background:transparent;border:1px dashed rgba(217,180,91,.6)"></i>Projetado (não gerado)</span><span><i style="background:var(--bad)"></i>Em atraso</span></div><details class="bi-data"><summary>Ver dados</summary><div id="tbFat"></div></details></div>
    <div class="card bi-card" style="flex:1"><h3>Aging de recebíveis</h3><div id="aging"></div></div>
  </div>
  <div class="bi-row">
    <div class="card bi-card" style="flex:1"><h3>Receita por cliente <span class="mono" style="margin-left:auto">${mLbl(REF, true)}</span></h3><div id="share"></div></div>
    <div class="card bi-card" style="flex:1.2"><h3>Fluxo de caixa de ${mLbl(REF, true)} <span class="mono" style="margin-left:auto">vencimentos por dia</span></h3><div id="cal"></div></div>
  </div>
  <div class="card" style="margin-top:14px"><h3>Carteira de clientes</h3><div id="carteira" style="overflow-x:auto"></div></div>
  <div id="biTip" class="bi-tip"></div>`;
  renderFat(); renderAging(); renderShare(); renderCal(); renderCarteira();
  ['s_new', 's_tk', 's_ch', 's_rj'].forEach(id => $('#' + id).addEventListener('input', () => { renderSim(); }));
  ['s_new', 's_ch'].forEach(id => $('#' + id).addEventListener('change', e => sb.from('settings').upsert({ key: id === 's_new' ? 'sim_new_clients' : 'sim_churn', value: e.target.value })));
  renderSim();
}
/* ---------- simulador + gráfico MRR ---------- */
function renderSim() { const { REF, mrrAt, mrr, goal } = BI.st; const n = +$('#s_new').value, tk = +$('#s_tk').value, ch = +$('#s_ch').value / 100, rj = +$('#s_rj').value / 100;
  $('#v_new').textContent = n; $('#v_tk').textContent = money(tk); $('#v_ch').textContent = num(ch * 100, 1) + '%'; $('#v_rj').textContent = num(rj * 100, 0) + '%';
  const H = 24, hist = []; for (let k = -6; k <= 0; k++) hist.push({ m: addM(REF, k), v: mrrAt(addM(REF, k)) });
  const proj = (nn, cc) => { const out = []; let v = mrr; for (let k = 1; k <= H; k++) { v = v * (1 - cc) + nn * tk; if (k % 12 === 0) v *= 1 + rj; out.push({ m: addM(REF, k), v }); } return out; };
  const baseP = proj(n, ch), otim = proj(n * 1.5, ch * 0.5), cons = proj(n * 0.5, Math.max(ch * 1.5, 0.02));
  const at = (p, k) => p[k - 1].v; const hitGoal = goal ? baseP.findIndex(x => x.v >= goal) : -1;
  const need = goal ? (() => { const r = 1 - ch; let geo = 0; for (let k = 0; k < 12; k++) geo += Math.pow(r, k); return Math.max(0, Math.ceil((goal - mrr * Math.pow(r, 12)) / (tk * geo))); })() : null;
  const rec12 = baseP.slice(0, 12).reduce((a, x) => a + x.v, 0);
  $('#simOut').innerHTML = `<div class="kv"><span>MRR em 6 meses</span><b>${money(at(baseP, 6))}</b></div><div class="kv"><span>MRR em 12 meses</span><b>${money(at(baseP, 12))}</b></div><div class="kv"><span>MRR em 24 meses</span><b>${money(at(baseP, 24))}</b></div><div class="kv"><span>Receita nos próximos 12 meses</span><b>${money(rec12)}</b></div>
    <div class="kv"><span>Meta de ${money(goal)}</span><b>${!goal ? '–' : mrr >= goal ? 'batida ✓' : hitGoal >= 0 ? 'em ' + mLbl(baseP[hitGoal].m, true) + ' (' + (hitGoal + 1) + ' meses)' : 'não bate em 24 meses'}</b></div>
    <div class="kv"><span>Para bater a meta em 12 meses</span><b>${need === null ? '–' : need + ' novo(s)/mês'}</b></div><p class="hint">Cenário otimista: 1,5× novos e metade do churn. Conservador: metade dos novos e 1,5× o churn (mínimo 2%).</p>`;
  const months = [...hist.map(x => x.m), ...baseP.map(x => x.m)];
  const series = [{ name: 'Realizado', color: BI_PAL[0], pts: hist.map((x, i) => [i, x.v]), area: true },
    { name: 'Base', color: BI_PAL[0], dash: '6 4', pts: [[6, hist[6].v], ...baseP.map((x, i) => [7 + i, x.v])] },
    { name: 'Otimista', color: BI_PAL[3], dash: '2 4', pts: [[6, hist[6].v], ...otim.map((x, i) => [7 + i, x.v])] },
    { name: 'Conservador', color: BI_PAL[2], dash: '2 4', pts: [[6, hist[6].v], ...cons.map((x, i) => [7 + i, x.v])] }];
  lineChart($('#chMRR'), months, series, { goal, nowIdx: 6 });
  $('#lgMRR').innerHTML = series.map(s => `<span><i style="background:${s.dash ? 'transparent' : s.color};border:2px ${s.dash ? 'dashed' : 'solid'} ${s.color}"></i>${s.name}</span>`).join('') + (goal ? `<span><i style="background:transparent;border-top:2px dashed var(--muted);height:0;border-radius:0"></i>Meta</span>` : '');
  $('#tbMRR').innerHTML = `<table><thead><tr><th>Mês</th><th>Realizado</th><th>Base</th><th>Otimista</th><th>Conservador</th></tr></thead><tbody>${months.map((m, i) => `<tr><td>${mLbl(m, true)}</td><td>${i <= 6 ? money(hist[i].v) : '–'}</td><td>${i >= 7 ? money(baseP[i - 7].v) : '–'}</td><td>${i >= 7 ? money(otim[i - 7].v) : '–'}</td><td>${i >= 7 ? money(cons[i - 7].v) : '–'}</td></tr>`).join('')}</tbody></table>`; }
function lineChart(el, months, series, o = {}) { const W = el.clientWidth || 700, Hh = 280, P = { l: 64, r: 16, t: 14, b: 28 }; const n = months.length;
  const maxV = Math.max(o.goal || 0, ...series.flatMap(s => s.pts.map(p => p[1]))) * 1.08 || 1; const x = i => P.l + i * (W - P.l - P.r) / (n - 1), y = v => P.t + (1 - v / maxV) * (Hh - P.t - P.b);
  const ticks = [0, .25, .5, .75, 1].map(f => f * maxV); const path = pts => pts.map((p, i) => (i ? 'L' : 'M') + x(p[0]).toFixed(1) + ',' + y(p[1]).toFixed(1)).join('');
  let svg = `<svg viewBox="0 0 ${W} ${Hh}" width="100%" height="${Hh}" role="img" aria-label="MRR histórico e projeção">`;
  svg += ticks.map(v => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" stroke="rgba(255,255,255,.06)"/><text x="${P.l - 8}" y="${y(v) + 4}" text-anchor="end" class="bi-ax">${kfmt(v)}</text>`).join('');
  months.forEach((m, i) => { if (i % 3 === 0 || i === o.nowIdx) svg += `<text x="${x(i)}" y="${Hh - 8}" text-anchor="middle" class="bi-ax" ${i === o.nowIdx ? 'style="fill:var(--accent2)"' : ''}>${mLbl(m)}</text>`; });
  if (o.nowIdx != null) svg += `<line x1="${x(o.nowIdx)}" x2="${x(o.nowIdx)}" y1="${P.t}" y2="${Hh - P.b}" stroke="rgba(217,180,91,.25)" stroke-dasharray="3 3"/>`;
  if (o.goal) svg += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(o.goal)}" y2="${y(o.goal)}" stroke="var(--muted)" stroke-dasharray="6 5" stroke-width="1.5"/><text x="${W - P.r}" y="${y(o.goal) - 6}" text-anchor="end" class="bi-ax">meta ${kfmt(o.goal)}</text>`;
  series.forEach(s => { if (s.area) svg += `<path d="${path(s.pts)}L${x(s.pts[s.pts.length - 1][0])},${y(0)}L${x(s.pts[0][0])},${y(0)}Z" fill="${s.color}" opacity=".16"/>`; svg += `<path d="${path(s.pts)}" fill="none" stroke="${s.color}" stroke-width="2" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''} stroke-linecap="round" class="bi-line"/>`; });
  svg += `<line id="xh" y1="${P.t}" y2="${Hh - P.b}" stroke="rgba(255,255,255,.35)" style="display:none"/><g id="xd"></g><rect x="${P.l}" y="${P.t}" width="${W - P.l - P.r}" height="${Hh - P.t - P.b}" fill="transparent" id="hit"/></svg>`;
  el.innerHTML = svg; const tip = $('#biTip'), hit = el.querySelector('#hit'), xh = el.querySelector('#xh'), xd = el.querySelector('#xd');
  hit.addEventListener('mousemove', e => { const r = el.getBoundingClientRect(); const px = (e.clientX - r.left) * (W / r.width); const i = Math.max(0, Math.min(n - 1, Math.round((px - P.l) / ((W - P.l - P.r) / (n - 1)))));
    xh.setAttribute('x1', x(i)); xh.setAttribute('x2', x(i)); xh.style.display = ''; const vals = series.map(s => ({ s, p: s.pts.find(p => p[0] === i) })).filter(v => v.p);
    xd.innerHTML = vals.map(v => `<circle cx="${x(i)}" cy="${y(v.p[1])}" r="4.5" fill="${v.s.color}" stroke="#121214" stroke-width="2"/>`).join('');
    tip.innerHTML = `<b>${mLbl(months[i], true)}</b>${vals.map(v => `<div><i style="background:${v.s.color}"></i>${v.s.name}<span>${money(v.p[1])}</span></div>`).join('')}`; showTip(e); });
  hit.addEventListener('mouseleave', () => { xh.style.display = 'none'; xd.innerHTML = ''; tip.style.opacity = 0; });
  el.querySelectorAll('.bi-line').forEach(p => { const L = p.getTotalLength(); if (p.getAttribute('stroke-dasharray')) return; p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.getBoundingClientRect(); p.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)'; p.style.strokeDashoffset = 0; }); }
function showTip(e) { const tip = $('#biTip'); tip.style.opacity = 1; const w = tip.offsetWidth; let lx = e.clientX + 16; if (lx + w > innerWidth - 10) lx = e.clientX - w - 16; tip.style.left = lx + 'px'; tip.style.top = (e.clientY + 14) + 'px'; }
/* ---------- faturado × recebido ---------- */
function renderFat() { const { REF, ofComp, sum, mrrAt, t } = BI.st; const rows = []; for (let k = -8; k <= 3; k++) { const m = addM(REF, k); const it = ofComp(m); const fat = sum(it); rows.push({ m, fat, proj: fat ? 0 : mrrAt(m), rec: sum(it.filter(i => i.status === 'paid')), atr: sum(it.filter(i => i.status === 'open' && i.due_date < t)), n: it.length }); }
  const el = $('#chFat'), W = el.clientWidth || 700, Hh = 250, P = { l: 64, r: 10, t: 12, b: 28 }; const maxV = Math.max(1, ...rows.map(r => Math.max(r.fat, r.proj))) * 1.1; const bw = (W - P.l - P.r) / rows.length; const y = v => P.t + (1 - v / maxV) * (Hh - P.t - P.b); const y0 = y(0);
  let svg = `<svg viewBox="0 0 ${W} ${Hh}" width="100%" height="${Hh}" role="img" aria-label="Faturado e recebido por mês">` + [0, .5, 1].map(f => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(f * maxV)}" y2="${y(f * maxV)}" stroke="rgba(255,255,255,.06)"/><text x="${P.l - 8}" y="${y(f * maxV) + 4}" text-anchor="end" class="bi-ax">${kfmt(f * maxV)}</text>`).join('');
  rows.forEach((r, i) => { const x0 = P.l + i * bw + bw * 0.16, w = bw * 0.68; const bar = (v, style, cls = '') => v > 0 ? `<rect class="bi-bar ${cls}" x="${x0}" y="${y(v)}" width="${w}" height="${Math.max(0, y0 - y(v))}" rx="4" ${style}/>` : '';
    svg += `<g class="bi-g" data-i="${i}">${bar(r.proj, 'fill="transparent" stroke="rgba(217,180,91,.55)" stroke-dasharray="4 3"')}${bar(r.fat, 'fill="rgba(181,140,46,.22)" stroke="rgba(217,180,91,.55)"')}${bar(r.rec, 'fill="url(#gold)"')}${bar(r.atr, 'fill="var(--bad)"')}<rect x="${P.l + i * bw}" y="${P.t}" width="${bw}" height="${Hh - P.t - P.b}" fill="transparent"/></g><text x="${x0 + w / 2}" y="${Hh - 8}" text-anchor="middle" class="bi-ax" ${r.m === REF ? 'style="fill:var(--accent2);font-weight:600"' : ''}>${mLbl(r.m)}</text>`; });
  svg += `<defs><linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ebd08a"/><stop offset="1" stop-color="#8a6d1f"/></linearGradient></defs></svg>`; el.innerHTML = svg;
  el.querySelectorAll('.bi-g').forEach(g => { const r = rows[+g.dataset.i]; g.addEventListener('mousemove', e => { $('#biTip').innerHTML = `<b>${mLbl(r.m, true)}</b>${r.fat ? `<div>Faturado<span>${money(r.fat)}</span></div><div>Recebido<span>${money(r.rec)} · ${num(pct(r.rec, r.fat), 0)}%</span></div>${r.atr ? `<div style="color:var(--bad)">Em atraso<span>${money(r.atr)}</span></div>` : ''}<div>Faturas<span>${r.n}</span></div>` : `<div>Projetado pela carteira<span>${money(r.proj)}</span></div><div class="hint" style="margin:4px 0 0">Mês ainda não gerado</div>`}`; showTip(e); }); g.addEventListener('mouseleave', () => $('#biTip').style.opacity = 0); });
  el.querySelectorAll('.bi-bar').forEach(b => { const h = b.getAttribute('height'), yy = b.getAttribute('y'); b.setAttribute('height', 0); b.setAttribute('y', y0); requestAnimationFrame(() => { b.style.transition = 'all .9s cubic-bezier(.2,.8,.2,1)'; b.setAttribute('height', h); b.setAttribute('y', yy); }); });
  $('#tbFat').innerHTML = `<table><thead><tr><th>Mês</th><th>Faturado</th><th>Recebido</th><th>Em atraso</th><th>Projetado</th></tr></thead><tbody>${rows.map(r => `<tr><td>${mLbl(r.m, true)}</td><td>${money(r.fat)}</td><td>${money(r.rec)}</td><td>${money(r.atr)}</td><td>${r.proj ? money(r.proj) : '–'}</td></tr>`).join('')}</tbody></table>`; }
/* ---------- aging ---------- */
function renderAging() { const { live, t, sum } = BI.st; const open = live.filter(i => ['open', 'review'].includes(i.status)); const d = i => Math.floor((new Date(t) - new Date(i.due_date)) / 864e5);
  const b = [['A vencer', open.filter(i => d(i) < 0), 'ok', '✓'], ['Vence hoje', open.filter(i => d(i) === 0), 'warn', '!'], ['1 a 15 dias', open.filter(i => d(i) >= 1 && d(i) <= 15), 'warn', '⚠'], ['16 a 30 dias', open.filter(i => d(i) >= 16 && d(i) <= 30), 'bad', '⚠'], ['Mais de 30 dias', open.filter(i => d(i) > 30), 'bad', '✕']];
  const max = Math.max(1, ...b.map(x => sum(x[1]))); const col = { ok: 'var(--ok)', warn: 'var(--warn)', bad: 'var(--bad)' };
  $('#aging').innerHTML = b.map(x => `<div style="margin:12px 0"><div style="display:flex;justify-content:space-between;font-size:13px"><span>${x[3]} ${x[0]}</span><b>${money(sum(x[1]))} <span style="color:var(--muted);font-weight:400">· ${x[1].length}</span></b></div><div class="bar" style="height:8px;margin-top:6px"><i data-w="${sum(x[1]) / max * 100}%" style="width:0;background:${col[x[2]]};transition:width 1s cubic-bezier(.2,.8,.2,1)"></i></div></div>`).join('') + `<p class="hint">Recebíveis em aberto por dias de atraso. Comprovantes em análise contam como em aberto.</p>`;
  setTimeout(() => $$('#aging [data-w]').forEach(i => i.style.width = i.dataset.w), 60); }
/* ---------- receita por cliente ---------- */
function renderShare() { const { ativos, mrr, colorOf } = BI.st; const list = [...ativos].sort((a, b) => b.p.fee - a.p.fee); const top = list.slice(0, 6), rest = list.slice(6); const outros = rest.reduce((a, x) => a + x.p.fee, 0);
  const segs = [...top.map(x => ({ n: x.c.name, v: x.p.fee, c: colorOf(x.c.id) })), ...(outros ? [{ n: 'Outros (' + rest.length + ')', v: outros, c: '#5a574f' }] : [])];
  $('#share').innerHTML = `<div class="bi-stack">${segs.map(s => `<i style="flex:${s.v};background:${s.c}" title="${esc(s.n)} · ${money(s.v)} · ${num(pct(s.v, mrr), 1)}%"></i>`).join('')}</div>` + segs.map(s => `<div class="bi-sharerow"><i style="background:${s.c}"></i><span>${esc(s.n)}</span><b>${money(s.v)}</b><em>${num(pct(s.v, mrr), 1)}%</em></div>`).join('') + `<p class="hint">${pct(segs[0]?.v || 0, mrr) >= 40 ? '⚠ Um cliente passa de 40% da receita: risco alto se ele sair.' : 'Nenhum cliente acima de 40% da receita.'}</p>`; }
/* ---------- calendário do fluxo de caixa ---------- */
function renderCal() { const { REF, ofComp, activeIn, sum } = BI.st; const [y, m] = REF.split('-').map(Number); const days = new Date(y, m, 0).getDate(), first = new Date(y, m - 1, 1).getDay();
  const its = ofComp(REF); const gerado = its.length > 0; const byDay = {}; if (gerado) its.forEach(i => { const d = +i.due_date.slice(8, 10); if (i.due_date.slice(0, 7) !== REF) return; (byDay[d] = byDay[d] || []).push({ n: COS.find(c => c.id === i.company_id)?.name, v: +i.amount, s: i.status }); });
  else activeIn(REF).forEach(x => { const d = Math.min(x.p.due, days); (byDay[d] = byDay[d] || []).push({ n: x.c.name, v: x.p.fee, s: 'proj' }); });
  const max = Math.max(1, ...Object.values(byDay).map(a => a.reduce((s, x) => s + x.v, 0))); let h = '<div class="bi-cal">' + ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => `<span class="mono">${d}</span>`).join('') + '<i></i>'.repeat(first);
  for (let d = 1; d <= days; d++) { const a = byDay[d] || []; const v = a.reduce((s, x) => s + x.v, 0); const paid = a.length && a.every(x => x.s === 'paid'); const late = a.some(x => x.s === 'open' && `${REF}-${String(d).padStart(2, '0')}` < BI.st.t);
    h += `<div class="bi-day ${v ? 'has' : ''}" style="${v ? `background:rgba(181,140,46,${0.18 + 0.6 * v / max})` : ''}" data-d="${d}"><small>${d}</small>${v ? `<b>${kfmt(v)}</b><em>${paid ? '✓' : late ? '⚠' : a[0].s === 'proj' ? '·' : '○'}</em>` : ''}</div>`; }
  $('#cal').innerHTML = h + `</div><p class="hint">✓ pago · ○ em aberto · ⚠ em atraso ${gerado ? '' : '· · projetado (faturas do mês ainda não geradas)'}</p>`;
  $$('#cal .bi-day.has').forEach(el => { const a = byDay[+el.dataset.d]; el.addEventListener('mousemove', e => { $('#biTip').innerHTML = `<b>Dia ${el.dataset.d}</b>${a.map(x => `<div>${esc(x.n)}<span>${money(x.v)} ${x.s === 'paid' ? '✓' : x.s === 'proj' ? '(proj.)' : ''}</span></div>`).join('')}`; showTip(e); }); el.addEventListener('mouseleave', () => $('#biTip').style.opacity = 0); }); }
/* ---------- carteira ---------- */
function renderCarteira() { const { base, live, REF, t, colorOf, mrr, sum, clicks } = BI.st; const rows = base.map(x => { const inv = live.filter(i => i.company_id === x.c.id); const pagos = inv.filter(i => i.status === 'paid'); const pont = pagos.filter(i => i.paid_at && i.paid_at.slice(0, 10) <= i.due_date);
    const atr = inv.filter(i => i.status === 'open' && i.due_date < t); const prox = inv.filter(i => ['open', 'review'].includes(i.status)).sort((a, b) => a.due_date.localeCompare(b.due_date))[0]; const meses = Math.max(0, monthsBetween(x.p.start, REF) + 1);
    return { x, pagoTotal: sum(pagos), pont: pagos.length ? pct(pont.length, pagos.length) : null, atr, prox, meses, cl: clicks.filter(c => c.company_id === x.c.id).length }; }).sort((a, b) => b.x.p.fee - a.x.p.fee);
  $('#carteira').innerHTML = `<table><thead><tr><th>Cliente</th><th>Mensalidade</th><th>% do MRR</th><th>Contrato</th><th>Cliente desde</th><th>Meses</th><th>Receita acumulada</th><th>Pontualidade</th><th>Próxima fatura</th><th>Situação</th><th>Upsell</th><th></th></tr></thead><tbody>${rows.map(r => `<tr><td><span style="display:inline-block;width:9px;height:9px;border-radius:3px;background:${colorOf(r.x.c.id)};margin-right:8px"></span><b>${esc(r.x.c.name)}</b>${r.x.c.active ? '' : ' <span class="badge bad">encerrado</span>'}</td><td>${money(r.x.p.fee)}</td><td>${num(pct(r.x.p.fee, mrr), 1)}%</td><td>${r.x.p.contrato ? '<span class="badge ok">✓ sim</span>' : '<span class="badge warn">sem contrato</span>'}</td><td>${r.x.p.start === '2000-01' ? '–' : mLbl(r.x.p.start, true)}</td><td>${r.meses}</td><td>${money(r.pagoTotal)}</td><td>${r.pont === null ? '–' : num(r.pont, 0) + '%'}</td><td>${r.prox ? dtShort(r.prox.due_date) + ' · ' + money(r.prox.amount) : '<span style="color:var(--muted)">não gerada</span>'}</td><td><span class="badge ${r.atr.length ? 'bad' : r.prox?.status === 'review' ? 'gold' : 'ok'}">${r.atr.length ? '⚠ ' + r.atr.length + ' em atraso' : r.prox?.status === 'review' ? 'comprovante em análise' : '✓ em dia'}</span></td><td>${r.cl || '–'}</td><td><a class="btn sm ghost" onclick="openCompany('${r.x.c.id}','contrato')">Abrir</a></td></tr>`).join('')}</tbody></table>`; }
