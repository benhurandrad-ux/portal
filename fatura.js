/* Render e PDF da fatura (usado em fatura.html, admin e painel do cliente) */
function faturaHTML(r) {
  const e = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const m = v => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const d = s => s ? new Date(s.length === 10 ? s + 'T12:00:00' : s).toLocaleDateString('pt-BR') : '';
  const comp = new Date(r.competence + 'T12:00:00').toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
  const st = { open: 'Em aberto', overdue: 'Em atraso', paid: 'Paga', review: 'Comprovante em análise' }[r.status] || r.status;
  const E = r.emitente || {}, P = r.pagador || {};
  const desc = r.contrato ? `${e(r.contrato)} · ${e(r.notes || 'Mensalidade')}` : e(r.notes || 'Prestação de serviços de marketing digital');
  return `<div class="fat">
  <div class="top"><div><div class="wm">${e((E.marca || 'Ben Hur Andrade').toUpperCase())}</div><h1>Fatura de serviços</h1><div class="mono">${e(E.razao)}</div></div>
    <div class="doc"><div class="mono">Documento</div><b>Nº ${e(r.number)}</b><div class="dates">Emissão ${d(r.issue_date)} · Vencimento ${d(r.due_date)}</div><span class="st ${e(r.status)}">${st}</span></div></div>
  <div class="cards">
    <div class="cd a"><span class="mono">Emitente</span><b>${e(E.razao)}</b>CNPJ ${e(E.cnpj)}<br>${e(E.endereco)}<br>Contato ${e(E.contato)}</div>
    <div class="cd"><span class="mono">Cobrar de</span><b>${e(P.razao || P.nome)}</b>${P.cnpj ? 'CNPJ ' + e(P.cnpj) + '<br>' : ''}${e(P.endereco || '')}</div>
    <div class="cd"><span class="mono">Contato financeiro</span><b>${e(P.contato || P.nome)}</b>${P.email ? e(P.email) + '<br>' : ''}${P.whatsapp ? e(P.whatsapp) + '<br>' : ''}<span style="display:block;margin-top:8px"><strong style="color:#1c1b18">Forma de pagamento:</strong> Pix</span></div>
  </div>
  <table><thead><tr><th>Descrição do serviço</th><th>Referência</th><th>Valor</th></tr></thead><tbody><tr>
    <td><b>${desc}</b><small>Competência ${comp}</small>${(r.servicos || []).length ? `<div class="chips">${r.servicos.slice(0, 5).map(s => `<span>${e(s)}</span>`).join('')}${r.servicos.length > 5 ? `<span style="background:#e7e3d8;color:#4a4741">+${r.servicos.length - 5} frentes</span>` : ''}</div>` : ''}</td>
    <td>Mensalidade · competência ${comp}</td><td><b>${m(r.amount)}</b></td></tr></tbody></table>
  <div class="tot"><div><span>Subtotal</span><span>${m(r.amount)}</span></div><div><span>Impostos / retenções</span><span>–</span></div><div class="big"><span class="mono" style="align-self:center">Total</span><b>${m(r.amount)}</b></div></div>
  ${r.status === 'paid' ? `<div class="paidmark">✓ Pagamento confirmado em ${d(r.paid_at)}${r.receipt_number ? ' · recibo nº ' + e(r.receipt_number) : ''}</div>` : `
  <div class="pay"><div class="h"><span class="mono">Pagamento</span><span class="mono">Pix</span></div><div class="b">
    <div class="pix"><span class="mono">Chave Pix (CNPJ)</span><b>${e(r.pix_key)}</b></div>
    <div><div class="kv"><span>Valor a pagar</span><b style="font-size:16px">${m(r.amount)}</b></div><div class="kv"><span>Vencimento</span><b>${d(r.due_date)}</b></div><div class="kv"><span>Favorecido</span><b>${e(E.favorecido || E.razao)}</b></div><div class="kv"><span>CNPJ</span><b>${e(E.cnpj)}</b></div></div></div></div>
  <div class="ins"><b>Instruções de pagamento</b><br>Efetue o pagamento até ${d(r.due_date)} via Pix. Após o pagamento, envie o comprovante pelo painel ou pelo WhatsApp ${e(E.contato)}.</div>`}
  <div class="ft"><span class="mono">Documento gerado eletronicamente</span><span class="mono">Fatura ${e(r.number)}</span></div></div>`;
}
async function faturaBlob(r) { const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:0;top:0;width:794px;background:#fff;z-index:-10;pointer-events:none;opacity:1'; host.innerHTML = faturaHTML(r); document.body.appendChild(host); const sy = scrollY; window.scrollTo(0, 0);
  try { await document.fonts.ready; return await html2pdf().set({ margin: 0, image: { type: 'jpeg', quality: 0.97 }, html2canvas: { scale: 2, backgroundColor: '#ffffff', windowWidth: 794, scrollX: 0, scrollY: 0, x: 0, y: 0 }, jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait', hotfixes: ['px_scaling'] } }).from(host.firstElementChild).outputPdf('blob'); }
  finally { host.remove(); window.scrollTo(0, sy); } }
const faturaNome = r => `Fatura-${r.number}-${String(r.pagador?.nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')}.pdf`;
function saveBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }
async function baixarFatura(token) { const { data: r, error } = await sb.rpc('invoice_public', { p_token: token }); if (error || !r) return (window.toast || alert)('Fatura não encontrada'); (window.toast || (() => {}))('Gerando PDF...'); saveBlob(await faturaBlob(r), faturaNome(r)); }
async function baixarFaturasZip(tokens, zipName) { if (!tokens.length) return; if (tokens.length === 1) return baixarFatura(tokens[0]); const zip = new JSZip(); let n = 0;
  for (const t of tokens) { const { data: r } = await sb.rpc('invoice_public', { p_token: t }); if (!r) continue; zip.file(faturaNome(r), await faturaBlob(r)); n++; (window.toast || (() => {}))(`Gerando faturas ${n}/${tokens.length}...`); }
  saveBlob(await zip.generateAsync({ type: 'blob' }), zipName + '.zip'); (window.toast || (() => {}))('Faturas prontas', 'ok'); }
