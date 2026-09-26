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

## Clientes comunes con poses (asignación provisional, segundo lote)

| Tipo | Personaje (mega pack) | Poses usadas |
|---|---|---|
| Cliente tranquilo | Abuela con rebeca lila | esperar · enfadada (con bastón) |
| Estudiante | Niño con sudadera azul y mochila | llegar: saludando · esperar: con piruleta · contento: brazos arriba · enfadado (capucha) |
| Oficinista | Chica de media melena castaña, camiseta verde con hoja | esperar · enfadada (brazos cruzados) |
| Turista | Chico con gorra, gafas de sol y camisa de notas | esperar: con vinilo · contento: brazos arriba · enfadado (con cascos) |

Los retratos grandes anteriores (abuela, chaval con cascos, chica enfadada, alien brócoli) se conservan para clientes especiales de la Fase 4.

## Cartas (Fase 2)

Nombres y lore en `src/data/i18n/es.js` (`card.<id>.name|lore|hint`); `draft: true` en `src/data/cards.js` para las cartas inventadas. **Todo el lore es borrador**, también el de las cartas con nombre de la especificación.

| Rareza | De la especificación | Inventadas (draft) |
|---|---|---|
| Común (20) | Huevo Quemado, Tostada Dudosa, Tomate Triste, Bacon Normal, Patata Sospechosa | Queso Perezoso, Champiñón Tímido, Cebolla Llorona, Hierbas Despistadas, Pez Fuera del Agua, Pan Bailongo, Huevo de Dos Yemas, Bocadillo de Medianoche, Bacon Crujiente, Bravas Felices, Tortilla de la Abuela, Ensalada Solitaria, El Delantal de Pip, Sartén Abollada, Reloj de Cocina |
| Rara (10 + 4 descubrimiento) | Vegana Enfadada, DJ del Bacon, Tomate Samurái, Huevo Astronauta · Corona de Bacon, Revuelto Místico, Sopa del Maestro, Crítico Satisfecho | La Abuela Exigente, Pip Dormido, Turista de Otro Mundo, Desayuno de Campeones, El Rey del Rebozado, Cocina Enamorada |
| Épica (5 + 5) | Pan Galáctico · Maestro del Triple Bacon, Tomate Explosivo, Tortilla Imposible, Chef del Vacío, Fiebre Doble | Gallo Rey, El Chef Rival, Sartén en Llamas, Remolino de Especias |
| Legendaria (2 + 2) | Trufa Dorada, La Primera Receta · Sello del Maestro Antiguo, La Receta Perdida | — |

**Diario de la cocina** (`fragment.1–12`, draft hasta aprobar D-1): cuenta la sección 6.5 sin nombrar a Pip ni a Brûlée. Fragmento 1 en Tostada Dudosa (bienvenida); 2–10 en comunes y raras; 11 en Gallo Rey; 12 en La Primera Receta.

**Acertijos de cartas de descubrimiento** (`card.<id>.hint`): p. ej. "Tres veces tres lonchas en un solo servicio" o "Termina un servicio sin dejar ni una miga".

**Calendario, álbum, ajustes y resultados:** textos de interfaz nuevos en `es.js` (`calendar.*`, `album.*`, `settings.*`, `results.*`, `reveal.*`, `pack.*`).

**Créditos (Ajustes):** "Idea y dirección: Daniel · Arte de referencia generado con Meta AI · Programación con Claude Code". Revisar.

## Álbum ampliado a 120 cartas (72 cartas nuevas, todas draft)

Nombres, lore y acertijos en `es.js`; arte compuesto en `cards.js`.

