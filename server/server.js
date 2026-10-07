const express = require('express'), path = require('path'), fs = require('fs'), crypto = require('crypto');
const bcrypt = require('bcryptjs'), Database = require('better-sqlite3');

const ROOT = path.join(__dirname, '..');
const DBFILE = process.env.DB_FILE || path.join(ROOT, 'database', 'triates_pos.db');
const BK = path.join(ROOT, 'backups');
fs.mkdirSync(BK, { recursive: true });

const db = new Database(DBFILE);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
const sql = f => fs.readFileSync(path.join(ROOT, 'database', f), 'utf8');
db.exec(sql('schema.sql'));
if (!db.prepare('SELECT COUNT(*) n FROM rol').get().n) db.exec(sql('seed.sql'));

const app = express();
app.use(express.json());
const sesiones = new Map();

const bad = (m, c = 400) => { const e = new Error(m); e.status = c; throw e; };
const wrap = f => (q, s) => {
  try { f(q, s); } catch (e) {
    if (!e.status) console.error(e);
    s.status(e.status || 500).json({ error: e.status ? e.message : 'Error interno del servidor' });
  }
};

function usuarioDe(id) {
  const u = db.prepare('SELECT u.id_usuario id, u.nombre, u.usuario, r.nombre rol FROM usuario u JOIN rol r ON r.id_rol=u.id_rol WHERE u.id_usuario=? AND u.activo=1').get(id);
  if (u) u.permisos = db.prepare('SELECT p.nombre FROM usuario_permiso up JOIN permiso p ON p.id_permiso=up.id_permiso WHERE up.id_usuario=?').all(id).map(x => x.nombre);
  return u;
}
// auth()        -> cualquier usuario con sesión
// auth('owner') -> solo Propietario
// auth('Inventario') -> Propietario o usuario con ese permiso
const auth = req => (q, s, n) => {
  const id = sesiones.get((q.headers.authorization || '').slice(7));
  const u = id && usuarioDe(id);
  if (!u) return s.status(401).json({ error: 'Sesión no válida' });
  const dueno = u.rol === 'Propietario';
  if (req === 'owner' ? !dueno : req && !dueno && !u.permisos.includes(req))
    return s.status(403).json({ error: 'No tienes permiso para esta acción' });
  q.user = u; n();
};

// ---------- Sesión ----------
app.post('/api/login', wrap((q, s) => {
  const { usuario, contrasena } = q.body || {};
  const r = db.prepare('SELECT id_usuario, contrasena_hash FROM usuario WHERE usuario=? AND activo=1').get(String(usuario || ''));
  if (!r || !bcrypt.compareSync(String(contrasena || ''), r.contrasena_hash)) bad('Usuario o contraseña incorrectos', 401);
  const token = crypto.randomBytes(24).toString('hex');
  sesiones.set(token, r.id_usuario);
  s.json({ token, user: usuarioDe(r.id_usuario) });
}));
app.get('/api/me', auth(), (q, s) => s.json(q.user));
app.post('/api/logout', auth(), (q, s) => { sesiones.delete(q.headers.authorization.slice(7)); s.json({ ok: true }); });

// ---------- Productos e inventario ----------
app.get('/api/categorias', auth(), wrap((q, s) => s.json(db.prepare('SELECT * FROM categoria ORDER BY nombre').all())));
app.get('/api/productos', auth(), wrap((q, s) => s.json(db.prepare(
  'SELECT p.*, c.nombre categoria FROM producto p JOIN categoria c ON c.id_categoria=p.id_categoria WHERE p.activo=1 ORDER BY c.nombre, p.nombre').all())));

