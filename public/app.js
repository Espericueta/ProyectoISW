const $ = s => document.querySelector(s);
const money = n => '$' + Number(n || 0).toFixed(2);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const S = { user: null, view: 'venta', cat: 'Todos', cats: ['Todos'], q: '', client: 1, products: [], clients: [], categorias: [], cart: JSON.parse(sessionStorage.getItem('cart') || '[]') };
const FILE = { venta: 'venta', clientes: 'clientes', docs: 'documentos', inv: 'inventario', compras: 'compras', corte: 'corte', users: 'usuarios', resp: 'respaldos' };
const own = () => S.user.rol === 'Propietario';
const can = p => own() || S.user.permisos.includes(p);
const MENU = () => [['venta', 'Registrar venta', 1], ['clientes', 'Datos del cliente', 1], ['docs', 'Cotizaciones y notas', 1], ['inv', 'Inventario', can('Inventario')], ['compras', 'Compras y egresos', can('Compras')], ['corte', 'Corte de caja', can('Reportes')], ['users', 'Usuarios y permisos', own()], ['resp', 'Copias de seguridad', own()]].filter(m => m[2]);

async function api(m, u, b) {
  const r = await fetch('/api' + u, { method: m, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (sessionStorage.getItem('tk') || '') }, body: b ? JSON.stringify(b) : undefined });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && !location.pathname.endsWith('login.html')) { sessionStorage.clear(); location.href = 'login.html'; throw new Error('Tu sesión expiró'); }
  if (!r.ok) throw new Error(d.error || 'Error del servidor');
  return d;
}
function M(h) { $('#md').innerHTML = h; $('#ov').classList.add('on'); }
function T(t) { const e = $('#toast'); if (!e) return; e.textContent = t; e.style.display = 'block'; clearTimeout(T.i); T.i = setTimeout(() => e.style.display = 'none', 2600); }
const total = () => S.cart.reduce((a, l) => a + l.p * l.q, 0);
const saveCart = () => sessionStorage.setItem('cart', JSON.stringify(S.cart));
const nuevaVenta = () => ({ id_cliente: S.client, items: S.cart.map(l => ({ id_producto: l.id, cantidad: l.q })) });
function docHtml(d) {
  return `<div class="doc"><b>TRIATES PAPELERÍA</b><br>Calle Rosal #176, Valle de las Flores Infonavit<br>Saltillo, Coahuila · C.P. 25290<hr><b>${esc(d.tipo.toUpperCase())} #${String(d.folio).padStart(4, '0')}</b><br>Fecha: ${esc(d.fecha)}<br>Cliente: ${esc(d.cliente)}<br>Atendió: ${esc(d.usuario)}<hr>
 ${d.items.map(l => `${l.cantidad} × ${esc(l.nombre)}<span style="float:right">${money(l.subtotal)}</span><br>`).join('')}<hr><b>TOTAL<span style="float:right">${money(d.total)}</span></b><br>${d.tipo === 'Cotización' ? 'Vigencia: 7 días' : 'Pago: ' + esc(d.metodo_pago)}</div><br>`;
}

