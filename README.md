# limonada.com.mx

Limonada: sastrería de **trajes a la medida** en la Ciudad de México, desde 1997. Tienda en línea con configurador
(tela, color, corte, solapa, botones, aberturas, pantalón, chaleco, pañuelo, forro, monograma, entrega), precio en vivo,
carrito y pedido con anticipo por WhatsApp. Estilo: papel crudo, tinta, limón; Fraunces + Space Grotesk + JetBrains Mono.

**Variante C** de `../ARQUITECTURA-WEB-ETAPAS.md`: React + Tailwind por CDN, sin build, datos simulados en `public/db/`
y una sola capa de datos (`db` en `js/tienda.jsx`).

**Estado: 2.0.0 · Etapa 1.** Modelos, telas, precios, historia y textos legales son de ejemplo: revisar todos los
`[verificar]` y `[corchetes]` con el cliente antes de publicar.

## Probar en local

```
python3 -m http.server 8126   # desde esta carpeta → http://localhost:8126  (Windows: py -m http.server 8126)
```

También funciona servido desde una carpeta superior (p. ej. `http://localhost:8000/limonada.com.mx/`): todas las rutas
son relativas y `js/arranque.js` calcula la raíz. Abrir el archivo con doble clic (`file://`) **no** funciona —el navegador
bloquea los scripts— y la página lo explica en vez de quedarse en blanco.

## Pantallas en blanco (corregido en 2.0.0)
- Causa: rutas absolutas (`/js/layout.jsx`, `/public/db/…`) que daban 404 si el sitio no estaba en la raíz del dominio.
- Ahora: rutas relativas en el HTML y `url('/ruta/')` en el JSX (prefija `LI_ROOT`).
- `js/arranque.js` (primer script) muestra un mensaje con la causa si `#root` sigue vacío (CDN bloqueado, error de JSX, `file://`).
- `ErrorBoundary` en `renderPage()`: un error al pintar muestra una tarjeta con «Recargar» en vez de desmontar todo.
- Excepción: `404.html` usa rutas absolutas, porque el hosting lo sirve en cualquier URL.

## Estructura

```
index.html                     inicio: héroe con looks, cinta de telas, «juega con la solapa», favoritos, ocasiones
404.html                       no encontrada + MOVED (redirige las URLs de la 1.0.0: colecciones, cotización, empresa…)
css/site.css · js/tailwind.config.js   tokens (paper, ink, lemon, olive, clay), .btn, .chip, .sticker, .tape, .hl, grano
js/arranque.js                 LI_ROOT + aviso si la página no carga
js/layout.jsx                  BRAND, url(), carrito (li-carrito), cabecera, pie, WhatsApp, cookies, ErrorBoundary, renderPage()
js/tienda.jsx                  db, useCatalog, precio, <Traje> (ilustración SVG por configuración), SuitCard, configurador,
                               HowItWorks, mensaje del pedido, MEASURES / MEASURE_METHODS, ORDER_ENDPOINT
public/db/                     trajes.json · telas.json · opciones.json (ver su README)
tools/generar-paginas-traje.py crea pages/trajes/<slug>/ desde trajes.json
pages/trajes/                  tienda (?estilo= ?ocasion= ?orden=) + #telas
pages/trajes/<slug>/           configurador (?tela= ?color=, ?editar=<clave del carrito>)
pages/carrito/                 carrito + checkout (medición, datos, anticipo) → WhatsApp
pages/medidas/                 guía de 9 medidas + #cita
pages/estudio/                 historia, detalles, #garantia, #empresas
pages/contacto/ · terminos/ · privacidad/
```

## Claves de almacenamiento local
`li-carrito` · `li-cliente` (nombre, email, teléfono, ciudad para rellenar) · `li-pedidos` (resumen, **sin medidas**) · `li-cookies`.

## Etapa 2
`ORDER_ENDPOINT` en `js/tienda.jsx`: Edge Function que relee precios desde la base de datos, crea el pedido y devuelve
`checkout_url` de Stripe para el anticipo; el carrito ya redirige si la recibe. Las medidas corporales son datos personales:
RLS y borrado a petición.

## Versiones

### 2.0.0 — 2026-10-11 · Trajes a la medida
- Giro de uniformes empresariales a tienda de trajes a la medida con configurador, carrito y checkout.
- Arreglo de pantallas en blanco (ver arriba). Rediseño completo.

### 1.0.0 — 2026-10-07 · Primera versión (uniformes ejecutivos, cotización por WhatsApp)
