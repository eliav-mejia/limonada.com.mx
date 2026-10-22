/* Limonada · menú, aparición al desplazar, filtro del portafolio y formulario por correo. Sin dependencias. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');

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

    // Filtro del portafolio (?linea=caballero|dama)
    var chips = document.querySelectorAll('[data-filter]');
    if (chips.length) {
      var looks = document.querySelectorAll('[data-linea]');
      var apply = function (val) {
        chips.forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.filter === val ? 'true' : 'false'); });
        looks.forEach(function (l) {
          l.hidden = val !== 'todos' && l.dataset.linea !== val;
          if (!l.hidden) l.classList.add('is-in');
        });
      };
      chips.forEach(function (c) {
        c.addEventListener('click', function () {
          apply(c.dataset.filter);
          var url = new URL(location.href);
          if (c.dataset.filter === 'todos') url.searchParams.delete('linea'); else url.searchParams.set('linea', c.dataset.filter);
          history.replaceState(null, '', url);
        });
      });
      var initial = new URLSearchParams(location.search).get('linea');
      if (initial === 'caballero' || initial === 'dama') apply(initial);
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