| Rareza | De sobre (nuevas) | De descubrimiento (nuevas) |
|---|---|---|
| Común (+30) | Huevo Valiente, Patata Rodante, Tomates Gemelos, Luna de Queso, Seta Paraguas, Aros de Cebolla, Ramillete de Hierbas, Pez Saltarín, Ola de Bacon, Tostada Perfecta, Tostada de la Casa, Revuelto de Domingo, Tortilla del Bosque, Desfile de Brochetas, Almuerzo Marinero, Guiso Calentito, El Clásico, Torre de Bocadillo, Pip Despistado, Guiño de Pip, Pip Preocupado, Cliente de Siempre, Estudiante con Prisa, Pausa del Café, Turista Perdido, Propina Caída, Nube de Humo, Nota en la Nevera, Cocina al Amanecer, Familia Patata | — |
| Rara (+20 · +5) | Cocina de Medianoche, Pip de Fiesta, Pip Orgulloso, Pip Llorón, Recuerdo de Viaje, Oficinista Satisfecho, Banquete Estudiante, Tarde Tranquila, Rey del Mar, Fondue Furtiva, Buscatrufas, Ensalada Arcoíris, Bravas de Madrugada, Tortilla de Concurso, Mago de las Hierbas, Torre de Huevos, Lluvia de Tomates, Lluvia de Monedas, Carta de Amor, Último Segundo | Invitado Misterioso, Visita del Coleccionista, Hora Punta, Tres en su Punto, Nadie se Queda sin Comer |
| Épica (+9 · +3) | La Sonrisa de Brûlée, Celos de Repostería, La Risa de Brûlée, Tregua Dulce, Huevo de Oro, Sueño Febril, Casa Llena, Tapa Misteriosa, Desayuno Estelar | Cadena de Diez, Rival Convencido, Noche de Récord |
| Legendaria (+2 · +3) | La Sartén Soñada, El Corazón de la Cocina | Visitante Nocturno, Cinco Estrellas, Fuego Triple |

Brûlée aparece en 4 cartas épicas (La Sonrisa de Brûlée, Celos de Repostería, La Risa de Brûlée, Tregua Dulce) aunque en la historia aparece en el capítulo 3: si prefieres que no se vea antes, se pueden cambiar de arte o pasar a descubrimiento.

## Encargos de Pip

Textos `challenges.*`, `challenge.*`, `panel.*`, `pause.panel` y `results.challenges` en `es.js`. Ejemplos: "Llega a combo x3 en un servicio", "Cocina Bacon con Huevo 3 veces", "Termina un servicio sin que se vaya ningún cliente", "Tres encargos cada día. Cúmplelos todos y Pip te regala un sobre."

## Fase 4 (todo draft)

- **Escenas de capítulo** (`story.chapter2.*` … `story.chapter7.*`, `story.finale.*`): 3 bocadillos cada una. Frases de Brûlée de la especificación: "Así que por fin has encontrado a alguien que aguanta una cocina", "Si mi aprendiz tiene un aprendiz, es hora de desempolvar el baúl" y "Cada utensilio tiene una historia. Algunas terminan bien". El resto es inventado. El capítulo 7 y el epílogo revelan el secreto de la sección 6.5 (D-1).
- **Almacén:** frases de Brûlée (`warehouse.brulee.*`, `warehouse.bruleeDone`); descripciones de utensilios (`utensil.*.desc`) y de la vitrina (`product.*.desc`).
- **Decoración** (`decor.*.name`, `src/data/decor.js`; arte recortado de la cocina del mega pack): Maceta de Hierbas 150, Bolsa del Mercado 250, Tabla de Cortar 400, Ristra de Ajos y Guindillas 500, Suculenta de la Ventana 650, Frutero 800, Estante de Tarros 1.000, Lámpara Colgante 1.300, Estante de Plantas 1.600 y Planta Grande 2.000.
- **Especialidades:** descripciones cortas (`specialty.*.desc`).
- **Avisos en partida:** "¡Cliente especial!", "¡Cliente legendario!", "¡Paciencia congelada!" y "Fuera". En resultados: "Alguien te observa desde la puerta de la cocina…".
- **Clientes sin arte propio** (provisional): Coleccionista = chico de los cascos, Crítico legendario = crítico de traje negro, Visitante de la Cocina Nocturna = alien brócoli.

## Fase 5

- **Frases del Pase de Pip** (`pip.pass.1`–`15`, draft): p. ej. "¡Con esta sartén dorada hasta yo parezco un chef de verdad!", "¿Oyes la lluvia? Es el mejor ruido para cocinar.", "Gracias por quedarte en la cocina, {nombre}."
- **Pack de Inicio** (draft): Bacon Normal, Tomate Triste, Queso Perezoso, Cebolla Llorona y Pip Dormido.
- **Nombres de sartenes:** Sartén de Pip (la inicial), Sartén Oxidada, Sartén Rosa de Pip, Sartén Negra y Sartén Dorada.
- **Textos de tienda** (`shop.*`, `warehouse.*`, `pass.*`): "Pago pendiente: recibirás el contenido cuando se complete.", "La compra ha fallado. No se te ha cobrado nada."

