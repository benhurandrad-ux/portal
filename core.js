/* núcleo do portal: cliente supabase, sessão, helpers */
const sb = window.supabase.createClient(PORTAL.url, PORTAL.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money = v => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (v, d=0) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const compact = v => { v = Number(v||0); return v >= 1e6 ? num(v/1e6,1)+' mi' : v >= 1e3 ? num(v/1e3, v>=1e4?0:1)+' mil' : num(v); };
const dt = s => s ? new Date(s.length === 10 ? s + 'T12:00:00' : s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '') : '';
const dtShort = s => s ? new Date(s.length === 10 ? s + 'T12:00:00' : s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
const monthLabel = s => s ? new Date(s.length === 10 ? s + 'T12:00:00' : s).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '';
const daysUntil = s => Math.ceil((new Date(s + 'T12:00:00') - new Date()) / 864e5);
const initials = n => (n || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const toast = (msg, kind='') => { let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); } t.textContent = msg; t.className = 'show ' + kind; clearTimeout(t._h); t._h = setTimeout(() => t.className = '', 3200); };
const KIND_LABEL = { post:'Post', carousel:'Carrossel', reel:'Reels', story:'Story', ad:'Anúncio', video:'Vídeo', site:'Site', other:'Arquivo' };
const INVOICE_LABEL = { open:'Em aberto', review:'Comprovante em análise', paid:'Paga', overdue:'Atrasada', cancelled:'Cancelada' };
const STATUS_LABEL = { draft:'Rascunho', pending:'Aguardando aprovação', approved:'Aprovado', changes:'Pedido de ajuste', published:'Publicado' };
const MODULES = [['overview','Tela inicial'],['results_social','Resultados das redes'],['results_ads','Resultados de tráfego'],['leads','Leads do mês'],['creatives_view','Ver criativos'],['creatives_approve','Aprovar criativos'],['roadmap','Quadro evolutivo'],['financial','Financeiro e contrato'],['requests','Solicitações'],['nps','Pesquisas'],['documents','Documentos da marca'],['credentials','Acessos e senhas'],['offers','Serviços disponíveis']];
const CATEGORY_COLOR = { trafego:'var(--c-ads)', social:'var(--c-social)', design:'var(--c-design)', web:'var(--c-web)', estrategia:'var(--accent)', comercial:'var(--c-comercial)', marca:'var(--accent)', copy:'var(--c-design)', video:'var(--c-video)' };
const invoiceStatus = i => (i.status === 'open' && i.due_date < new Date().toISOString().slice(0,10)) ? 'overdue' : i.status;

async function requireSession(opts = {}) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { location.replace('login.html?next=' + encodeURIComponent(location.pathname + location.hash)); return null; }
  const { data: me, error } = await sb.rpc('me');
  if (error) { console.error(error); toast('Erro ao carregar seu perfil'); return null; }
  if (me.profile?.must_change_password && !opts.allowPasswordChange) { location.replace('primeiro-acesso.html'); return null; }
  if (opts.admin && !me.is_super_admin) { location.replace('index.html'); return null; }
  if (!opts.admin && !opts.any && !me.is_super_admin && !me.companies.length) { location.replace('entrar.html'); return null; }
  return { session, me };
}
async function signOut() { await sb.auth.signOut(); location.replace('login.html'); }
async function signedUrl(bucket, path, expires = 3600) { if (!path) return null; const { data } = await sb.storage.from(bucket).createSignedUrl(path, expires); return data?.signedUrl || null; }
async function signedUrls(bucket, paths) { paths = paths.filter(Boolean); if (!paths.length) return {}; const { data } = await sb.storage.from(bucket).createSignedUrls(paths, 3600); const m = {}; (data || []).forEach(d => { if (d.signedUrl) m[d.path] = d.signedUrl; }); return m; }
function publicUrl(bucket, path) { return path ? sb.storage.from(bucket).getPublicUrl(path).data.publicUrl : null; }
function modal(html, opts = {}) {
  let m = $('#modal'); if (!m) { m = document.createElement('div'); m.id = 'modal'; m.className = 'modal'; m.innerHTML = '<div class="md-box"></div>'; document.body.appendChild(m); m.addEventListener('click', e => { if (e.target === m) closeModal(); }); }
  $('.md-box', m).innerHTML = html; $('.md-box', m).style.width = opts.width || ''; requestAnimationFrame(() => m.classList.add('on')); return m;
}
function closeModal() { $('#modal')?.classList.remove('on'); }
addEventListener('keydown', e => e.key === 'Escape' && closeModal());
function waLink(company, service) { return `https://wa.me/${(window.CONTACT && CONTACT.whatsapp) || PORTAL.whatsapp}?text=` + encodeURIComponent(`Olá Ben, sou da ${company} e quero contratar: ${service}`); }
const WA_SVG = '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1l-.8.9c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.7-1.7c-.2-.5-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 2.9.6a2.5 2.5 0 0 0 1.7-1.2 2 2 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3z"/></svg>';
async function mountWhatsApp(companyName) { try { const { data } = await sb.rpc('public_contact'); window.CONTACT = data || {}; } catch (e) { window.CONTACT = {}; }
  const num = (CONTACT.whatsapp || PORTAL.whatsapp || '').replace(/\D/g, ''); if (!num) return; const msg = (CONTACT.message || 'Olá Ben, preciso de ajuda.').replace(/{{empresa}}/g, companyName || '');
  let a = document.getElementById('waFloat'); if (!a) { a = document.createElement('a'); a.id = 'waFloat'; a.className = 'wa-float'; a.target = '_blank'; a.rel = 'noopener'; a.setAttribute('aria-label', 'Falar no WhatsApp'); document.body.appendChild(a); }
  a.href = `https://wa.me/${num}?text=` + encodeURIComponent(msg); a.innerHTML = WA_SVG + '<span class="tip">Falar com o Ben no WhatsApp</span>'; }