const cuerpoProducto = b => {
  const nombre = String(b.nombre || '').trim(), precio = +b.precio, cat = +b.id_categoria, srv = b.es_servicio ? 1 : 0;
  const ex = srv ? 0 : parseInt(b.existencias || 0), min = parseInt(b.stock_minimo ?? 5);
  if (!nombre || !(precio > 0) || !cat || !(ex >= 0) || !(min >= 0)) bad('Completa nombre, categoría y un precio mayor a 0');
  return [cat, nombre, precio, ex, srv, min];
};
app.post('/api/productos', auth('Inventario'), wrap((q, s) => {
  const r = db.prepare('INSERT INTO producto(id_categoria,nombre,precio,existencias,es_servicio,stock_minimo) VALUES(?,?,?,?,?,?)').run(...cuerpoProducto(q.body));
  s.json({ id: r.lastInsertRowid });
}));
app.put('/api/productos/:id', auth('Inventario'), wrap((q, s) => {
  const r = db.prepare('UPDATE producto SET id_categoria=?,nombre=?,precio=?,existencias=?,es_servicio=?,stock_minimo=? WHERE id_producto=? AND activo=1').run(...cuerpoProducto(q.body), +q.params.id);
  if (!r.changes) bad('Producto no encontrado', 404);
  s.json({ ok: true });
}));
app.delete('/api/productos/:id', auth('Inventario'), wrap((q, s) => {
  db.prepare('UPDATE producto SET activo=0 WHERE id_producto=?').run(+q.params.id); // baja lógica: conserva el historial de ventas
  s.json({ ok: true });
}));
app.post('/api/productos/:id/resurtir', auth('Inventario'), wrap((q, s) => {
  const cant = parseInt(q.body.cantidad), costo = +q.body.costo;
  if (!(cant > 0) || !(costo > 0)) bad('Escribe una cantidad y un costo mayores a 0');
  db.transaction(() => {
    const p = db.prepare('SELECT * FROM producto WHERE id_producto=? AND activo=1 AND es_servicio=0').get(+q.params.id);
    if (!p) bad('Producto no encontrado o es un servicio', 404);
    const e = db.prepare("INSERT INTO egreso(id_usuario,tipo,concepto,monto) VALUES(?, 'Mercancía', ?, ?)").run(q.user.id, `Resurtido: ${p.nombre} (+${cant})`, costo).lastInsertRowid;
    db.prepare('INSERT INTO resurtido(id_producto,id_egreso,cantidad) VALUES(?,?,?)').run(p.id_producto, e, cant);
    db.prepare('UPDATE producto SET existencias=existencias+? WHERE id_producto=?').run(cant, p.id_producto);
  })();
  s.json({ ok: true });
}));

// ---------- Clientes ----------
app.get('/api/clientes', auth(), wrap((q, s) => s.json(db.prepare('SELECT * FROM cliente ORDER BY id_cliente').all())));
app.post('/api/clientes', auth(), wrap((q, s) => {
  const nombre = String(q.body.nombre || '').trim();
  if (!nombre) bad('Escribe el nombre del cliente');
  const r = db.prepare('INSERT INTO cliente(nombre,telefono,correo) VALUES(?,?,?)').run(nombre, q.body.telefono || null, q.body.correo || null);
  s.json({ id: r.lastInsertRowid });
}));

// ---------- Documentos (cotizaciones y notas de remisión) ----------
function documentoCompleto(id) {
  const d = db.prepare('SELECT d.*, c.nombre cliente, u.nombre usuario FROM documento d JOIN cliente c ON c.id_cliente=d.id_cliente JOIN usuario u ON u.id_usuario=d.id_usuario WHERE d.id_documento=?').get(id);
  if (!d) bad('Documento no encontrado', 404);
  d.items = db.prepare('SELECT dd.cantidad, dd.precio_unitario, dd.subtotal, p.nombre FROM detalle_documento dd JOIN producto p ON p.id_producto=dd.id_producto WHERE dd.id_documento=? ORDER BY dd.id_detalle').all(id);
  return d;
}
app.get('/api/documentos', auth(), wrap((q, s) => s.json(db.prepare(
  'SELECT d.id_documento, d.folio, d.tipo, d.fecha, d.total, d.metodo_pago, c.nombre cliente FROM documento d JOIN cliente c ON c.id_cliente=d.id_cliente ORDER BY d.id_documento DESC LIMIT 200').all())));