## Sartén de cada cliente

- **Frases de Pip al quemarse un plato** (`pip.burnt.1`–`3`, draft): "¡Huele a carbón! Ese plato ya es arte moderno.", "Se quemó… Lo llamaremos «estilo ahumado».", "Uy, demasiado tarde. ¡La sartén no espera!"
- **Tutorial** (`tutorial.pan`, draft): "¡A la sartén! Se cocina en su sartén y se sirve sola. ¡Que no se acabe su paciencia!"
- **Textos flotantes:** "¡A la sartén!" y "¡Se quemó!".

## Reacciones de los clientes y cocina a tope (todo draft)

- **Frases al servir** (`react.<cliente>.1–2`), por ejemplo:
  - Crítico: "Mmm… Cinco estrellas."
  - Chef rival: "Hmpf… No está mal."
  - Oficinista: "¡A tiempo para la reunión!"
  - Visitante nocturno: "Sabe a luna llena…"
- **Pip:**
  - Cocina a tope (`pip.fullStove.1–3`): "¡Todas las sartenes al fuego! ¡Esto es una cocina de verdad!"
  - Justo a tiempo (`pip.closeCall.3–4`): "¡Justo a tiempo! Me late el corazón a mil."
- **Textos flotantes:** "¡Justo a tiempo!" y "¡Cocina a tope!".


## Fase 6 — Android

- **Salir desde el menú** (`exit.*`): "¿Cerrar Kitchen Loop?", "SEGUIR COCINANDO" y "Salir".
- **Poses generadas de los clientes especiales y legendarios** (`customers/<id>_happy` y `_angry`): su retrato con corazones, o con rubor y vapor. Provisionales hasta tener arte con expresiones propias.
- **Icono y pantalla de inicio** de Android: `icon_final.png` sobre la madera oscura del juego.

## Música provisional (draft)

- Tres temas compuestos en código (`src/data/music.js`): "Cocina tranquila" (menú), "Servicio" (partida, con capa de fiebre) y "Lluvia en la cocina" (Cocina Nocturna). Son provisionales hasta tener música definitiva (D-3).
- Voces de diálogo: pitidos agudos para Pip y graves para Brûlée.

## Economía: decoración nueva y rincón mágico (draft)

- **Decoración de monedas:** Reloj de Pared, Cruasán de Exposición, Tortitas del Domingo, Arroz Frito de Pip, Sushi del Viajero y Chuletón de Gala.
- **Rincón mágico de Brûlée (fragmentos):** Poción de Sabor, Tarro de Polvo de Estrellas, Setas del Bosque Encantado, Recetario de Brûlée y Trufa Dorada. Texto: "Objetos que Brûlée trajo de sus viajes."
- **Sobres del Almacén:** "Sobres de cartas por monedas. Se guardan en tu Álbum para abrirlos cuando quieras."
- **Chef del Vacío:** pista nueva, "Termina un servicio con 2 ingredientes o menos en la encimera".

## Inglés (draft)

- `src/data/i18n/en.js`: traducción completa de todos los textos, pendiente de revisión, a ser posible por una persona nativa.
- Decisiones de traducción:
  - Nombres propios sin traducir (Pip, Brûlée, Patatas Bravas).
  - "¡En su punto!" → "Perfectly done!", "Fiebre en la cocina" → "Kitchen fever", "Encargos de Pip" → "Pip's Orders", "Almacén de Brûlée" → "Brûlée's Warehouse".
  - Inglés británico ("favourite", "neighbourhood").

## Arte de las cartas y tutorial (0.9.2, draft)

- **Ilustraciones de las 120 cartas** (`scripts/card_art.py`), dibujadas a juego con su nombre y su texto, sobre fondos en pixel art. Merece la pena revisar sobre todo las que interpretan el nombre:
  - Sartén Abollada, Reloj de Cocina (va hacia atrás), Propina Caída (debajo de la nevera) y Tapa Misteriosa (ojos debajo de la tapa).
  - Sello del Maestro Antiguo (sello de cera con una sartén), La Primera Receta (papel escrito a mano) y Cadena de Diez / Noche de Récord (pizarra con "x10" y "3000").
- **Tutorial** (`tutorial.orderTomato`, `tutorial.orderCook`): "Ahora el tomate, pegado al pan." y "¡Brillan! Tócalos: el plato va a la sartén de su cliente."

