# public/db — base de datos simulada (Etapa 1)

JSON editados a mano que sustituyen a la base de datos hasta la Etapa 2. **Son públicos**: nunca pongas aquí costos,
márgenes, precios de distribuidor ni datos de clientes o colaboradores.

| Archivo | «Tabla» | Lo usa |
|---|---|---|
| `colecciones.json` | `lines`, `types` | filtros, inicio, ruta de la ficha |
| `prendas.json` | `garments` | colecciones, fichas, cotización, inicio |
| `telas.json` | `fabrics` (+ `colors`) | colores de cada prenda, ficha, página Empresa |
| `distribuidores.json` | `distributors` | página Distribuidores |

## garments

| Campo | Notas |
|---|---|
| `id` | permanente (`li-001`…); la lista de cotización lo guarda |
| `slug` | URL `/pages/colecciones/<slug>/` |
| `line_id` / `type_id` | de `colecciones.json` |
| `fabric_ids` | telas en que se fabrica |
| `color_ids` | colores ofrecidos; cada id debe existir en alguna tela de `telas.json`. El primero es el de la tarjeta |
| `sizes` | lista de tallas en orden |
| `min_qty` | pedido mínimo por prenda (se avisa, no se bloquea) |
| `price_from_mxn` | precio orientativo por pieza antes de IVA; `null` = «Precio por cotización» |
| `lead_days` | días de entrega desde medidas + anticipo |
| `features` | lista de detalles |
| `active` / `featured` | ocultar / destacar en el inicio |

Los colores se comparten entre telas por `id` (p. ej. `marino`): si cambias su `hex`, cámbialo en todas las telas.