function slug(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(0,80); }

/* ===== pastas de criativos ===== */
const TRASH_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>';
const folderOf = c => c.folder || 'Sem pasta';
function groupFolders(items) { const m = {}; items.forEach(c => { const f = folderOf(c); (m[f] = m[f] || []).push(c); });
  return Object.entries(m).map(([name, arr]) => ({ name, items: arr, cover: arr.find(c => (c.mime || '').startsWith('image/')) || arr[0], pending: arr.filter(c => c.status === 'pending').length, last: arr.map(c => c.created_at).sort().pop() })).sort((a, b) => b.last.localeCompare(a.last)); }
function folderGrid(groups, urls, openFn, delFn, dlFn) { return `<div class="folders">${groups.map(g => { const u = urls[g.cover?.thumb_path || g.cover?.storage_path]; const img = (g.cover?.mime || '').startsWith('image/');
  const kinds = [...new Set(g.items.map(c => KIND_LABEL[c.kind] || 'Arquivo'))].slice(0, 3).join(' · ');
  return `<div class="folder" onclick="${openFn}(${JSON.stringify(g.name).replace(/"/g, '&quot;')})"><div class="folder-cover">${u && img ? `<img src="${u}" alt="">` : `<div class="file">📁</div>`}<span class="folder-n">${g.items.length}</span>${dlFn ? `<button class="dl" title="Baixar pasta" aria-label="Baixar pasta ${esc(g.name)}" onclick="event.stopPropagation();${dlFn}(${JSON.stringify(g.name).replace(/"/g, '&quot;')})"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg></button>` : ''}${delFn ? `<button class="trash" title="Excluir pasta" aria-label="Excluir pasta ${esc(g.name)}" onclick="event.stopPropagation();${delFn}(${JSON.stringify(g.name).replace(/"/g, '&quot;')})">${TRASH_SVG}</button>` : ''}</div><div class="folder-m"><b>📁 ${esc(g.name)}</b><span>${kinds} · ${dtShort(g.last.slice(0, 10))}</span>${g.pending ? `<em class="badge warn">${g.pending} para aprovar</em>` : '<em class="badge ok">✓ em dia</em>'}</div></div>`; }).join('')}</div>`; }
