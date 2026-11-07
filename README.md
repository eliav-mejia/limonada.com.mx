# limonada.com.mx

Limonada: sastrería ejecutiva en la Ciudad de México desde 1997. **Trajes a la medida para caballero y dama** y
uniformes ejecutivos para empresas y organizaciones.

**Variante B** de `../ARQUITECTURA-WEB-ETAPAS.md`: **portafolio editorial estático** (HTML + CSS + JS vanilla, sin build),
con reglas de servidor en `_headers` y señales de derechos (`robots.txt`, `.well-known/tdmrep.json`).

Estilo: gaceta de sastrería retro. Fondos solo crema `#ede2cd` (acentos amarillo `#f3c12c` y verde `#7a7229`) o blanco (acentos azul `#133951` y `#6a95b1`), alternados por sección con `.scheme-warm` / `.scheme-blue`; DM Serif Display + DM Sans +
DM Mono. Las láminas I–VIII usan fotografías del catálogo de limonada.com.mx (caballeros y colecciones dama). Logotipo: solo tipografía «limonada.com.mx».

**Estado: v1.2.2 · fase interna** (numeración en `_interno/README.md`; la base «3.0.0» equivale a v1.0.0). Publicado en <https://eliav-mejia.github.io/limonada.com.mx/> (GitHub Pages, rama `main`, raíz).

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
css/moderno.css             estilo alterno «Moderno» (sans, esquinas redondeadas, sombras suaves) bajo [data-style="moderno"];
                            el botón Editorial/Moderno del menú lo activa y se guarda en localStorage (limonada-estilo)
css/colores.css             v1.2.2: las tres variantes de COLOR (Limonada · Terracota · Blanco) como tokens bajo [data-color];
                            fotos con mix-blend-multiply (el blanco toma el color de cada paleta); muestras del selector
css/premium.css             estilo «Premium» (botones y tipografía de lujo) bajo [data-style="premium"], sin colores propios.
                            COMPILADO con Tailwind CSS v4 desde tools/estilo-premium/premium.src.css (no editar a mano);
                            muestra .solo-premium (lookbook «Dama Premium» con las cuatro láminas dama)
js/main.js                  menú, selectores Estilo (Retro / Moderno / Premium) × Color (Limonada / Terracota / Blanco) = 9
                            combinaciones (localStorage limonada-estilo y limonada-color; ?estilo=premium&color=blanco las fija),
                            aparición al desplazar, filtro del portafolio, formulario por mailto
js/whatsapp.js              v1.2.0: botón flotante + pop-up de dos pasos → n8n (opcional) → wa.me/5215614800424 con «Ref LIM-XXXX»;
                            eventos GA4 (whatsapp_click, lead_filter_view, lead_filter_step2, generate_lead, lead_filter_skip,
                            whatsapp_open) si hay gtag/dataLayer. Webhook: data-webhook en la etiqueta <script> (vacío = no envía)
tools/wpcode.py             empaqueta el mismo CSS + JS como fragmento de WPCode → tools/wordpress/whatsapp-wpcode.html
img/fotos/*.jpg             SOLO fotos de fondo blanco (v1.2.2): 02-consejo, 03-tres-piezas (caballero) y 05–08 (dama).
                            Retiradas: 01-ejecutivo (degradado lila), 04-gala (muro de piedra), 09-terraza y 10-rosa (exteriores)
tools/estilo-premium/       fuente Tailwind del estilo Premium: cd tools/estilo-premium && npm install && npm run build
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

### v1.2.2 — 2026-11-06 · 3 estilos × 3 colores = 9 combinaciones, solo fotos de fondo blanco
- Dos selectores en el menú de todas las páginas: **Estilo** (botones y tipografía: Retro · Moderno · Premium; «Editorial»
  pasa a llamarse Retro) y **Color** (Limonada · Terracota · Blanco). Se combinan libremente y se recuerdan por separado;
  `?estilo=…&color=…` abre una combinación concreta.
- `css/colores.css`: las paletas solo reasignan los tokens base (--cream, --white, --gold, --olive, --navy, --sky, --lujo);
  Premium se recompiló sin colores propios para combinar con las tres. Contraste AA revisado en las tres paletas.
- Solo fotos de fondo blanco: se retiran 01, 04, 09 y 10. El portafolio queda en seis láminas (Caballero I–II, Dama III–VI);
  héroe = Tres Piezas; adelanto del inicio = Consejo, Directora, Funda, Junta; lookbook Premium = cuatro láminas dama.

### v1.2.1 — 2026-11-06 · Tercer estilo «Premium» (lujo)
- Selector de estilo de tres opciones en todas las páginas: Editorial · Moderno · Premium. `?estilo=premium` abre el sitio en
  ese estilo (para enviar a la clienta).
- Premium: paleta y tipografía de Limonada Premium (crema, arena, terracota, taupe, lana + tinta; Cormorant Garamond y Plus
  Jakarta Sans), arcos en lugar de marcos con sombra desplazada, sin grano de papel, botones redondos, pie oscuro, WhatsApp
  con la misma paleta. CSS compilado con Tailwind CSS 4.3.3 solo con `@apply` (sin preflight): Editorial y Moderno no cambian.
- Solo en Premium: héroe de estilo de vida (09-terraza) y lookbook «Dama Premium» (10-rosa + láminas V–VIII) en el inicio.
- Pendiente: confirmar con la clienta el uso de 09 y 10 (parecen generadas con IA); `tools/paginas.py` sigue desfasado
  (no regenerar páginas con él: perdería el selector de tres opciones).

### v1.2.0 — 2026-11-02 · WhatsApp con filtro y reglas S1–S3
- Botón de WhatsApp propio (sin scripts externos) al +52 1 56 1480 0424, con pop-up de dos pasos: interés (empresa, caballero,
  dama, arreglos, distribuidor, otro) y calificación (personas, ocasión, lugar, plazo, estado). «Prefiero ir directo a WhatsApp»
  siempre visible; el mensaje prellenado lleva la referencia `LIM-XXXX`. Registro a n8n por `sendBeacon` (form-urlencoded, sin
  preflight) cuando se configure el webhook. Estilos en `css/brand.css` (bloque autocontenido) y `css/moderno.css`.
- Fragmento para WordPress con `python3 tools/wpcode.py <URL_WEBHOOK>`; instalar el mismo día que se retira GetButton.io.
- S1: `noindex, follow` en todas las páginas · S2: sin canónicas hacia limonada.com.mx · S3: `robots.txt` sin `Sitemap`.
- Aviso de privacidad: respuestas del filtro (12 meses) y medición.
- Pendiente: URL del webhook de n8n (y `connect-src` en `_headers`), ID de GA4 «desarrollo».

### 3.0.0 — 2026-10-22 · Variante B, portafolio editorial
- Marca retro y corporativa (gaceta de sastrería); portafolio de 8 láminas caballero y dama; garantías, oficio y servicios.
- La tienda con configurador 2.0.0 (Variante C) se conserva en la rama `variante-c-tienda`.

### 2.0.0 — 2026-10-11 · Tienda de trajes a la medida (Variante C) — rama `variante-c-tienda`
### 1.0.0 — 2026-10-07 · Uniformes ejecutivos, cotización por WhatsApp