app.get('/api/documentos/:id', auth(), wrap((q, s) => s.json(documentoCompleto(+q.params.id))));
app.post('/api/documentos', auth(), wrap((q, s) => {
  const { tipo, id_cliente, metodo_pago, items } = q.body || {};
  if (!['Cotización', 'Nota de remisión'].includes(tipo)) bad('Tipo de documento inválido');
  if (!Array.isArray(items) || !items.length) bad('Agrega al menos un producto');
  const nota = tipo === 'Nota de remisión';
  if (nota && !['Efectivo', 'Tarjeta', 'Transferencia'].includes(metodo_pago)) bad('Selecciona un método de pago');
  const lineas = new Map(); // une líneas repetidas del mismo producto
  for (const i of items) { const c = parseInt(i.cantidad); if (!(c > 0)) bad('Cantidad inválida'); lineas.set(+i.id_producto, (lineas.get(+i.id_producto) || 0) + c); }
  const id = db.transaction(() => {
    let total = 0;
    const det = [...lineas].map(([idp, c]) => {
      const p = db.prepare('SELECT * FROM producto WHERE id_producto=? AND activo=1').get(idp);
      if (!p) bad('Uno de los productos ya no está disponible');
      if (nota && !p.es_servicio && p.existencias < c) bad(`Existencias insuficientes de ${p.nombre} (quedan ${p.existencias})`);
      total += p.precio * c;
      return { p, c };
    });
    total = Math.round(total * 100) / 100;
    const folio = db.prepare('SELECT COALESCE(MAX(folio),0)+1 f FROM documento').get().f;
    const cli = db.prepare('SELECT id_cliente FROM cliente WHERE id_cliente=?').get(+id_cliente || 1);
    if (!cli) bad('Cliente no encontrado', 404);
    const d = db.prepare('INSERT INTO documento(id_usuario,id_cliente,folio,tipo,metodo_pago,total) VALUES(?,?,?,?,?,?)')
      .run(q.user.id, cli.id_cliente, folio, tipo, nota ? metodo_pago : null, total).lastInsertRowid;
    for (const { p, c } of det) {
      db.prepare('INSERT INTO detalle_documento(id_documento,id_producto,cantidad,precio_unitario,subtotal) VALUES(?,?,?,?,?)').run(d, p.id_producto, c, p.precio, Math.round(p.precio * c * 100) / 100);
      if (nota && !p.es_servicio) db.prepare('UPDATE producto SET existencias=existencias-? WHERE id_producto=?').run(c, p.id_producto);
    }
    return d;
  })();
  s.json(documentoCompleto(id));
}));

// ---------- Compras y egresos ----------
app.get('/api/egresos', auth('Compras'), wrap((q, s) => s.json(db.prepare(
  'SELECT e.*, u.nombre usuario FROM egreso e JOIN usuario u ON u.id_usuario=e.id_usuario ORDER BY e.id_egreso DESC LIMIT 200').all())));
app.post('/api/egresos', auth('Compras'), wrap((q, s) => {
  const { tipo, concepto, monto } = q.body || {};
  if (!['Mercancía', 'Sueldos', 'Otros gastos'].includes(tipo) || !String(concepto || '').trim() || !(+monto > 0)) bad('Escribe tipo, concepto y un monto mayor a 0');
  const r = db.prepare('INSERT INTO egreso(id_usuario,tipo,concepto,monto) VALUES(?,?,?,?)').run(q.user.id, tipo, String(concepto).trim(), +monto);
  s.json({ id: r.lastInsertRowid });
}));

// ---------- Corte de caja ----------
function resumenDelDia() {
  const por_metodo = db.prepare("SELECT metodo_pago m, ROUND(SUM(total),2) t, COUNT(*) n FROM documento WHERE tipo='Nota de remisión' AND date(fecha)=date('now','localtime') GROUP BY metodo_pago").all();
  const total_egresos = db.prepare("SELECT ROUND(COALESCE(SUM(monto),0),2) t FROM egreso WHERE fecha=date('now','localtime')").get().t;
  const total_ventas = Math.round(por_metodo.reduce((a, x) => a + x.t, 0) * 100) / 100;
  return { por_metodo, notas: por_metodo.reduce((a, x) => a + x.n, 0), total_ventas, total_egresos, saldo: Math.round((total_ventas - total_egresos) * 100) / 100 };
}
app.get('/api/corte', auth('Reportes'), wrap((q, s) => s.json(resumenDelDia())));
app.post('/api/corte', auth('Reportes'), wrap((q, s) => {
  const r = resumenDelDia();
  db.prepare('INSERT INTO corte_caja(id_usuario,total_ventas,total_egresos,saldo) VALUES(?,?,?,?)').run(q.user.id, r.total_ventas, r.total_egresos, r.saldo);
  s.json(r);
}));
app.get('/api/cortes', auth('Reportes'), wrap((q, s) => s.json(db.prepare(
  'SELECT c.*, u.nombre usuario FROM corte_caja c JOIN usuario u ON u.id_usuario=c.id_usuario ORDER BY c.id_corte DESC LIMIT 50').all())));

