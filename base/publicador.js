/* =========================================================================
   PUBLICADOR — guarda en GitHub sin salir del armador
   =========================================================================
   Sube archivos al repositorio usando la API de GitHub con un token tuyo.
   Así publicas una rutina o un GIF con un botón, sin entrar a github.com.

   El token se guarda en este navegador. Dale permiso SOLO a este
   repositorio: si alguien se sentara en tu computadora, lo más que podría
   hacer es tocar tus rutinas, nada más de tu cuenta.
   ========================================================================= */

const Publicador = (function () {
  'use strict';

  const LS_TOKEN = 'cdr_token_github';
  const API = 'https://api.github.com';

  /* El repositorio se deduce de la dirección: no hay nada que configurar.
     x5-007.github.io/CreadorDeRutinas/armador/ → x5-007 / CreadorDeRutinas */
  function detectarRepo() {
    const h = location.hostname.match(/^([^.]+)\.github\.io$/i);
    const tramos = location.pathname.split('/').filter(Boolean);
    if (h && tramos.length) return { owner: h[1], repo: tramos[0] };
    return { owner: '', repo: '' };
  }

  let repo = detectarRepo();
  let token = '';
  try { token = localStorage.getItem(LS_TOKEN) || ''; } catch (e) {}

  const hayToken = () => !!token;
  const destino = () => `${repo.owner}/${repo.repo}`;
  const configurable = () => !!(repo.owner && repo.repo);

  function guardarToken(t) {
    token = (t || '').trim();
    try {
      if (token) localStorage.setItem(LS_TOKEN, token);
      else localStorage.removeItem(LS_TOKEN);
    } catch (e) {}
  }

  function fijarRepo(owner, nombre) { repo = { owner, repo: nombre }; }

  /* --------------------------------------------------------------------
     Conversión a base64 (la API de GitHub recibe los archivos así)
     -------------------------------------------------------------------- */
  function aBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let s = '';
    // En trozos, para que un archivo grande no desborde la pila
    for (let i = 0; i < bytes.length; i += 8192) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    }
    return btoa(s);
  }

  const textoABase64 = (txt) => {
    const bytes = new TextEncoder().encode(txt);
    let s = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    }
    return btoa(s);
  };

  async function archivoABase64(file) {
    return aBase64(await file.arrayBuffer());
  }

  /* --------------------------------------------------------------------
     Llamadas a la API
     -------------------------------------------------------------------- */
  async function api(ruta, opciones) {
    const op = opciones || {};
    const resp = await fetch(API + ruta, {
      method: op.method || 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(op.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: op.body ? JSON.stringify(op.body) : undefined,
    });

    if (resp.status === 404 && op.permitir404) return null;

    if (!resp.ok) {
      let detalle = '';
      try { detalle = (await resp.json()).message || ''; } catch (e) {}
      throw new Error(mensajeDeError(resp.status, detalle));
    }
    return resp.status === 204 ? null : resp.json();
  }

  function mensajeDeError(estado, detalle) {
    if (estado === 401) return 'El token no es válido o caducó. Genera uno nuevo y vuelve a pegarlo.';
    if (estado === 403) return 'El token no tiene permiso de escritura sobre este repositorio. '
      + 'Revisa que le diste acceso a ' + destino() + ' con permiso de Contents: Read and write.';
    if (estado === 409) return 'El archivo cambió mientras se subía. Vuelve a intentarlo.';
    if (estado === 422) return 'GitHub rechazó el archivo' + (detalle ? ': ' + detalle : '') + '.';
    return `GitHub respondió ${estado}${detalle ? ': ' + detalle : ''}.`;
  }

  /* Comprueba que el token sirve y que puede escribir aquí. */
  async function verificar() {
    if (!configurable()) throw new Error('Esta página no está publicada en GitHub Pages, así que no sé a qué repositorio escribir.');
    if (!token) throw new Error('Falta el token.');
    const r = await api(`/repos/${repo.owner}/${repo.repo}`);
    if (!r.permissions || !r.permissions.push) {
      throw new Error('El token llega al repositorio pero no puede escribir en él. '
        + 'Dale permiso Contents: Read and write.');
    }
    return { nombre: r.full_name, privado: r.private, rama: r.default_branch };
  }

  const ruta = (p) => `/repos/${repo.owner}/${repo.repo}/contents/${p.split('/').map(encodeURIComponent).join('/')}`;

  async function shaDe(p) {
    const r = await api(ruta(p), { permitir404: true });
    return r && r.sha ? r.sha : null;
  }

  /* Sube (o reemplaza) un archivo. contenido = base64. */
  async function subir(p, contenidoB64, mensaje) {
    const sha = await shaDe(p);
    const r = await api(ruta(p), {
      method: 'PUT',
      body: { message: mensaje || `Actualizar ${p}`, content: contenidoB64, ...(sha ? { sha } : {}) },
    });
    return { creado: !sha, commit: r && r.commit ? r.commit.sha : '' };
  }

  /* Varios archivos, uno detrás de otro: en paralelo GitHub los rechaza
     porque cada uno cambia el árbol del repositorio. */
  async function subirVarios(archivos, mensaje, alProgresar) {
    const hechos = [];
    for (let i = 0; i < archivos.length; i++) {
      const a = archivos[i];
      if (alProgresar) alProgresar(i, archivos.length, a.ruta);
      hechos.push(await subir(a.ruta, a.base64, mensaje));
    }
    return hechos;
  }

  async function listar(carpeta) {
    const r = await api(ruta(carpeta || ''), { permitir404: true });
    return Array.isArray(r) ? r : [];
  }

  async function leerTexto(p) {
    const r = await api(ruta(p), { permitir404: true });
    if (!r || !r.content) return null;
    const bin = atob(r.content.replace(/\n/g, ''));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  async function borrar(p, mensaje) {
    const sha = await shaDe(p);
    if (!sha) return false;
    await api(ruta(p), { method: 'DELETE', body: { message: mensaje || `Eliminar ${p}`, sha } });
    return true;
  }

  /* GitHub Pages tarda en republicar. Esto espera a que la página responda. */
  async function esperarEnLinea(url, msMax) {
    const fin = Date.now() + (msMax || 90000);
    while (Date.now() < fin) {
      try {
        const r = await fetch(url + '?t=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
        if (r.ok) return true;
      } catch (e) {}
      await new Promise((res) => setTimeout(res, 3000));
    }
    return false;
  }

  return {
    detectarRepo, fijarRepo, destino, configurable,
    hayToken, guardarToken, verificar,
    subir, subirVarios, listar, leerTexto, borrar, shaDe,
    textoABase64, archivoABase64, aBase64,
    esperarEnLinea,
  };
})();
