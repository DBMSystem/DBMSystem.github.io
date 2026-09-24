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

## Arte de clientes (asignación provisional)

Retratos de `assets/ref/customers_ref.jpg` asignados a los tipos de la sección 3.3. `draft`: Daniel lo confirma o lo cambia (basta con editar `CUSTOMER_CELLS` en `scripts/extract_sprites.py`).

| Tipo | Retrato | Por qué |
|---|---|---|
| Cliente tranquilo | Abuela con cesta | Sonriente, sin prisa |
| Estudiante | Chaval con cascos y gorra | Joven |
| Oficinista (paciencia ×0,8) | Chica enfadada de brazos cruzados | Impaciente |
| Turista | Alien brócoli | Viene de muy lejos |
| Crítico gastronómico | Señor con chistera, monóculo y libreta | Apunta todo |
| Chef rival | Cocinero de sushi | Otro chef |
| Cliente misterioso | Guindilla demoníaca | Sorpresa |
| Maestro antiguo | Gallo rey con capa | Legendario |
| Coleccionista, Crítico legendario, Visitante de la Cocina Nocturna | Sin retrato (placeholder) | Falta arte |

## Historia, tutorial y frases (draft)

Todos en `src/data/i18n/es.js`; marcados `draft: true` en `src/data/dialogues.js` y `src/data/tutorial.js`.

**Escena "intro"** (antes del nombre): `story.intro.1–3`
> ¡Ah! ¡Alguien ha entrado en mi cocina! · Soy Chef Pip. El mejor chef de este barrio… de esta calle… bueno, de esta cocina. · Espera, ¿esa hoja que traes es una receta? Qué vieja… ¿Cómo te llamas?

**Escena "premise"** (después del nombre): `story.premise.1–3`
> ¡Encantado, {nombre}! Esa receta está rota, pero huele a algo importante. · Te cuento un secreto: esta cocina recuerda cada plato que se cocina en ella. Algún día verás por qué. · Yo te enseño a cocinar y tú intentas no quemar nada. ¡Trato hecho!

**Tutorial**: `tutorial.*`
> Arrastra el huevo a la encimera, a la casilla que brilla. · Ahora el bacon, justo al lado del huevo. · ¡Brillan! Eso es una receta. Tócala para cocinarla. · ¡Un cliente! Quiere Tostada con Tomate: pan y tomate juntos. · ¡Ahora sin ayuda! Tienes 30 segundos. Cocina seguido para hacer combo.

**Frases nuevas de Pip** (las de la tabla 3.6 no se listan):
- Inicio: ¡Abrimos la cocina! Que pase el primero.
- Receta: ¡Ni yo lo habría hecho mejor! Bueno… · ¡Otro plato que la cocina no olvidará!
- Combo: ¡Más rápido que mi sartén favorita!
- Por los pelos: ¡Por los pelos del bigote que no tengo!
- Fiebre: ¡Fiebre en la cocina! ¡Todo vale el doble de rico!
- Cliente se va: Se ha ido con hambre. Qué drama.
- Toque sin receta: Eso aún no es una receta. ¡Sigue juntando! · Solo se cocina lo que brilla.
- Consejo (una vez): Sin pedido se vende en el mostrador: ¡también suma combo!

**Acertijos de recetas secretas** (el de Corona de Bacon es de la especificación):
- Tortilla Imposible: Cuatro iguales, bien juntitos, hacen algo imposible.
- Revuelto Místico: Tres sombreros y un sol.
- Sopa del Maestro: Lo que el maestro sacaba del mar, del huerto y de la tierra.
- Tomate Explosivo: Rojo, fundido y con chispa.
- La Receta Perdida: Cuatro esquinas: una joya negra y el desayuno de siempre.

**Textos de interfaz nuevos**: recetario (`book.*`), nombre (`name.*`), menú (`menu.recipes`, `menu.story`, `menu.tutorial`, `menu.greeting`), `story.skip`, `story.next`.
