# Contenido para revisar

Contenido creado por Claude Code que no estaba literalmente en la especificación. Daniel lo aprueba o lo cambia.

## Fase 1

No se ha inventado contenido narrativo (ni frases de Pip, ni cartas, ni clientes, ni decoración). Solo textos de interfaz nuevos en `src/data/i18n/es.js`:

| Clave | Texto |
|---|---|
| `menu.howTo` | Arrastra ingredientes a la encimera. Cuando brillen, tócalos para cocinar. |
| `menu.testLevel` / `menu.testLevelHint` | Nivel de prueba · Solo en la Fase 1: elige qué recetas e ingredientes entran. |
| `pattern.group` / `line` / `square` | juntos · en línea · en cuadrado (debajo del pedido) |
| `fx.served` / `fx.counterSale` / `fx.customerLeft` | ¡Servido! · Venta de mostrador · Se ha ido… |
| `fx.secret` | ¡Receta secreta! |
| `hud.next` | Siguiente |
| `pause.quitHint` | Si sales, este loop no cuenta. |
| `overflow.secondChanceReward` | Vacía {cells} casillas y suma {s} s. |
| `results.*` | ¡Loop terminado! · La cocina se ha desbordado · Puntuación · Mejor combo · Pedidos servidos · Recetas cocinadas · Recetas secretas descubiertas |
| `mock.*` | Textos del anuncio simulado (solo desarrollo) |

Colores y formas de los placeholders de ingredientes y clientes: `src/data/ingredients.js` y `src/data/customers.js`.
