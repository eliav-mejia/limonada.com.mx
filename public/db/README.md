# public/db — base de datos simulada (Etapa 1)

JSON editados a mano que sustituyen a la base de datos hasta la Etapa 2. **Son públicos**: nunca pongas aquí costos,
márgenes ni datos de clientes (medidas, teléfonos).

| Archivo | «Tabla» | Lo usa |
|---|---|---|
| `trajes.json` | `styles`, `occasions`, `suits` | inicio, tienda, ficha/configurador, carrito |
| `telas.json` | `fabrics` (+ `colors`) | configurador, sala de telas (`/pages/trajes/#telas`), ilustración |
| `opciones.json` | `groups`, `linings`, `monogram`, `delivery` | configurador y precio |

## Precio
`base_price_mxn` es el precio del traje **en su configuración `defaults`**, IVA incluido. Cada elección suma
(su `price_delta_mxn` − el del default). Así el precio base nunca cambia al reordenar opciones.

## suits
| Campo | Notas |
|---|---|
| `id` | permanente (`lt-001`…); el carrito lo guarda |
| `slug` | URL `/pages/trajes/<slug>/`; tras añadir uno: `python3 tools/generar-paginas-traje.py` |
| `defaults` | una elección por grupo de `opciones.json` + `fabric`, `color`, `lining`; el color debe existir en esa tela |
| `occasions` / `style_id` | filtros de la tienda |
| `monogram_included` | el monograma no se cobra |
| `badge` | sticker de la tarjeta («Nuevo» sale en color arcilla) |

## fabrics
`pattern` decide el dibujo en la ilustración: `liso`, `raya`, `cuadro`, `espiga`, `pana`, `lino` (este último pone bolsas de parche).
