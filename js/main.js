/* Limonada · estilo (editorial / moderno / premium), menú, aparición al desplazar y formulario por correo. Sin dependencias. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');

  // Estilo guardado: se aplica antes de pintar para evitar el parpadeo
  var STYLE_KEY = 'limonada-estilo';
  var STYLES = ['editorial', 'moderno', 'premium'];   // editorial = sin data-style
  var NAMES = { editorial: 'Editorial', moderno: 'Moderno', premium: 'Premium' };
  var setStyle = function (s) { if (s === 'editorial' || STYLES.indexOf(s) < 0) delete root.dataset.style; else root.dataset.style = s; };
  try { setStyle(localStorage.getItem(STYLE_KEY)); } catch (e) {}
  // ?estilo=premium (o moderno / editorial) abre el sitio en ese estilo y lo recuerda: útil para enviar a la clienta
  var pedido = (location.search.match(/[?&]estilo=(editorial|moderno|premium)\b/) || [])[1];
  if (pedido) { setStyle(pedido); try { localStorage.setItem(STYLE_KEY, pedido); } catch (e) {} }

  document.addEventListener('DOMContentLoaded', function () {
    // Menú móvil
    var toggle = document.querySelector('.nav-toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var open = document.body.classList.toggle('nav-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      });
      document.querySelectorAll('.nav-links a').forEach(function (a) {
        a.addEventListener('click', function () {
          document.body.classList.remove('nav-open');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
    }

    // Selector de estilo: Editorial → Moderno → Premium (misma estructura y contenido, otra hoja de estilos).
    // Clic en una opción la elige; clic en el botón fuera de las opciones pasa a la siguiente.
    var styleToggles = document.querySelectorAll('[data-style-toggle]');
    var current = function () { return root.dataset.style || 'editorial'; };
    var syncStyle = function () {
      var s = current(), next = STYLES[(STYLES.indexOf(s) + 1) % STYLES.length];
      styleToggles.forEach(function (b) {
        b.querySelectorAll('[data-style-name]').forEach(function (sp) { sp.classList.toggle('is-on', sp.dataset.styleName === s); });
        b.setAttribute('aria-label', 'Estilo del sitio: ' + NAMES[s] + '. Cambiar a ' + NAMES[next]);
      });
    };
    styleToggles.forEach(function (b) {
      b.addEventListener('click', function (ev) {
        var picked = ev.target.closest && ev.target.closest('[data-style-name]');
        var s = picked ? picked.dataset.styleName : STYLES[(STYLES.indexOf(current()) + 1) % STYLES.length];
        setStyle(s);
        try { localStorage.setItem(STYLE_KEY, s); } catch (e) {}
        syncStyle();
      });
    });
    syncStyle();

    // Año del pie
    document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

    // Aparición al desplazar
    var items = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px' });
      items.forEach(function (el) { io.observe(el); });
    } else {
      items.forEach(function (el) { el.classList.add('is-in'); });
    }

    // Formulario: arma un correo a ventas@ (sitio estático, sin servidor)
    var form = document.querySelector('[data-mailto]');
    if (form) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        if (!form.reportValidity()) return;
        var d = new FormData(form);
        var subject = 'Solicitud de cita · ' + (d.get('servicio') || 'Limonada');
        var body = [
          'Nombre: ' + d.get('nombre'),
          'Empresa: ' + (d.get('empresa') || '—'),
          'Teléfono: ' + (d.get('telefono') || '—'),
          'Servicio: ' + d.get('servicio'),
          'Prendas aproximadas: ' + (d.get('cantidad') || '—'),
          '',
          d.get('mensaje') || ''
        ].join('\n');
        location.href = 'mailto:' + form.dataset.mailto + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
        var note = form.querySelector('[data-note]');
        if (note) note.textContent = 'Abrimos tu programa de correo con el mensaje listo. Si no se abre, escríbenos a ' + form.dataset.mailto + '.';
      });
    }
  });
})();
