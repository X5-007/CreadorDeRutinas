/* =========================================================================
   ARMADOR DE RUTINAS
   =========================================================================
   Tres columnas: biblioteca de ejercicios · días de la semana · acciones.

   Lo que hace por ti:
   - Publica la rutina en el repositorio con un botón (necesita el token de
     GitHub, que se configura desde la barra de arriba).
   - Sube los GIF de los ejercicios directamente desde tu computadora.
   - Cifra cada rutina: la clave viaja en el link, nunca en el repositorio.

   Tus datos de coach salen de coach.js.
   ========================================================================= */

(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const LS = 'cdr_borrador';
  const LS_BIB = 'cdr_biblioteca_extra';
  const LS_LLAVERO = 'cdr_llavero';

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

  const SITIO_DEF = (typeof COACH_DATOS !== 'undefined' && COACH_DATOS.sitio)
    || 'https://x5-007.github.io/CreadorDeRutinas';

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
    for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192));
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
  async function cifrar(obj, claveB64) {
    const clave = await crypto.subtle.importKey('raw', deB64(claveB64), { name: 'AES-GCM' }, false, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const datos = new TextEncoder().encode(JSON.stringify(obj));
    const cif = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, clave, datos);
    return { v: 1, iv: aB64(iv), d: aB64(cif) };
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
    version: 3,
    alumno: '', slug: '', clave: '', objetivo: '', paquete: '', vigencia: '',
    actualizado: hoy(), nota: '', sitio: SITIO_DEF, dias: [],
  });

  let R = vacio();
  let diaActivo = 0;
  let filtroGrupo = '';
  let busqueda = '';
  let extras = [];
  let llavero = [];

  const leerLS = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; } };
  const escribirLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  const guardar = () => escribirLS(LS, R);
  const guardarExtras = () => escribirLS(LS_BIB, extras);
  const guardarLlavero = () => escribirLS(LS_LLAVERO, llavero);

  function cargarExtras() {
    extras = leerLS(LS_BIB, []);
    const enArchivo = new Set(EJERCICIOS.map((e) => e.id));
    const antes = extras.length;
    extras = extras.filter((e) => !enArchivo.has(e.id));
    if (extras.length !== antes) guardarExtras();
  }

  function biblioteca() {
    // Los propios pisan a los del archivo si comparten id, nunca se duplican
    const mapa = new Map();
    EJERCICIOS.forEach((e) => mapa.set(e.id, e));
    extras.forEach((e) => mapa.set(e.id, e));
    return Array.from(mapa.values());
  }
  function gruposTodos() {
    const g = GRUPOS.slice();
    extras.forEach((e) => { if (e.grupo && !g.includes(e.grupo)) g.push(e.grupo); });
    return g;
  }
  const porId = (id) => biblioteca().find((e) => e.id === id);

  /* =====================================================================
     UTILIDADES
     ===================================================================== */
  function slugId(txt) {
    return String(txt).normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim()
      .replace(/\s+/g, '-').replace(/-+/g, '-');
  }
  function codigo(n) {
    const abc = 'abcdefghijkmnpqrstuvwxyz23456789';
    const b = crypto.getRandomValues(new Uint8Array(n));
    let s = '';
    for (let i = 0; i < n; i++) s += abc[b[i] % abc.length];
    return s;
  }
  const slugAuto = () => `r-${codigo(4)}-${codigo(4)}`;

  function fechaLarga(iso) {
    const p = String(iso || '').split('-');
    if (p.length !== 3) return iso || '';
    const m = ['enero','febrero','marzo','abril','mayo','junio','julio',
               'agosto','septiembre','octubre','noviembre','diciembre'][Number(p[1]) - 1];
    return m ? `${Number(p[2])} de ${m} de ${p[0]}` : iso;
  }
  const nombrePila = () => (R.alumno || '').trim().split(/\s+/)[0] || '';
  const base = () => (R.sitio || SITIO_DEF).replace(/\/+$/, '');
  function urlRutina() {
    const u = `${base()}/${R.slug || 'r-xxxx'}/`;
    return R.clave ? `${u}#k=${R.clave}` : u;
  }
  const esVideo = (f) => /\.(mp4|webm|mov)$/i.test(f || '');

  let toastT;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(() => { t.hidden = true; }, 3400);
  }

  const abrir = (id) => { $('#' + id).hidden = false; };
  const cerrar = (id) => { $('#' + id).hidden = true; };

  /* =====================================================================
     COLUMNA 1 — BIBLIOTECA
     ===================================================================== */
  function pintarFiltros() {
    $('#filtros').innerHTML =
      `<button class="chip${filtroGrupo === '' ? ' on' : ''}" data-g="">Todos</button>` +
      gruposTodos().map((g) => `<button class="chip${filtroGrupo === g ? ' on' : ''}" data-g="${esc(g)}">${esc(g)}</button>`).join('');
  }

  /* La portada (.jpg) es lo más fiable: siempre se ve. Si no hay, se usa el
     propio clip. Si falla, el elemento se quita y queda el "+ GIF" de debajo. */
  function miniatura(e) {
    if (e.poster) return `<img class="mini" src="../clips/${esc(e.poster)}" alt="" loading="lazy" onerror="this.remove()">`;
    if (!e.clip) return '';
    const src = `../clips/${esc(e.clip)}`;
    return esVideo(e.clip)
      ? `<video class="mini" src="${src}" muted loop playsinline autoplay onerror="this.remove()"></video>`
      : `<img class="mini" src="${src}" alt="" loading="lazy" onerror="this.remove()">`;
  }

  function pintarBiblio() {
    const q = busqueda.toLowerCase();
    const lista = biblioteca().filter((e) =>
      (!filtroGrupo || e.grupo === filtroGrupo) &&
      (!q || e.nombre.toLowerCase().includes(q) || e.grupo.toLowerCase().includes(q)));
    const propios = new Set(extras.map((e) => e.id));

    $('#biblioList').innerHTML = lista.length ? lista.map((e) => `
      <div class="ejb" data-id="${esc(e.id)}">
        <button class="ejb__gif${e.clip ? ' lleno' : ''}" data-gif="${esc(e.id)}"
                title="${e.clip ? 'Cambiar el GIF' : 'Añadir GIF desde tu computadora'}" type="button">
          <span class="ejb__gif-mas">+</span><span class="ejb__gif-txt">GIF</span>
          ${miniatura(e)}
        </button>
        <button class="ejb__txt" data-add="${esc(e.id)}" type="button">
          <b>${esc(e.nombre)}${propios.has(e.id) ? '<i class="ejb__tuyo">tuyo</i>' : ''}</b>
          <span>${esc(e.grupo)}</span>
        </button>
        ${propios.has(e.id) ? `<button class="mini-btn mini-btn--del ejb__quitar" data-quitar="${esc(e.id)}" title="Quitar" type="button">✕</button>` : ''}
        <button class="ejb__mas" data-add="${esc(e.id)}" title="Añadir al día" type="button">+</button>
      </div>`).join('')
      : '<p class="vacio">Ningún ejercicio coincide.<br>Créalo con <b>+ Nuevo</b>.</p>';

    const n = extras.length;
    $('#biblioGuardar').hidden = n === 0;
    if (n) {
      $('#extrasCuenta').innerHTML = n === 1
        ? '<b>1 ejercicio tuyo</b> solo está en este navegador.'
        : `<b>${n} ejercicios tuyos</b> solo están en este navegador.`;
    }
  }

  /* =====================================================================
     COLUMNA 2 — DÍAS
     ===================================================================== */
  /* Agrupa solo los ejercicios que van SEGUIDOS del mismo grupo muscular.
     Así mandas tú el orden: dos de cuádriceps, uno de glúteo y otro de
     cuádriceps salen como tres bloques, en ese mismo orden. */
  function agrupar(ejercicios) {
    const bloques = [];
    ejercicios.forEach((ej) => {
      const ultimo = bloques[bloques.length - 1];
      if (ultimo && ultimo.grupo === ej.grupo) ultimo.ejercicios.push(ej);
      else bloques.push({ grupo: ej.grupo, ejercicios: [ej] });
    });
    return bloques;
  }

  function contador(di, ei, campo, etiqueta, clase) {
    const v = R.dias[di].ejercicios[ei][campo] || '';
    return `
      <div class="cont ${clase || ''}">
        <button class="cont__btn" data-paso="${di}:${ei}:${campo}:-1" type="button">−</button>
        <span class="cont__medio">
          <input class="cont__val" data-ej="${di}:${ei}" data-campo="${campo}"
                 value="${esc(v)}" aria-label="${esc(etiqueta)}">
          <span class="cont__et">${esc(etiqueta)}</span>
        </span>
        <button class="cont__btn" data-paso="${di}:${ei}:${campo}:1" type="button">+</button>
      </div>`;
  }

  function pintarDias() {
    const cont = $('#dias');
    $('#diaActivoNombre').textContent = R.dias.length
      ? `Se añade a: ${R.dias[diaActivo] ? (R.dias[diaActivo].nombre || 'Día ' + (diaActivo + 1)) : '—'}`
      : '';

    if (!R.dias.length) {
      cont.innerHTML = '<p class="vacio">Todavía no hay días. Añade el primero abajo.</p>';
      return;
    }

    cont.innerHTML = R.dias.map((dia, i) => {
      const bloques = agrupar(dia.ejercicios || []);
      const cuerpo = bloques.length ? bloques.map((bl) => `
        <div class="bloque-ed">
          <p class="bloque-ed__t">${esc(bl.grupo)}</p>
          ${bl.ejercicios.map((ej) => filaDia(ej, i, (dia.ejercicios || []).indexOf(ej))).join('')}
        </div>`).join('')
        : '<p class="dia-vacio">Elige ejercicios de la izquierda para este día.</p>';

      return `
        <article class="dia-card${i === diaActivo ? ' activo' : ''}">
          <header class="dia-card__cabeza" data-activar="${i}">
            <span class="dia-card__n">${i + 1}</span>
            <span class="dia-card__campos">
              <input class="input" data-campo="nombre" data-dia="${i}" value="${esc(dia.nombre || '')}" placeholder="Lunes">
              <input class="input" data-campo="enfoque" data-dia="${i}" value="${esc(dia.enfoque || '')}" placeholder="Pecho / Tríceps">
            </span>
            <span class="dia-card__tools">
              <button class="mini-btn" data-mover-dia="${i}" data-dir="-1" title="Subir" type="button">↑</button>
              <button class="mini-btn" data-mover-dia="${i}" data-dir="1" title="Bajar" type="button">↓</button>
              <button class="mini-btn mini-btn--del" data-borrar-dia="${i}" title="Eliminar día" type="button">✕</button>
            </span>
          </header>
          <div class="dia-card__cuerpo">${cuerpo}</div>
        </article>`;
    }).join('');
  }

  function filaDia(ej, di, ei) {
    return `
      <div class="ejd">
        <span class="ejd__gif">${miniatura(ej)}</span>
        <div class="ejd__cuerpo">
          <div class="ejd__nombre">${esc(ej.nombre)}</div>
          <div class="contadores">
            ${contador(di, ei, 'series', 'series', 'cont--series')}
            ${contador(di, ei, 'reps', 'reps')}
            ${contador(di, ei, 'descanso', 'descanso')}
          </div>
          <div class="ejd__nota">
            <input class="input" data-ej="${di}:${ei}" data-campo="nota"
                   value="${esc(ej.nota || '')}" placeholder="Nota de técnica (opcional)">
          </div>
        </div>
        <div class="ejd__tools">
          <button class="mini-btn" data-mover-ej="${di}:${ei}" data-dir="-1" title="Subir" type="button">↑</button>
          <button class="mini-btn" data-mover-ej="${di}:${ei}" data-dir="1" title="Bajar" type="button">↓</button>
          <button class="mini-btn mini-btn--del" data-borrar-ej="${di}:${ei}" title="Quitar" type="button">✕</button>
        </div>
      </div>`;
  }

  /* Sube o baja el valor de un campo respetando su formato.
     "8-10" +1 → "9-11"   ·   "90 s" +1 → "1 min"   ·   "3" +1 → "4"      */
  function pasoValor(campo, valor, dir) {
    const v = String(valor || '').trim();

    if (campo === 'descanso') {
      const m = v.match(/^(\d+(?:[.,]\d+)?)\s*(min|m|s|seg)?/i);
      let seg = 60;
      if (m) {
        const n = parseFloat(m[1].replace(',', '.'));
        seg = /^m/i.test(m[2] || '') ? Math.round(n * 60) : Math.round(n);
      }
      seg = Math.max(0, seg + dir * 15);
      if (seg === 0) return '0 s';
      return seg % 60 === 0 && seg >= 60 ? `${seg / 60} min` : `${seg} s`;
    }

    if (!/\d/.test(v)) return dir > 0 ? '1' : v;
    // Sube o baja todos los números que haya: así "10-12" avanza entero
    return v.replace(/\d+/g, (n) => String(Math.max(0, parseInt(n, 10) + dir)));
  }

  /* =====================================================================
     DATOS Y PLANTILLA
     ===================================================================== */
  function datosRutina() {
    return {
      version: 3,
      alumno: R.alumno.trim(), objetivo: R.objetivo.trim(), paquete: R.paquete.trim(),
      vigencia: R.vigencia.trim(), actualizado: R.actualizado, nota: R.nota.trim(),
      coach: COACH,
      dias: R.dias.map((dia) => ({
        nombre: dia.nombre || '', enfoque: dia.enfoque || '',
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

  function plantilla(sobre, extraHead) {
    const url = `${base()}/${R.slug}/`;
    const pila = nombrePila();
    const titulo = pila ? `Rutina de ${pila} — ${COACH.nombre}` : `Tu rutina — ${COACH.nombre}`;
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

  /* Arma el ejercicios.js completo: lo del archivo más lo que añadiste. */
  function archivoBiblioteca() {
    const todos = biblioteca(), grupos = gruposTodos();
    const linea = (e) => `  { id: ${JSON.stringify(e.id)}, nombre: ${JSON.stringify(e.nombre)}, `
      + `grupo: ${JSON.stringify(e.grupo)}, clip: ${JSON.stringify(e.clip || '')}`
      + (e.poster ? `, poster: ${JSON.stringify(e.poster)}` : '') + ' },';
    return `/* =========================================================================
   BIBLIOTECA DE EJERCICIOS
   =========================================================================
   La lista de la que eliges al armar una rutina. Puedes añadir ejercicios
   desde el armador (botón "+ Nuevo") y sus GIF desde la miniatura.

   id      -> identificador único, en minúsculas y con guiones. No lo repitas.
   nombre  -> como se ve en la rutina del alumno.
   grupo   -> tiene que ser uno de los de GRUPOS (abajo).
   clip    -> archivo dentro de clips/ (GIF, MP4 o WebM). "" si aún no lo tienes.
   poster  -> imagen que se ve antes de que cargue el video (opcional).

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

  /* =====================================================================
     GIF DESDE TU COMPUTADORA
     ===================================================================== */
  let gifDestino = null;   // id del ejercicio que espera archivo

  // Saca el primer fotograma para usarlo de portada del video
  function portadaDe(file, url) {
    return new Promise((res) => {
      const lienzo = document.createElement('canvas');
      const pintar = (fuente, w, h) => {
        const lado = Math.min(w, h) || 480;
        lienzo.width = lienzo.height = Math.min(640, lado);
        const ctx = lienzo.getContext('2d');
        const escala = Math.max(lienzo.width / w, lienzo.height / h);
        ctx.drawImage(fuente, (lienzo.width - w * escala) / 2, (lienzo.height - h * escala) / 2,
                      w * escala, h * escala);
        lienzo.toBlob((b) => res(b), 'image/jpeg', 0.82);
      };
      if (/^video\//.test(file.type)) {
        const v = document.createElement('video');
        v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
        v.onloadeddata = () => { v.currentTime = Math.min(0.4, (v.duration || 1) / 3); };
        v.onseeked = () => pintar(v, v.videoWidth, v.videoHeight);
        v.onerror = () => res(null);
        setTimeout(() => res(null), 8000);
      } else {
        const i = new Image();
        i.onload = () => pintar(i, i.naturalWidth, i.naturalHeight);
        i.onerror = () => res(null);
        i.src = url;
      }
    });
  }

  async function subirGif(file) {
    const ej = porId(gifDestino);
    if (!ej) { toast('Elige primero el ejercicio: pulsa su miniatura'); return; }

    const ext = (file.name.match(/\.([a-z0-9]+)$/i) || [, 'mp4'])[1].toLowerCase();
    const permitidas = ['gif', 'mp4', 'webm', 'mov', 'webp'];
    if (!permitidas.includes(ext)) { toast('Usa un GIF, un MP4 o un WebM'); return; }

    const mb = file.size / 1048576;
    if (mb > 8) { toast(`Ese archivo pesa ${mb.toFixed(1)} MB. Comprímelo a menos de 8 MB.`); return; }
    if (mb > 3) toast(`Pesa ${mb.toFixed(1)} MB: a tu alumno le costará datos. Mejor por debajo de 1 MB.`);

    const boton = $(`[data-gif="${CSS.escape(ej.id)}"]`);
    if (boton) boton.classList.add('subiendo');

    try {
      const nombreClip = `${ej.id}.${ext === 'mov' ? 'mp4' : ext}`;
      const url = URL.createObjectURL(file);
      const portada = await portadaDe(file, url);
      URL.revokeObjectURL(url);

      if (!Publicador.hayToken()) {
        toast('Conecta GitHub para subir GIF (botón de arriba a la derecha)');
        return;
      }

      const archivos = [{ ruta: `clips/${nombreClip}`, base64: await Publicador.archivoABase64(file) }];
      let nombrePortada = '';
      if (portada) {
        nombrePortada = `${ej.id}.jpg`;
        archivos.push({ ruta: `clips/${nombrePortada}`, base64: Publicador.aBase64(await portada.arrayBuffer()) });
      }

      // ej apunta al ejercicio real, venga del archivo o de los tuyos
      ej.clip = nombreClip;
      ej.poster = nombrePortada;

      // La biblioteca actualizada viaja con el clip: así el cambio queda en el
      // repositorio y no se pierde al recargar.
      archivos.push({ ruta: 'ejercicios.js', base64: Publicador.textoABase64(archivoBiblioteca()) });
      await Publicador.subirVarios(archivos, `Clip de ${ej.nombre}`);

      extras = [];          // ya están todos dentro de ejercicios.js
      guardarExtras();

      // Los días que ya usan ese ejercicio también se actualizan
      R.dias.forEach((d) => (d.ejercicios || []).forEach((x) => {
        if (x.id === ej.id) { x.clip = nombreClip; x.poster = nombrePortada; }
      }));
      guardar();

      pintarBiblio(); pintarDias();
      toast(`GIF de "${ej.nombre}" subido`);
    } catch (e) {
      console.error('[GIF]', e);
      toast('No se pudo subir: ' + (e.message || e));
    } finally {
      const b2 = $(`[data-gif="${CSS.escape(ej.id)}"]`);
      if (b2) b2.classList.remove('subiendo');
    }
  }

  /* =====================================================================
     PUBLICAR
     ===================================================================== */
  function pintarPasos(pasos) {
    $('#pubProgreso').innerHTML = pasos.map((p) => `
      <div class="paso ${p.estado}">
        <span class="paso__marca">${p.estado === 'listo' ? '✓' : p.estado === 'falla' ? '✕' : p.n}</span>
        <span>${esc(p.txt)}</span>
      </div>`).join('');
  }

  async function publicar() {
    if (!(await validar())) return;

    if (!Publicador.hayToken()) {
      toast('Primero conecta GitHub con el botón de arriba a la derecha');
      abrir('modalToken');
      return;
    }

    const pasos = [
      { n: 1, txt: 'Cifrando la rutina', estado: 'haciendo' },
      { n: 2, txt: 'Subiendo al repositorio', estado: '' },
      { n: 3, txt: 'Esperando a que GitHub la publique', estado: '' },
    ];
    $('#pubTitulo').textContent = 'Publicando…';
    $('#pubResultado').innerHTML = '';
    pintarPasos(pasos);
    abrir('modalPublicar');

    try {
      const sobre = await cifrar(datosRutina(), R.clave);
      const html = plantilla(sobre);
      pasos[0].estado = 'listo'; pasos[1].estado = 'haciendo'; pintarPasos(pasos);

      const archivos = [{ ruta: `${R.slug}/index.html`, base64: Publicador.textoABase64(html) }];
      if (extras.length) {
        archivos.push({ ruta: 'ejercicios.js', base64: Publicador.textoABase64(archivoBiblioteca()) });
      }
      await Publicador.subirVarios(archivos, `Rutina de ${R.alumno || 'alumno'}`);

      // Si la biblioteca ya quedó en el archivo, se limpia la copia local
      if (extras.length) { extras = []; guardarExtras(); pintarBiblio(); }

      pasos[1].estado = 'listo'; pasos[2].estado = 'haciendo'; pintarPasos(pasos);

      recordarEnLlavero();
      const enLinea = await Publicador.esperarEnLinea(`${base()}/${R.slug}/`, 120000);
      pasos[2].estado = enLinea ? 'listo' : 'falla';
      pintarPasos(pasos);

      $('#pubTitulo').textContent = enLinea ? 'Rutina publicada' : 'Subida, publicándose';
      $('#pubResultado').innerHTML = `
        <div class="resultado-ok">
          <strong>${enLinea ? 'Ya puedes mandarle el link.' : 'GitHub está tardando más de lo normal; el link funcionará en unos minutos.'}</strong>
          <code>${esc(urlRutina())}</code>
          <div class="modal__acciones" style="margin:0">
            <button class="btn btn--primary" id="pubWa" type="button">Copiar mensaje de WhatsApp</button>
            <button class="btn btn--fantasma" id="pubLink" type="button">Copiar solo el link</button>
          </div>
        </div>`;
      $('#pubWa').addEventListener('click', copiarMensajeWa);
      $('#pubLink').addEventListener('click', () => copiar(urlRutina(), 'Link copiado'));

      $('#railLink').hidden = false;
      pintarLink();
    } catch (e) {
      console.error('[Publicar]', e);
      pasos.forEach((p) => { if (p.estado === 'haciendo') p.estado = 'falla'; });
      pintarPasos(pasos);
      $('#pubTitulo').textContent = 'No se pudo publicar';
      $('#pubResultado').innerHTML = `
        <div class="peligro">
          <strong>${esc(e.message || e)}</strong>
          <p>Si el token caducó, genera otro y vuelve a conectarlo desde el botón de la barra.
             También puedes descargar los archivos y subirlos a mano desde «Sin conexión a GitHub».</p>
        </div>`;
    }
  }

  function recordarEnLlavero() {
    const i = llavero.findIndex((x) => x.slug === R.slug);
    const entrada = { slug: R.slug, clave: R.clave, alumno: R.alumno, fecha: R.actualizado, sitio: R.sitio };
    if (i >= 0) llavero[i] = entrada; else llavero.unshift(entrada);
    llavero = llavero.slice(0, 60);
    guardarLlavero();
  }

  /* =====================================================================
     CARGAR UNA RUTINA
     ===================================================================== */
  function pintarListaRutinas() {
    if (!llavero.length) {
      $('#listaRutinas').innerHTML = '<p class="vacio">Todavía no has publicado ninguna rutina desde este navegador.<br>'
        + 'Puedes abrir una con «Abrir desde link» o «Abrir respaldo».</p>';
      return;
    }
    $('#listaRutinas').innerHTML = llavero.map((x, i) => `
      <button class="rut-item" data-abrir="${i}" type="button">
        <span class="rut-item__txt">
          <b>${esc(x.alumno || x.slug)}</b>
          <span>${esc(x.slug)} · ${esc(fechaLarga(x.fecha))}</span>
        </span>
        <span class="ejb__mas">→</span>
      </button>`).join('');
  }

  async function abrirDelLlavero(i) {
    const x = llavero[i];
    if (!x) return;
    cerrar('modalCargar');
    toast('Abriendo ' + (x.alumno || x.slug) + '…');
    const url = `${(x.sitio || SITIO_DEF).replace(/\/+$/, '')}/${x.slug}/#k=${x.clave}`;
    await importarDesdeLink(url);
  }

  async function importarDesdeLink(url) {
    let u;
    try { u = new URL(String(url).trim()); } catch (e) { toast('Ese no parece un link válido'); return; }
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
      const tramos = u.pathname.split('/').filter(Boolean);
      const slug = tramos[tramos.length - 1];
      const esReal = u.protocol === 'https:' && !/^(localhost|127\.|\[?::1)/.test(u.hostname);
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
     VALIDAR, VISTA PREVIA, DESCARGAS
     ===================================================================== */
  async function validar() {
    if (!hayCripto()) { toast('Ábrelo desde tu sitio con https: aquí no se puede cifrar'); return false; }
    if (!R.alumno.trim()) { toast('Ponle el nombre del alumno'); $('#fichaAlumno').open = true; $('#fAlumno').focus(); return false; }
    if (!R.dias.length) { toast('Añade al menos un día'); return false; }
    if (!R.slug) { R.slug = slugAuto(); $('#fSlug').value = R.slug; }
    if (!R.clave) R.clave = await nuevaClave();
    pintarLink();
    guardar();
    return true;
  }

  function descargar(nombre, texto, tipo) {
    const blob = new Blob([texto], { type: tipo + ';charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  async function vistaPrevia() {
    if (!(await validar())) return;
    const sobre = await cifrar(datosRutina(), R.clave);
    const extra = `<base href="${new URL('../vista-previa/', location.href).href}">`
      + `<script>location.hash='k=${R.clave}';<\/script>`;
    const w = window.open('', '_blank');
    if (!w) { toast('Tu navegador bloqueó la ventana emergente'); return; }
    w.document.open(); w.document.write(plantilla(sobre, extra)); w.document.close();
  }

  async function copiar(texto, ok) {
    try { await navigator.clipboard.writeText(texto); toast(ok); }
    catch (e) { prompt('Copia este texto:', texto); }
  }
  function copiarMensajeWa() {
    const pila = nombrePila() || 'crack';
    copiar(`Hola ${pila}, aquí está tu rutina 💪\n`
      + `Está dividida por días y cada ejercicio trae su video.\n\n${urlRutina()}\n\n`
      + `Ábrela tocando el link completo. Cualquier duda me escribes.`,
      'Mensaje copiado, pégalo en WhatsApp');
  }

  const pintarLink = () => {
    $('#linkFinal').textContent = urlRutina();
    $('#railLink').hidden = !R.clave;
    $('#avisoCodigo').textContent = R.slug ? '' : 'se genera solo';
  };

  /* =====================================================================
     IMÁGENES
     ===================================================================== */
  let imgs = [];
  async function generarImagenes() {
    if (!(await validar())) return;
    if (typeof RutinaImagenes === 'undefined') { toast('No se pudo cargar el generador'); return; }
    const btn = $('#btnImagenes');
    const original = btn.textContent;
    btn.disabled = true; btn.textContent = 'Generando…';
    try {
      imgs.forEach((i) => URL.revokeObjectURL(i.url));
      imgs = await RutinaImagenes.generar(datosRutina(), { rutaClips: '../clips/' });
      $('#imgCuenta').textContent = `${imgs.length} ${imgs.length === 1 ? 'imagen' : 'imágenes'}`;
      $('#btnBajarTodas').hidden = false;
      $('#imgGrid').innerHTML = imgs.map((im, i) => `
        <figure class="img-card">
          <img src="${im.url}" alt="${esc(im.etiqueta)}" loading="lazy">
          <figcaption>
            <span>${esc(im.etiqueta)}</span>
            <button class="btn btn--mini" data-bajar="${i}" type="button">Descargar</button>
          </figcaption>
        </figure>`).join('');
      abrir('modalImg');
    } catch (e) {
      console.error('[Imágenes]', e);
      $('#imgCuenta').textContent = '';
      $('#btnBajarTodas').hidden = true;
      $('#imgGrid').innerHTML = `
        <div class="img-error">
          <strong>No se pudieron generar las imágenes</strong>
          <p>${esc((e && e.message) ? e.message : String(e))}</p>
          <p class="hint">Si no se entiende, abre la consola con <b>F12</b> y mándame lo que salga en rojo.</p>
        </div>`;
      abrir('modalImg');
    } finally { btn.disabled = false; btn.textContent = original; }
  }

  /* =====================================================================
     EVENTOS
     ===================================================================== */
  const campos = {
    fAlumno: 'alumno', fSlug: 'slug', fObjetivo: 'objetivo', fPaquete: 'paquete',
    fVigencia: 'vigencia', fFecha: 'actualizado', fNota: 'nota',
  };
  Object.keys(campos).forEach((id) => {
    $('#' + id).addEventListener('input', (e) => {
      R[campos[id]] = e.target.value;
      if (id === 'fAlumno') $('#resumenAlumno').textContent = R.alumno.trim() || 'Datos del alumno';
      pintarLink(); guardar();
    });
  });

  $('#btnSlug').addEventListener('click', () => {
    if (R.slug && !confirm('Si cambias el código, el link anterior deja de funcionar.\n¿Seguro?')) return;
    R.slug = slugAuto(); $('#fSlug').value = R.slug; pintarLink(); guardar();
  });

  $('#buscar').addEventListener('input', (e) => { busqueda = e.target.value; pintarBiblio(); });
  $('#filtros').addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    filtroGrupo = b.dataset.g; pintarFiltros(); pintarBiblio();
  });

  $('#biblioList').addEventListener('click', (e) => {
    const gif = e.target.closest('[data-gif]');
    if (gif) { gifDestino = gif.dataset.gif; $('#fileClip').value = ''; $('#fileClip').click(); return; }

    const quitar = e.target.closest('[data-quitar]');
    if (quitar) {
      const id = quitar.dataset.quitar;
      const ej = extras.find((x) => x.id === id);
      if (!confirm(`¿Quitar "${ej ? ej.nombre : id}" de la biblioteca?\n\nLas rutinas que ya lo usan no se tocan.`)) return;
      extras = extras.filter((x) => x.id !== id);
      guardarExtras(); pintarFiltros(); pintarBiblio();
      return;
    }

    const add = e.target.closest('[data-add]');
    if (!add) return;
    if (!R.dias.length) { toast('Primero añade un día'); return; }
    const b = porId(add.dataset.add); if (!b) return;
    R.dias[diaActivo].ejercicios.push({
      id: b.id, nombre: b.nombre, grupo: b.grupo,
      clip: b.clip || '', poster: b.poster || '',
      series: '3', reps: '10-12', descanso: '60 s', nota: '',
    });
    pintarDias(); guardar();
    toast(`${b.nombre} → ${R.dias[diaActivo].nombre || 'Día ' + (diaActivo + 1)}`);
  });

  $('#fileClip').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) subirGif(f);
  });

  $('#btnDia').addEventListener('click', () => {
    const n = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
    R.dias.push({ nombre: n[R.dias.length] || 'Día ' + (R.dias.length + 1), enfoque: '', ejercicios: [] });
    diaActivo = R.dias.length - 1;
    pintarDias(); pintarBiblio(); guardar();
  });

  $('#dias').addEventListener('click', (e) => {
    const paso = e.target.closest('[data-paso]');
    if (paso) {
      const [di, ei, campo, dir] = paso.dataset.paso.split(':');
      const ej = R.dias[+di].ejercicios[+ei];
      ej[campo] = pasoValor(campo, ej[campo], Number(dir));
      const input = $(`[data-ej="${di}:${ei}"][data-campo="${campo}"]`);
      if (input) input.value = ej[campo];
      guardar();
      return;
    }
    const movD = e.target.closest('[data-mover-dia]');
    const delD = e.target.closest('[data-borrar-dia]');
    const movE = e.target.closest('[data-mover-ej]');
    const delE = e.target.closest('[data-borrar-ej]');
    const act = e.target.closest('[data-activar]');

    if (movD) {
      const i = +movD.dataset.moverDia, j = i + Number(movD.dataset.dir);
      if (j < 0 || j >= R.dias.length) return;
      [R.dias[i], R.dias[j]] = [R.dias[j], R.dias[i]];
      if (diaActivo === i) diaActivo = j; else if (diaActivo === j) diaActivo = i;
      pintarDias(); guardar(); return;
    }
    if (delD) {
      const i = +delD.dataset.borrarDia;
      if (!confirm(`¿Eliminar ${R.dias[i].nombre || 'este día'} y sus ejercicios?`)) return;
      R.dias.splice(i, 1);
      diaActivo = Math.max(0, Math.min(diaActivo, R.dias.length - 1));
      pintarDias(); pintarBiblio(); guardar(); return;
    }
    if (movE) {
      // Se mueve por todo el día, cruzando grupos musculares si hace falta
      const [di, ei] = movE.dataset.moverEj.split(':').map(Number);
      const lista = R.dias[di].ejercicios;
      const destino = ei + Number(movE.dataset.dir);
      if (destino < 0 || destino >= lista.length) return;
      [lista[ei], lista[destino]] = [lista[destino], lista[ei]];
      pintarDias(); guardar(); return;
    }
    if (delE) {
      const [di, ei] = delE.dataset.borrarEj.split(':').map(Number);
      R.dias[di].ejercicios.splice(ei, 1);
      pintarDias(); guardar(); return;
    }
    if (act) { diaActivo = +act.dataset.activar; pintarDias(); pintarBiblio(); }
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
      if (t.dataset.campo === 'nombre') pintarDias.nombreTimer = (clearTimeout(pintarDias.nombreTimer),
        setTimeout(() => { $('#diaActivoNombre').textContent =
          `Se añade a: ${R.dias[diaActivo].nombre || 'Día ' + (diaActivo + 1)}`; }, 300));
    }
  });

  // --- Acciones del rail ---
  $('#btnPublicar').addEventListener('click', publicar);
  $('#btnVista').addEventListener('click', vistaPrevia);
  $('#btnImagenes').addEventListener('click', generarImagenes);
  $('#btnCopiarLink').addEventListener('click', async () => {
    if (!(await validar())) return; copiar(urlRutina(), 'Link copiado, completo con su clave');
  });
  $('#btnWa').addEventListener('click', async () => {
    if (!(await validar())) return; copiarMensajeWa();
  });
  $('#btnCargar').addEventListener('click', () => { pintarListaRutinas(); abrir('modalCargar'); });
  $('#listaRutinas').addEventListener('click', (e) => {
    const b = e.target.closest('[data-abrir]');
    if (b) abrirDelLlavero(+b.dataset.abrir);
  });
  $('#btnNueva').addEventListener('click', async () => {
    if (!confirm('¿Empezar una rutina nueva? El borrador actual se pierde si no lo has publicado.')) return;
    R = vacio(); diaActivo = 0;
    if (hayCripto()) { R.slug = slugAuto(); R.clave = await nuevaClave(); }
    pintarTodo(); guardar();
    toast('Listo para una rutina nueva');
  });

  // --- Sin conexión ---
  $('#btnExportar').addEventListener('click', async () => {
    if (!(await validar())) return;
    $('#mRuta').textContent = R.slug;
    abrir('modal');
  });
  $('#btnFileHtml').addEventListener('click', async () => {
    const sobre = await cifrar(datosRutina(), R.clave);
    descargar('index.html', plantilla(sobre), 'text/html');
  });
  $('#btnFileJson').addEventListener('click', () => {
    descargar(`respaldo-${R.slug}.json`,
      JSON.stringify({ ...R, _aviso: 'NO subas este archivo a GitHub: contiene la clave sin cifrar.' }, null, 2),
      'application/json');
  });
  $('#btnImportar').addEventListener('click', () => $('#fileImport').click());
  $('#fileImport').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const d = JSON.parse(fr.result);
        R = Object.assign(vacio(), d); delete R._aviso;
        diaActivo = 0; pintarTodo(); guardar();
        toast(`Rutina de ${R.alumno || 'alumno'} cargada`);
      } catch (err) { toast('Ese archivo no es un respaldo válido'); }
      e.target.value = '';
    };
    fr.readAsText(f);
  });
  $('#btnImportarLink').addEventListener('click', () => {
    const url = prompt('Pega el link completo del alumno (con la parte del #):');
    if (url) importarDesdeLink(url);
  });

  // --- Biblioteca: nuevo ejercicio ---
  $('#btnNuevoEj').addEventListener('click', () => {
    const sel = $('#nvGrupo');
    sel.innerHTML = gruposTodos().map((g) => `<option value="${esc(g)}">${esc(g)}</option>`).join('')
      + '<option value="__otro">Otro grupo nuevo…</option>';
    if (filtroGrupo) sel.value = filtroGrupo;
    $('#nvGrupoOtroCampo').hidden = true;
    $('#nvNombre').value = ''; $('#nvGrupoOtro').value = '';
    abrir('modalEj'); $('#nvNombre').focus();
  });
  $('#nvGrupo').addEventListener('change', (e) => {
    const otro = e.target.value === '__otro';
    $('#nvGrupoOtroCampo').hidden = !otro;
    if (otro) $('#nvGrupoOtro').focus();
  });
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
    extras.push({ id, nombre, grupo, clip: '', poster: '' });
    guardarExtras();
    cerrar('modalEj');
    filtroGrupo = ''; busqueda = ''; $('#buscar').value = '';
    pintarFiltros(); pintarBiblio();
    toast(`"${nombre}" añadido a ${grupo}. Pulsa su miniatura para subirle el GIF.`);
  });

  $('#btnBajarBiblio').addEventListener('click', async () => {
    if (Publicador.hayToken()) {
      try {
        await Publicador.subir('ejercicios.js', Publicador.textoABase64(archivoBiblioteca()), 'Actualizar biblioteca de ejercicios');
        extras = []; guardarExtras(); pintarBiblio();
        toast('Biblioteca guardada en el repositorio');
      } catch (e) { toast('No se pudo guardar: ' + (e.message || e)); }
    } else {
      abrir('modalBib');
    }
  });
  $('#btnFileBib').addEventListener('click', () => descargar('ejercicios.js', archivoBiblioteca(), 'text/javascript'));

  // --- Imágenes: descargas ---
  const bajarImg = (im) => {
    const a = document.createElement('a');
    a.href = im.url; a.download = im.archivo;
    document.body.appendChild(a); a.click(); a.remove();
  };
  $('#imgGrid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-bajar]');
    if (b) bajarImg(imgs[+b.dataset.bajar]);
  });
  $('#btnBajarTodas').addEventListener('click', () => {
    imgs.forEach((im, i) => setTimeout(() => bajarImg(im), i * 400));
    toast('Descargando ' + imgs.length + ' imágenes');
  });

  // --- Tema claro / oscuro ---
  const LS_TEMA = 'cdr_tema';
  function aplicarTema(t) {
    document.documentElement.dataset.tema = t;
    try { localStorage.setItem(LS_TEMA, t); } catch (e) {}
  }
  $('#btnTema').addEventListener('click', () => {
    aplicarTema(document.documentElement.dataset.tema === 'oscuro' ? 'claro' : 'oscuro');
  });

  // --- Token ---
  $('#estadoRepo').addEventListener('click', () => {
    const r = Publicador.detectarRepo();
    $('#tokRepo').textContent = r.repo || 'CreadorDeRutinas';
    $('#fToken').value = '';
    abrir('modalToken');
  });
  $('#btnGuardarToken').addEventListener('click', async () => {
    const t = $('#fToken').value.trim();
    if (!t) { toast('Pega el token'); return; }
    Publicador.guardarToken(t);
    await comprobarConexion(true);
    if (Publicador.hayToken()) cerrar('modalToken');
  });
  $('#btnQuitarToken').addEventListener('click', () => {
    Publicador.guardarToken('');
    comprobarConexion();
    toast('Desconectado de GitHub');
  });

  async function comprobarConexion(avisar) {
    const el = $('#estadoRepo');
    const txt = el.querySelector('.estado__txt');
    el.classList.remove('ok', 'mal');
    if (!Publicador.configurable()) { txt.textContent = 'Local (sin publicar)'; return; }
    if (!Publicador.hayToken()) { txt.textContent = 'Conectar GitHub'; el.classList.add('mal'); return; }
    txt.textContent = 'Comprobando…';
    try {
      const info = await Publicador.verificar();
      el.classList.add('ok');
      txt.textContent = info.nombre;
      if (avisar) toast('Conectado a ' + info.nombre);
    } catch (e) {
      el.classList.add('mal');
      txt.textContent = 'Revisar conexión';
      if (avisar) toast(e.message || 'No se pudo conectar');
    }
  }

  // --- Cierre de modales ---
  document.addEventListener('click', (e) => {
    const x = e.target.closest('[data-cerrar]');
    if (x) cerrar(x.dataset.cerrar);
    if (e.target.classList && e.target.classList.contains('modal')) e.target.hidden = true;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $$('.modal').forEach((m) => { m.hidden = true; });
  });

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
    $('#resumenAlumno').textContent = R.alumno.trim() || 'Datos del alumno';
    pintarFiltros(); pintarBiblio(); pintarDias(); pintarLink();
  }

  (async function inicio() {
    // Arranca en oscuro, que es como se pidió; el interruptor guarda la elección.
    let tema = 'oscuro';
    try { tema = localStorage.getItem(LS_TEMA) || 'oscuro'; } catch (e) {}
    document.documentElement.dataset.tema = tema;

    $('#barRol').textContent = `${COACH.nombre} · uso interno`;
    cargarExtras();
    llavero = leerLS(LS_LLAVERO, []);
    R = Object.assign(vacio(), leerLS(LS, {}));
    if (!hayCripto()) {
      toast('Ábrelo desde tu sitio con https: aquí no se puede cifrar');
    } else {
      if (!R.slug) R.slug = slugAuto();
      if (!R.clave) R.clave = await nuevaClave();
      guardar();
    }
    pintarTodo();
    comprobarConexion();
  })();
})();
