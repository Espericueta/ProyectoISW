-- Triates Papelería · Gestor de Venta (POS) · Esquema de base de datos (SQLite)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS rol (
  id_rol   INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre   TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS usuario (
  id_usuario      INTEGER PRIMARY KEY AUTOINCREMENT,
  id_rol          INTEGER NOT NULL REFERENCES rol(id_rol),
  nombre          TEXT NOT NULL,
  usuario         TEXT NOT NULL UNIQUE,
  contrasena_hash TEXT NOT NULL,
  activo          INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1))
);

CREATE TABLE IF NOT EXISTS permiso (
  id_permiso INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre     TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS usuario_permiso (
  id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  id_permiso INTEGER NOT NULL REFERENCES permiso(id_permiso) ON DELETE CASCADE,
  PRIMARY KEY (id_usuario, id_permiso)
);

CREATE TABLE IF NOT EXISTS cliente (
  id_cliente INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre     TEXT NOT NULL,
  telefono   TEXT,
  correo     TEXT
);

CREATE TABLE IF NOT EXISTS categoria (
  id_categoria INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre       TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS producto (
  id_producto  INTEGER PRIMARY KEY AUTOINCREMENT,
  id_categoria INTEGER NOT NULL REFERENCES categoria(id_categoria),
  nombre       TEXT NOT NULL,
  precio       REAL NOT NULL CHECK (precio > 0),
  existencias  INTEGER NOT NULL DEFAULT 0 CHECK (existencias >= 0),
  es_servicio  INTEGER NOT NULL DEFAULT 0 CHECK (es_servicio IN (0,1)),
  stock_minimo INTEGER NOT NULL DEFAULT 5 CHECK (stock_minimo >= 0),
  activo       INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1))
);

CREATE TABLE IF NOT EXISTS documento (
  id_documento INTEGER PRIMARY KEY AUTOINCREMENT,
  id_usuario   INTEGER NOT NULL REFERENCES usuario(id_usuario),
  id_cliente   INTEGER NOT NULL REFERENCES cliente(id_cliente),
  folio        INTEGER NOT NULL UNIQUE,
  tipo         TEXT NOT NULL CHECK (tipo IN ('Cotización','Nota de remisión')),
  fecha        TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  metodo_pago  TEXT CHECK (metodo_pago IN ('Efectivo','Tarjeta','Transferencia')),
  total        REAL NOT NULL CHECK (total >= 0),
  CHECK (tipo = 'Cotización' OR metodo_pago IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS detalle_documento (
  id_detalle      INTEGER PRIMARY KEY AUTOINCREMENT,
  id_documento    INTEGER NOT NULL REFERENCES documento(id_documento) ON DELETE CASCADE,
  id_producto     INTEGER NOT NULL REFERENCES producto(id_producto),
  cantidad        INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario REAL NOT NULL CHECK (precio_unitario >= 0),
  subtotal        REAL NOT NULL CHECK (subtotal >= 0)
);

CREATE TABLE IF NOT EXISTS egreso (
  id_egreso  INTEGER PRIMARY KEY AUTOINCREMENT,
  id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario),
  fecha      TEXT NOT NULL DEFAULT (date('now','localtime')),
  tipo       TEXT NOT NULL CHECK (tipo IN ('Mercancía','Sueldos','Otros gastos')),
  concepto   TEXT NOT NULL,
  monto      REAL NOT NULL CHECK (monto > 0)
);

CREATE TABLE IF NOT EXISTS resurtido (
  id_resurtido INTEGER PRIMARY KEY AUTOINCREMENT,
  id_producto  INTEGER NOT NULL REFERENCES producto(id_producto),
  id_egreso    INTEGER UNIQUE REFERENCES egreso(id_egreso),
  cantidad     INTEGER NOT NULL CHECK (cantidad > 0),
  fecha        TEXT NOT NULL DEFAULT (date('now','localtime'))
);

CREATE TABLE IF NOT EXISTS corte_caja (
  id_corte      INTEGER PRIMARY KEY AUTOINCREMENT,
  id_usuario    INTEGER NOT NULL REFERENCES usuario(id_usuario),
  fecha         TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  total_ventas  REAL NOT NULL,
  total_egresos REAL NOT NULL,
  saldo         REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS copia_seguridad (
  id_copia   INTEGER PRIMARY KEY AUTOINCREMENT,
  id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario),
  fecha      TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  archivo    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_producto_categoria ON producto(id_categoria);
CREATE INDEX IF NOT EXISTS idx_documento_fecha    ON documento(fecha);
CREATE INDEX IF NOT EXISTS idx_documento_cliente  ON documento(id_cliente);
CREATE INDEX IF NOT EXISTS idx_detalle_documento  ON detalle_documento(id_documento);
CREATE INDEX IF NOT EXISTS idx_egreso_fecha       ON egreso(fecha);
