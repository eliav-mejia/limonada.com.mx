/* Limonada · estilo (retro / moderno / premium) × color (limonada / terracota / blanco), menú, aparición al desplazar y
   formulario por correo. Sin dependencias. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');

  // Estilo (botones + tipografía) y color, cada uno con tres opciones: 9 combinaciones. Se aplican antes de pintar.
  // Retro y Limonada son la base (sin atributo). Se recuerdan en localStorage; ?estilo=…&color=… los fija desde un enlace.
  var EJES = {
    estilo: { attr: 'style', key: 'limonada-estilo', base: 'retro', valores: ['retro', 'moderno', 'premium'] },
    color:  { attr: 'color', key: 'limonada-color',  base: 'limonada', valores: ['limonada', 'terracota', 'blanco'] }
  };
  var poner = function (eje, v) {
    var e = EJES[eje];
    if (v === 'editorial') v = 'retro';   // nombre anterior del estilo Retro (v1.2.x)
    if (e.valores.indexOf(v) < 0 || v === e.base) delete root.dataset[e.attr]; else root.dataset[e.attr] = v;
  };
  var actual = function (eje) { return root.dataset[EJES[eje].attr] || EJES[eje].base; };
  Object.keys(EJES).forEach(function (eje) {
    try { poner(eje, localStorage.getItem(EJES[eje].key)); } catch (e) {}
    var pedido = (location.search.match(new RegExp('[?&]' + eje + '=([a-z]+)')) || [])[1];
    if (pedido) { poner(eje, pedido); try { localStorage.setItem(EJES[eje].key, actual(eje)); } catch (e) {} }
  });

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

    // Selectores de estilo y color (misma estructura y contenido; cambian las hojas que aplican)
    var sincronizar = function () {
      document.querySelectorAll('[data-set-style]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.setStyle === actual('estilo'))); });
      document.querySelectorAll('[data-set-color]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.setColor === actual('color'))); });
    };
    document.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('[data-set-style], [data-set-color]');
      if (!b) return;
      var eje = b.dataset.setStyle ? 'estilo' : 'color';
      poner(eje, b.dataset.setStyle || b.dataset.setColor);
      try { localStorage.setItem(EJES[eje].key, actual(eje)); } catch (e) {}
      sincronizar();
    });
    sincronizar();

    // Banner: sin movimiento si el sistema pide reducirlo (queda el cartel fijo)
    var banner = document.querySelector('.banner__video');
    if (banner && window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { banner.removeAttribute('autoplay'); banner.pause(); }

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
