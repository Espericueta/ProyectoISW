// Prueba de humo de la API: node server/test.js
process.env.DB_FILE = require('path').join(require('os').tmpdir(), 'triates_test_' + Date.now() + '.db');
const app = require('./server'); const assert = require('assert');
const srv = app.listen(0, async () => {
  const base = `http://localhost:${srv.address().port}/api`;
  const call = async (m, u, b, t) => { const r = await fetch(base + u, { method: m, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (t || '') }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json() }; };
  try {
    assert.equal((await call('POST', '/login', { usuario: 'mostrador', contrasena: 'mal' })).s, 401);
    const m = (await call('POST', '/login', { usuario: 'mostrador', contrasena: '1234' })).d.token;
    const o = (await call('POST', '/login', { usuario: 'propietario', contrasena: '1234' })).d.token;
    assert.equal((await call('POST', '/productos', { nombre: 'X' }, m)).s, 403);
    assert.equal((await call('GET', '/usuarios', null, m)).s, 403);
    const antes = (await call('GET', '/productos', null, m)).d.find(p => p.nombre === 'Resma de papel carta');
    const nota = await call('POST', '/documentos', { tipo: 'Nota de remisión', id_cliente: 2, metodo_pago: 'Efectivo', items: [{ id_producto: antes.id_producto, cantidad: 2 }, { id_producto: 9, cantidad: 10 }] }, m);
    assert.equal(nota.s, 200); assert.equal(nota.d.total, 220); assert.equal(nota.d.folio, 1);
    const desp = (await call('GET', '/productos', null, m)).d.find(p => p.id_producto === antes.id_producto);
    assert.equal(desp.existencias, antes.existencias - 2);
    assert.equal((await call('POST', '/documentos', { tipo: 'Nota de remisión', metodo_pago: 'Efectivo', items: [{ id_producto: antes.id_producto, cantidad: 999 }] }, m)).s, 400);
    const cot = await call('POST', '/documentos', { tipo: 'Cotización', items: [{ id_producto: antes.id_producto, cantidad: 1 }] }, m);
    assert.equal(cot.d.metodo_pago, null);
    assert.equal((await call('GET', '/productos', null, m)).d.find(p => p.id_producto === antes.id_producto).existencias, desp.existencias);
    assert.equal((await call('POST', '/productos/3/resurtir', { cantidad: 10, costo: 100 }, o)).s, 200);
    assert.equal((await call('POST', '/egresos', { tipo: 'Sueldos', concepto: 'Quincena', monto: 500 }, m)).s, 403);
    await call('PUT', '/usuarios/2/permisos', { permisos: ['Reportes'] }, o);
    const corte = (await call('GET', '/corte', null, m)).d;
    assert.equal(corte.total_ventas, 220); assert.equal(corte.total_egresos, 100); assert.equal(corte.saldo, 120);
    assert.equal((await call('POST', '/respaldos', null, o)).s, 200);
    console.log('Todas las pruebas de la API pasaron');
  } catch (e) { console.error('FALLÓ:', e.message); process.exitCode = 1; }
  srv.close(); process.exit(process.exitCode || 0);
});