const A = {
  fill(u) { $('#u').value = u; $('#pw').value = '1234'; },
  async login() {
    try {
      const d = await api('POST', '/login', { usuario: $('#u').value.trim(), contrasena: $('#pw').value });
      sessionStorage.setItem('tk', d.token); sessionStorage.setItem('user', JSON.stringify(d.user)); location.href = 'venta.html';
    } catch (e) { $('#err').textContent = e.message + '. Revisa los datos e intenta de nuevo.'; }
  },
  async out() { try { await api('POST', '/logout'); } catch (e) {} sessionStorage.clear(); location.href = 'login.html'; },
  go(v) { location.href = FILE[v] + '.html'; },
  cat(i) { S.cat = S.cats[i]; V.grid(); V.chips(); },
  find(v) { S.q = v; V.grid(); },
  add(id) {
    const p = S.products.find(x => x.id_producto == id), l = S.cart.find(x => x.id == id);
    if (!p.es_servicio && (l ? l.q : 0) >= p.existencias) return T('Sin existencias de ' + p.nombre);
    l ? l.q++ : S.cart.push({ id: p.id_producto, n: p.nombre, p: p.precio, q: 1 }); V.ticket();
  },
  qty(id, d) {
    const l = S.cart.find(x => x.id == id), p = S.products.find(x => x.id_producto == id);
    if (d > 0 && !p.es_servicio && l.q >= p.existencias) return T('No hay más existencias');
    l.q += d; if (l.q <= 0) S.cart = S.cart.filter(x => x.id != id); V.ticket();
  },
  cli(v) { S.client = +v; },
  async quote() {
    if (!S.cart.length) return T('Agrega productos para cotizar');
    const d = await api('POST', '/documentos', { tipo: 'Cotización', ...nuevaVenta() });
    S.cart = []; saveCart(); V.ticket(); M(docHtml(d) + '<button class="btn p" onclick="A.close()">Cerrar</button>');
  },
  pay() {
    if (!S.cart.length) return T('Agrega productos para cobrar');
    M(`<h3 style="margin-top:0">Cobrar ${money(total())}</h3><label>Método de pago</label><select id="mt"><option>Efectivo</option><option>Tarjeta</option><option>Transferencia</option></select>
 <label>Monto recibido</label><input id="rc" type="number" min="0" oninput="A.chg()"><p id="ch" style="font-weight:800;font-size:20px">Cambio: $0.00</p>
 <div class="row"><button class="btn p" onclick="A.sell()">Confirmar venta</button><button class="btn" onclick="A.close()">Cancelar</button></div>`);
  },
  chg() { $('#ch').textContent = 'Cambio: ' + money(Math.max((+$('#rc').value || 0) - total(), 0)); },
  async sell() {
    const mt = $('#mt').value;
    if (mt === 'Efectivo' && (+$('#rc').value || 0) < total()) return T('El monto recibido es menor al total');
    const d = await api('POST', '/documentos', { tipo: 'Nota de remisión', metodo_pago: mt, ...nuevaVenta() });
    S.cart = []; saveCart(); M(docHtml(d) + '<button class="btn p" onclick="A.close()">Nueva venta</button>'); R();
  },
  async open(id) { M(docHtml(await api('GET', '/documentos/' + id)) + '<button class="btn" onclick="A.close()">Cerrar</button>'); },
  close() { $('#ov').classList.remove('on'); },
  cform() {
    M(`<h3 style="margin-top:0">Nuevo cliente</h3><label>Nombre</label><input id="cn"><label>Teléfono</label><input id="ct"><label>Correo</label><input id="cm">
 <div class="row" style="margin-top:14px"><button class="btn p" onclick="A.csave()">Guardar cliente</button><button class="btn" onclick="A.close()">Cancelar</button></div>`);
  },
  async csave() { await api('POST', '/clientes', { nombre: $('#cn').value, telefono: $('#ct').value, correo: $('#cm').value }); A.close(); T('Cliente guardado'); R(); },
  pform(id) {
    const p = id ? S.products.find(x => x.id_producto == id) : { nombre: '', id_categoria: S.categorias[0].id_categoria, precio: '', existencias: 0, stock_minimo: 5, es_servicio: 0 };
    M(`<h3 style="margin-top:0">${id ? 'Editar' : 'Alta de'} producto</h3><label>Nombre</label><input id="pn" value="${esc(p.nombre)}"><label>Categoría</label><select id="pc">${S.categorias.map(c => `<option value="${c.id_categoria}" ${c.id_categoria == p.id_categoria ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select>
 <label>Precio</label><input id="pp" type="number" min="0" step="0.01" value="${p.precio}"><label>Existencias</label><input id="ps" type="number" min="0" value="${p.existencias}"><label>Existencias mínimas (alerta)</label><input id="pm" type="number" min="0" value="${p.stock_minimo}">
 <label class="perm"><input type="checkbox" id="pv" ${p.es_servicio ? 'checked' : ''}> Es un servicio (sin existencias)</label>
 <div class="row" style="margin-top:14px"><button class="btn p" onclick="A.psave(${id || 0})">Guardar producto</button><button class="btn" onclick="A.close()">Cancelar</button></div>`);
  },
  async psave(id) {
    const b = { nombre: $('#pn').value, id_categoria: $('#pc').value, precio: $('#pp').value, existencias: $('#ps').value, stock_minimo: $('#pm').value, es_servicio: $('#pv').checked };
    await api(id ? 'PUT' : 'POST', '/productos' + (id ? '/' + id : ''), b); A.close(); T('Producto guardado'); R();
  },
  async pdel(id) { if (!confirm('¿Eliminar este producto? Las ventas anteriores se conservan.')) return; await api('DELETE', '/productos/' + id); T('Producto eliminado'); R(); },
  rform(id) {
    const p = S.products.find(x => x.id_producto == id);
    M(`<h3 style="margin-top:0">Resurtir: ${esc(p.nombre)}</h3><label>Cantidad que ingresa</label><input id="rq" type="number" min="1" value="10"><label>Costo total de la compra</label><input id="rk" type="number" min="0" step="0.01">
 <div class="row" style="margin-top:14px"><button class="btn p" onclick="A.rsave(${id})">Registrar resurtido</button><button class="btn" onclick="A.close()">Cancelar</button></div>`);
  },
  async rsave(id) { await api('POST', `/productos/${id}/resurtir`, { cantidad: $('#rq').value, costo: $('#rk').value }); A.close(); T('Resurtido registrado'); R(); },
  async eadd() { await api('POST', '/egresos', { tipo: $('#et').value, concepto: $('#ec').value, monto: $('#em').value }); T('Egreso registrado'); R(); },
  async cg() { await api('POST', '/corte'); T('Corte de caja guardado'); R(); },
  uform() {
    M(`<h3 style="margin-top:0">Nuevo usuario</h3><label>Nombre</label><input id="un"><label>Usuario</label><input id="uu"><label>Contraseña (mínimo 4 caracteres)</label><input id="up" type="password"><label>Rol</label><select id="ur"><option>Encargado de mostrador</option><option>Propietario</option></select>
 <div class="row" style="margin-top:14px"><button class="btn p" onclick="A.usave()">Crear usuario</button><button class="btn" onclick="A.close()">Cancelar</button></div>`);
  },
  async usave() { await api('POST', '/usuarios', { nombre: $('#un').value, usuario: $('#uu').value, contrasena: $('#up').value, rol: $('#ur').value }); A.close(); T('Usuario creado'); R(); },
  async perm(id) {
    const p = [...document.querySelectorAll(`input[data-u="${id}"]:checked`)].map(x => x.value);
    await api('PUT', `/usuarios/${id}/permisos`, { permisos: p }); T('Permisos actualizados');
  },
  async bk() { const d = await api('POST', '/respaldos'); T('Copia creada: ' + d.archivo); R(); },
};
// Todas las acciones muestran los errores del servidor en un aviso
for (const k of Object.keys(A)) { const f = A[k]; A[k] = (...a) => { try { const r = f(...a); if (r && r.catch) r.catch(e => T(e.message)); } catch (e) { T(e.message); } }; }

const V = {
  async venta() {
    [S.products, S.clients] = await Promise.all([api('GET', '/productos'), api('GET', '/clientes')]);
    S.cats = ['Todos', ...new Set(S.products.map(p => p.categoria))];
    if (!S.clients.some(c => c.id_cliente == S.client)) S.client = 1;
    S.cart = S.cart.filter(l => S.products.some(p => p.id_producto == l.id));
    return `<h2>Registrar venta</h2><div class="pos"><div><div class="row"><input style="max-width:280px" placeholder="Buscar producto o servicio" oninput="A.find(this.value)" value="${esc(S.q)}"><span id="chips" class="row"></span></div><div class="grid" id="grid"></div></div>
 <div class="card tk"><b>Ticket</b><label>Cliente</label><select onchange="A.cli(this.value)">${S.clients.map(c => `<option value="${c.id_cliente}" ${c.id_cliente == S.client ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select><div id="tk"></div></div></div>`;
  },
  chips() { const e = $('#chips'); if (e) e.innerHTML = S.cats.map((c, i) => `<button class="chip" style="${c == S.cat ? 'background:var(--acc);color:#14213d;border-color:var(--ink)' : ''}" onclick="A.cat(${i})">${esc(c)}</button>`).join(''); },
  grid() {
    const g = $('#grid'); if (!g) return;
    const l = S.products.filter(p => (S.cat == 'Todos' || p.categoria == S.cat) && p.nombre.toLowerCase().includes(S.q.toLowerCase()));
    g.innerHTML = l.map(p => `<button class="prod" onclick="A.add(${p.id_producto})"><b>${esc(p.nombre)}</b><span class="pr">${money(p.precio)}</span><small>${p.es_servicio ? 'Servicio' : p.existencias + ' en existencia'}</small></button>`).join('') || '<p>No se encontraron productos. Prueba con otro nombre o categoría.</p>';
  },
  ticket() {
    saveCart(); const t = $('#tk'); if (!t) return;
    t.innerHTML = (S.cart.length ? S.cart.map(l => `<div class="li"><span>${esc(l.n)}<br><small style="color:var(--mut)">${money(l.p)} c/u</small></span><span class="q"><button onclick="A.qty(${l.id},-1)" aria-label="Quitar uno">−</button>${l.q}<button onclick="A.qty(${l.id},1)" aria-label="Agregar uno">+</button></span><b>${money(l.p * l.q)}</b></div>`).join('') : '<p style="color:var(--mut)">Toca un producto para agregarlo al ticket.</p>')
      + `<div class="tot"><span>Total</span><span>${money(total())}</span></div><div class="row"><button class="btn" onclick="A.quote()">Realizar cotización</button><button class="btn p sp" onclick="A.pay()">Cobrar</button></div>`;
  },
  async clientes() {
    S.clients = await api('GET', '/clientes');
    return `<h2>Datos del cliente</h2><div class="row" style="margin-bottom:12px"><button class="btn p" onclick="A.cform()">Nuevo cliente</button></div><div class="card tw"><table><tr><th>Nombre</th><th>Teléfono</th><th>Correo</th></tr>${S.clients.slice(1).map(c => `<tr><td>${esc(c.nombre)}</td><td>${esc(c.telefono || '—')}</td><td>${esc(c.correo || '—')}</td></tr>`).join('')}</table></div>`;
  },
  async docs() {
    const d = await api('GET', '/documentos');
    return `<h2>Cotizaciones y notas de remisión</h2><div class="card tw">${d.length ? `<table><tr><th>Folio</th><th>Tipo</th><th>Fecha</th><th>Cliente</th><th>Total</th><th></th></tr>${d.map(x => `<tr><td>#${String(x.folio).padStart(4, '0')}</td><td>${x.tipo}</td><td>${esc(x.fecha)}</td><td>${esc(x.cliente)}</td><td>${money(x.total)}</td><td><button class="btn s" onclick="A.open(${x.id_documento})">Ver documento</button></td></tr>`).join('')}</table>` : '<p>Aún no hay documentos. Registra una venta o una cotización para generarlos.</p>'}</div>`;
  },
  async inv() {
    [S.products, S.categorias] = await Promise.all([api('GET', '/productos'), api('GET', '/categorias')]);
    const bajo = p => !p.es_servicio && p.existencias <= p.stock_minimo, low = S.products.filter(bajo).length;
    return `<h2>Inventario</h2><div class="stats"><div class="card stat"><b>${S.products.length}</b><span>Productos y servicios</span></div><div class="card stat"><b style="color:${low ? 'var(--bad)' : 'var(--ok)'}">${low}</b><span>Con existencias bajas</span></div></div>
 <div class="row" style="margin-bottom:12px"><button class="btn p" onclick="A.pform()">Alta de producto</button></div><div class="card tw"><table><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Existencias</th><th></th></tr>${S.products.map(p => `<tr><td>${esc(p.nombre)}</td><td>${esc(p.categoria)}</td><td>${money(p.precio)}</td><td>${p.es_servicio ? '<span class="tag">Servicio</span>' : `<span class="tag ${bajo(p) ? 'low' : 'ok'}">${p.existencias}${bajo(p) ? ' · resurtir' : ''}</span>`}</td><td class="row">${p.es_servicio ? '' : `<button class="btn s" onclick="A.rform(${p.id_producto})">Resurtir</button>`}<button class="btn s" onclick="A.pform(${p.id_producto})">Editar</button><button class="btn s d" onclick="A.pdel(${p.id_producto})">Eliminar</button></td></tr>`).join('')}</table></div>`;
  },
  async compras() {
    const e = await api('GET', '/egresos'), t = e.reduce((a, x) => a + x.monto, 0);
    return `<h2>Compras y egresos</h2><div class="card" style="margin-bottom:14px"><div class="row"><select id="et" style="max-width:170px"><option>Mercancía</option><option>Sueldos</option><option>Otros gastos</option></select><input id="ec" placeholder="Concepto" style="max-width:280px"><input id="em" type="number" min="0" step="0.01" placeholder="Monto" style="max-width:130px"><button class="btn p" onclick="A.eadd()">Registrar egreso</button></div></div>
 <div class="card tw"><table><tr><th>Fecha</th><th>Tipo</th><th>Concepto</th><th>Registró</th><th>Monto</th></tr>${e.map(x => `<tr><td>${esc(x.fecha)}</td><td>${esc(x.tipo)}</td><td>${esc(x.concepto)}</td><td>${esc(x.usuario)}</td><td>${money(x.monto)}</td></tr>`).join('')}<tr><td colspan="4"><b>Total mostrado</b></td><td><b>${money(t)}</b></td></tr></table></div>`;
  },
  async corte() {
    const [d, h] = await Promise.all([api('GET', '/corte'), api('GET', '/cortes')]);
    const por = k => (d.por_metodo.find(x => x.m == k) || { t: 0 }).t;
    return `<h2>Corte de caja</h2><div class="stats"><div class="card stat"><b>${money(d.total_ventas)}</b><span>Ventas de hoy (${d.notas} notas)</span></div><div class="card stat"><b>${money(d.total_egresos)}</b><span>Egresos de hoy</span></div><div class="card stat"><b style="color:${d.saldo >= 0 ? 'var(--ok)' : 'var(--bad)'}">${money(d.saldo)}</b><span>Saldo del día</span></div></div>
 <div class="row" style="margin-bottom:12px"><button class="btn p" onclick="A.cg()">Guardar corte del día</button></div>
 <div class="card tw" style="margin-bottom:14px"><table><tr><th>Método de pago</th><th>Total</th></tr>${['Efectivo', 'Tarjeta', 'Transferencia'].map(m => `<tr><td>${m}</td><td>${money(por(m))}</td></tr>`).join('')}</table></div>
 <h3>Cortes guardados</h3><div class="card tw">${h.length ? `<table><tr><th>Fecha</th><th>Usuario</th><th>Ventas</th><th>Egresos</th><th>Saldo</th></tr>${h.map(c => `<tr><td>${esc(c.fecha)}</td><td>${esc(c.usuario)}</td><td>${money(c.total_ventas)}</td><td>${money(c.total_egresos)}</td><td>${money(c.saldo)}</td></tr>`).join('')}</table>` : '<p>Aún no hay cortes guardados.</p>'}</div>`;
  },
  async users() {
    const u = await api('GET', '/usuarios');
    return `<h2>Usuarios y permisos</h2><div class="row" style="margin-bottom:12px"><button class="btn p" onclick="A.uform()">Nuevo usuario</button></div><div class="card tw"><table><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Accesos adicionales</th></tr>${u.map(x => `<tr><td>${esc(x.nombre)}</td><td>${esc(x.usuario)}</td><td>${esc(x.rol)}</td><td>${x.rol == 'Propietario' ? '<span class="tag ok">Acceso total</span>' : ['Inventario', 'Compras', 'Reportes'].map(p => `<label class="perm" style="margin:0"><input type="checkbox" value="${p}" data-u="${x.id}" ${x.permisos.includes(p) ? 'checked' : ''} onchange="A.perm(${x.id})">${p}</label>`).join('')}</td></tr>`).join('')}</table></div>`;
  },
  async resp() {
    const b = await api('GET', '/respaldos');
    return `<h2>Copias de seguridad</h2><div class="row" style="margin-bottom:12px"><button class="btn p" onclick="A.bk()">Crear copia ahora</button><span style="color:var(--mut)">Los archivos se guardan en la carpeta <code>backups/</code> del proyecto.</span></div><div class="card tw">${b.length ? `<table><tr><th>Fecha y hora</th><th>Archivo</th><th>Creada por</th></tr>${b.map(x => `<tr><td>${esc(x.fecha)}</td><td>${esc(x.archivo)}</td><td>${esc(x.usuario)}</td></tr>`).join('')}</table>` : '<p>Aún no hay copias de seguridad.</p>'}</div>`;
  },
};

async function R() {
  $('#nav').innerHTML = `<div class="logo">Triates <mark>POS</mark></div>` + MENU().map(([k, l]) => `<button class="${k == S.view ? 'on' : ''}" onclick="A.go('${k}')">${l}</button>`).join('') + `<div class="who">${esc(S.user.nombre)}<br><button style="padding:6px 0;color:var(--acc)" onclick="A.out()">Cerrar sesión</button></div>`;
  try { $('#main').innerHTML = await V[S.view](); if (S.view == 'venta') { V.chips(); V.grid(); V.ticket(); } } catch (e) { T(e.message); }
}
async function boot(view) {
  S.view = view;
  if (!sessionStorage.getItem('tk')) { location.href = 'login.html'; return; }
  try { S.user = await api('GET', '/me'); } catch (e) { return; }
  if (!MENU().some(m => m[0] == view)) { location.href = 'venta.html'; return; }
  await R();
}
$('#ov') && $('#ov').addEventListener('click', e => { if (e.target.id == 'ov') A.close(); });
$('#pw') && $('#pw').addEventListener('keydown', e => { if (e.key == 'Enter') A.login(); });