// ---------- Usuarios y permisos (solo Propietario) ----------
const PERMISOS = () => db.prepare('SELECT id_permiso, nombre FROM permiso').all();
app.get('/api/usuarios', auth('owner'), wrap((q, s) => {
  const us = db.prepare('SELECT u.id_usuario id, u.nombre, u.usuario, r.nombre rol FROM usuario u JOIN rol r ON r.id_rol=u.id_rol WHERE u.activo=1 ORDER BY u.id_usuario').all();
  us.forEach(u => u.permisos = db.prepare('SELECT p.nombre FROM usuario_permiso up JOIN permiso p ON p.id_permiso=up.id_permiso WHERE up.id_usuario=?').all(u.id).map(x => x.nombre));
  s.json(us);
}));
app.post('/api/usuarios', auth('owner'), wrap((q, s) => {
  const { nombre, usuario, contrasena, rol } = q.body || {};
  const r = db.prepare('SELECT id_rol FROM rol WHERE nombre=?').get(String(rol || ''));
  if (!String(nombre || '').trim() || !String(usuario || '').trim() || String(contrasena || '').length < 4 || !r) bad('Completa todos los campos (contraseña de al menos 4 caracteres)');
  if (db.prepare('SELECT 1 FROM usuario WHERE usuario=?').get(usuario)) bad('Ese nombre de usuario ya existe', 409);
  const x = db.prepare('INSERT INTO usuario(id_rol,nombre,usuario,contrasena_hash) VALUES(?,?,?,?)').run(r.id_rol, nombre.trim(), usuario.trim(), bcrypt.hashSync(contrasena, 10));
  s.json({ id: x.lastInsertRowid });
}));
app.put('/api/usuarios/:id/permisos', auth('owner'), wrap((q, s) => {
  const pedidos = Array.isArray(q.body.permisos) ? q.body.permisos : [];
  db.transaction(() => {
    db.prepare('DELETE FROM usuario_permiso WHERE id_usuario=?').run(+q.params.id);
    for (const p of PERMISOS()) if (pedidos.includes(p.nombre)) db.prepare('INSERT INTO usuario_permiso(id_usuario,id_permiso) VALUES(?,?)').run(+q.params.id, p.id_permiso);
  })();
  s.json({ ok: true });
}));

// ---------- Copias de seguridad (solo Propietario) ----------
app.get('/api/respaldos', auth('owner'), wrap((q, s) => s.json(db.prepare(
  'SELECT c.*, u.nombre usuario FROM copia_seguridad c JOIN usuario u ON u.id_usuario=c.id_usuario ORDER BY c.id_copia DESC LIMIT 100').all())));
app.post('/api/respaldos', auth('owner'), async (q, s) => {
  try {
    const archivo = 'pos_' + new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14) + '.db';
    await db.backup(path.join(BK, archivo));
    db.prepare('INSERT INTO copia_seguridad(id_usuario,archivo) VALUES(?,?)').run(q.user.id, archivo);
    s.json({ archivo });
  } catch (e) { console.error(e); s.status(500).json({ error: 'No se pudo crear la copia de seguridad' }); }
});

// ---------- Interfaz ----------
app.use('/api', (q, s) => s.status(404).json({ error: 'Ruta no encontrada' }));
app.get('/', (q, s) => s.redirect('/login.html'));
app.use(express.static(path.join(ROOT, 'public')));

const PORT = process.env.PORT || 3000;
if (require.main === module) app.listen(PORT, () => console.log(`Triates POS listo en http://localhost:${PORT}`));
module.exports = app;
