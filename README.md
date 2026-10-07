# Triates Papelería · Gestor de Venta (POS)

Proyecto de Ingeniería de Software (ITS). Sistema web con base de datos, API y interfaz.

**Tecnologías:** Node.js · Express · SQLite (better-sqlite3) · bcryptjs · HTML/CSS/JS

## Cómo ejecutarlo

Requisito: Node.js 18 o superior.

```bash
npm install
npm start
```

Abre http://localhost:3000. La base de datos (`database/triates_pos.db`) se crea sola
la primera vez, ejecutando `database/schema.sql` y `database/seed.sql`.

| Usuario       | Contraseña | Rol                    |
|---------------|------------|------------------------|
| propietario   | 1234       | Propietario            |
| mostrador     | 1234       | Encargado de mostrador |

## Estructura

```
database/schema.sql   Tablas del diagrama E-R (13 tablas, llaves, restricciones, índices)
database/seed.sql     Roles, permisos, categorías, productos, clientes y usuarios de ejemplo
server/server.js      API REST (Express) y reglas de negocio
server/test.js        Prueba de humo de la API:  npm test
public/               Interfaz: login.html + una página por módulo, app.css y app.js
backups/              Copias de seguridad generadas desde la interfaz
```

## Reglas de negocio implementadas

- Contraseñas guardadas con hash (bcrypt). Sesión por token.
- **Encargado de mostrador:** registrar venta, cotizar, clientes, consultar documentos.
- **Propietario:** todo lo anterior, usuarios, permisos y copias de seguridad.
- El Propietario puede dar permisos adicionales por usuario: Inventario, Compras, Reportes.
- El servidor calcula precios y totales (no confía en el navegador) y valida existencias.
- Una **nota de remisión** descuenta existencias; una **cotización** no.
- Los servicios (fotocopia, engargolado, etc.) no manejan existencias.
- Resurtir un producto crea el egreso de mercancía y el registro de resurtido en una sola transacción.
- Eliminar un producto es una baja lógica (`activo = 0`) para conservar el historial de ventas.
- Corte de caja: totales del día por método de pago; se pueden guardar en la tabla `corte_caja`.

## API (resumen)

| Método y ruta                        | Acceso                 |
|--------------------------------------|------------------------|
| POST /api/login · GET /api/me        | Público · Sesión       |
| GET /api/productos · /categorias · /clientes | Sesión         |
| POST /api/clientes                   | Sesión                 |
| GET/POST /api/documentos             | Sesión                 |
| POST/PUT/DELETE /api/productos, POST /api/productos/:id/resurtir | Inventario |
| GET/POST /api/egresos                | Compras                |
| GET/POST /api/corte · GET /api/cortes | Reportes              |
| GET/POST /api/usuarios · PUT /api/usuarios/:id/permisos | Propietario |
| GET/POST /api/respaldos              | Propietario            |

## Notas

- Para reiniciar los datos de demostración, detén el servidor y borra `database/triates_pos.db*`.
- Para restaurar una copia: detén el servidor y reemplaza `database/triates_pos.db` por el archivo de `backups/`.
- Cambia las contraseñas de demostración antes de usarlo en el negocio real.
- Diferencia con el diagrama E-R: `producto` incluye la columna `activo` (baja lógica).
