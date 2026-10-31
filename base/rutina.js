/* =========================================================================
   RUTINA DEL ALUMNO — motor
   =========================================================================
   Los datos de la rutina viajan CIFRADOS dentro de este index.html.
   La clave para descifrarlos NO está aquí: viaja en el link, después del
   "#". Esa parte del link nunca se envía al servidor ni queda guardada en
   ningún lado, así que solo quien tiene el link completo puede leer la
   rutina. Quien navegue el repositorio solo ve texto ilegible.

   No necesitas tocar este archivo para cambiar una rutina.
   ========================================================================= */

(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);

  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const ICONOS = {
    objetivo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/></svg>',
    calendario: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg>',
    paquete: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/></svg>',
    nota: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>',
    pesa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 10v4M2.5 9v6M7 8v8M17 8v8M21.5 9v6M20 10v4M7 12h10"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.3A9 9 0 1 0 12 3zm0 16.2a7.2 7.2 0 0 1-3.7-1l-.3-.2-2.7.8.8-2.6-.2-.3A7.2 7.2 0 1 1 12 19.2zm4-5.4c-.2-.1-1.3-.6-1.5-.7-.2-.1-.3-.1-.5.1s-.6.7-.7.9-.3.2-.5.1a5.9 5.9 0 0 1-1.7-1 6.4 6.4 0 0 1-1.2-1.5c-.1-.2 0-.3.1-.4l.3-.4c.1-.1.1-.2.2-.4a.4.4 0 0 0 0-.4c-.1-.1-.5-1.2-.7-1.6s-.4-.4-.5-.4h-.4a.9.9 0 0 0-.6.3 2.6 2.6 0 0 0-.8 2c0 1.2.9 2.3 1 2.5s1.7 2.6 4.2 3.6a5.4 5.4 0 0 0 3.2.2 2.4 2.4 0 0 0 1.5-1.1c.2-.4.2-.7.1-.8s-.2-.1-.4-.2z"/></svg>',
  };

  /* =====================================================================
     DESCIFRADO
     ===================================================================== */
  const deB64 = (s) => {
    const base = s.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(base + '==='.slice((base.length + 3) % 4));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  };

  function claveDelLink() {
    const h = location.hash.replace(/^#/, '');
    if (!h) return '';
    const p = new URLSearchParams(h);
    return p.get('k') || '';
  }

  async function descifrar(sobre, claveB64) {
    const clave = await crypto.subtle.importKey(
      'raw', deB64(claveB64), { name: 'AES-GCM' }, false, ['decrypt']);
    const plano = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: deB64(sobre.iv) }, clave, deB64(sobre.d));
    return JSON.parse(new TextDecoder().decode(plano));
  }

  /* =====================================================================
     AVISOS
     ===================================================================== */
  function aviso(titulo, parrafos, conWhatsapp) {
    const wa = conWhatsapp
      ? `<a class="wa-boton" href="${esc(conWhatsapp)}">${ICONOS.whatsapp}<span>Escríbele a tu coach</span></a>`
      : '';
    document.body.innerHTML = `
      <div class="aviso">
        <div class="aviso__caja">
          <img class="aviso__foto" src="../img/perfil.webp" alt="" onerror="this.src='../img/perfil.png'">
          <h1>${esc(titulo)}</h1>
          ${parrafos.map((p) => `<p>${esc(p)}</p>`).join('')}
          ${wa}
        </div>
      </div>`;
  }

  /* =====================================================================
     ARRANQUE
     ===================================================================== */
  async function arrancar() {
    const bruto = document.getElementById('datos');
    if (!bruto) return;

    // El navegador solo permite descifrar en páginas seguras (https).
    // Si alguien abre el archivo descargado con doble clic, se lo explicamos.
    if (!window.crypto || !crypto.subtle) {
      aviso('Abre tu rutina desde el link', [
        'Esta página solo funciona abierta desde el link que te mandaron, el que empieza con https.',
        'Si abriste un archivo descargado, vuelve al chat y toca el link completo.',
      ]);
      return;
    }

    const clave = claveDelLink();
    if (!clave) {
      aviso('Este link está incompleto', [
        'Le falta la parte final, que es la que abre tu rutina.',
        'Pídele a tu coach que te lo reenvíe completo y ábrelo tocándolo directo desde el chat.',
      ]);
      return;
    }

    let d;
    try {
      d = await descifrar(JSON.parse(bruto.textContent), clave);
    } catch (e) {
      aviso('No se pudo abrir esta rutina', [
        'El link llegó cortado o modificado.',
        'Pídele a tu coach que te lo reenvíe completo.',
      ]);
      return;
    }

    pintar(d);
  }

  /* =====================================================================
     PINTADO
     ===================================================================== */
  function pintar(d) {
    const coach = d.coach || {};
    const dias = Array.isArray(d.dias) ? d.dias : [];

    const fechaLarga = (iso) => {
      const p = String(iso || '').split('-');
      if (p.length !== 3) return iso || '';
      const m = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
                 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][Number(p[1]) - 1];
      return m ? `${Number(p[2])} de ${m} de ${p[0]}` : iso;
    };

    const waLink = (texto) => {
      const num = String(coach.whatsapp || '').replace(/\D/g, '');
      if (!num) return '';
      return `https://wa.me/${coach.lada || '52'}${num}?text=${encodeURIComponent(texto)}`;
    };

    // ---- Barra del coach ----
    $('#coachNombre').textContent = coach.nombre || '';
    $('#coachRol').textContent = coach.rol || '';

    const barra = $('#barra');
    const alScroll = () => barra.classList.toggle('esta-fija', window.scrollY > 8);
    alScroll();
    window.addEventListener('scroll', alScroll, { passive: true });

    // ---- Ficha ----
    $('#alumno').textContent = d.alumno || 'Tu rutina';
    document.title = `Rutina de ${d.alumno || 'entrenamiento'} — ${coach.nombre || ''}`;

    const resumen = [];
    if (dias.length) resumen.push(`${dias.length} ${dias.length === 1 ? 'día' : 'días'} de entrenamiento`);
    const total = dias.reduce((a, dia) =>
      a + (dia.bloques || []).reduce((b, bl) => b + (bl.ejercicios || []).length, 0), 0);
    if (total) resumen.push(`${total} ejercicios`);
    $('#resumen').textContent = resumen.join(' · ');

    const chips = [];
    if (d.objetivo) chips.push({ i: 'objetivo', t: d.objetivo, oro: true });
    if (d.paquete) chips.push({ i: 'paquete', t: d.paquete });
    if (d.vigencia) chips.push({ i: 'calendario', t: d.vigencia });
    if (d.actualizado) chips.push({ i: 'nota', t: 'Actualizada el ' + fechaLarga(d.actualizado) });
    $('#chips').innerHTML = chips
      .map((c) => `<span class="chip${c.oro ? ' chip--oro' : ''}">${ICONOS[c.i]}${esc(c.t)}</span>`)
      .join('');

    if (d.nota) $('#notaCoach').innerHTML = `${ICONOS.nota}<p>${esc(d.nota)}</p>`;
    else $('#notaCoach').remove();

    // ---- Días ----
    const tabs = $('#diasTabs');
    const paneles = $('#diasPaneles');

    if (!dias.length) {
      $('#dias').remove();
      paneles.innerHTML = '<div class="caja" style="padding-block:40px"><p>Esta rutina todavía no tiene días cargados.</p></div>';
    } else {
      tabs.innerHTML = dias.map((dia, i) => `
        <button class="dia-tab${i === 0 ? ' activa' : ''}" data-dia="${i}" type="button">
          <strong>${esc(dia.nombre || 'Día ' + (i + 1))}</strong>
          ${dia.enfoque ? `<span>${esc(dia.enfoque)}</span>` : ''}
        </button>`).join('');

      paneles.innerHTML = dias.map((dia, i) => panelDia(dia, i, dias.length)).join('');

      tabs.addEventListener('click', (e) => {
        const b = e.target.closest('.dia-tab');
        if (!b) return;
        const idx = b.dataset.dia;
        tabs.querySelectorAll('.dia-tab').forEach((x) => x.classList.toggle('activa', x === b));
        paneles.querySelectorAll('.dia').forEach((p) => { p.hidden = p.dataset.dia !== idx; });
        b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        window.scrollTo({ top: paneles.offsetTop - 110, behavior: 'smooth' });
        arrancarVisibles();
      });
    }

    function panelDia(dia, i, totalDias) {
      const bloques = (dia.bloques || []).filter((b) => (b.ejercicios || []).length);
      let n = 0;
      const cuerpo = bloques.map((bl) => `
        <section class="bloque">
          <h3 class="bloque__titulo">${esc(bl.grupo || 'Ejercicios')}</h3>
          <div class="ejercicios">
            ${(bl.ejercicios || []).map((ej) => tarjeta(ej, ++n)).join('')}
          </div>
        </section>`).join('');

      return `
        <section class="dia" data-dia="${i}"${i === 0 ? '' : ' hidden'}>
          <div class="caja">
            <header class="dia__cabeza">
              <p class="antetitulo">Día ${i + 1} de ${totalDias}</p>
              <h2>${esc(dia.nombre || 'Día ' + (i + 1))}</h2>
              ${dia.enfoque ? `<p>${esc(dia.enfoque)}</p>` : ''}
            </header>
            ${cuerpo || '<p>Día de descanso.</p>'}
          </div>
        </section>`;
    }

    // Declarada como función para que esté disponible aunque se use antes.
    function esAnimado(f) { return /\.(gif|webp|png|jpe?g)$/i.test(f || ''); }

    function tarjeta(ej, n) {
      // Un GIF se anima solo con <img>; un MP4 necesita <video>.
      const media = ej.clip
        ? (esAnimado(ej.clip)
            ? `<img src="../clips/${esc(ej.clip)}" alt="" loading="lazy">`
            : `<video class="ej__video" muted loop playsinline preload="none" disablepictureinpicture
                  ${ej.poster ? `poster="../clips/${esc(ej.poster)}"` : ''}
                  data-src="../clips/${esc(ej.clip)}"></video>`)
        : (ej.poster
            ? `<img src="../clips/${esc(ej.poster)}" alt="" loading="lazy">`
            : `<div class="ej__media--vacio" style="width:100%;height:100%">${ICONOS.pesa}</div>`);

      const datos = [
        ej.series ? `<span class="dato dato--series"><b>${esc(ej.series)}</b><span>series</span></span>` : '',
        ej.reps ? `<span class="dato"><b>${esc(ej.reps)}</b><span>reps</span></span>` : '',
        ej.descanso ? `<span class="dato"><b>${esc(ej.descanso)}</b><span>descanso</span></span>` : '',
      ].filter(Boolean).join('');

      return `
        <article class="ej">
          <div class="ej__media">
            <span class="ej__num">${n}</span>
            ${media}
          </div>
          <div class="ej__cuerpo">
            <h4 class="ej__nombre">${esc(ej.nombre || 'Ejercicio')}</h4>
            ${datos ? `<div class="ej__datos">${datos}</div>` : ''}
            ${ej.nota ? `<div class="ej__nota">${ICONOS.nota}<span>${esc(ej.nota)}</span></div>` : ''}
          </div>
        </article>`;
    }

    // ---- Videos: cargar y reproducir solo los que se ven ----
    const menosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function activar(video) {
      if (!video.src) video.src = video.dataset.src;
      const p = video.play();
      if (p && p.then) {
        p.then(() => video.parentElement.classList.remove('bloqueado'))
         .catch(() => video.parentElement.classList.add('bloqueado'));
      }
    }

    let observador = null;
    if ('IntersectionObserver' in window && !menosMovimiento) {
      observador = new IntersectionObserver((entradas) => {
        entradas.forEach((en) => {
          const v = en.target;
          if (en.isIntersecting) activar(v);
          else if (!v.paused) v.pause();
        });
      }, { rootMargin: '120px 0px', threshold: 0.2 });
    }

    function arrancarVisibles() {
      document.querySelectorAll('.dia:not([hidden]) .ej__video').forEach((v) => {
        if (observador) observador.observe(v);
        else if (!menosMovimiento) activar(v);
      });
    }
    arrancarVisibles();

    document.addEventListener('click', (e) => {
      const media = e.target.closest('.ej__media.bloqueado');
      if (!media) return;
      const v = media.querySelector('video');
      if (v) activar(v);
    });

    // ---- WhatsApp y pie ----
    const wa = $('#waBoton');
    const link = waLink(`Hola ${coach.nombre || ''}, tengo una duda con mi rutina.`);
    if (link) {
      wa.href = link;
      wa.innerHTML = `${ICONOS.whatsapp}<span>Dudas con tu rutina</span>`;
    } else {
      wa.remove();
    }

    $('#pieNombre').textContent = coach.nombre || '';
    $('#pieRol').textContent = coach.rol || '';
  }

  arrancar();
})();
