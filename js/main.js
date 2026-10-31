/* Limonada · estilo (editorial / moderno), menú, aparición al desplazar y formulario por correo. Sin dependencias. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');

  // Estilo guardado: se aplica antes de pintar para evitar el parpadeo
  var STYLE_KEY = 'limonada-estilo';
  try { if (localStorage.getItem(STYLE_KEY) === 'moderno') root.dataset.style = 'moderno'; } catch (e) {}

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

    // Selector de estilo (misma estructura y contenido, otra hoja de estilos)
    var styleToggles = document.querySelectorAll('[data-style-toggle]');
    var syncStyle = function () {
      var on = root.dataset.style === 'moderno';
      styleToggles.forEach(function (b) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    };
    styleToggles.forEach(function (b) {
      b.addEventListener('click', function () {
        if (root.dataset.style === 'moderno') delete root.dataset.style; else root.dataset.style = 'moderno';
        try { localStorage.setItem(STYLE_KEY, root.dataset.style || 'editorial'); } catch (e) {}
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
