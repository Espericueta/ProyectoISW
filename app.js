const $=s=>document.querySelector(s),money=n=>'$'+Number(n).toFixed(2),today=()=>new Date().toLocaleDateString('es-MX');
const S={user:null,view:'venta',cart:[],cat:'Todos',q:'',client:0,folio:1,
products:[
{id:1,n:'Resma de papel carta',c:'Papel',p:105,s:24},{id:2,n:'Cuaderno profesional',c:'Papel',p:38,s:40},
{id:3,n:'Carpeta tamaño carta',c:'Oficina',p:22,s:6},{id:4,n:'Pegamento blanco 250 ml',c:'Manualidades',p:28,s:15},
{id:5,n:'Pintura acrílica',c:'Manualidades',p:18,s:30},{id:6,n:'Papel de regalo',c:'Regalos',p:15,s:50},
{id:7,n:'Listón (metro)',c:'Regalos',p:6,s:3},{id:8,n:'Peluche chico',c:'Regalos',p:85,s:9},
{id:9,n:'Fotocopia B/N',c:'Servicios',p:1,s:null},{id:10,n:'Impresión a color',c:'Servicios',p:5,s:null},
{id:11,n:'Escaneo',c:'Servicios',p:3,s:null},{id:12,n:'Engargolado',c:'Servicios',p:25,s:null},{id:13,n:'Enmicado',c:'Servicios',p:12,s:null}],
clients:[{id:0,n:'Público en general',t:'—',m:''},{id:1,n:'María López',t:'844 555 0192',m:'maria@correo.com'},{id:2,n:'Escuela Primaria Benito Juárez',t:'844 555 0147',m:'direccion@bj.edu.mx'}],
docs:[],expenses:[{id:1,f:today(),t:'Mercancía',c:'Resmas de papel (proveedor)',m:1200}],
users:[{id:1,u:'propietario',n:'Propietario',r:'Propietario',pw:'1234',pm:['Inventario','Compras','Reportes','Usuarios','Respaldos']},{id:2,u:'mostrador',n:'Encargado de mostrador',r:'Encargado de mostrador',pw:'1234',pm:[]}],
backups:['01/09/2026 08:00']};
const KEY='triates_pos_v1';
(function(){try{const d=JSON.parse(localStorage.getItem(KEY));if(d)Object.assign(S,d)}catch(e){}})();
function save(){try{localStorage.setItem(KEY,JSON.stringify({products:S.products,clients:S.clients,docs:S.docs,expenses:S.expenses,users:S.users,backups:S.backups,folio:S.folio,cart:S.cart,client:S.client}))}catch(e){}}
const FILE={venta:'venta',clientes:'clientes',docs:'documentos',inv:'inventario',compras:'compras',corte:'corte',users:'usuarios',resp:'respaldos'};
const MENU={Propietario:[['venta','Registrar venta'],['clientes','Datos del cliente'],['docs','Cotizaciones y notas'],['inv','Inventario'],['compras','Compras y egresos'],['corte','Corte de caja'],['users','Usuarios y permisos'],['resp','Copias de seguridad']],
'Encargado de mostrador':[['venta','Registrar venta'],['clientes','Datos del cliente'],['docs','Cotizaciones y notas']]};
const A={
fill(u){$('#u').value=u;$('#pw').value='1234'},
login(){const x=S.users.find(a=>a.u===$('#u').value.trim()&&a.pw===$('#pw').value);
 if(!x){$('#err').textContent='Usuario o contraseña incorrectos. Revisa los datos e intenta de nuevo.';return}
 sessionStorage.setItem('triates_user',x.id);location.href='venta.html'},
out(){sessionStorage.removeItem('triates_user');location.href='login.html'},
go(v){location.href=FILE[v]+'.html'},
cat(c){S.cat=c;R()},
find(v){S.q=v;V.grid()},
add(id){const p=S.products.find(x=>x.id==id),l=S.cart.find(x=>x.id==id),n=l?l.q:0;
 if(p.s!==null&&n>=p.s){T('Sin existencias de '+p.n);return}
 l?l.q++:S.cart.push({id:p.id,n:p.n,p:p.p,q:1});V.ticket()},
qty(id,d){const l=S.cart.find(x=>x.id==id),p=S.products.find(x=>x.id==id);
 if(d>0&&p.s!==null&&l.q>=p.s){T('No hay más existencias');return}
 l.q+=d;if(l.q<=0)S.cart=S.cart.filter(x=>x.id!=id);V.ticket()},
cli(v){S.client=+v;save()},
total(){return S.cart.reduce((a,l)=>a+l.p*l.q,0)},
quote(){if(!S.cart.length){T('Agrega productos para cotizar');return}
 const d=A.mk('Cotización','—');S.docs.unshift(d);M(A.docHtml(d)+'<button class="btn p" onclick="A.close()">Cerrar</button>');S.cart=[];V.ticket()},
pay(){if(!S.cart.length){T('Agrega productos para cobrar');return}
 M(`<h3 style="margin-top:0">Cobrar ${money(A.total())}</h3><label>Método de pago</label><select id="mt"><option>Efectivo</option><option>Tarjeta</option><option>Transferencia</option></select>
 <label>Monto recibido</label><input id="rc" type="number" min="0" oninput="A.chg()"><p id="ch" style="font-weight:800;font-size:20px">Cambio: $0.00</p>
 <div class="row"><button class="btn p" onclick="A.sell()">Confirmar venta</button><button class="btn" onclick="A.close()">Cancelar</button></div>`)},
chg(){const c=(+$('#rc').value||0)-A.total();$('#ch').textContent='Cambio: '+money(Math.max(c,0))},
sell(){const mt=$('#mt').value,rc=+$('#rc').value||0;if(mt==='Efectivo'&&rc<A.total()){T('El monto recibido es menor al total');return}
 S.cart.forEach(l=>{const p=S.products.find(x=>x.id==l.id);if(p.s!==null)p.s-=l.q});
 const d=A.mk('Nota de remisión',mt);S.docs.unshift(d);S.cart=[];M(A.docHtml(d)+'<button class="btn p" onclick="A.close()">Nueva venta</button>');R()},
mk(t,mt){return{f:S.folio++,t,d:today(),c:S.clients.find(x=>x.id==S.client).n,mt,u:S.user.n,it:S.cart.map(l=>({...l})),tot:A.total()}},
docHtml(d){return`<div class="doc"><b>TRIATES PAPELERÍA</b><br>Calle Rosal #176, Valle de las Flores Infonavit<br>Saltillo, Coahuila · C.P. 25290<hr><b>${d.t.toUpperCase()} #${String(d.f).padStart(4,'0')}</b><br>Fecha: ${d.d}<br>Cliente: ${d.c}<br>Atendió: ${d.u}<hr>
 ${d.it.map(l=>`${l.q} × ${l.n}<span style="float:right">${money(l.p*l.q)}</span><br>`).join('')}<hr><b>TOTAL<span style="float:right">${money(d.tot)}</span></b><br>${d.t==='Cotización'?'Vigencia: 7 días':'Pago: '+d.mt}</div><br>`},
open(i){M(A.docHtml(S.docs[i])+'<button class="btn" onclick="A.close()">Cerrar</button>')},
close(){$('#ov').classList.remove('on')},
cform(){M(`<h3 style="margin-top:0">Nuevo cliente</h3><label>Nombre</label><input id="cn"><label>Teléfono</label><input id="ct"><label>Correo</label><input id="cm">
 <div class="row" style="margin-top:14px"><button class="btn p" onclick="A.csave()">Guardar cliente</button><button class="btn" onclick="A.close()">Cancelar</button></div>`)},
csave(){const n=$('#cn').value.trim();if(!n){T('Escribe el nombre del cliente');return}
 S.clients.push({id:S.clients.length,n,t:$('#ct').value||'—',m:$('#cm').value});A.close();T('Cliente guardado');R()},
pform(id){const p=id?S.products.find(x=>x.id==id):{n:'',c:'Papel',p:'',s:''};
 M(`<h3 style="margin-top:0">${id?'Editar':'Alta de'} producto</h3><label>Nombre</label><input id="pn" value="${p.n}"><label>Categoría</label><select id="pc">${['Papel','Oficina','Manualidades','Regalos','Servicios'].map(c=>`<option ${c==p.c?'selected':''}>${c}</option>`).join('')}</select>
 <label>Precio</label><input id="pp" type="number" min="0" value="${p.p}"><label>Existencias (vacío si es servicio)</label><input id="ps" type="number" min="0" value="${p.s??''}">
 <div class="row" style="margin-top:14px"><button class="btn p" onclick="A.psave(${id||0})">Guardar producto</button><button class="btn" onclick="A.close()">Cancelar</button></div>`)},
psave(id){const n=$('#pn').value.trim(),pr=+$('#pp').value;if(!n||!pr){T('Completa nombre y precio');return}
 const s=$('#ps').value===''?null:+$('#ps').value,o={n,c:$('#pc').value,p:pr,s};
 id?Object.assign(S.products.find(x=>x.id==id),o):S.products.push({id:Date.now(),...o});A.close();T('Producto guardado');R()},
pdel(id){S.products=S.products.filter(x=>x.id!=id);T('Producto eliminado');R()},
restock(id){const p=S.products.find(x=>x.id==id);p.s+=10;S.expenses.unshift({id:Date.now(),f:today(),t:'Mercancía',c:'Resurtido: '+p.n+' (+10)',m:p.p*10*.6});T('Resurtido registrado: +10 piezas');R()},
eadd(){const c=$('#ec').value.trim(),m=+$('#em').value;if(!c||!m){T('Escribe concepto y monto');return}
 S.expenses.unshift({id:Date.now(),f:today(),t:$('#et').value,c,m});R()},
uform(){M(`<h3 style="margin-top:0">Nuevo usuario</h3><label>Nombre</label><input id="un"><label>Usuario</label><input id="uu"><label>Contraseña</label><input id="up" type="password"><label>Rol</label><select id="ur"><option>Encargado de mostrador</option><option>Propietario</option></select>
 <div class="row" style="margin-top:14px"><button class="btn p" onclick="A.usave()">Crear usuario</button><button class="btn" onclick="A.close()">Cancelar</button></div>`)},
usave(){const n=$('#un').value.trim(),u=$('#uu').value.trim(),pw=$('#up').value;if(!n||!u||!pw){T('Completa todos los campos');return}
 S.users.push({id:Date.now(),u,n,r:$('#ur').value,pw,pm:[]});A.close();R()},
perm(id,p){const u=S.users.find(x=>x.id==id);u.pm=u.pm.includes(p)?u.pm.filter(x=>x!=p):[...u.pm,p];save();T('Permisos actualizados')},
bk(){S.backups.unshift(new Date().toLocaleString('es-MX'));T('Copia de seguridad creada');R()}};
function M(h){$('#md').innerHTML=h;$('#ov').classList.add('on')}
function T(t){const e=$('#toast');e.textContent=t;e.style.display='block';clearTimeout(T.i);T.i=setTimeout(()=>e.style.display='none',2200)}
const cats=['Todos','Papel','Oficina','Manualidades','Regalos','Servicios'];
const V={
venta(){return`<h2>Registrar venta</h2><div class="pos"><div><div class="row"><input style="max-width:280px" placeholder="Buscar producto o servicio" oninput="A.find(this.value)" value="${S.q}">${cats.map(c=>`<button class="chip" style="${c==S.cat?'background:var(--acc);color:#14213d;border-color:var(--ink)':''}" onclick="A.cat('${c}')">${c}</button>`).join('')}</div><div class="grid" id="grid"></div></div>
 <div class="card tk"><b>Ticket</b><label>Cliente</label><select onchange="A.cli(this.value)">${S.clients.map(c=>`<option value="${c.id}" ${c.id==S.client?'selected':''}>${c.n}</option>`).join('')}</select><div id="tk"></div></div></div>`},
grid(){const g=$('#grid');if(!g)return;const l=S.products.filter(p=>(S.cat=='Todos'||p.c==S.cat)&&p.n.toLowerCase().includes(S.q.toLowerCase()));
 g.innerHTML=l.map(p=>`<button class="prod" onclick="A.add(${p.id})"><b>${p.n}</b><span class="pr">${money(p.p)}</span><small>${p.s===null?'Servicio':p.s+' en existencia'}</small></button>`).join('')||'<p>No se encontraron productos. Prueba con otro nombre o categoría.</p>'},
ticket(){save();const t=$('#tk');if(!t)return;t.innerHTML=(S.cart.length?S.cart.map(l=>`<div class="li"><span>${l.n}<br><small style="color:var(--mut)">${money(l.p)} c/u</small></span><span class="q"><button onclick="A.qty(${l.id},-1)" aria-label="Quitar uno">−</button>${l.q}<button onclick="A.qty(${l.id},1)" aria-label="Agregar uno">+</button></span><b>${money(l.p*l.q)}</b></div>`).join(''):'<p style="color:var(--mut)">Toca un producto para agregarlo al ticket.</p>')+`<div class="tot"><span>Total</span><span>${money(A.total())}</span></div><div class="row"><button class="btn" onclick="A.quote()">Realizar cotización</button><button class="btn p sp" onclick="A.pay()">Cobrar</button></div>`},
clientes(){return`<h2>Datos del cliente</h2><div class="row" style="margin-bottom:12px"><button class="btn p" onclick="A.cform()">Nuevo cliente</button></div><div class="card tw"><table><tr><th>Nombre</th><th>Teléfono</th><th>Correo</th></tr>${S.clients.slice(1).map(c=>`<tr><td>${c.n}</td><td>${c.t}</td><td>${c.m||'—'}</td></tr>`).join('')}</table></div>`},
docs(){return`<h2>Cotizaciones y notas de remisión</h2><div class="card tw">${S.docs.length?`<table><tr><th>Folio</th><th>Tipo</th><th>Fecha</th><th>Cliente</th><th>Total</th><th></th></tr>${S.docs.map((d,i)=>`<tr><td>#${String(d.f).padStart(4,'0')}</td><td>${d.t}</td><td>${d.d}</td><td>${d.c}</td><td>${money(d.tot)}</td><td><button class="btn s" onclick="A.open(${i})">Ver documento</button></td></tr>`).join('')}</table>`:'<p>Aún no hay documentos. Registra una venta o una cotización para generarlos.</p>'}</div>`},
inv(){const low=S.products.filter(p=>p.s!==null&&p.s<=7).length;return`<h2>Inventario</h2><div class="stats"><div class="card stat"><b>${S.products.length}</b><span>Productos y servicios</span></div><div class="card stat"><b style="color:${low?'var(--bad)':'var(--ok)'}">${low}</b><span>Con existencias bajas</span></div></div>
 <div class="row" style="margin-bottom:12px"><button class="btn p" onclick="A.pform()">Alta de producto</button></div><div class="card tw"><table><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Existencias</th><th></th></tr>${S.products.map(p=>`<tr><td>${p.n}</td><td>${p.c}</td><td>${money(p.p)}</td><td>${p.s===null?'<span class="tag">Servicio</span>':`<span class="tag ${p.s<=7?'low':'ok'}">${p.s}${p.s<=7?' · resurtir':''}</span>`}</td><td class="row">${p.s!==null?`<button class="btn s" onclick="A.restock(${p.id})">Resurtir +10</button>`:''}<button class="btn s" onclick="A.pform(${p.id})">Editar</button><button class="btn s d" onclick="A.pdel(${p.id})">Eliminar</button></td></tr>`).join('')}</table></div>`},
compras(){const t=S.expenses.reduce((a,e)=>a+e.m,0);return`<h2>Compras y egresos</h2><div class="card" style="margin-bottom:14px"><div class="row"><select id="et" style="max-width:170px"><option>Mercancía</option><option>Sueldos</option><option>Otros gastos</option></select><input id="ec" placeholder="Concepto" style="max-width:280px"><input id="em" type="number" min="0" placeholder="Monto" style="max-width:130px"><button class="btn p" onclick="A.eadd()">Registrar egreso</button></div></div>
 <div class="card tw"><table><tr><th>Fecha</th><th>Tipo</th><th>Concepto</th><th>Monto</th></tr>${S.expenses.map(e=>`<tr><td>${e.f}</td><td>${e.t}</td><td>${e.c}</td><td>${money(e.m)}</td></tr>`).join('')}<tr><td colspan="3"><b>Total de egresos</b></td><td><b>${money(t)}</b></td></tr></table></div>`},
corte(){const v=S.docs.filter(d=>d.t=='Nota de remisión'),by=m=>v.filter(d=>d.mt==m).reduce((a,d)=>a+d.tot,0),tv=v.reduce((a,d)=>a+d.tot,0),eg=S.expenses.reduce((a,e)=>a+e.m,0);
 return`<h2>Corte de caja</h2><div class="stats"><div class="card stat"><b>${money(tv)}</b><span>Ventas (${v.length} notas)</span></div><div class="card stat"><b>${money(eg)}</b><span>Egresos</span></div><div class="card stat"><b style="color:${tv-eg>=0?'var(--ok)':'var(--bad)'}">${money(tv-eg)}</b><span>Saldo del día</span></div></div>
 <div class="card tw"><table><tr><th>Método de pago</th><th>Total</th></tr>${['Efectivo','Tarjeta','Transferencia'].map(m=>`<tr><td>${m}</td><td>${money(by(m))}</td></tr>`).join('')}</table></div>`},
users(){return`<h2>Usuarios y permisos</h2><div class="row" style="margin-bottom:12px"><button class="btn p" onclick="A.uform()">Nuevo usuario</button></div><div class="card tw"><table><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Accesos adicionales</th></tr>${S.users.map(u=>`<tr><td>${u.n}</td><td>${u.u}</td><td>${u.r}</td><td>${u.r=='Propietario'?'<span class="tag ok">Acceso total</span>':['Inventario','Compras','Reportes'].map(p=>`<label class="perm" style="margin:0"><input type="checkbox" ${u.pm.includes(p)?'checked':''} onchange="A.perm(${u.id},'${p}')">${p}</label>`).join('')}</td></tr>`).join('')}</table></div>`},
resp(){return`<h2>Copias de seguridad</h2><div class="row" style="margin-bottom:12px"><button class="btn p" onclick="A.bk()">Crear copia ahora</button></div><div class="card tw"><table><tr><th>Fecha y hora</th><th></th></tr>${S.backups.map(b=>`<tr><td>${b}</td><td><button class="btn s" onclick="T('Restauración simulada en esta demostración')">Restaurar</button></td></tr>`).join('')}</table></div>`}};
function R(){save();const m=MENU[S.user.r];
 $('#nav').innerHTML=`<div class="logo">Triates <mark>POS</mark></div>`+m.map(([k,l])=>`<button class="${k==S.view?'on':''}" onclick="A.go('${k}')">${l}</button>`).join('')+`<div class="who">${S.user.n}<br><button style="padding:6px 0;color:var(--acc)" onclick="A.out()">Cerrar sesión</button></div>`;
 $('#main').innerHTML=V[S.view]();if(S.view=='venta'){V.grid();V.ticket()}}
$('#ov')&&$('#ov').addEventListener('click',e=>{if(e.target.id=='ov')A.close()});
$('#pw')&&$('#pw').addEventListener('keydown',e=>{if(e.key=='Enter')A.login()});

function boot(view){S.view=view;const id=sessionStorage.getItem('triates_user');S.user=S.users.find(u=>u.id==id);
 if(!S.user){location.href='login.html';return}
 if(!MENU[S.user.r].some(m=>m[0]==view)){location.href='venta.html';return}
 R()}
