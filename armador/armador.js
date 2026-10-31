/* =========================================================================
   ARMADOR DE RUTINAS
   =========================================================================
   Arma la rutina, la cifra y exporta el index.html que se sube a GitHub.

   CÓMO FUNCIONA EL CIFRADO
   - Cada rutina tiene una clave propia que se genera una sola vez y se
     guarda junto con la rutina (en el borrador y en el respaldo).
   - Al exportar, la rutina se cifra con AES-GCM y un vector nuevo cada vez.
     En el index.html queda solo el texto cifrado: la clave NO está ahí.
   - La clave viaja en el link, después del "#". Esa parte nunca se envía
     al servidor ni se guarda en el repositorio.
   - Como la clave no cambia entre ediciones, EL LINK DEL ALUMNO SIEMPRE
     ES EL MISMO aunque edites la rutina mil veces.

   Tus datos de coach salen de coach.js.
   ========================================================================= */

(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const LS = 'fl_rutina_borrador';
  const LS_BIB = 'fl_biblioteca_extra';
  const SITIO_DEF = (typeof COACH_DATOS !== 'undefined' && COACH_DATOS.sitio)
    || 'https://x5-007.github.io/CreadorDeRutinas';

  const COACH = (() => {
    const d = (typeof COACH_DATOS !== 'undefined' && COACH_DATOS) || {};
    const w = d.whatsapp || {};
    return {
      nombre: d.nombre || 'Damian Torres',
      rol: d.rol || 'Coach de entrenamiento',
      whatsapp: w.numero || '',
      lada: w.lada || '52',
      mostrar: w.mostrar || '',
    };
  })();

  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const hoy = () => new Date().toISOString().slice(0, 10);

  /* =====================================================================
     CIFRADO
     ===================================================================== */
  const aB64 = (buf) => {
    const b = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const deB64 = (s) => {
    const base = String(s).replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(base + '==='.slice((base.length + 3) % 4));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  };

  const hayCripto = () => !!(window.crypto && crypto.subtle);

  async function nuevaClave() {
    const k = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    return aB64(await crypto.subtle.exportKey('raw', k));
  }

  async function cifrar(objeto, claveB64) {
    const clave = await crypto.subtle.importKey('raw', deB64(claveB64), { name: 'AES-GCM' }, false, ['encrypt']);
    // Vector nuevo en cada exportación: nunca se repite con la misma clave.
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const datos = new TextEncoder().encode(JSON.stringify(objeto));
    const cifrado = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, clave, datos);
    return { v: 1, iv: aB64(iv), d: aB64(cifrado) };
  }

  async function descifrar(sobre, claveB64) {
    const clave = await crypto.subtle.importKey('raw', deB64(claveB64), { name: 'AES-GCM' }, false, ['decrypt']);
    const plano = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(sobre.iv) }, clave, deB64(sobre.d));
    return JSON.parse(new TextDecoder().decode(plano));
  }

  /* =====================================================================
     ESTADO
     ===================================================================== */
  const vacio = () => ({
    version: 2,
    alumno: '', slug: '', clave: '', objetivo: '', paquete: '', vigencia: '',
    actualizado: hoy(), nota: '', sitio: SITIO_DEF,
    dias: [],
  });

  let R = vacio();
  let diaActivo = 0;

  /* Ejercicios que agregaste desde aquí y todavía no están en ejercicios.js.
     Viven en este navegador hasta que los guardes en el sitio. */
  let extras = [];

  const guardarExtras = () => { try { localStorage.setItem(LS_BIB, JSON.stringify(extras)); } catch (e) {} };

  function cargarExtras() {
    try { extras = JSON.parse(localStorage.getItem(LS_BIB) || '[]'); } catch (e) { extras = []; }
    // Si ya llegaron al archivo, se quitan de aquí: así nunca se duplican.
    const enArchivo = new Set(EJERCICIOS.map((e) => e.id));
    const antes = extras.length;
    extras = extras.filter((e) => !enArchivo.has(e.id));
    if (extras.length !== antes) guardarExtras();
  }

  const biblioteca = () => EJERCICIOS.concat(extras);
  function gruposTodos() {
    const g = GRUPOS.slice();
    extras.forEach((e) => { if (e.grupo && !g.includes(e.grupo)) g.push(e.grupo); });
    return g;
  }
  let filtroGrupo = '';
  let busqueda = '';

  /* =====================================================================
     UTILIDADES
     ===================================================================== */
  function codigo(n) {
    const abc = 'abcdefghijkmnpqrstuvwxyz23456789';
    const bytes = crypto.getRandomValues(new Uint8Array(n));
    let s = '';
    for (let i = 0; i < n; i++) s += abc[bytes[i] % abc.length];
    return s;
  }
  // Sin nombre: el repositorio es público y la carpeta no debe decir de quién es.
  const slugAuto = () => `r-${codigo(4)}-${codigo(4)}`;

  function fechaLarga(iso) {
    const p = String(iso || '').split('-');
    if (p.length !== 3) return iso || '';
    const m = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
               'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][Number(p[1]) - 1];
    return m ? `${Number(p[2])} de ${m} de ${p[0]}` : iso;
  }
  const porId = (id) => biblioteca().find((e) => e.id === id);
  const nombrePila = () => (R.alumno || '').trim().split(/\s+/)[0] || '';

  const base = () => (R.sitio || SITIO_DEF).replace(/\/+$/, '');
  function urlRutina() {
    const u = `${base()}/${R.slug || 'r-xxxx'}/`;
    return R.clave ? `${u}#k=${R.clave}` : u;
  }

  let toastT;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(() => { t.hidden = true; }, 3200);
  }

  const guardar = () => { try { localStorage.setItem(LS, JSON.stringify(R)); } catch (e) {} };
  function cargar() {
    try {
      const v = localStorage.getItem(LS);
      if (v) R = Object.assign(vacio(), JSON.parse(v));
    } catch (e) {}
  }

  /* =====================================================================
     BIBLIOTECA
     ===================================================================== */
  function renderFiltros() {
    $('#filtros').innerHTML =
      `<button class="filtro${filtroGrupo === '' ? ' is-on' : ''}" data-g="">Todos</button>` +
      gruposTodos().map((g) => `<button class="filtro${filtroGrupo === g ? ' is-on' : ''}" data-g="${esc(g)}">${esc(g)}</button>`).join('');
  }

  function renderBiblio() {
    const q = busqueda.toLowerCase();
    const lista = biblioteca().filter((e) =>
      (!filtroGrupo || e.grupo === filtroGrupo) &&
      (!q || e.nombre.toLowerCase().includes(q) || e.grupo.toLowerCase().includes(q)));

    $('#biblioDestino').textContent = R.dias.length
      ? `Se agrega a: ${R.dias[diaActivo] ? (R.dias[diaActivo].nombre || 'Día ' + (diaActivo + 1)) : '—'}`
      : 'Primero agrega un día';

    const propios = new Set(extras.map((e) => e.id));

    $('#biblioList').innerHTML = lista.length
      ? lista.map((e) => `
          <div class="bib-fila">
            <button class="bib-item" data-add="${esc(e.id)}" type="button">
              ${e.poster
                ? `<img class="bib-item__mini" src="../clips/${esc(e.poster)}" alt="" loading="lazy"
                        onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'bib-item__mini'}))">`
                : `<span class="bib-item__mini"></span>`}
              <span class="bib-item__txt">
                <b>${esc(e.nombre)}${propios.has(e.id) ? '<i class="bib-item__tuyo">tuyo</i>' : ''}</b>
                <span>${esc(e.grupo)}${e.clip ? '' : ' · <i class="bib-item__sin">sin clip</i>'}</span>
              </span>
              <span class="bib-item__add">+</span>
            </button>
            ${propios.has(e.id)
              ? `<button class="icon-btn icon-btn--del bib-item__quitar" data-quitar="${esc(e.id)}" title="Quitar de la biblioteca" type="button">✕</button>`
              : ''}
          </div>`).join('')
      : '<p class="vacio">Ningún ejercicio coincide.<br>Puedes crearlo con <b>+ Nuevo</b>.</p>';

    const n = extras.length;
    $('#biblioGuardar').hidden = n === 0;
    if (n) {
      $('#extrasCuenta').innerHTML = n === 1
        ? '<b>1 ejercicio tuyo</b> solo está en este navegador.'
        : `<b>${n} ejercicios tuyos</b> solo están en este navegador.`;
    }
  }

  /* =====================================================================
     DÍAS
     ===================================================================== */
  function renderDias() {
    const cont = $('#dias');
    if (!R.dias.length) {
      cont.innerHTML = '<p class="vacio">Todavía no hay días. Agrega el primero abajo.</p>';
      return;
    }
    cont.innerHTML = R.dias.map((dia, i) => {
      const bloques = agrupar(dia.ejercicios || []);
      const cuerpo = bloques.length
        ? bloques.map((bl) => `
            <div class="bloque-ed">
              <p class="bloque-ed__t">${esc(bl.grupo)}</p>
              ${bl.ejercicios.map((ej) => fila(ej, i, (dia.ejercicios || []).indexOf(ej))).join('')}
            </div>`).join('')
        : '<p class="dia-vacio">Elige ejercicios de la biblioteca para este día.</p>';

      return `
        <article class="dia-card${i === diaActivo ? ' is-activo' : ''}">
          <header class="dia-card__head" data-activar="${i}">
            <span class="dia-card__n">${i + 1}</span>
            <span class="dia-card__inputs">
              <input class="input" data-campo="nombre" data-dia="${i}" value="${esc(dia.nombre || '')}" placeholder="Lunes">
              <input class="input" data-campo="enfoque" data-dia="${i}" value="${esc(dia.enfoque || '')}" placeholder="Pecho / Tríceps">
            </span>
            <span class="dia-card__tools">
              <button class="icon-btn" data-mover-dia="${i}" data-dir="-1" title="Subir" type="button">↑</button>
              <button class="icon-btn" data-mover-dia="${i}" data-dir="1" title="Bajar" type="button">↓</button>
              <button class="icon-btn icon-btn--del" data-borrar-dia="${i}" title="Eliminar día" type="button">✕</button>
            </span>
          </header>
          <div class="dia-card__body">${cuerpo}</div>
        </article>`;
    }).join('');
  }

  function fila(ej, di, ei) {
    return `
      <div class="ej-row">
        ${ej.poster
          ? `<img class="ej-row__mini" src="../clips/${esc(ej.poster)}" alt="" loading="lazy">`
          : `<span class="ej-row__mini"></span>`}
        <div class="ej-row__main">
          <div class="ej-row__name">${esc(ej.nombre)}</div>
          <div class="ej-row__campos">
            <input class="input" data-ej="${di}:${ei}" data-campo="series"   value="${esc(ej.series || '')}"   placeholder="3" aria-label="Series">
            <input class="input" data-ej="${di}:${ei}" data-campo="reps"     value="${esc(ej.reps || '')}"     placeholder="10-12" aria-label="Repeticiones">
            <input class="input" data-ej="${di}:${ei}" data-campo="descanso" value="${esc(ej.descanso || '')}" placeholder="60 s" aria-label="Descanso">
            <input class="input" data-ej="${di}:${ei}" data-campo="nota"     value="${esc(ej.nota || '')}"     placeholder="Nota de técnica" aria-label="Nota">
          </div>
        </div>
        <div class="ej-row__tools">
          <button class="icon-btn" data-mover-ej="${di}:${ei}" data-dir="-1" title="Subir" type="button">↑</button>
          <button class="icon-btn" data-mover-ej="${di}:${ei}" data-dir="1" title="Bajar" type="button">↓</button>
          <button class="icon-btn icon-btn--del" data-borrar-ej="${di}:${ei}" title="Quitar" type="button">✕</button>
        </div>
      </div>`;
  }

  function agrupar(ejercicios) {
    const orden = [];
    const mapa = new Map();
    ejercicios.forEach((ej) => {
      if (!mapa.has(ej.grupo)) { mapa.set(ej.grupo, []); orden.push(ej.grupo); }
      mapa.get(ej.grupo).push(ej);
    });
    return orden.map((g) => ({ grupo: g, ejercicios: mapa.get(g) }));
  }

  const renderLink = () => { $('#linkFinal').textContent = urlRutina(); };

  /* =====================================================================
     DATOS QUE SE CIFRAN
     ===================================================================== */
  function datosRutina() {
    return {
      version: 2,
      alumno: R.alumno.trim(),
      objetivo: R.objetivo.trim(),
      paquete: R.paquete.trim(),
      vigencia: R.vigencia.trim(),
      actualizado: R.actualizado,
      nota: R.nota.trim(),
      coach: COACH,
      dias: R.dias.map((dia) => ({
        nombre: dia.nombre || '',
        enfoque: dia.enfoque || '',
        bloques: agrupar(dia.ejercicios || []).map((bl) => ({
          grupo: bl.grupo,
          ejercicios: bl.ejercicios.map((ej) => ({
            nombre: ej.nombre, grupo: ej.grupo,
            clip: ej.clip || '', poster: ej.poster || '',
            series: ej.series || '', reps: ej.reps || '',
            descanso: ej.descanso || '', nota: ej.nota || '',
          })),
        })),
      })),
    };
  }

  /* ---------------------------------------------------------------------
     PLANTILLA DE LA PÁGINA DEL ALUMNO
     Lo único sin cifrar es el nombre de pila, que va en la vista previa de
     WhatsApp. Todo lo demás (apellido, objetivo, días, ejercicios, notas)
     queda cifrado dentro de #datos.
     --------------------------------------------------------------------- */
  function plantilla(sobre, extraHead) {
    const url = `${base()}/${R.slug}/`;
    const pila = nombrePila();
    const titulo = pila
      ? `Rutina de ${pila} — ${COACH.nombre}`
      : `Tu rutina de entrenamiento — ${COACH.nombre}`;
    const desc = 'Tu plan día por día, con video de cada ejercicio. Ábrelo desde el link que te mandaron.';
    const json = JSON.stringify(sobre).replace(/</g, '\\u003c');

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#171512">
<meta name="robots" content="noindex, nofollow">

<!-- Vista previa al compartir por WhatsApp -->
<meta property="og:type" content="article">
<meta property="og:site_name" content="${esc(COACH.nombre)} — ${esc(COACH.rol)}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(base())}/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Rutina personalizada de ${esc(COACH.nombre)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(titulo)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(base())}/og.jpg">
${extraHead || ''}
<link rel="icon" href="../img/perfil.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../base/rutina.css">
</head>
<body>

<header class="barra" id="barra">
  <div class="caja barra__interior">
    <img class="barra__foto" src="../img/perfil.webp" alt=""
         onerror="this.onerror=null;this.src='../img/perfil.png'">
    <div>
      <div class="barra__nombre" id="coachNombre"></div>
      <div class="barra__rol" id="coachRol"></div>
    </div>
  </div>
</header>

<section class="ficha">
  <div class="caja ficha__interior">
    <p class="antetitulo">Plan de entrenamiento</p>
    <h1 id="alumno"></h1>
    <p class="ficha__resumen" id="resumen"></p>
    <div class="ficha__chips" id="chips"></div>
    <div class="nota-coach" id="notaCoach"></div>
  </div>
</section>

<nav class="dias" id="dias" aria-label="Días de entrenamiento">
  <div class="caja dias__scroll" id="diasTabs"></div>
</nav>

<div id="diasPaneles"></div>

<footer class="pie">
  <div class="caja">
    <img class="pie__foto" src="../img/perfil.webp" alt=""
         onerror="this.onerror=null;this.src='../img/perfil.png'">
    <strong id="pieNombre"></strong>
    <p id="pieRol"></p>
  </div>
</footer>

<a class="wa-boton" id="waBoton" href="#"></a>

<script type="application/json" id="datos">${json}</script>
<script src="../base/rutina.js"></script>
</body>
</html>
`;
  }

  /* =====================================================================
     EXPORTAR, VISTA PREVIA E IMPORTAR
     ===================================================================== */
  function descargar(nombre, texto, tipo) {
    const blob = new Blob([texto], { type: tipo + ';charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  async function validar() {
    if (!hayCripto()) {
      toast('Abre el armador desde tu sitio con https, no como archivo local');
      return false;
    }
    if (!R.alumno.trim()) { toast('Ponle el nombre del alumno'); $('#fAlumno').focus(); return false; }
    if (!R.dias.length) { toast('Agrega al menos un día'); return false; }
    if (!R.slug) { R.slug = slugAuto(); $('#fSlug').value = R.slug; }
    if (!R.clave) { R.clave = await nuevaClave(); }
    renderLink();
    guardar();
    return true;
  }

  async function vistaPrevia() {
    if (!(await validar())) return;
    const sobre = await cifrar(datosRutina(), R.clave);
    // Solo para la vista previa: la clave va en una variable para no depender
    // del "#". Esto NO se incluye nunca en el archivo que se exporta.
    const extra = `<base href="${new URL('../vista-previa/', location.href).href}">`
      + `<script>location.hash='k=${R.clave}';<\/script>`;
    const w = window.open('', '_blank');
    if (!w) { toast('Tu navegador bloqueó la ventana emergente'); return; }
    w.document.open();
    w.document.write(plantilla(sobre, extra));
    w.document.close();
  }

  async function exportar() {
    if (!(await validar())) return;
    $('#mRuta').textContent = R.slug;
    $('#mRespaldo').textContent = `respaldo-${R.slug}.json`;
    $('#modal').hidden = false;
  }

  async function importarDesdeLink(url) {
    let u;
    try { u = new URL(url.trim()); } catch (e) { toast('Ese no parece un link válido'); return; }
    const k = new URLSearchParams(u.hash.replace(/^#/, '')).get('k');
    if (!k) { toast('Al link le falta la parte del # con la clave'); return; }

    const destino = u.origin + u.pathname.replace(/\/?$/, '/') + 'index.html';
    try {
      const resp = await fetch(destino, { cache: 'no-store' });
      if (!resp.ok) throw new Error(resp.status);
      const html = await resp.text();
      const m = html.match(/<script type="application\/json" id="datos">([\s\S]*?)<\/script>/);
      if (!m) throw new Error('sin datos');
      const datos = await descifrar(JSON.parse(m[1]), k);
      const slug = u.pathname.split('/').filter(Boolean).pop();
      // Solo adoptamos la dirección del link si es un sitio real: así, probar
      // con una URL local no deja esa dirección metida en las etiquetas.
      const esReal = u.protocol === 'https:' && !/^(localhost|127\.|\[?::1)/.test(u.hostname);
      const tramos = u.pathname.split('/').filter(Boolean);
      const sitio = esReal
        ? u.origin + (tramos.length > 1 ? '/' + tramos.slice(0, -1).join('/') : '')
        : (R.sitio || SITIO_DEF);
      cargarEnEditor(datos, { slug, clave: k, sitio });
      toast(`Rutina de ${R.alumno || 'alumno'} cargada`);
    } catch (e) {
      toast('No se pudo leer esa rutina. Revisa que el link esté completo.');
    }
  }

  function cargarEnEditor(d, extra) {
    R = Object.assign(vacio(), {
      alumno: d.alumno || '', objetivo: d.objetivo || '', paquete: d.paquete || '',
      vigencia: d.vigencia || '', actualizado: d.actualizado || hoy(), nota: d.nota || '',
      slug: (extra && extra.slug) || '', clave: (extra && extra.clave) || '',
      sitio: (extra && extra.sitio) || SITIO_DEF,
      dias: (d.dias || []).map((dia) => ({
        nombre: dia.nombre || '', enfoque: dia.enfoque || '',
        ejercicios: (dia.bloques || []).reduce((a, bl) => a.concat(bl.ejercicios || []), []),
      })),
    });
    diaActivo = 0;
    pintarTodo();
    guardar();
  }

  /* =====================================================================
     EVENTOS
     ===================================================================== */
  const campos = {
    fAlumno: 'alumno', fSlug: 'slug', fObjetivo: 'objetivo', fPaquete: 'paquete',
    fVigencia: 'vigencia', fFecha: 'actualizado', fNota: 'nota', fSitio: 'sitio',
  };
  Object.keys(campos).forEach((id) => {
    $('#' + id).addEventListener('input', (e) => {
      R[campos[id]] = e.target.value;
      renderLink();
      guardar();
    });
  });

  $('#btnSlug').addEventListener('click', () => {
    if (R.slug && !confirm('Si cambias el código, el link anterior deja de funcionar.\n¿Seguro?')) return;
    R.slug = slugAuto();
    $('#fSlug').value = R.slug;
    renderLink();
    guardar();
  });

  $('#buscar').addEventListener('input', (e) => { busqueda = e.target.value; renderBiblio(); });
  $('#filtros').addEventListener('click', (e) => {
    const b = e.target.closest('.filtro');
    if (!b) return;
    filtroGrupo = b.dataset.g;
    renderFiltros();
    renderBiblio();
  });
  $('#biblioList').addEventListener('click', (e) => {
    const quitar = e.target.closest('[data-quitar]');
    if (quitar) {
      const id = quitar.dataset.quitar;
      const ej = extras.find((x) => x.id === id);
      if (!confirm(`¿Quitar "${ej ? ej.nombre : id}" de la biblioteca?\n\nLas rutinas que ya lo usan no se tocan.`)) return;
      extras = extras.filter((x) => x.id !== id);
      guardarExtras();
      renderFiltros();
      renderBiblio();
      return;
    }
    const b = e.target.closest('[data-add]');
    if (!b) return;
    if (!R.dias.length) { toast('Primero agrega un día'); return; }
    const base = porId(b.dataset.add);
    if (!base) return;
    R.dias[diaActivo].ejercicios.push({
      id: base.id, nombre: base.nombre, grupo: base.grupo,
      clip: base.clip || '', poster: base.poster || '',
      series: '3', reps: '10-12', descanso: '60 s', nota: '',
    });
    renderDias(); guardar();
    toast(`${base.nombre} → ${R.dias[diaActivo].nombre || 'Día ' + (diaActivo + 1)}`);
  });

  $('#btnDia').addEventListener('click', () => {
    const n = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    R.dias.push({ nombre: n[R.dias.length] || 'Día ' + (R.dias.length + 1), enfoque: '', ejercicios: [] });
    diaActivo = R.dias.length - 1;
    renderDias(); renderBiblio(); guardar();
  });

  $('#dias').addEventListener('click', (e) => {
    const act = e.target.closest('[data-activar]');
    const movD = e.target.closest('[data-mover-dia]');
    const delD = e.target.closest('[data-borrar-dia]');
    const movE = e.target.closest('[data-mover-ej]');
    const delE = e.target.closest('[data-borrar-ej]');

    if (movD) {
      const i = +movD.dataset.moverDia, j = i + Number(movD.dataset.dir);
      if (j < 0 || j >= R.dias.length) return;
      [R.dias[i], R.dias[j]] = [R.dias[j], R.dias[i]];
      if (diaActivo === i) diaActivo = j; else if (diaActivo === j) diaActivo = i;
      renderDias(); renderBiblio(); guardar(); return;
    }
    if (delD) {
      const i = +delD.dataset.borrarDia;
      if (!confirm(`¿Eliminar ${R.dias[i].nombre || 'este día'} y sus ejercicios?`)) return;
      R.dias.splice(i, 1);
      diaActivo = Math.max(0, Math.min(diaActivo, R.dias.length - 1));
      renderDias(); renderBiblio(); guardar(); return;
    }
    if (movE) {
      const [di, ei] = movE.dataset.moverEj.split(':').map(Number);
      const lista = R.dias[di].ejercicios, ej = lista[ei];
      const mismos = lista.map((x, k) => (x.grupo === ej.grupo ? k : -1)).filter((k) => k >= 0);
      const destino = mismos[mismos.indexOf(ei) + Number(movE.dataset.dir)];
      if (destino === undefined) return;
      [lista[ei], lista[destino]] = [lista[destino], lista[ei]];
      renderDias(); guardar(); return;
    }
    if (delE) {
      const [di, ei] = delE.dataset.borrarEj.split(':').map(Number);
      R.dias[di].ejercicios.splice(ei, 1);
      renderDias(); guardar(); return;
    }
    if (act) { diaActivo = +act.dataset.activar; renderDias(); renderBiblio(); }
  });

  $('#dias').addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.ej) {
      const [di, ei] = t.dataset.ej.split(':').map(Number);
      R.dias[di].ejercicios[ei][t.dataset.campo] = t.value;
      guardar();
    } else if (t.dataset.dia !== undefined && t.dataset.campo) {
      R.dias[+t.dataset.dia][t.dataset.campo] = t.value;
      guardar();
      if (t.dataset.campo === 'nombre') renderBiblio();
    }
  });

  $('#btnVista').addEventListener('click', vistaPrevia);
  $('#btnExportar').addEventListener('click', exportar);

  $('#btnFileHtml').addEventListener('click', async () => {
    const sobre = await cifrar(datosRutina(), R.clave);
    descargar('index.html', plantilla(sobre), 'text/html');
  });
  $('#btnFileJson').addEventListener('click', () => {
    const respaldo = Object.assign({}, R, { _aviso: 'NO subas este archivo a GitHub: contiene la clave sin cifrar.' });
    descargar(`respaldo-${R.slug}.json`, JSON.stringify(respaldo, null, 2), 'application/json');
  });

  $('#modalX').addEventListener('click', () => { $('#modal').hidden = true; });
  $('#modal').addEventListener('click', (e) => { if (e.target === $('#modal')) $('#modal').hidden = true; });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    $('#modal').hidden = true;
    $('#modalEj').hidden = true;
    $('#modalBib').hidden = true;
    $('#modalImg').hidden = true;
  });

  async function copiar(texto, ok) {
    try { await navigator.clipboard.writeText(texto); toast(ok); }
    catch (e) { prompt('Copia este texto:', texto); }
  }
  $('#btnCopiarLink').addEventListener('click', async () => {
    if (!(await validar())) return;
    copiar(urlRutina(), 'Link copiado, completo con su clave');
  });
  $('#btnWa').addEventListener('click', async () => {
    if (!(await validar())) return;
    const pila = nombrePila() || 'crack';
    copiar(
      `Hola ${pila}, aquí está tu rutina 💪\n` +
      `Está dividida por días y cada ejercicio trae su video.\n\n${urlRutina()}\n\n` +
      `Ábrela tocando el link completo. Cualquier duda me escribes.`,
      'Mensaje copiado, pégalo en WhatsApp');
  });

  $('#btnImportarLink').addEventListener('click', () => {
    const url = prompt('Pega el link completo del alumno (con la parte del #):');
    if (url) importarDesdeLink(url);
  });

  $('#btnImportar').addEventListener('click', () => $('#fileImport').click());
  $('#fileImport').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const d = JSON.parse(fr.result);
        R = Object.assign(vacio(), d);
        delete R._aviso;
        diaActivo = 0;
        pintarTodo();
        guardar();
        toast(`Rutina de ${R.alumno || 'alumno'} cargada`);
      } catch (err) {
        toast('Ese archivo no es un respaldo válido');
      }
      e.target.value = '';
    };
    fr.readAsText(f);
  });

  $('#btnLimpiar').addEventListener('click', async () => {
    if (!confirm('¿Vaciar el armador y empezar de cero? Se pierde el borrador actual.')) return;
    R = vacio();
    diaActivo = 0;
    try { localStorage.removeItem(LS); } catch (e) {}
    if (hayCripto()) { R.slug = slugAuto(); R.clave = await nuevaClave(); }
    pintarTodo();
    guardar();
  });

  /* =====================================================================
     IMÁGENES PARA COMPARTIR
     ===================================================================== */
  let imgsGeneradas = [];

  function limpiarImgs() {
    imgsGeneradas.forEach((i) => URL.revokeObjectURL(i.url));
    imgsGeneradas = [];
  }

  async function generarImagenes() {
    if (!(await validar())) return;
    if (typeof RutinaImagenes === 'undefined') { toast('No se pudo cargar el generador'); return; }

    const btn = $('#btnImagenes');
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Generando…';

    try {
      limpiarImgs();
      imgsGeneradas = await RutinaImagenes.generar(datosRutina(), { rutaClips: '../clips/' });

      $('#imgCuenta').textContent = `${imgsGeneradas.length} ${imgsGeneradas.length === 1 ? 'imagen' : 'imágenes'}`;
      $('#imgGrid').innerHTML = imgsGeneradas.map((im, i) => `
        <figure class="img-card">
          <img src="${im.url}" alt="${esc(im.etiqueta)}" loading="lazy">
          <figcaption>
            <span>${esc(im.etiqueta)}</span>
            <button class="btn btn--mini" data-bajar="${i}" type="button">Descargar</button>
          </figcaption>
        </figure>`).join('');
      $('#btnBajarTodas').hidden = false;
      $('#modalImg').hidden = false;
    } catch (e) {
      // El aviso flotante dura 3 segundos y se pierde: el error se queda a la
      // vista, con el motivo, para poder arreglarlo.
      console.error('[Imágenes] fallo al generar:', e);
      const motivo = (e && e.message) ? e.message : String(e);
      $('#imgCuenta').textContent = '';
      $('#btnBajarTodas').hidden = true;
      $('#imgGrid').innerHTML = `
        <div class="img-error">
          <strong>No se pudieron generar las imágenes</strong>
          <p>${esc(motivo)}</p>
          <p class="hint">Si no se entiende, abre la consola del navegador con
             <b>F12</b> (pestaña «Console») y mándame lo que aparezca en rojo.</p>
        </div>`;
      $('#modalImg').hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  }

  function bajarImg(im) {
    const a = document.createElement('a');
    a.href = im.url;
    a.download = im.archivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  $('#btnImagenes').addEventListener('click', generarImagenes);
  $('#modalImgX').addEventListener('click', () => { $('#modalImg').hidden = true; });
  $('#modalImg').addEventListener('click', (e) => { if (e.target === $('#modalImg')) $('#modalImg').hidden = true; });
  $('#imgGrid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-bajar]');
    if (b) bajarImg(imgsGeneradas[+b.dataset.bajar]);
  });
  $('#btnBajarTodas').addEventListener('click', () => {
    // Con una pausa entre cada una: el navegador bloquea las descargas en ráfaga.
    imgsGeneradas.forEach((im, i) => setTimeout(() => bajarImg(im), i * 400));
    toast('Descargando ' + imgsGeneradas.length + ' imágenes');
  });

  /* =====================================================================
     NUEVOS EJERCICIOS
     ===================================================================== */
  function slugId(txt) {
    return String(txt).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim()
      .replace(/\s+/g, '-').replace(/-+/g, '-');
  }

  function abrirNuevoEj() {
    const sel = $('#nvGrupo');
    sel.innerHTML = gruposTodos().map((g) => `<option value="${esc(g)}">${esc(g)}</option>`).join('')
      + '<option value="__otro">Otro grupo nuevo…</option>';
    if (filtroGrupo) sel.value = filtroGrupo;
    $('#nvGrupoOtroCampo').hidden = true;
    $('#nvNombre').value = '';
    $('#nvGrupoOtro').value = '';
    $('#nvClip').value = '';
    $('#modalEj').hidden = false;
    $('#nvNombre').focus();
  }

  $('#btnNuevoEj').addEventListener('click', abrirNuevoEj);
  $('#modalEjX').addEventListener('click', () => { $('#modalEj').hidden = true; });
  $('#modalEj').addEventListener('click', (e) => { if (e.target === $('#modalEj')) $('#modalEj').hidden = true; });
  $('#nvGrupo').addEventListener('change', (e) => {
    const otro = e.target.value === '__otro';
    $('#nvGrupoOtroCampo').hidden = !otro;
    if (otro) $('#nvGrupoOtro').focus();
  });

  // Sugerir el nombre del archivo a partir del nombre del ejercicio
  $('#nvNombre').addEventListener('input', (e) => {
    const campo = $('#nvClip');
    if (!campo.dataset.tocado) campo.placeholder = (slugId(e.target.value) || 'nombre-del-clip') + '.mp4';
  });
  $('#nvClip').addEventListener('input', (e) => { e.target.dataset.tocado = '1'; });

  $('#nvGuardar').addEventListener('click', () => {
    const nombre = $('#nvNombre').value.trim();
    if (!nombre) { toast('Ponle nombre al ejercicio'); $('#nvNombre').focus(); return; }

    let grupo = $('#nvGrupo').value;
    if (grupo === '__otro') {
      grupo = $('#nvGrupoOtro').value.trim();
      if (!grupo) { toast('Escribe el nombre del grupo'); $('#nvGrupoOtro').focus(); return; }
    }

    let id = slugId(nombre);
    if (!id) { toast('Ese nombre no sirve para generar un identificador'); return; }
    if (biblioteca().some((e) => e.id === id)) {
      if (!confirm(`Ya existe un ejercicio con el identificador "${id}".\n¿Guardarlo igual con un sufijo?`)) return;
      let i = 2;
      while (biblioteca().some((e) => e.id === `${id}-${i}`)) i++;
      id = `${id}-${i}`;
    }

    let clip = $('#nvClip').value.trim();
    if (clip && !/\.(mp4|webm|mov)$/i.test(clip)) clip += '.mp4';
    const poster = clip ? clip.replace(/\.[^.]+$/, '.jpg') : '';

    extras.push({ id, nombre, grupo, clip, poster });
    guardarExtras();
    $('#modalEj').hidden = true;
    filtroGrupo = '';
    busqueda = '';
    $('#buscar').value = '';
    renderFiltros();
    renderBiblio();
    toast(`"${nombre}" agregado a ${grupo}`);
  });

  /* Arma un ejercicios.js completo: lo del archivo más lo que agregaste. */
  function archivoBiblioteca() {
    const todos = biblioteca();
    const grupos = gruposTodos();
    const linea = (e) => `  { id: ${JSON.stringify(e.id)}, nombre: ${JSON.stringify(e.nombre)}, `
      + `grupo: ${JSON.stringify(e.grupo)}, clip: ${JSON.stringify(e.clip || '')}`
      + (e.poster ? `, poster: ${JSON.stringify(e.poster)}` : '') + ' },';

    return `/* =========================================================================
   BIBLIOTECA DE EJERCICIOS
   =========================================================================
   Esta es la lista de la que eliges al armar una rutina.
   Puedes agregar ejercicios desde el armador (botón "+ Nuevo") y luego
   guardarlos aquí, o escribirlos a mano copiando una línea y cambiándola.

   id      -> identificador único, en minúsculas y con guiones. No lo repitas.
   nombre  -> como se ve en la rutina del alumno.
   grupo   -> tiene que ser uno de los de GRUPOS (abajo).
   clip    -> nombre del archivo MP4 dentro de la carpeta clips/.
              Déjalo en "" si todavía no tienes el video: el ejercicio se
              muestra igual, solo que sin animación.
   poster  -> imagen que se ve antes de que cargue el video (opcional).

   Especificaciones de los clips: lee clips/LEEME.txt

   Generado desde el armador el ${new Date().toLocaleDateString('es-MX')}.
   ========================================================================= */

const GRUPOS = [
${grupos.map((g) => `  ${JSON.stringify(g)},`).join('\n')}
];

const EJERCICIOS = [
${todos.map(linea).join('\n')}
];
`;
  }

  $('#btnBajarBiblio').addEventListener('click', () => { $('#modalBib').hidden = false; });
  $('#modalBibX').addEventListener('click', () => { $('#modalBib').hidden = true; });
  $('#modalBib').addEventListener('click', (e) => { if (e.target === $('#modalBib')) $('#modalBib').hidden = true; });
  $('#btnFileBib').addEventListener('click', () =>
    descargar('ejercicios.js', archivoBiblioteca(), 'text/javascript'));

  /* =====================================================================
     ARRANQUE
     ===================================================================== */
  function pintarTodo() {
    $('#fAlumno').value = R.alumno;
    $('#fSlug').value = R.slug;
    $('#fObjetivo').value = R.objetivo;
    $('#fPaquete').value = R.paquete;
    $('#fVigencia').value = R.vigencia;
    $('#fFecha').value = R.actualizado;
    $('#fNota').value = R.nota;
    $('#fSitio').value = R.sitio;
    renderFiltros();
    renderBiblio();
    renderDias();
    renderLink();
  }

  (async function inicio() {
    $('#barRol').textContent = `${COACH.nombre} · uso interno`;
    cargarExtras();
    cargar();
    if (!hayCripto()) {
      toast('Ábrelo desde tu sitio con https: aquí no se puede cifrar');
    } else {
      // Clave y código desde el inicio, para que el link esté completo siempre.
      if (!R.slug) R.slug = slugAuto();
      if (!R.clave) R.clave = await nuevaClave();
      guardar();
    }
    pintarTodo();
  })();
})();