function folderCrumb(name, backFn, extra = '') { return `<div class="toolbar" style="margin:6px 0 14px"><a class="btn sm ghost" onclick="${backFn}()">‹ Todas as pastas</a><h3 style="margin:0;font-size:17px">📁 ${esc(name)}</h3><span class="sp"></span>${extra}</div>`; }

/* tabelas: rótulo de cada célula (vira cartão no celular) */
function labelTables(root = document) { root.querySelectorAll('table').forEach(t => { const hs = [...t.querySelectorAll('thead th')].map(th => th.textContent.trim()); if (!hs.length) return; t.querySelectorAll('tbody tr').forEach(tr => [...tr.children].forEach((td, i) => { if (!td.hasAttribute('data-l')) td.setAttribute('data-l', hs[i] || ''); })); }); }
new MutationObserver(() => { clearTimeout(window._lt); window._lt = setTimeout(labelTables, 30); }).observe(document.documentElement, { childList: true, subtree: true });

/* ===== logo da empresa ===== */
const logoSrc = co => co?.logo_url ? publicUrl('logos', co.logo_url) : null;
function logoPill(co, big) { const u = logoSrc(co); return u ? `<span class="logo-pill ${big ? 'big' : ''}"><img src="${esc(u)}" alt="${esc(co.name || '')}"></span>` : ''; }
/* logo com fundo branco/claro -> PNG transparente e recortado (roda no navegador) */
async function logoToTransparentPng(file) { if (/svg/i.test(file.type)) return file; const url = URL.createObjectURL(file);
  try { const img = await new Promise((ok, err) => { const i = new Image(); i.onload = () => ok(i); i.onerror = err; i.src = url; });
    const max = 1600, sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)); const W = Math.round(img.naturalWidth * sc), H = Math.round(img.naturalHeight * sc);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, W, H); const d = cx.getImageData(0, 0, W, H), p = d.data;
    const corner = (x, y) => { const i = (y * W + x) * 4; return p[i + 3] > 250 && Math.min(p[i], p[i + 1], p[i + 2]) > 235; };
    const whiteBg = [corner(0, 0), corner(W - 1, 0), corner(0, H - 1), corner(W - 1, H - 1)].filter(Boolean).length >= 3;
    if (whiteBg) for (let i = 0; i < p.length; i += 4) { const a = Math.max(255 - p[i], 255 - p[i + 1], 255 - p[i + 2]); if (a <= 6) { p[i + 3] = 0; continue; } const af = a / 255; for (let k = 0; k < 3; k++) p[i + k] = Math.max(0, Math.min(255, Math.round((p[i + k] - 255 * (1 - af)) / af))); p[i + 3] = Math.round(p[i + 3] * af); }
    let x0 = W, y0 = H, x1 = -1, y1 = -1; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (p[(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    cx.putImageData(d, 0, 0); if (x1 < 0) return file; const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1; out.getContext('2d').drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    const blob = await new Promise(r => out.toBlob(r, 'image/png')); return new File([blob], (file.name.replace(/\.[^.]+$/, '') || 'logo') + '.png', { type: 'image/png' });
  } catch (e) { console.warn(e); return file; } finally { URL.revokeObjectURL(url); } }
async function uploadCompanyLogo(companyId, file) { if (!file || !(file.type || '').startsWith('image/')) { toast('Envie uma imagem (PNG, JPG, SVG ou WEBP)', 'bad'); return null; }
  file = await logoToTransparentPng(file);
  const ext = (file.name.split('.').pop() || 'png').toLowerCase(); const path = `${companyId}/logo_${Date.now()}.${ext}`;
  const up = await sb.storage.from('logos').upload(path, file, { upsert: true, contentType: file.type }); if (up.error) { toast('Logo: ' + up.error.message, 'bad'); return null; }
  const { error } = await sb.from('companies').update({ logo_url: path }).eq('id', companyId); if (error) { toast(error.message, 'bad'); return null; } return path; }
