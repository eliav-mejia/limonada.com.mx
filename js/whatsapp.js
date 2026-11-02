/* Limonada · v1.2.0 · WhatsApp con filtro de dos pasos. Sin dependencias.
 *
 * Botón flotante → pop-up (interés + calificación) → registro en n8n (opcional) → wa.me con mensaje prellenado y
 * referencia LIM-XXXX. El filtro nunca bloquea el contacto: «Prefiero ir directo a WhatsApp» siempre está visible.
 *
 * Configuración (cualquiera de las dos; window.LIMONADA_WA tiene prioridad):
 *   <script src="js/whatsapp.js" data-webhook="https://…/webhook/limonada-lead" data-site="nuevo" defer></script>
 *   <script>window.LIMONADA_WA = { webhook: "…", site: "wordpress", privacy: "https://…" };</script>
 * Sin webhook no se envía nada a la red: WhatsApp se abre igual y los eventos de GA4 se emiten si gtag/dataLayer existe.
 * El mismo archivo se empaqueta para WordPress (WPCode) con tools/wpcode.py.
 */
(function () {
  'use strict';
  if (window.__limonadaWA) return;
  window.__limonadaWA = true;

  var VERSION = 'v1.2.0';
  var script = document.currentScript;
  var CFG = window.LIMONADA_WA || {};
  function opt(key, fallback) {
    if (CFG[key] != null && CFG[key] !== '') return CFG[key];
    var v = script && script.dataset ? script.dataset[key] : null;
    return v != null && v !== '' ? v : fallback;
  }
  var PHONE = String(opt('phone', '5215614800424')).replace(/\D/g, '');
  var WEBHOOK = opt('webhook', '');
  var SITE = opt('site', 'nuevo');
  var PRIVACY = opt('privacy', script && script.src ? new URL('../privacidad/', script.src).href : '/privacidad/');

  // ── Opciones del filtro (los valores son la lista blanca que valida n8n) ──
  var LUGAR = { name: 'lugar', label: '¿Dónde estás?', options: [['cdmx', 'CDMX y área metropolitana'], ['otro-estado', 'Otro estado']] };
  var PLAZO = { name: 'plazo', label: '¿Para cuándo?', options: [['este-mes', 'Este mes'], ['1-3m', '1 – 3 meses'], ['cotizo', 'Solo cotizo']] };
  var OCASION = { name: 'ocasion', label: '¿Para qué ocasión?', options: [['oficina', 'Oficina'], ['evento', 'Evento'], ['boda', 'Boda']] };
  var ESTADOS = ['Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua', 'Ciudad de México',
    'Coahuila', 'Colima', 'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos',
    'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco',
    'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'];
  function slug(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'); }

  var INTERESES = [
    { id: 'empresa', label: 'Uniformes ejecutivos para mi empresa', corto: 'Uniformes para empresa', fields: [
      { name: 'personas', label: '¿Cuántas personas uniformarías?', options: [['1-10', '1 – 10'], ['11-50', '11 – 50'], ['51-200', '51 – 200'], ['200+', '200+']], suffix: ' personas' },
      LUGAR, PLAZO] },
    { id: 'caballero', label: 'Traje a la medida · caballero', corto: 'Traje caballero', fields: [OCASION, LUGAR, PLAZO] },
    { id: 'dama', label: 'Traje o conjunto a la medida · dama', corto: 'Traje dama', fields: [OCASION, LUGAR, PLAZO] },
    { id: 'arreglos', label: 'Arreglos y ajustes', corto: 'Arreglos y ajustes', fields: [LUGAR, PLAZO] },
    { id: 'distribuidor', label: 'Quiero ser distribuidor', corto: 'Distribuidor', fields: [
      { name: 'estado', label: '¿En qué estado?', select: ESTADOS.map(function (e) { return [slug(e), e]; }) },
      { name: 'vende', label: '¿Ya vendes uniformes?', options: [['si', 'Sí'], ['no', 'No']], prefix: 'ya vende uniformes: ' }] },
    { id: 'otro', label: 'Otro', corto: 'Otro', fields: [
      { name: 'texto', label: 'Cuéntanos en pocas palabras', text: 140 }, LUGAR] }
  ];

  // Mensaje de «ir directo» según la página (fase interna §V)
  function pageMessage() {
    var p = location.pathname;
    if (/\/portafolio\/caballero\//.test(p)) return 'Hola, vi el portafolio de caballero y me gustaría más información.';
    if (/\/portafolio\/dama\//.test(p)) return 'Hola, vi el portafolio de dama y me gustaría más información.';
    if (/\/portafolio\//.test(p)) return 'Hola, vi el portafolio y me gustaría más información.';
    return 'Hola, me gustaría más información.';
  }

  // ── Utilidades ──
  var ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I
  function newRef() {
    var out = '', bytes = new Uint8Array(4);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    for (var i = 0; i < 4; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
    return 'LIM-' + out;
  }
  function device() {
    var ua = navigator.userAgent || '';
    if (/iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'tableta';
    if (/Mobi|Android|iPhone/i.test(ua)) return 'movil';
    return 'escritorio';
  }
  function gaClientId() {
    var m = document.cookie.match(/(?:^|;\s*)_ga=GA\d\.\d\.(\d+\.\d+)/);
    return m ? m[1] : '';
  }
  // UTM y referrer de la página de entrada de la sesión
  var ORIGIN_KEY = 'limonada-origen';
  var origen = (function () {
    var q = new URLSearchParams(location.search), o = null;
    try { o = JSON.parse(sessionStorage.getItem(ORIGIN_KEY) || 'null'); } catch (e) {}
    if (!o || q.get('utm_source')) {
      var ref = document.referrer && document.referrer.indexOf(location.origin) !== 0 ? document.referrer : '';
      o = { utm_source: q.get('utm_source') || '', utm_medium: q.get('utm_medium') || '', utm_campaign: q.get('utm_campaign') || '', referrer: ref.slice(0, 200) };
      try { sessionStorage.setItem(ORIGIN_KEY, JSON.stringify(o)); } catch (e) {}
    }
    return o;
  })();

  function track(name, params) {
    var p = { sitio: SITE, version: VERSION, pagina_origen: location.pathname };
    for (var k in params) p[k] = params[k];
    if (typeof window.gtag === 'function') window.gtag('event', name, p);
    else if (Array.isArray(window.dataLayer)) { p.event = name; window.dataLayer.push(p); }
  }

  // Registro en n8n: form-urlencoded por sendBeacon (sin preflight de CORS, sobrevive a la navegación).
  function send(data) {
    if (!WEBHOOK) return;
    var body = new URLSearchParams();
    for (var k in data) body.append(k, data[k] == null ? '' : String(data[k]));
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(WEBHOOK, body)) return;
    } catch (e) {}
    try { fetch(WEBHOOK, { method: 'POST', body: body, mode: 'no-cors', keepalive: true, credentials: 'omit' }); } catch (e) {}
  }

  function openWhatsApp(text) {
    var url = 'https://wa.me/' + PHONE + '?text=' + encodeURIComponent(text);
    var w = window.open(url, '_blank');
    if (w) { try { w.opener = null; } catch (e) {} } else { location.href = url; }
    return url;
  }

  // ── Interfaz ──
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  var WA_ICON = '<svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true" focusable="false"><path fill="currentColor" d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3 29l6.4-2c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.8S23.2 3 16 3zm0 23.4c-2.1 0-4.1-.6-5.9-1.7l-.4-.3-3.8 1.2 1.2-3.7-.3-.4c-1.2-1.8-1.8-3.8-1.8-5.9C5 9.9 10 5.2 16 5.2s11 4.7 11 10.6-5 10.6-11 10.6zm6-7.9c-.3-.2-2-1-2.3-1.1-.3-.1-.5-.2-.8.2-.2.3-.9 1.1-1.1 1.3-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.7-1.7-1-.9-1.7-2-1.9-2.3-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.6.1-.2 0-.4 0-.6l-1-2.5c-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8 0 1.6 1.2 3.2 1.4 3.4.2.2 2.4 3.6 5.8 5 .8.3 1.4.5 1.9.7.8.3 1.5.2 2.1.1.6-.1 2-.8 2.2-1.6.3-.8.3-1.5.2-1.6-.1-.1-.3-.2-.6-.4z"/></svg>';

  function build() {
    var state = { ref: newRef(), interes: null, openedAt: 0, step: 1 };

    var fab = el('button', { type: 'button', class: 'lwa-fab', 'aria-haspopup': 'dialog', 'aria-label': 'WhatsApp: ¿Cómo podemos ayudarte?' });
    fab.innerHTML = WA_ICON + '<span class="lwa-fab__label">¿Cómo podemos ayudarte?</span>';

    var dlg = el('dialog', { class: 'lwa', 'aria-labelledby': 'lwa-title', 'aria-describedby': 'lwa-desc' });
    var close = el('button', { type: 'button', class: 'lwa__close', 'aria-label': 'Cerrar', html: '<span aria-hidden="true">×</span>' });
    var stepTag = el('p', { class: 'lwa__step', 'aria-live': 'polite' });
    var title = el('h2', { class: 'lwa__title', id: 'lwa-title' });
    var desc = el('p', { class: 'lwa__desc', id: 'lwa-desc' });
    var body = el('div', { class: 'lwa__body' });
    var skip = el('button', { type: 'button', class: 'lwa__skip', text: 'Prefiero ir directo a WhatsApp →' });
    dlg.appendChild(el('div', { class: 'lwa__panel' }, [close, stepTag, title, desc, body, skip]));

    function setHeader(step, t, d) {
      state.step = step;
      stepTag.textContent = step === 1 ? 'Paso 1 de 2' : step === 2 ? 'Paso 2 de 2 · ' + state.interes.corto : '';
      title.textContent = t;
      desc.textContent = d;
      body.innerHTML = '';
    }

    function step1() {
      setHeader(1, '¿Cómo podemos ayudarte?', 'Elige lo que más se acerque y te atendemos por WhatsApp.');
      skip.hidden = false;
      var list = el('div', { class: 'lwa__options', role: 'list' });
      INTERESES.forEach(function (it) {
        var b = el('button', { type: 'button', class: 'lwa__option', role: 'listitem', 'data-interes': it.id, text: it.label });
        b.addEventListener('click', function () { state.interes = it; step2(); });
        list.appendChild(b);
      });
      body.appendChild(list);
      var first = list.querySelector('button');
      if (first) first.focus();
    }

    function step2() {
      var it = state.interes;
      setHeader(2, 'Cuéntanos un poco más', 'Unos datos más y seguimos por WhatsApp. Puedes dejar en blanco lo que no sepas.');
      track('lead_filter_step2', { interes: it.id });
      var form = el('form', { class: 'lwa__form', novalidate: '' });
      it.fields.forEach(function (f) {
        var id = 'lwa-' + f.name;
        if (f.select) {
          var sel = el('select', { id: id, name: f.name }, [el('option', { value: '', text: 'Elige un estado' })]);
          f.select.forEach(function (o) { sel.appendChild(el('option', { value: o[0], text: o[1] })); });
          form.appendChild(el('div', { class: 'lwa__field' }, [el('label', { for: id, text: f.label }), sel]));
        } else if (f.text) {
          var ta = el('textarea', { id: id, name: f.name, maxlength: String(f.text), rows: '3', placeholder: 'Máximo ' + f.text + ' caracteres' });
          form.appendChild(el('div', { class: 'lwa__field' }, [el('label', { for: id, text: f.label }), ta]));
        } else {
          var fs = el('fieldset', { class: 'lwa__group' }, [el('legend', { text: f.label })]);
          var chips = el('div', { class: 'lwa__chips' });
          f.options.forEach(function (o, i) {
            var rid = id + '-' + i;
            chips.appendChild(el('span', { class: 'lwa__chip' }, [
              el('input', { type: 'radio', id: rid, name: f.name, value: o[0] }),
              el('label', { for: rid, text: o[1] })
            ]));
          });
          fs.appendChild(chips);
          form.appendChild(fs);
        }
      });
      // Honeypot: invisible para personas; n8n descarta el envío si trae valor.
      form.appendChild(el('div', { class: 'lwa__hp', 'aria-hidden': 'true' }, [
        el('label', { for: 'lwa-web', text: 'No llenar' }), el('input', { id: 'lwa-web', name: 'web', tabindex: '-1', autocomplete: 'off' })]));
      var nav = el('div', { class: 'lwa__actions' }, [
        el('button', { type: 'button', class: 'lwa__back', text: '← Volver' }),
        el('button', { type: 'submit', class: 'lwa__go', html: 'Continuar en WhatsApp <span aria-hidden="true">→</span>' })
      ]);
      form.appendChild(nav);
      var legal = el('p', { class: 'lwa__legal' });
      legal.innerHTML = 'Al continuar aceptas el <a href="' + PRIVACY + '" target="_blank" rel="noopener">aviso de privacidad</a>. Usamos tus respuestas solo para atenderte.';
      form.appendChild(legal);
      nav.firstChild.addEventListener('click', step1);
      form.addEventListener('submit', function (ev) { ev.preventDefault(); submit(form); });
      body.appendChild(form);
      var first = form.querySelector('input:not([name=web]), select, textarea');
      if (first) first.focus();
    }

    function submit(form) {
      var it = state.interes, d = new FormData(form), codes = [], words = [];
      it.fields.forEach(function (f) {
        var v = (d.get(f.name) || '').toString().trim();
        if (!v) return;
        if (f.text) {
          v = v.replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').slice(0, f.text);
          codes.push(v); words.push('«' + v + '»');
          return;
        }
        var list = f.select || f.options, label = v;
        for (var i = 0; i < list.length; i++) if (list[i][0] === v) label = list[i][1];
        codes.push(v);
        words.push((f.prefix || '') + label + (f.suffix || ''));
      });
      var text = 'Hola, me interesa: ' + it.label + (words.length ? ' (' + words.join(', ') + ')' : '') + '. Ref ' + state.ref;
      send(payload({ interes: it.id, detalle: codes.join(' | '), omitido: 'false', web: d.get('web') || '' }));
      track('generate_lead', { interes: it.id });
      finish(text, it.id);
    }

    function goDirect() {
      var text = pageMessage() + ' Ref ' + state.ref;
      send(payload({ interes: state.interes ? state.interes.id : '', detalle: '', omitido: 'true', web: '' }));
      track('lead_filter_skip', { interes: state.interes ? state.interes.id : '' });
      finish(text, state.interes ? state.interes.id : '');
    }

    function payload(extra) {
      var p = {
        ref: state.ref, sitio: SITE, version: VERSION, pagina: location.pathname.slice(0, 200),
        utm_source: origen.utm_source, utm_medium: origen.utm_medium, utm_campaign: origen.utm_campaign, referrer: origen.referrer,
        dispositivo: device(), ga_client_id: gaClientId(), t: String(Date.now() - state.openedAt)
      };
      for (var k in extra) p[k] = extra[k];
      return p;
    }

    function finish(text, interes) {
      var url = openWhatsApp(text);
      track('whatsapp_open', { interes: interes });
      setHeader(3, 'Te esperamos en WhatsApp', 'Abrimos el chat con tu mensaje listo. Envíalo tal cual para que te ubiquemos con la referencia ' + state.ref + '.');
      skip.hidden = true;
      var again = el('a', { class: 'lwa__go', href: url, target: '_blank', rel: 'noopener', html: 'Abrir WhatsApp otra vez <span aria-hidden="true">→</span>' });
      body.appendChild(el('div', { class: 'lwa__actions' }, [again]));
      again.focus();
      state.ref = newRef(); // la siguiente consulta lleva otra referencia
      state.interes = null;
    }

    function open(preset) {
      track('whatsapp_click', {});
      state.openedAt = Date.now();
      state.interes = null;
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
      document.documentElement.classList.add('lwa-open');
      var it = preset && INTERESES.filter(function (x) { return x.id === preset; })[0];
      track('lead_filter_view', {});
      if (it) { state.interes = it; step2(); } else step1();
    }
    function shut() {
      if (typeof dlg.close === 'function' && dlg.open) dlg.close(); else dlg.removeAttribute('open');
    }

    fab.addEventListener('click', function () { open(); });
    close.addEventListener('click', shut);
    skip.addEventListener('click', goDirect);
    dlg.addEventListener('close', function () { document.documentElement.classList.remove('lwa-open'); fab.focus(); });
    dlg.addEventListener('click', function (ev) { if (ev.target === dlg) shut(); }); // clic fuera del panel
    dlg.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && typeof dlg.showModal !== 'function') shut();
      if (ev.key === 'Tab' && typeof dlg.showModal !== 'function') { // trampa de foco sin <dialog> nativo
        var f = dlg.querySelectorAll('button:not([hidden]), a[href], input:not([tabindex="-1"]), select, textarea');
        if (!f.length) return;
        var a = f[0], z = f[f.length - 1];
        if (ev.shiftKey && document.activeElement === a) { z.focus(); ev.preventDefault(); }
        else if (!ev.shiftKey && document.activeElement === z) { a.focus(); ev.preventDefault(); }
      }
    });

    // Enlaces del sitio hacia WhatsApp: <a href="https://wa.me/…" data-wa-open data-wa-interes="empresa">
    document.addEventListener('click', function (ev) {
      var a = ev.target.closest && ev.target.closest('[data-wa-open]');
      if (!a) return;
      ev.preventDefault();
      open(a.getAttribute('data-wa-interes'));
    });

    document.body.appendChild(fab);
    document.body.appendChild(dlg);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
