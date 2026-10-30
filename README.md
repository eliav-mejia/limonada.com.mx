# limonada.com.mx

Limonada: sastrería ejecutiva en la Ciudad de México desde 1997. **Trajes a la medida para caballero y dama** y
uniformes ejecutivos para empresas y organizaciones.

**Variante B** de `../ARQUITECTURA-WEB-ETAPAS.md`: **portafolio editorial estático** (HTML + CSS + JS vanilla, sin build),
con reglas de servidor en `_headers` y señales de derechos (`robots.txt`, `.well-known/tdmrep.json`).

Estilo: gaceta de sastrería retro. Fondos solo crema `#ede2cd` (acentos amarillo `#f3c12c` y verde `#7a7229`) o blanco (acentos azul `#133951` y `#6a95b1`), alternados por sección con `.scheme-warm` / `.scheme-blue`; DM Serif Display + DM Sans +
DM Mono. Las láminas I–VIII usan fotografías del catálogo de limonada.com.mx (caballeros y colecciones dama). Logotipo: solo tipografía «limonada.com.mx».

**Estado: 3.0.0 · Etapa 1.** Publicado en <https://eliav-mejia.github.io/limonada.com.mx/> (GitHub Pages, rama `main`, raíz).

## Probar en local

```
python3 -m http.server 8126   # desde esta carpeta → http://localhost:8126   (Windows: py -m http.server 8126)
```

Todas las rutas son relativas: funciona en la raíz del dominio y en la subcarpeta de github.io. Excepción: `404.html`
calcula su `<base>` con un script porque GitHub Pages lo sirve en cualquier URL.

## Estructura

```
index.html                  inicio: héroe + lámina I, cinta, adelanto del portafolio, manifiesto, garantías, tecnología (video),
                            oficio, servicios (etiqueta personalizada), contacto (formulario → correo a ventas@)
portafolio/index.html       índice sin scroll: dos columnas animadas que llevan a caballero/ y dama/
portafolio/caballero/       láminas I–IV con ficha (piezas, tela, corte, ocasión)
portafolio/dama/            láminas V–VIII con ficha
privacidad/index.html       aviso de privacidad (texto base: revisar con asesoría legal)
404.html                    no encontrada
css/site.css                capa 1: tokens y base
css/layout.css              capa 2: estructura (contenedor, cabecera, rejillas, pie)
css/brand.css               capa 3: componentes de marca (láminas, sello, cinta, garantías, etiqueta…)
js/main.js                  menú, aparición al desplazar, filtro del portafolio, formulario por mailto
img/fotos/*.jpg             fotografías de las láminas (de limonada.com.mx/caballeros y /colecciones-dama)
tools/laminas.py            generaba los figurines SVG anteriores (ya no se usan)
tools/paginas.py            genera portafolio/, privacidad/ y 404.html con la cabecera y el pie de index.html
_headers                    cabeceras y CSP (Cloudflare Pages / Netlify; GitHub Pages lo ignora)
robots.txt · sitemap.xml · .well-known/tdmrep.json
```

**Flujo de edición:** cabecera, pie o `<head>` se cambian en `index.html` y luego `python3 tools/paginas.py`. Los textos
del portafolio viven en `LOOKS` dentro de `tools/paginas.py`.

## Pendiente con el cliente
- Fotografías propias en alta resolución (las de caballero del catálogo son 400×500 con marca de agua).
- Teléfono: se publica como `+55 9012 7903` (enlace `tel:+525590127903`); confirmar si es WhatsApp.
- Nombres y fichas de las láminas son propuesta editorial: validar telas reales.
- Formulario: hoy abre el correo del visitante. Etapa 2: endpoint (Worker o Apps Script) que reciba la solicitud.

## Versiones

### 3.0.0 — 2026-10-22 · Variante B, portafolio editorial
- Marca retro y corporativa (gaceta de sastrería); portafolio de 8 láminas caballero y dama; garantías, oficio y servicios.
- La tienda con configurador 2.0.0 (Variante C) se conserva en la rama `variante-c-tienda`.

### 2.0.0 — 2026-10-11 · Tienda de trajes a la medida (Variante C) — rama `variante-c-tienda`
### 1.0.0 — 2026-10-07 · Uniformes ejecutivos, cotización por WhatsApp
