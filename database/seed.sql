-- Datos iniciales de demostración (contraseña de ambos usuarios: 1234)
INSERT INTO rol(nombre) VALUES ('Propietario'),('Encargado de mostrador');
INSERT INTO permiso(nombre) VALUES ('Inventario'),('Compras'),('Reportes');
INSERT INTO usuario(id_rol,nombre,usuario,contrasena_hash) VALUES
 (1,'Propietario','propietario','$2a$10$tGY9.4Wf98oIB8g0PlStROrtKlbkwmF.LwsfrHbAQl24bt/1EfDb.'),
 (2,'Encargado de mostrador','mostrador','$2a$10$tGY9.4Wf98oIB8g0PlStROrtKlbkwmF.LwsfrHbAQl24bt/1EfDb.');
INSERT INTO categoria(nombre) VALUES ('Papel'),('Oficina'),('Manualidades'),('Regalos'),('Servicios');
INSERT INTO cliente(nombre,telefono,correo) VALUES
 ('Público en general',NULL,NULL),
 ('María López','844 555 0192','maria@correo.com'),
 ('Escuela Primaria Benito Juárez','844 555 0147','direccion@bj.edu.mx');
INSERT INTO producto(id_categoria,nombre,precio,existencias,es_servicio,stock_minimo) VALUES
 (1,'Resma de papel carta',105,24,0,7),(1,'Cuaderno profesional',38,40,0,7),
 (2,'Carpeta tamaño carta',22,6,0,7),(3,'Pegamento blanco 250 ml',28,15,0,7),
 (3,'Pintura acrílica',18,30,0,7),(4,'Papel de regalo',15,50,0,7),
 (4,'Listón (metro)',6,3,0,7),(4,'Peluche chico',85,9,0,7),
 (5,'Fotocopia B/N',1,0,1,0),(5,'Impresión a color',5,0,1,0),(5,'Escaneo',3,0,1,0),
 (5,'Engargolado',25,0,1,0),(5,'Enmicado',12,0,1,0);
