/* =========================================================================
   IMÁGENES DE LA RUTINA  —  formato historia 1080 x 1920
   =========================================================================
   Dibuja la rutina en un <canvas> con la paleta y las tipografías de la
   marca. No es una captura de la página: es una pieza diseñada aparte, sin
   barras ni botones, pensada para estados de WhatsApp e historias.

   Se usa así:
       const imgs = await RutinaImagenes.generar(datos, { rutaClips: '../clips/' });
       // imgs = [{ etiqueta, archivo, blob, url }, ...]

   Si un día no cabe en una historia, se parte solo ("Lunes · 1 de 2").
   ========================================================================= */

const RutinaImagenes = (function () {
  'use strict';

  const ANCHO = 1080, ALTO = 1920;   // formato historia

  const M = 72;               // margen lateral
  const TOP = 104;            // zona segura de arriba
  const BOT = 150;            // zona segura de abajo (donde va el "responder")

  const C = {
    tinta:   '#171512',
    papel:   '#f7f4ef',
    papel2:  '#f0ebe2',
    tarjeta: '#fffefb',
    texto:   '#1d1a16',
    texto2:  '#5c554b',
    texto3:  '#736b5f',
    inv:     '#f5f1ea',
    inv2:    'rgba(245, 241, 234, 0.72)',
    inv3:    'rgba(245, 241, 234, 0.48)',
    oro:     '#c9a15a',
    bronce:  '#a97b3f',
    bronceT: '#8a6230',
    linea:   '#e7dfd2',
    linea2:  '#d6cab8',
    lineaInv:'rgba(245, 241, 234, 0.16)',
  };

  const F = {
    display: (peso, px) => `${peso} ${px}px Fraunces, Georgia, serif`,
    texto:   (peso, px) => `${peso} ${px}px Inter, sans-serif`,
  };

  /* ---------------------------------------------------------------------
     AYUDANTES DE DIBUJO
     --------------------------------------------------------------------- */
  function rect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function cortar(ctx, txt, maxW) {
    const palabras = String(txt == null ? '' : txt).split(/\s+/).filter(Boolean);
    const lineas = [];
    let linea = '';
    palabras.forEach((p) => {
      const prueba = linea ? linea + ' ' + p : p;
      if (ctx.measureText(prueba).width <= maxW || !linea) linea = prueba;
      else { lineas.push(linea); linea = p; }
    });
    if (linea) lineas.push(linea);
    return lineas;
  }

  function escribir(ctx, lineas, x, y, lh) {
    lineas.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
    return lineas.length * lh;
  }

  /* Texto en mayúsculas con espaciado entre letras (canvas no lo trae). */
  function espaciado(ctx, txt, x, y, px) {
    const s = String(txt).toUpperCase();
    let cx = x;
    for (const ch of s) {
      ctx.fillText(ch, cx, y);
      cx += ctx.measureText(ch).width + px;
    }
    return cx - x - px;
  }
  function anchoEspaciado(ctx, txt, px) {
    const s = String(txt).toUpperCase();
    let w = 0;
    for (const ch of s) w += ctx.measureText(ch).width + px;
    return w - px;
  }

  function cargarImg(src) {
    return new Promise((res) => {
      if (!src) return res(null);
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => res(null);
      i.src = src;
    });
  }

  async function fuentesListas() {
    if (!document.fonts) return;
    // Con tope de tiempo: si las fuentes no cargan (sin red, o bloqueadas por
    // el navegador), seguimos con la tipografía de respaldo en vez de quedarnos
    // esperando para siempre.
    const tope = (promesa, ms) => Promise.race([promesa, new Promise((r) => setTimeout(r, ms))]);
    try {
      await tope(Promise.all([
        document.fonts.load('600 1em Fraunces'), document.fonts.load('700 1em Fraunces'),
        document.fonts.load('400 1em Inter'), document.fonts.load('500 1em Inter'),
        document.fonts.load('600 1em Inter'), document.fonts.load('700 1em Inter'),
      ]), 5000);
      await tope(document.fonts.ready, 2000);
    } catch (e) {}
  }

  /* Dibuja una pesa sencilla, para los ejercicios que todavía no tienen clip */
  function pesa(ctx, cx, cy, s) {
    ctx.save();
    ctx.strokeStyle = '#c9bda9';
    ctx.lineWidth = s * 0.07;
    ctx.lineCap = 'round';
    const u = s / 2;
    [[-0.78, 0.34], [-0.58, 0.56], [0.58, 0.56], [0.78, 0.34]].forEach(([dx, alto]) => {
      ctx.beginPath();
      ctx.moveTo(cx + dx * u, cy - alto * u);
      ctx.lineTo(cx + dx * u, cy + alto * u);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(cx - 0.58 * u, cy);
    ctx.lineTo(cx + 0.58 * u, cy);
    ctx.stroke();
    ctx.restore();
  }

  /* ---------------------------------------------------------------------
     MEDIDAS (para saber qué cabe en cada historia)
     --------------------------------------------------------------------- */
  const ANCHO_UTIL = ANCHO - M * 2;
  const COL_TXT = ANCHO_UTIL - 150 - 26;   // ancho del texto junto a la miniatura

  function medirEjercicio(ctx, ej) {
    ctx.font = F.texto(600, 36);
    const nombre = cortar(ctx, ej.nombre, COL_TXT);
    let h = nombre.length * 44 + 14;       // nombre
    h += 52;                                // fila de datos
    let nota = [];
    if (ej.nota) {
      ctx.font = F.texto(400, 27);
      nota = cortar(ctx, ej.nota, COL_TXT - 22);
      h += 12 + nota.length * 36;
    }
    return { h: Math.max(150, h) + 30, nombre, nota };
  }

  /* ---------------------------------------------------------------------
     PÁGINA: fondo, cabecera y pie
     --------------------------------------------------------------------- */
  function lienzo(oscuro) {
    const cv = document.createElement('canvas');
    cv.width = ANCHO; cv.height = ALTO;
    const ctx = cv.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.fillStyle = oscuro ? C.tinta : C.papel;
    ctx.fillRect(0, 0, ANCHO, ALTO);

    // Resplandor dorado
    const g = ctx.createRadialGradient(ANCHO - 60, 150, 0, ANCHO - 60, 150, 620);
    g.addColorStop(0, oscuro ? 'rgba(201,161,90,.22)' : 'rgba(201,161,90,.16)');
    g.addColorStop(1, 'rgba(201,161,90,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ANCHO, 760);

    // Esquinas de la marca
    ctx.strokeStyle = C.oro;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 3;
    const e = 54, o = 40;
    ctx.beginPath();
    ctx.moveTo(o, o + e); ctx.lineTo(o, o); ctx.lineTo(o + e, o);
    ctx.moveTo(ANCHO - o, ALTO - o - e); ctx.lineTo(ANCHO - o, ALTO - o); ctx.lineTo(ANCHO - o - e, ALTO - o);
    ctx.stroke();
    ctx.globalAlpha = 1;

    return { cv, ctx };
  }

  function marca(ctx, foto, nombre, rol, y, oscuro) {
    const d = 76;
    if (foto) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(M + d / 2, y + d / 2, d / 2, 0, Math.PI * 2);
      ctx.strokeStyle = C.oro; ctx.lineWidth = 3; ctx.stroke();
      ctx.clip();
      ctx.drawImage(foto, M + 4, y + 4, d - 8, d - 8);
      ctx.restore();
    }
    const x = M + d + 20;
    ctx.fillStyle = oscuro ? C.inv : C.texto;
    ctx.font = F.display(600, 34);
    ctx.fillText(nombre, x, y + 8);
    ctx.fillStyle = oscuro ? C.inv3 : C.texto3;
    ctx.font = F.texto(500, 19);
    espaciado(ctx, rol, x, y + 50, 2.6);
    return d;
  }

  function pie(ctx, coach, etiqueta, oscuro) {
    const y = ALTO - BOT + 20;
    ctx.strokeStyle = oscuro ? C.lineaInv : C.linea;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(M, y); ctx.lineTo(ANCHO - M, y); ctx.stroke();

    ctx.fillStyle = oscuro ? C.inv2 : C.texto2;
    ctx.font = F.texto(600, 23);
    espaciado(ctx, coach.nombre, M, y + 26, 2.4);

    if (coach.mostrar) {
      ctx.fillStyle = C.bronceT;
      ctx.font = F.texto(600, 23);
      const w = anchoEspaciado(ctx, coach.mostrar, 2.4);
      espaciado(ctx, coach.mostrar, ANCHO - M - w, y + 26, 2.4);
    }
    if (etiqueta) {
      ctx.fillStyle = oscuro ? C.inv3 : C.texto3;
      ctx.font = F.texto(500, 21);
      ctx.fillText(etiqueta, M, y + 64);
    }
  }

  function antetitulo(ctx, txt, y, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.moveTo(M, y + 11); ctx.lineTo(M + 38, y + 11); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.font = F.texto(600, 21);
    espaciado(ctx, txt, M + 54, y, 3.4);
  }

  /* ---------------------------------------------------------------------
     PORTADA
     --------------------------------------------------------------------- */
  function portada(d, foto) {
    const { cv, ctx } = lienzo(true);
    const coach = d.coach || {};

    marca(ctx, foto, coach.nombre || '', coach.rol || '', TOP, true);

    const dias = d.dias || [];

    // Primero se mide todo el bloque para poder centrarlo verticalmente:
    // si la rutina es corta, no queda un hueco enorme en medio.
    ctx.font = F.display(600, 94);
    const lineasNombre = cortar(ctx, d.alumno || 'Tu rutina', ANCHO_UTIL);
    const fichasMedidas = [];
    [d.objetivo && { t: d.objetivo, oro: true }, d.paquete && { t: d.paquete },
     d.vigencia && { t: d.vigencia }].filter(Boolean).forEach((f) => {
      ctx.font = F.texto(f.oro ? 600 : 500, 27);
      const lineas = cortar(ctx, f.t, ANCHO_UTIL - 56);
      fichasMedidas.push({ ...f, lineas, h: lineas.length * 36 + 26 });
    });
    let lineasNota = [];
    if (d.nota) { ctx.font = F.texto(400, 30); lineasNota = cortar(ctx, d.nota, ANCHO_UTIL - 68); }

    const altoTotal = 62 + lineasNombre.length * 104 + 18 + 70
      + fichasMedidas.reduce((a, f) => a + f.h + 14, 0)
      + (lineasNota.length ? 26 + lineasNota.length * 42 + 52 : 0)
      + 70 + dias.length * 46;

    const arriba = TOP + 190;
    const abajo = ALTO - BOT - 40;
    let y = arriba + Math.max(0, (abajo - arriba - altoTotal) / 2);

    antetitulo(ctx, 'Plan de entrenamiento', y, C.oro);
    y += 62;

    ctx.fillStyle = C.inv;
    ctx.font = F.display(600, 94);
    y += escribir(ctx, lineasNombre, M, y, 104) + 18;
    const totalEj = dias.reduce((a, x) =>
      a + (x.bloques || []).reduce((b, bl) => b + (bl.ejercicios || []).length, 0), 0);
    ctx.fillStyle = C.inv2;
    ctx.font = F.texto(400, 32);
    ctx.fillText(`${dias.length} ${dias.length === 1 ? 'día' : 'días'} · ${totalEj} ejercicios`, M, y);
    y += 70;

    // Fichas
    fichasMedidas.forEach((f) => {
      ctx.font = F.texto(f.oro ? 600 : 500, 27);
      const lineas = f.lineas, h = f.h;
      ctx.fillStyle = f.oro ? 'rgba(201,161,90,.16)' : 'rgba(245,241,234,.05)';
      rect(ctx, M, y, Math.min(ANCHO_UTIL, Math.max(...lineas.map((l) => ctx.measureText(l).width)) + 56), h, h / 2);
      ctx.fill();
      ctx.strokeStyle = f.oro ? 'rgba(201,161,90,.45)' : C.lineaInv;
      ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = f.oro ? '#ead5a6' : C.inv2;
      escribir(ctx, lineas, M + 28, y + 13, 36);
      y += h + 14;
    });

    // Nota general
    if (lineasNota.length) {
      y += 26;
      ctx.font = F.texto(400, 30);
      const lineas = lineasNota;
      const h = lineas.length * 42 + 52;
      ctx.fillStyle = 'rgba(245,241,234,.05)';
      rect(ctx, M, y, ANCHO_UTIL, h, 20); ctx.fill();
      ctx.strokeStyle = C.lineaInv; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = C.oro;
      rect(ctx, M, y, 6, h, 3); ctx.fill();
      ctx.fillStyle = C.inv2;
      escribir(ctx, lineas, M + 36, y + 26, 42);
      y += h;
    }

    // Lista de días
    let yb = y + 70;
    ctx.font = F.texto(500, 27);
    dias.forEach((dia, i) => {
      ctx.fillStyle = C.oro;
      ctx.font = F.display(600, 27);
      ctx.fillText(String(i + 1).padStart(2, '0'), M, yb + 4);
      ctx.fillStyle = C.inv2;
      ctx.font = F.texto(500, 27);
      ctx.fillText(`${dia.nombre || 'Día ' + (i + 1)}${dia.enfoque ? ' · ' + dia.enfoque : ''}`, M + 56, yb);
      yb += 46;
    });

    pie(ctx, { nombre: coach.nombre || '', mostrar: coach.mostrar || '' }, '', true);
    return cv;
  }

  /* ---------------------------------------------------------------------
     PÁGINAS DE UN DÍA
     --------------------------------------------------------------------- */
  function paginarDia(ctx, dia, i, totalDias) {
    const elementos = [];
    let n = 0;
    (dia.bloques || []).forEach((bl) => {
      if (!(bl.ejercicios || []).length) return;
      elementos.push({ tipo: 'bloque', grupo: bl.grupo, h: 72 });
      bl.ejercicios.forEach((ej) => {
        const m = medirEjercicio(ctx, ej);
        elementos.push({ tipo: 'ej', ej, n: ++n, ...m });
      });
    });

    // La primera página lleva el titular del día; las siguientes no.
    const altoCabeza1 = 190 + 150;
    const altoCabezaN = 190 + 80;
    const disponible = () => ALTO - BOT - 40;

    const paginas = [];
    let actual = [], y = TOP + altoCabeza1, grupoActual = null;

    elementos.forEach((el) => {
      if (el.tipo === 'bloque') grupoActual = el.grupo;
      if (y + el.h > disponible() && actual.length) {
        paginas.push(actual);
        actual = [];
        y = TOP + altoCabezaN;
        // Si el bloque sigue en la página nueva, se repite su título.
        if (el.tipo === 'ej' && grupoActual) {
          const cab = { tipo: 'bloque', grupo: grupoActual, sigue: true, h: 72 };
          actual.push(cab);
          y += cab.h;
        }
      }
      actual.push(el);
      y += el.h;
    });
    if (actual.length) paginas.push(actual);
    return paginas;
  }

  function dibujarDia(d, dia, i, pagina, nPag, totalPag, foto, posters) {
    const { cv, ctx } = lienzo(false);
    const coach = d.coach || {};
    const primera = nPag === 1;

    marca(ctx, foto, coach.nombre || '', coach.rol || '', TOP, false);

    // "DÍA 1 DE 3" a la derecha
    ctx.fillStyle = C.texto3;
    ctx.font = F.texto(600, 21);
    const et = `Día ${i + 1} de ${(d.dias || []).length}`;
    const w = anchoEspaciado(ctx, et, 3);
    espaciado(ctx, et, ANCHO - M - w, TOP + 26, 3);

    let y = TOP + 190;

    if (primera) {
      ctx.fillStyle = C.texto;
      ctx.font = F.display(600, 76);
      ctx.fillText(dia.nombre || 'Día ' + (i + 1), M, y);
      y += 92;
      if (dia.enfoque) {
        ctx.fillStyle = C.texto2;
        ctx.font = F.texto(400, 32);
        ctx.fillText(dia.enfoque, M, y);
        y += 58;
      }
    } else {
      ctx.fillStyle = C.texto;
      ctx.font = F.display(600, 46);
      ctx.fillText(`${dia.nombre || 'Día ' + (i + 1)}`, M, y);
      y += 80;
    }

    // Si la página va holgada, el bloque se centra en vez de quedar arriba.
    const altoLista = pagina.reduce((a, el) => a + el.h, 0);
    const libre = (ALTO - BOT - 40) - y - altoLista;
    if (libre > 0) y += Math.min(libre / 2, 120);

    pagina.forEach((el) => {
      if (el.tipo === 'bloque') {
        ctx.fillStyle = C.bronceT;
        ctx.font = F.texto(600, 22);
        const txt = el.sigue ? `${el.grupo} (sigue)` : el.grupo;
        const aw = anchoEspaciado(ctx, txt, 3.4);
        espaciado(ctx, txt, M, y + 14, 3.4);
        ctx.strokeStyle = C.linea; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(M + aw + 22, y + 25); ctx.lineTo(ANCHO - M, y + 25); ctx.stroke();
        y += el.h;
        return;
      }

      const ej = el.ej;
      const alto = el.h - 30;

      // Tarjeta
      ctx.fillStyle = C.tarjeta;
      rect(ctx, M - 16, y - 14, ANCHO_UTIL + 32, alto + 28, 20); ctx.fill();
      ctx.strokeStyle = C.linea; ctx.lineWidth = 2; ctx.stroke();

      // Miniatura
      const s = 150;
      const img = posters[ej.poster || ''] || null;
      ctx.save();
      rect(ctx, M, y, s, s, 16);
      ctx.fillStyle = C.papel2; ctx.fill();
      ctx.clip();
      if (img) {
        const esc = Math.max(s / img.width, s / img.height);
        const iw = img.width * esc, ih = img.height * esc;
        ctx.drawImage(img, M + (s - iw) / 2, y + (s - ih) / 2, iw, ih);
      }
      ctx.restore();
      if (!img) pesa(ctx, M + s / 2, y + s / 2, 58);
      ctx.strokeStyle = C.linea; ctx.lineWidth = 2;
      rect(ctx, M, y, s, s, 16); ctx.stroke();

      // Número
      ctx.fillStyle = 'rgba(23,21,18,.76)';
      rect(ctx, M + 9, y + 9, 44, 34, 17); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = F.texto(700, 22);
      const nw = ctx.measureText(String(el.n)).width;
      ctx.fillText(String(el.n), M + 9 + (44 - nw) / 2, y + 16);

      // Texto
      const tx = M + s + 26;
      let ty = y;
      ctx.fillStyle = C.texto;
      ctx.font = F.texto(600, 36);
      ty += escribir(ctx, el.nombre, tx, ty, 44) + 14;

      // Datos
      const datos = [
        ej.series ? [ej.series, 'series', true] : null,
        ej.reps ? [ej.reps, 'reps', false] : null,
        ej.descanso ? [ej.descanso, 'descanso', false] : null,
      ].filter(Boolean);
      let dx = tx;
      datos.forEach(([val, lab, oro]) => {
        ctx.font = F.texto(700, 28);
        const vw = ctx.measureText(val).width;
        ctx.font = F.texto(600, 18);
        const lw = anchoEspaciado(ctx, lab, 2);
        const bw = vw + lw + 34;
        ctx.fillStyle = C.papel2;
        rect(ctx, dx, ty, bw, 44, 10); ctx.fill();
        ctx.fillStyle = oro ? C.bronceT : C.texto;
        ctx.font = F.texto(700, 28);
        ctx.fillText(val, dx + 13, ty + 8);
        ctx.fillStyle = C.texto3;
        ctx.font = F.texto(600, 18);
        espaciado(ctx, lab, dx + 13 + vw + 8, ty + 15, 2);
        dx += bw + 10;
      });
      ty += 52;

      // Nota de técnica
      if (el.nota.length) {
        ctx.fillStyle = C.bronce;
        rect(ctx, tx, ty + 6, 4, el.nota.length * 36 - 8, 2); ctx.fill();
        ctx.fillStyle = C.texto2;
        ctx.font = F.texto(400, 27);
        escribir(ctx, el.nota, tx + 22, ty + 6, 36);
      }

      y += el.h;
    });

    pie(ctx,
      { nombre: coach.nombre || '', mostrar: coach.mostrar || '' },
      totalPag > 1 ? `${dia.nombre || 'Día ' + (i + 1)} · ${nPag} de ${totalPag}` : '',
      false);
    return cv;
  }

  /* ---------------------------------------------------------------------
     API
     --------------------------------------------------------------------- */
  async function generar(d, opciones) {
    const op = opciones || {};
    const rutaClips = op.rutaClips || '../clips/';
    await fuentesListas();

    const foto = (await cargarImg(op.foto || '../img/perfil.webp'))
              || (await cargarImg('../img/perfil.png'));

    // Miniaturas de los ejercicios
    const posters = {};
    const nombres = new Set();
    (d.dias || []).forEach((dia) => (dia.bloques || []).forEach((bl) =>
      (bl.ejercicios || []).forEach((ej) => { if (ej.poster) nombres.add(ej.poster); })));
    await Promise.all([...nombres].map(async (p) => { posters[p] = await cargarImg(rutaClips + p); }));

    // Lienzo auxiliar solo para medir
    const medidor = document.createElement('canvas').getContext('2d');
    medidor.textBaseline = 'top';

    const lienzos = [];
    lienzos.push({ etiqueta: 'Portada', cv: portada(d, foto) });

    (d.dias || []).forEach((dia, i) => {
      const paginas = paginarDia(medidor, dia, i, (d.dias || []).length);
      paginas.forEach((pag, k) => {
        lienzos.push({
          etiqueta: `${dia.nombre || 'Día ' + (i + 1)}${paginas.length > 1 ? ` (${k + 1}/${paginas.length})` : ''}`,
          cv: dibujarDia(d, dia, i, pag, k + 1, paginas.length, foto, posters),
        });
      });
    });

    // A archivos
    const salida = [];
    for (let i = 0; i < lienzos.length; i++) {
      const { etiqueta, cv } = lienzos[i];
      let blob = null, url = '';
      try {
        blob = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.93));
      } catch (e) { blob = null; }

      if (blob) {
        url = URL.createObjectURL(blob);
      } else {
        // Algunos navegadores con protección antihuella devuelven null en
        // toBlob; ahí probamos con toDataURL antes de darnos por vencidos.
        try { url = cv.toDataURL('image/jpeg', 0.93); } catch (e) { url = ''; }
        if (!url || url.length < 1000) {
          throw new Error('El navegador no deja exportar el contenido del lienzo. '
            + 'Suele ser la protección antihuella: desactiva los escudos para este '
            + 'sitio (el icono del león, arriba a la derecha en Brave) y reintenta.');
        }
      }
      salida.push({
        etiqueta,
        archivo: `${String(i + 1).padStart(2, '0')}-${etiqueta.toLowerCase()
          .normalize('NFD').replace(/[̀-ͯ]/g, '')
          .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.jpg`,
        blob,
        url,
      });
    }
    if (!salida.length) {
      throw new Error('No se generó ninguna imagen. Revisa que la rutina tenga al menos un día con ejercicios.');
    }
    return salida;
  }

  return { generar };
})();
