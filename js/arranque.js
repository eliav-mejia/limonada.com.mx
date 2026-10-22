// First script on every page (plain JS, loaded before the CDNs). Two jobs:
//   1. LI_ROOT: absolute URL of the site folder, taken from this script's own address. Every link, asset and JSON
//      fetch is built from it (url('/pages/trajes/') in layout.jsx), so the site works at the domain root, in a
//      subfolder (http://localhost:8000/limonada.com.mx/) or on a preview host — no more blank page from "/js/..." 404s.
//   2. Never a white screen: if #root is still empty a few seconds after load (a CDN blocked, a JSX error, the file
//      opened with file://), show a plain message with the cause instead of a blank page.
(function () {
    'use strict';
    var src = document.currentScript && document.currentScript.src;
    window.LI_ROOT = src ? src.slice(0, src.lastIndexOf('/js/') + 1) : location.origin + '/';

    var errors = [];
    window.LI_ERRORS = errors;
    addEventListener('error', function (e) {
        var t = e.target;
        if (t && t !== window && (t.src || t.href)) errors.push('No cargó: ' + (t.src || t.href));
        else if (e.message) errors.push(e.message);
    }, true);
    addEventListener('unhandledrejection', function (e) { errors.push(String((e.reason && e.reason.message) || e.reason)); });

    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    function fallback() {
        var root = document.getElementById('root');
        if (!root || root.childElementCount) return;
        var local = location.protocol === 'file:';
        root.innerHTML =
            '<div style="font-family:system-ui,sans-serif;max-width:40rem;margin:12vh auto;padding:0 1.25rem;color:#171614">' +
            '<p style="font:600 .75rem/1 monospace;letter-spacing:.2em;text-transform:uppercase;color:#55524b">Limonada · sastrería</p>' +
            '<h1 style="font:600 2.2rem/1.1 Georgia,serif;margin:.75rem 0 1rem">La página no terminó de cargar.</h1>' +
            (local
                ? '<p>Estás abriendo el archivo directamente (<code>file://</code>). El navegador bloquea así los scripts del sitio. ' +
                  'Sírvelo desde la carpeta del sitio con <code>python3 -m http.server 8126</code> y abre <code>http://localhost:8126</code>.</p>'
                : '<p>Revisa tu conexión y vuelve a intentarlo. Si sigue así, escríbenos y lo resolvemos.</p>') +
            (errors.length ? '<pre style="white-space:pre-wrap;font-size:.8rem;background:#ebe5d6;padding:1rem;border-radius:.75rem;margin-top:1.25rem">' +
                esc(errors.slice(0, 6).join('\n')) + '</pre>' : '') +
            '<p style="margin-top:1.5rem"><a href="" style="display:inline-block;background:#171614;color:#f4f0e6;padding:.8rem 1.4rem;border-radius:999px;text-decoration:none">Reintentar</a></p>' +
            '</div>';
    }

    addEventListener('load', function () { setTimeout(fallback, 3500); });
})();
