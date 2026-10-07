# limonada.com.mx

Limonada: uniformes ejecutivos y empresariales para dama y caballero, desde 1997. Catálogo por colecciones, telas y
colores, lista de cotización para empresas, red de distribuidores, guía de tallas y garantía.

**Variante C** de `../ARQUITECTURA-WEB-ETAPAS.md`: React + Tailwind por CDN, sin build, con datos simulados en
`public/db/` y una sola capa de datos (`db` en `js/catalogo.jsx`). Elegida porque el negocio vende **por cotización**:
la lista de cotización de hoy es el carrito de mañana (Etapa 2: cuentas de empresa, pedidos y anticipos).

**Estado: 1.0.0 · Etapa 1.** Prendas, precios orientativos, tablas de tallas, distribuidores y textos legales son de ejemplo.
Revisar todos los `[marcadores]` y `[verificar]` con el cliente antes de publicar.

## Probar en local

```
py -m http.server 8126        # desde esta carpeta → http://localhost:8126
```

## Identidad

| Token | Color | Uso |
|---|---|---|
| `white` | `#ffffff` | fondo, tarjetas |
| `navy` | `#14213d` | texto, botones, secciones oscuras con raya diplomática (`.pinstripe`) |
| `lemon-400` | `#f4d35e` | acento: subrayado `.mark`, botón de cotización, contador |
| `cream` | `#faf7ee` | secciones suaves, fondo de prendas |
| `navy-400/500` | `#5d6880` / `#4a5875` | texto secundario |

Tipografías: **DM Serif Display** (títulos) · **DM Sans** (texto). Tokens en `js/tailwind.config.js` y `:root` de `css/site.css`.
Componentes: `.btn-navy / .btn-lemon / .btn-line`, `.field`, `.kicker`, `.mark`, `.pinstripe`, `.reveal`.

## Estructura de carpetas

```
limonada.com.mx/
├── CNAME · .nojekyll · .gitignore · .env.example
├── README.md                     este archivo
├── index.html                    inicio: héroe, diferenciadores, líneas, favoritas, proceso, sectores, distribuidores
├── 404.html                      página no encontrada + redirecciones (MOVED) desde el sitio anterior
│
├── css/site.css                  UNA hoja de estilos
├── js/
│   ├── tailwind.config.js        paleta y tipografías
│   ├── layout.jsx                TODAS las páginas: BRAND, NAV_LINKS, cabecera, pie, lista de cotización (quote),
│   │                             botón de WhatsApp, cookies, PageHero, SectionTitle, renderPage()
│   └── catalogo.jsx              capa de datos `db`, useCatalog, Garment (prenda SVG por color), Swatch,
│                                 GarmentCard, GarmentPage, QUOTE_ENDPOINT
│
├── public/db/                    BASE DE DATOS SIMULADA — ver public/db/README.md
│   ├── colecciones.json          líneas (dama, caballero) y tipos de prenda
│   ├── prendas.json              prendas: telas, colores, tallas, pedido mínimo, precio desde, entrega
│   ├── telas.json                telas con composición, cuidados, lavadas y colores
│   └── distribuidores.json       un distribuidor por estado
├── img/favicon.svg
├── tools/generar-paginas-prenda.py   crea pages/colecciones/<slug>/ desde prendas.json
│
├── pages/
│   ├── colecciones/              /pages/colecciones/  filtros ?linea=dama|caballero, ?tipo=, tela
│   ├── colecciones/<slug>/       ficha de prenda (generada), color en ?color=
│   ├── cotizacion/               lista de cotización + datos de la empresa → WhatsApp
│   ├── distribuidores/           7 estados + «quiero ser distribuidor»
│   ├── empresa/                  historia, #telas, #garantia, #tallas (guía de medición)
│   ├── contacto/                 formulario → WhatsApp o email; ?asunto=cotizacion|diseno|distribuidor|garantia
│   ├── terminos/                 cotizaciones, pedidos, entregas, #garantia
│   └── privacidad/               aviso de privacidad (LFPDPPP)
│
├── _docs/src/v1.0.0.html         PÚBLICO: documento de versión
└── _interno/                     LOCAL, NO SE PUBLICA (.gitignore)
```

## Qué carga cada página

| Página | layout.jsx | catalogo.jsx |
|---|:-:|:-:|
| `index.html`, `colecciones/`, `colecciones/<slug>/`, `cotizacion/`, `distribuidores/`, `empresa/` | ✓ | ✓ |
| `contacto/`, `terminos/`, `privacidad/`, `404.html` | ✓ | |

Orden: `tailwind.config.js` (en el `<head>`) → `layout.jsx` → `catalogo.jsx` → script de la página (`renderPage(...)`).

## Cambios habituales

- **Teléfono, WhatsApp, email, dirección, horario**: `BRAND` en `js/layout.jsx` (todos `[verificar]`).
- **Menú / pie**: `NAV_LINKS` y `FOOTER_COLUMNS` en `js/layout.jsx`.
- **Prendas, telas, colores, distribuidores**: `public/db/*.json`. Tras añadir una prenda: `python tools/generar-paginas-prenda.py`.
- **Recibir cotizaciones también en una hoja o base de datos**: `QUOTE_ENDPOINT` en `js/catalogo.jsx`.
- **Historia, tabla de tallas**: `MILESTONES` y `SIZE_TABLE` en `pages/empresa/index.html`.
- **Redirecciones desde el sitio anterior**: `MOVED` en `404.html` (p. ej. `'/productos-dama': '/pages/colecciones/?linea=dama'`).

## Claves de almacenamiento local

`li-cotizacion` (lista) · `li-solicitudes` (solicitudes enviadas desde este navegador) · `li-cookies`.

## Hoja de ruta (ver `../ARQUITECTURA-WEB-ETAPAS.md`)

| Etapa | Limonada |
|---|---|
| 1 | Este sitio. Pendiente del cliente: fotos reales por prenda y color, catálogo completo, distribuidores, tabla oficial de tallas, blog (sección «Empresa» del sitio actual) |
| 2 | Portal de empresas en Supabase: cuentas por empresa, colaboradores con medidas (datos personales: RLS y consentimiento), cotizaciones guardadas, pedido con anticipo (Stripe / Mercado Pago) |
| 3 | Odoo: órdenes de producción, inventario de telas, CFDI 4.0 |
| 5 | Distribuidores con acceso propio, n8n para avisos de pedido, WhatsApp Business API |

## Versiones

### 1.0.0 — 2026-10-07 · Primera versión (Etapa 1, Variante C)
- 9 prendas en 2 líneas y 7 tipos, 4 telas con 13 colores; prendas ilustradas en SVG en el color elegido.
- Lista de cotización sincronizada entre pestañas, solicitud con datos de la empresa → WhatsApp.
- Distribuidores en los 7 estados del sitio actual (datos de contacto pendientes), guía de tallas y medición, garantía.
- Fichas generadas con schema.org `Product` / `AggregateOffer`.
