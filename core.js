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
const MODULES = [['overview','Tela inicial'],['results_social','Resultados das redes'],['results_ads','Resultados de tráfego'],['leads','Leads do mês'],['creatives_view','Ver criativos'],['creatives_approve','Aprovar criativos'],['roadmap','Quadro evolutivo'],['financial','Financeiro e contrato'],['requests','Solicitações'],['nps','Pesquisas'],['documents','Documentos da marca'],['offers','Serviços disponíveis']];
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
function waLink(company, service) { return `https://wa.me/${PORTAL.whatsapp}?text=` + encodeURIComponent(`Olá Ben, sou da ${company} e quero contratar: ${service}`); }
function slug(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(0,80); }
