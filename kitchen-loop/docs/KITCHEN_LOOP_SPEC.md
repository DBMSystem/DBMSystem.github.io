# KITCHEN LOOP — Especificación v3.2 para Claude Code

> **COCINA. COLECCIONA. HAZ LOOP.**
> Versión 3.2 — la v3.1 más el fogón con la sartén equipada siempre visible en la partida (secciones 2.1, 7.5 y 8.3).
> Versión 3.1 — revisión de la v3.0 con contradicciones resueltas, núcleo jugable definido y valores de balance por defecto.
> Autor de la visión: Daniel. Todo lo marcado como **[DECISIÓN D-x]** está pendiente de su aprobación (ver sección 16).

---

## 0. CÓMO TRABAJAR CON ESTE DOCUMENTO

### 0.1 Reglas para Claude Code

1. **No sustituyas la visión del juego.** Este documento define qué se construye; tú decides cómo se programa.
2. **Trabaja por fases** (sección 14). No empieces una fase sin que la anterior cumpla su criterio de aceptación y Daniel la haya validado.
3. **Contenido sí, sistemas no.** Puedes crear contenido nuevo (frases, nombres de cartas, textos de lore, clientes, decoración) siguiendo las reglas de este documento. **No puedes añadir sistemas o mecánicas nuevas.** Si crees que falta uno, documéntalo como propuesta y detente.
4. **Todo contenido que inventes** lleva `draft: true` en su archivo de datos y se lista en `docs/CONTENT_REVIEW.md` para que Daniel lo revise.
5. **Si falta información crítica**, detente y añádela a `docs/DECISIONES.md`. Si una ambigüedad es menor y no cambia la visión, elige la opción más sencilla y anótala.
6. **Todos los números de balance** viven en `src/data/balance.js`. Nunca un número mágico en la lógica.
7. **Todo texto visible** pasa por el sistema de idioma (`t()`), en UTF-8, respetando **siempre tildes, ñ, ¿ y ¡**, también dentro del canvas.
8. **No dupliques lógica. No crees código innecesario.** Código en inglés; textos del juego en español.
9. Al terminar cada fase entrega un informe breve: qué está hecho, qué falta, cómo probarlo, y actualiza `CHANGELOG.md`.

### 0.2 Orden de prioridad absoluto

- Diversión > monetización.
- Calidad > cantidad de contenido.
- Legibilidad > efectos.
- **GAMEPLAY → FEEDBACK → PROGRESIÓN → COLECCIÓN → HISTORIA → MONETIZACIÓN.** Nunca al revés.

---

## 1. IDENTIDAD Y VISIÓN

| Campo | Valor |
|---|---|
| Nombre | KITCHEN LOOP |
| Eslogan | COCINA. COLECCIONA. HAZ LOOP. |
| Género | Puzle arcade de cocina + colección de cartas + cozy, con capa roguelite ligera (especialidad del día al inicio de cada loop, sección 2.12) |
| Plataforma | Android, vertical 9:16 (adaptable a 19,5:9 y 20:9) |
| Tecnología | React + Vite + JavaScript, Canvas 2D para el gameplay, Capacitor para empaquetar en Android |
| Control | Táctil (arrastrar y tocar) |

### 1.1 Sensación objetivo

"Solo voy a jugar una partida." → cinco minutos después → "Una más para conseguir esa carta."

El jugador debe sentir descubrimiento, progreso, sorpresa, dominio, colección, recompensas pequeñas y frecuentes, y momentos de espectáculo. Nunca debe sentir que está trabajando.

### 1.2 Núcleo

**COCINAR → COMBINAR → SERVIR → RECOMPENSA → CARTA → PROGRESIÓN → NUEVO LOOP**

Todo sistema secundario existe para reforzar este núcleo. Si no lo refuerza, no entra.

### 1.3 Metaobjetivo (la evolución de la motivación)

"Quiero puntos" → "Quiero descubrir esa receta" → "Quiero completar el álbum" → "Quiero saber qué pasó entre Pip y Brûlée".

---

## 2. NÚCLEO JUGABLE (ESPECIFICACIÓN CERRADA)

### 2.1 Pantalla de partida (de arriba abajo)

1. **HUD**: tiempo restante, puntuación, contador de combo.
2. **Zona de clientes**: hasta 3 huecos (4 con la Encimera Rúnica). Cada cliente muestra su pedido (icono del plato) y una barra de paciencia.
3. **Fogón**: entre los clientes y la encimera, con **una sartén por cliente**, justo debajo de cada hueco y con el aspecto de la sartén equipada (sección 7.5). Cada pedido hace el recorrido **encimera → su sartén → cliente** (sección 2.6). Nunca tapa la encimera ni los pedidos.
4. **Encimera (grid)**: 4x4 casillas.
5. **Habilidades de utensilios**: fila de botones pequeños, solo visible si hay utensilios desbloqueados.
6. **Bandeja**: 3 ingredientes disponibles + vista previa del siguiente (más pequeña y atenuada).
7. **Pip**: esquina inferior, con bocadillo de texto corto. Nunca tapa el grid ni la bandeja.

### 2.2 Ingredientes y bandeja

- Cada ingrediente ocupa **1 casilla**.
- La bandeja tiene 3 huecos. Al colocar un ingrediente, su hueco se rellena con el de la vista previa y se genera una nueva vista previa.
- **Generación**: bolsa barajada con los ingredientes desbloqueados (`ingredientBag` fichas por ingrediente, que se rellena al vaciarse), sin rachas ni sequías.
  - Cada ingrediente pesa según las recetas desbloqueadas que lo usan (`demandWeighting`).
  - Con probabilidad `orderBias` (0,35), el siguiente ingrediente será uno que falte para completar algún pedido activo.
  - Esto evita partidas imposibles, y que unas salgan mucho mejor que otras, sin quitar el reto (`docs/LOOP_BALANCE.md`).
- Los ingredientes aparecen con una pequeña animación de entrada y partículas suaves (chispas, vapor o aceite según el ingrediente), limitadas por el sistema de partículas (sección 9.2).

### 2.3 Colocar

- **Arrastrar** un ingrediente de la bandeja a una casilla vacía. Mientras se arrastra, el ingrediente se dibuja unos 40 px lógicos **por encima del dedo** para que el dedo no lo tape, y la casilla de destino se resalta.
- Soltar fuera del grid o sobre una casilla ocupada: el ingrediente vuelve a la bandeja, sin castigo.
- **Alternativa accesible** (ajuste "Colocar tocando"): tocar un ingrediente y luego tocar una casilla.

### 2.4 Recetas: cómo se forman

Una receta es un conjunto de ingredientes con un **patrón**:

| Patrón | Regla |
|---|---|
| `group` | Los ingredientes forman un grupo conectado ortogonalmente (arriba, abajo, izquierda, derecha), con cualquier forma. |
| `line` | Los ingredientes están en línea recta horizontal o vertical. Con `ordered: true`, el orden importa (se acepta en ambos sentidos). |
| `square` | Los 4 ingredientes forman un cuadrado 2x2. |

Tamaño máximo de una receta: 4 ingredientes.

### 2.5 Recetas: cómo se cocinan (tocar para cocinar)

- Cuando un conjunto de casillas forma una receta **conocida**, esas casillas **brillan** (outline temporal, pequeña vibración visual, partículas suaves y sonido suave).
- **Tocar cualquier casilla de un grupo brillante lo cocina.** Esto da la tensión central del juego: cocinar ya para mantener el combo, o esperar a construir una receta más grande y valiosa arriesgando espacio.
- Si una casilla pertenece a varias recetas posibles, se cocina según esta prioridad: 1) la receta más grande; 2) la que tiene un pedido activo; 3) la de más puntos.
- **Recetas secretas**: no brillan hasta descubrirse. Pero si el jugador toca una casilla y la receta más grande que la contiene es una secreta con su requisito cumplido, **se cocina y se descubre**. Así se descubren jugando, por accidente o por experimentación. Tras descubrirse, brillan como las demás.
- Tocar una casilla que no forma receta: pequeño temblor del ingrediente, sin castigo.
- Al cocinar: los ingredientes saltan a la sartén (≤ 400 ms), partículas, pequeño shake y texto flotante. Las casillas se liberan al terminar el salto y no aceptan ingredientes mientras tanto.
- El combo, ¡En su punto! y la fiebre cuentan **en el momento de tocar**, no al servir.

### 2.6 Servir: la sartén de cada cliente

- Cada cliente tiene su sartén en el fogón. Al cocinar un pedido, los ingredientes van a la sartén del cliente que lo pidió (si varios lo pidieron, al de menor paciencia restante que aún no tenga plato en la sartén).
- El plato chisporrotea `panCookTime` (2,5 s) con sonido, vapor y un anillo de progreso. Al terminar suena un "ding", el plato vuela al cliente y se cobra: puntos, monedas, fragmentos y pedido servido se suman **en ese momento**. Un cliente con su plato en la sartén ya no puede recibir otro.
- **Se quema**: la paciencia del cliente sigue corriendo mientras se cocina (solo la paran las Pinzas de Escarcha). Si se agota antes de que el plato esté listo, el plato se quema: humo negro, un comentario de Pip y el cliente se va. No da puntos ni pago y cuenta como cliente perdido. El anillo se pone rojo y parpadea cuando ya no va a llegar a tiempo.
- Si ningún cliente lo pidió: **venta de mostrador**, instantánea, con puntos base × `counterSaleMultiplier` (0,5). Pasa por una sartén libre camino del marcador. No cuenta como pedido, pero sí suma al combo.
- **Reacciones (solo feedback, sin efecto en puntos)**:
  - Mientras su plato se cocina a tiempo, el cliente se pone contento y da saltitos con un corazón. Si no va a llegar, se enfada.
  - Al servir, el cliente dice una frase propia de su tipo en un bocadillo (`react.<cliente>.n`).
  - **¡Justo a tiempo!**: si se sirve con menos del 15 % de paciencia (`closeCallPatience`), aparecen el texto, estrellas, un destello y un sonido propio, y Pip lo celebra.
  - **¡Cocina a tope!**: cuando todas las sartenes cocinan a la vez, sale un aviso, el fogón brilla, suena un chisporroteo fuerte y Pip lo comenta.
- **Fin del tiempo**: las sartenes que estaban cocinando terminan y sirven antes de la pantalla de resultados. En un desbordamiento, los platos que ya estaban en la sartén se sirven al terminar.

### 2.7 Clientes en partida

- Llega un cliente cada `customerInterval` (7 s); el primero al segundo 1. Máximo `maxCustomers` (3).
- Paciencia base `customerPatience` (22 s: 20 + 2 por el tiempo de sartén), modificada por tipo de cliente (sección 3.3).
- Los pedidos solo incluyen recetas **conocidas y desbloqueadas**, nunca secretas. Al principio se priorizan las recetas pequeñas.
- Si la paciencia se agota, el cliente se va: se pierde el pedido y Pip reacciona. No hay más castigo.

### 2.8 Combos

- Cada receta cocinada dentro de `comboWindow` (4,0 s; eran 3,0: el jugador casual no llegaba nunca a la fiebre) desde la anterior aumenta la cadena de combo. Si pasa el tiempo, la cadena vuelve a 0.
- Se muestra "Combo x{n}", donde n es la longitud de la cadena.
- Multiplicador de puntos por cadena (`comboMultipliers`): x1 → 1,0; x2 → 1,2; x3 → 1,5; x5 → 2,0; x10 → 3,0. Entre escalones se mantiene el valor anterior.
- Los combos suben ligeramente la probabilidad de carta al final del loop (sección 4.6), pero **nunca son obligatorios para progresar**.
- La palabra "combo" se reserva para la cadena. Ninguna receta puede llamarse "combo".

### 2.9 ¡EN SU PUNTO! (antes "Perfect Cook")

- Se activa al cocinar 3 recetas en ≤ `perfectWindow` (4 s).
- Efecto: flash muy breve, partículas, ingredientes girando, números grandes, sonido especial, vibración corta y animación de Pip.
- Límite de flashes: máximo 1 por segundo y opacidad ≤ 0,35 (fotosensibilidad).

### 2.10 ¡FIEBRE EN LA COCINA! (antes "Kitchen Fever")

- Se activa al llegar a una cadena de combo ≥ `feverThreshold` (5). Dura `feverDuration` (5 s).
- Si la cadena sigue viva cuando la fiebre acaba, la siguiente fiebre pide otras `feverThreshold` recetas en la cadena (si no, se encendería otra vez al instante).
- Durante la fiebre: multiplicador extra × `feverMultiplier` (1,5), `comboWindow` × 1,5, música con una capa más intensa, partículas adicionales, estelas en los ingredientes y Pip animado.
- La legibilidad manda: el grid y los pedidos deben leerse perfectamente durante la fiebre.

### 2.11 Tiempo, derrota y fin del loop

- Duración base: `loopDuration` (60 s). `timeBonusPerOrder` existe en la configuración con valor 0.
- **Fin normal**: el tiempo llega a 0. No es una derrota.
- **Desbordamiento (derrota real)**: el grid está lleno y no hay ninguna receta cocinable. Aparece "¡La cocina se desborda!" y el loop termina antes de tiempo.
- **Segunda oportunidad ("Sobornar a Pip — Ver anuncio")**: solo se ofrece en desbordamiento, una vez por loop y como máximo `secondChanceDailyCap` (3) veces al día. Recompensa: vacía las 8 casillas con los ingredientes más antiguos y suma +10 s (`secondChanceTime`).
  - Siempre hay un botón "No, gracias" igual de visible. Sin cuenta atrás que presione.
  - Si no hay anuncio disponible, el botón aparece desactivado con el texto "Anuncio no disponible" y la partida termina con normalidad.
- **Las recompensas del loop se calculan solo cuando el loop termina definitivamente** (después de resolver la segunda oportunidad). Nunca antes.

### 2.12 Especialidad del día (capa roguelite ligera)

- A partir del nivel 4 (`loopModifiersFromLevel`), antes de cada loop el jugador elige 1 de 3 especialidades al azar entre las desbloqueadas. Se puede desactivar entera con `loopModifiersEnabled`.

| Especialidad | Efecto |
|---|---|
| Hora del Desayuno | Huevo aparece el doble; recetas con huevo +25 % de puntos. |
| Bacon Fest | Bacon aparece el doble; Triple Bacon entra en los pedidos. |
| Visita de Pip | Pip cocina contigo: cada 15 s coloca un ingrediente útil en una casilla libre. |
| La Cocina se Vuelve Loca | Cada 10 s aparece un ingrediente especial (sección 3.1) o, si no hay ninguno desbloqueado, un ingrediente dorado. |
| Crítico en Sala | Garantiza la visita de un crítico gastronómico. |
| Noche de Brûlée | Requiere capítulo 3. Los pedidos incluyen recetas de utensilios y cada pedido da +1 fragmento. |

### 2.13 Sorpresas dentro del loop

- **Ingrediente dorado**: cada ingrediente tiene una probabilidad `goldenIngredientChance` (1 %) de salir dorado. La receta que lo contenga da ×2 puntos y +5 % de probabilidad de carta.
- **Cliente raro**: ver probabilidades en la sección 3.3.
- Nunca más de una sorpresa grande a la vez. El jugador nunca debe perder el control.

### 2.14 Puntuación, monedas y XP del loop

- Puntos de receta = puntos base × multiplicador de combo × (multiplicador de fiebre si procede). Un pedido servido suma un bonus de +50 % sobre esos puntos.
- Monedas = pedidos servidos × 5 × multiplicador de pago del cliente + `floor(puntos / 200)`.
- XP = `floor(puntos / 20)` + pedidos servidos × 5.
- Referencia orientativa de un loop medio: 10 recetas, 6 pedidos, unos 1.500 puntos, unas 37 monedas y unos 105 XP.

---

## 3. CONTENIDO DE LANZAMIENTO (DATOS)

Todo este contenido se define en archivos de datos (`src/data/`), nunca dentro de componentes. Los nombres de recetas y cartas se muestran en español; los `id` van en inglés o sin tildes.

### 3.1 Ingredientes

| id | Nombre | Se desbloquea |
|---|---|---|
| egg | Huevo | Nivel 1 |
| bacon | Bacon | Nivel 1 |
| bread | Pan | Nivel 1 |
| tomato | Tomate | Nivel 1 |
| cheese | Queso | Nivel 1 |
| mushroom | Champiñón | Nivel 3 |
| potato | Patata | Nivel 4 |
| onion | Cebolla | Nivel 5 |
| herbs | Hierbas | Nivel 5 |
| fish | Pescado | Nivel 6 |

**Ingredientes especiales** (aparecen en la bandeja con poca frecuencia, solo si están desbloqueados):

| id | Nombre | Origen | Efecto |
|---|---|---|---|
| clock | Reloj de Cocina | Cucharón del Tiempo | Al colocarlo, suma +4 s y desaparece sin ocupar casilla. Máx. 2 por loop. |
| spice | Especia Ancestral | Especia Ancestral | Comodín: sustituye a un ingrediente en recetas de 3 o más. Máx. 2 por loop. |
| flame | Llama | Brochetas Ember | Ingrediente para recetas de fuego (Tomate Explosivo, brochetas). |
| truffle | Trufa | Árbol completo | Aparece como máximo 1 vez por loop con un 15 % de probabilidad. |

### 3.2 Recetas

**Recetas visibles** (se conocen al desbloquearse):

| id | Nombre | Ingredientes | Patrón | Nivel | Puntos |
|---|---|---|---|---|---|
| bacon_egg | Bacon con Huevo | huevo, bacon | group | 1 | 50 |
| tomato_toast | Tostada con Tomate | pan, tomate | group | 1 | 50 |
| special_toast | Tostada Especial | pan, tomate, queso | group | 1 | 120 |
| triple_bacon | Triple Bacon | bacon ×3 | line | 2 | 130 |
| cheesy_scramble | Revuelto con Queso | huevo ×2, queso | group | 2 | 120 |
| mushroom_omelette | Tortilla de Champiñones | huevo, champiñón | group | 3 | 60 |
| bacon_sandwich | Bocadillo de Bacon | pan, bacon, pan | line, ordered | 4 | 140 |
| bravas | Patatas Bravas | patata, tomate | group | 4 | 60 |
| spanish_omelette | Tortilla de Patatas | huevo, patata, cebolla | group | 5 | 150 |
| garden_salad | Ensalada de la Huerta | tomate, cebolla, hierbas | group | 5 | 130 |
| herb_fish | Pescado a las Hierbas | pescado, hierbas | group | 6 | 70 |
| fish_chips | Pescado con Patatas | pescado, patata | group | 6 | 70 |
| full_breakfast | Desayuno Completo | huevo, bacon, pan, tomate | group | 7 | 280 |

**Recetas de utensilios** (se conocen al comprar el utensilio en el árbol de Brûlée):

| id | Nombre | Ingredientes | Patrón | Requiere | Puntos |
|---|---|---|---|---|---|
| french_omelette | Tortilla Francesa | huevo ×2 | line | Batidor Dorado | 60 |
| broken_eggs | Huevos Rotos | huevo, patata, bacon | group | Batidor Dorado | 150 |
| fish_stew | Guiso Marinero | pescado, patata, cebolla, tomate | group | Olla Encantada | 280 |
| mushroom_cream | Crema de Champiñones | champiñón ×2, queso, cebolla | group | Olla Encantada | 260 |
| garden_skewer | Brocheta de la Huerta | tomate, cebolla, champiñón, llama | line | Brochetas Ember | 300 |

**Recetas secretas** (no se muestran ni brillan hasta descubrirse; nunca aparecen en pedidos):

| id | Nombre | Ingredientes | Patrón | Requiere | Puntos |
|---|---|---|---|---|---|
| bacon_crown | Corona de Bacon | bacon, huevo, bacon | line, ordered (huevo en el centro) | Nivel 2 | 220 |
| impossible_omelette | Tortilla Imposible | huevo ×4 | square | Nivel 3 | 350 |
| mystic_scramble | Revuelto Místico | champiñón ×3, huevo | group | Nivel 4 | 300 |
| master_soup | Sopa del Maestro | pescado, cebolla, hierbas, patata | group | Olla Encantada | 400 |
| exploding_tomato | Tomate Explosivo | tomate, queso, llama | group | Brochetas Ember | 380 |
| lost_recipe | La Receta Perdida | trufa, huevo, pan, queso | square | Árbol completo | 600 |

**Pistas de recetas secretas**: el álbum muestra un acertijo corto por cada receta secreta no descubierta cuando el jugador cumple su requisito (ejemplo para la Corona de Bacon: "Dos lonchas protegen al más frágil"). Nunca se muestran los ingredientes.

### 3.3 Clientes

| Tipo | Categoría | Paciencia | Pago | Pide | Aparece |
|---|---|---|---|---|---|
| Cliente tranquilo | Común | ×1,3 | ×1,0 | Recetas pequeñas | Nivel 1 |
| Estudiante | Común | ×1,0 | ×0,8 | Recetas baratas | Nivel 1 |
| Oficinista | Común | ×0,8 | ×1,2 | Cualquiera | Nivel 2 |
| Turista | Común | ×1,0 | ×1,0 | Aleatoria, incluidas grandes | Nivel 4 |
| Crítico gastronómico | Especial (3 %) | ×0,7 | ×3,0 | Recetas de 3–4 | Nivel 5 |
| Chef rival | Especial (3 %) | ×0,9 | ×2,0 | Solo recetas de 4 | Nivel 6 |
| Cliente misterioso | Especial (2 %) | ×1,2 | ×2,0 | "Algo que no hayas servido hoy" (cualquier receta no servida en este loop) | Nivel 7 |
| Coleccionista | Especial (2 %) | ×1,0 | ×1,0 | Cualquiera; da +10 fragmentos | Nivel 8 |
| Maestro antiguo | Legendario (0,5 %) | ×1,0 | ×5,0 | Receta grande | Nivel 10 |
| Crítico legendario | Legendario (0,5 %) | ×0,6 | ×5,0 | Receta de 4 | Nivel 10 |
| Visitante de la Cocina Nocturna | Legendario (0,5 %) | ×1,5 | ×4,0 | Aleatoria | Capítulo 3 |

- Los porcentajes son por aparición de cliente. Máximo 1 cliente especial o legendario a la vez y 1 legendario por loop.
- Cada cliente tiene personalidad visual propia (silueta, color, animación de espera y de enfado).
- Todos los clientes legendarios son accesibles gratis. El Visitante de la Cocina Nocturna es una pista de la historia, no contenido de pago.

### 3.4 Pip

- **Edad ficticia**: 38 años. **Rol**: mentor del jugador y personaje emocional principal.
- **Personalidad**: energético, despistado, simpático, competitivo, exagerado, algo dramático. Quiere demostrar que es un gran chef.
- **Motivación central**: quiere hacer del jugador lo que él nunca llegó a ser por no haberse esforzado lo suficiente. Esta motivación sostiene toda la historia (sección 6).
- Nunca es cruel ni insulta de verdad al jugador. Cuando algo sale mal, lo exagera de forma cómica.
- **Expresiones mínimas (15)**: feliz, preocupado, enfadado, pulgar arriba, pensando, neutral, sorprendido, dormido, celebrando, asustado, orgulloso, confuso, emocionado hasta las lágrimas, guiñando un ojo, avergonzado.

### 3.5 Brûlée

- **Edad ficticia**: 78 años. **Rol**: maestro legendario, antiguo maestro de Pip.
- Lleva décadas coleccionando utensilios. Serio con la cocina, con humor seco. No es un villano: es una figura misteriosa.
- **Frase característica**: "Si mi aprendiz tiene un aprendiz, es hora de desempolvar el baúl."
- Aparece por primera vez en el capítulo 3 (sección 6.3) y desde entonces guarda el Almacén.

### 3.6 Frases (sistema de diálogo)

- **Frases cortas**: máximo unos 60 caracteres en partida.
- **Nombre del jugador**: se interpola como `{nombre}`.
- **Regla de género**: todas las frases dirigidas al jugador se escriben en forma neutra. Correcto: "¡Te damos la bienvenida, {nombre}!", "¡A por ello!", "¡Qué manos tienes!". Incorrecto: "¡Estás listo!", "¡Bienvenido!".
- **Anti-repetición**: no repetir una frase de las últimas 5 mostradas. En partida, como mínimo 4 s entre frases de Pip; las frases de eventos importantes (¡En su punto!, fiebre, desbordamiento) tienen prioridad.
- Las frases se eligen por **disparador** y deben cuadrar con lo que está pasando.

| Disparador | Ejemplos (Claude Code puede añadir más como `draft`) |
|---|---|
| Inicio de loop | "¡Hoy toca cocinar, {nombre}!" · "Delantal puesto. ¡Vamos allá!" · "Esta vez no se quema nada. Creo." |
| Receta cocinada | "¡Eso cuenta como cocina!" · "¡Huele a victoria!" · "¡Así se hace!" |
| Combo x3 o más | "¡Tenemos combo!" · "¡No pares ahora!" |
| Receta salvada en el último momento | "¡Eso ha estado MUY cerca!" |
| ¡En su punto! | "¡EN SU PUNTO! Voy a llorar." · "¡Brûlée tendría que ver esto!" |
| Fiebre | "¡La cocina está ARDIENDO! En el buen sentido." |
| Cliente se va | "Vale... ese no vuelve." · "Nota mental: la gente tiene prisa." |
| Grid casi lleno (≥ 13 casillas) | "¡Brûlée no puede ver esto!" · "¡Hay que hacer hueco, {nombre}!" |
| Toque sin receta | "Vale... eso no era tomate." |
| Desbordamiento | "Creo que Brûlée nos ha visto..." · "¡Todo bajo control! No." |
| Fin con récord | "Eso ha sido... sorprendentemente bueno." · "¡{nombre}, eso ha sido digno de un maestro!" |
| Fin normal | "Nada mal. Nada mal en absoluto." · "Mañana lo quemamos mejor. Digo, lo cocinamos." |
| Fin flojo | "Lo importante es que la cocina sigue en pie." · "Yo empecé peor. Mucho peor." |
| Nueva carta | "¡La cocina ha recordado algo!" |
| Legendaria | "No. Puede. Ser." |
| Receta secreta descubierta | "¡Eso no estaba en ningún libro!" |

**Frases de Brûlée** (ejemplos): "Así que por fin has encontrado a alguien que aguanta una cocina." · "Si mi aprendiz tiene un aprendiz, es hora de desempolvar el baúl." · "Cada utensilio tiene una historia. Algunas terminan bien." · "El fuego no perdona. Yo tampoco. Pero a veces se me olvida."

---

## 4. CARTAS, SOBRES Y FRAGMENTOS

### 4.1 Rarezas

| Rareza | Estrellas | Marco (forma, no solo color) | Color | Animación | Sonido |
|---|---|---|---|---|---|
| Común | 1★ | Marco simple | Crema | Pequeño salto al aparecer | Pop |
| Rara | 2★ | Esquinas redondeadas con remaches | Azul/verde | Reflejo que se desplaza, borde animado, partículas pequeñas | Chime |
| Épica | 3★ | Marco con gemas | Morado | Aura, partículas, movimiento del personaje, explosiones de estrellas | Whoosh + chime |
| Legendaria | 4★ | Marco ornamentado | Dorado holográfico | Secuencia cinematográfica (sección 4.5) | Secuencia especial |

La rareza nunca se comunica solo con el color: siempre estrellas + forma del marco.

### 4.2 Estructura de una carta (`src/data/cards.js`)

```js
{
  id: 'burnt_egg',
  number: 1,              // número en el álbum
  name: 'Huevo Quemado',
  rarity: 'common',       // common | rare | epic | legendary
  source: 'pack',         // 'pack' (sale en sobres) | 'discovery' (solo por acciones)
  unlock: null,           // solo en discovery: condición (ver 4.4)
  hint: null,             // acertijo para cartas discovery
  description: '...',
  lore: '...',            // máx. 140 caracteres
  storyFragment: null,    // número de fragmento de historia (sección 6.4) o null
  // arte: sprites cards/<id> y su fondo cards/bg_<tema>, dibujados por scripts/card_art.py a juego con el nombre
  draft: false,
}
```

### 4.3 Álbum de lanzamiento: 48 cartas **[DECISIÓN D-8]**

| Rareza | De sobre | De descubrimiento | Total |
|---|---|---|---|
| Común | 20 | 0 | 20 |
| Rara | 10 | 4 | 14 |
| Épica | 5 | 5 | 10 |
| Legendaria | 2 | 2 | 4 |
| **Total** | **37** | **11** | **48** |

- La estructura de datos debe admitir 120 cartas o más sin cambios de código.
- **El 100 % del álbum es alcanzable gratis.** No existen cartas exclusivas de pago.

**Cartas de sobre ya definidas** (el resto las crea Claude Code como `draft`):

- **Comunes**: Huevo Quemado, Tostada Dudosa, Tomate Triste, Bacon Normal, Patata Sospechosa.
- **Raras**: Vegana Enfadada, DJ del Bacon, Tomate Samurái, Huevo Astronauta.
- **Épicas**: Pan Galáctico.
- **Legendarias**: Trufa Dorada, La Primera Receta.

### 4.4 Cartas de descubrimiento (las 11)

Nunca salen en sobres, nunca se fabrican con fragmentos. Solo se consiguen haciendo algo.

| Carta | Rareza | Condición |
|---|---|---|
| Corona de Bacon | Rara | Descubrir la receta secreta Corona de Bacon |
| Revuelto Místico | Rara | Descubrir la receta secreta Revuelto Místico |
| Sopa del Maestro | Rara | Descubrir la receta secreta Sopa del Maestro |
| Crítico Satisfecho | Rara | Servir a un crítico gastronómico |
| Maestro del Triple Bacon | Épica | Cocinar Triple Bacon 3 veces en un mismo loop |
| Tomate Explosivo | Épica | Descubrir la receta secreta Tomate Explosivo |
| Tortilla Imposible | Épica | Descubrir la receta secreta Tortilla Imposible |
| Chef del Vacío | Épica | Terminar un loop por tiempo con 2 ingredientes o menos en el grid |
| Fiebre Doble | Épica | Activar la fiebre 2 veces en el mismo loop |
| Sello del Maestro Antiguo | Legendaria | Servir al Maestro antiguo |
| La Receta Perdida | Legendaria | Descubrir la receta secreta La Receta Perdida |

En el álbum, las cartas de descubrimiento no conseguidas se muestran como "?" con su acertijo (`hint`), sin revelar la condición exacta.

### 4.5 Animación de nueva carta

1. Texto "¡NUEVA CARTA!".
2. La carta aparece grande (entra girando si es épica o legendaria).
3. Se muestra la rareza: "1★ COMÚN" … "4★ LEGENDARIA".
4. La carta vuela a su hueco del álbum.

**Legendaria**: entra girando → se detiene → el fondo se oscurece ligeramente → brillo → partículas doradas → holograma que recorre la carta → aparece el nombre → pequeña explosión de partículas → pasa al álbum.

- Todas las animaciones de carta se pueden **saltar con un toque**.
- Duraciones máximas: común 1 s, rara 1,5 s, épica 2,5 s, legendaria 4 s.
- Si hay una carta repetida, se muestra la carta con el texto "+X fragmentos" en vez de "¡NUEVA CARTA!".

### 4.6 Fuentes de cartas

| Fuente | Qué da |
|---|---|
| Primera partida (tutorial) | 1 carta fija y garantizada: Tostada Dudosa (común), con un fragmento de lore de bienvenida |
| Final de loop | Probabilidad de 1 carta = `loopCardBase` 15 % + 3 % por pedido servido + 1 % por cada escalón de combo alcanzado, con un máximo de 60 %. Usa las probabilidades de los huecos 1–2 del sobre. |
| Subida de nivel | Un sobre cada 3 niveles |
| Racha diaria | Ver sección 5.5 |
| Sobre gratis por anuncio | 1 sobre, cooldown de 6 h |
| Pase del Maestro | 1 sobre diario sin anuncio |

### 4.7 Sobres

- Sobre estándar: 3 cartas, reveladas una a una.
- Animación: el sobre aparece → pequeño shake → brillo → apertura → sale la carta → reveal → siguiente. La tercera carta tiene una animación algo más especial.
- **Probabilidades por hueco** (configurables):

| Hueco | Común | Rara | Épica | Legendaria |
|---|---|---|---|---|
| 1 y 2 | 75 % | 19,5 % | 5 % | 0,5 % |
| 3 | 0 % | 80 % | 18 % | 2 % |

- **Sobre especial** (día 6 de la racha): el hueco 3 es épica o superior.
- **Garantías (pity)**: una épica como máximo cada `epicPity` (10) sobres y una legendaria como máximo cada `legendaryPity` (40) sobres. No puede salir una legendaria en los primeros `legendaryMinPacks` (5) sobres. Los contadores se guardan en la partida.
- Las cartas de sobre se eligen entre las de su rareza con **prioridad a las que el jugador no tiene** (`newCardBias`: 0,6), para suavizar el problema del coleccionista.

### 4.8 Duplicados y fragmentos

- Una carta repetida se convierte en fragmentos: común 5, rara 15, épica 40, legendaria 120.
- **Fabricar una carta de sobre** que no se tiene: común 40, rara 120, épica 320, legendaria 960. Las cartas de descubrimiento no se fabrican.
- **Variante brillante** (cosmética) de una carta que ya se tiene: común 60, rara 150, épica 400, legendaria 1.000.
- Las cartas no se pueden desmontar (evita bucles de fragmentos).
- Los fragmentos nunca dan ventajas de gameplay.

### 4.9 Álbum

- Grid tipo TCG con ilustración, nombre, rareza (estrellas) y número.
- **Cartas de sobre no conseguidas**: silueta + rareza. **Cartas de descubrimiento no conseguidas**: "?" + acertijo.
- Contador visible: "31 / 48 cartas · 64 % completado". Sin mensajes de urgencia ni de presión.
- Pestaña de recetas: recetas conocidas con su nivel de maestría y acertijos de las secretas disponibles.
- Debe verse bonito incluso casi vacío.

### 4.10 Objetivo de tiempo para completar el álbum **[DECISIÓN D-8]**

- Un jugador gratuito constante (unos 8 loops y 2 sobres por anuncio al día) completa las **cartas de sobre en 6–8 semanas**.
- Claude Code debe crear `scripts/simulateEconomy.js`, que simula 1.000 jugadores con perfiles distintos (ocasional, constante, intenso; con y sin anuncios; con y sin Pase) y ajustar `balance.js` hasta cumplir el objetivo. El informe se guarda en `docs/ECONOMY_REPORT.md`.

---

## 5. PROGRESIÓN

Tres capas: **jugador** (XP y nivel), **álbum** (colección) y **Brûlée** (árbol de utensilios). Regla anti-grind: rápida al principio, más lenta después, pero siempre con una recompensa cercana a la vista.

### 5.1 XP y niveles

- XP necesaria para pasar del nivel n al n+1: `100 + 60 × (n − 1)`.
- Referencia: nivel 2 en 1 loop, nivel 10 en unos 29 loops, nivel 20 en unos 115 loops.
- Nivel máximo de lanzamiento: 30.
- Cada subida de nivel da `20 × nivel` monedas. Cada 3 niveles, además, un sobre.

### 5.2 Tabla única de desbloqueos

Todo desbloqueo del juego sale de **una sola tabla** (`src/data/unlocks.js`). Nada se desbloquea desde otro sitio.

| Disparador | Desbloquea |
|---|---|
| Nivel 1 | Huevo, bacon, pan, tomate, queso · Bacon con Huevo, Tostada con Tomate, Tostada Especial · Cliente tranquilo, estudiante · Capítulo 1 |
| Nivel 2 | Triple Bacon, Revuelto con Queso · Oficinista · Secreta: Corona de Bacon |
| Nivel 3 | Champiñón · Tortilla de Champiñones · Capítulo 2 · Secreta: Tortilla Imposible |
| Nivel 4 | Patata · Patatas Bravas, Bocadillo de Bacon · Turista · Especialidad del día · Secreta: Revuelto Místico |
| Nivel 5 | Cebolla, hierbas · Tortilla de Patatas, Ensalada de la Huerta · Crítico gastronómico |
| Nivel 6 | Pescado · Pescado a las Hierbas, Pescado con Patatas · Chef rival |
| Nivel 7 | Desayuno Completo · Cliente misterioso |
| Nivel 8 | Coleccionista |
| Nivel 10 | Clientes legendarios |
| Aparición de Brûlée | Capítulo 3 · Almacén de Brûlée · Visitante de la Cocina Nocturna · Noche de Brûlée |
| Nodos del árbol | Ver sección 5.4 |
| Capítulos 4–7 | Ver sección 6.3 |

### 5.3 Maestría de recetas

| Nivel | Condición | Recompensa |
|---|---|---|
| 1 | Descubierta | — |
| 2 | Cocinada 10 veces | 50 monedas + 10 fragmentos |
| 3 | Cocinada 50 veces | 200 monedas + 40 fragmentos + efecto visual propio al cocinarla |

La maestría se calcula a partir de `timesCooked`. No se guarda por separado. Nunca da ventajas de puntos ni de tiempo.

### 5.4 Árbol de Brûlée (9 utensilios)

Los utensilios desbloquean **contenido y pequeños cambios estratégicos**, nunca estadísticas acumulables sin límite. Se pagan con monedas de cocina.

| Tier | Utensilio | Coste | Requiere | Efecto |
|---|---|---|---|---|
| T1 | Encimera Rúnica | 400 | Capítulo 3 | El grid pasa a 5x5. Para compensar: hasta 4 clientes y llegada cada 6 s. |
| T2 | Espátula de Cristal | 700 | T1 | Habilidad **Mover**: arrastrar un ingrediente ya colocado a otra casilla libre (3 veces por loop). |
| T2 | Cucharón del Tiempo | 700 | T1 | Ingrediente especial Reloj de Cocina. |
| T3 | Especia Ancestral | 1.400 | 1 utensilio de T2 | Ingrediente especial Especia (comodín). |
| T3 | Cuchillo Místico | 1.400 | 1 utensilio de T2 | Habilidad **Descartar**: mantener pulsado 0,5 s un ingrediente del grid para retirarlo (2 veces por loop). |
| T3 | Batidor Dorado | 1.400 | 1 utensilio de T2 | Recetas Tortilla Francesa y Huevos Rotos. |
| T4 | Olla Encantada | 2.500 | 2 utensilios de T3 | Recetas Guiso Marinero y Crema de Champiñones · habilita la secreta Sopa del Maestro. |
| T4 | Pinzas Gélidas | 2.500 | 2 utensilios de T3 | Habilidad **Congelar**: detiene la paciencia de todos los clientes 5 s (1 vez por loop). |
| T4 | Brochetas Ember | 2.500 | 2 utensilios de T3 | Ingrediente especial Llama · Brocheta de la Huerta · habilita la secreta Tomate Explosivo. |

- Coste total: 13.500 monedas. Objetivo: un jugador constante completa el árbol en 4–6 semanas.
- **Árbol completo**: habilita la Trufa y la secreta La Receta Perdida (final de la historia).
- La Encimera Rúnica no es una sartén. Las sartenes son solo cosméticas (sección 7.5).

### 5.5 Calendario de Pip (antes "streak")

- 7 días de recompensas. Se reclama la primera vez que se abre el juego en un día natural nuevo (fecha local).
- **Saltarse días no reinicia nada**: el calendario solo avanza los días que juegas. Tras el día 7 vuelve al día 1.

| Día | Recompensa |
|---|---|
| 1 | 2 cartas comunes |
| 2 | 30 fragmentos |
| 3 | 1 sobre |
| 4 | 1 carta rara |
| 5 | 50 fragmentos |
| 6 | 1 sobre especial (hueco 3 épica o superior) |
| 7 | 1 carta épica (con prioridad a una que no tengas) |

### 5.6 Monedas y decoración

- **Monedas de cocina**: se ganan jugando. Se gastan en el árbol de Brûlée, en decoración y en sobres de cartas del Almacén (`packPrices`: 900 el normal, 2.400 el especial), y en nada más. Nunca se compran con dinero real, así que un sobre por monedas nunca es contenido aleatorio de pago.
- **Decoración de la cocina**: 16 objetos cosméticos (150–3.000 monedas) que aparecen en la escena de la cocina del menú. Si varios comparten sitio, el jugador elige cuál colocar. Claude Code los crea como `draft`.
- **Rincón mágico de Brûlée**: 5 objetos de decoración que se pagan con **fragmentos** (600–5.000).
- **Fragmentos**: fabricar cartas, variantes brillantes y el rincón mágico.
- El reparto y los tiempos esperados están en `docs/DECISIONES.md` §23 y se comprueban con `scripts/simulatePlaythrough.js`.

---

## 6. HISTORIA

### 6.1 Premisa

- El jugador llega a una pequeña cocina tras encontrar una vieja receta. La cocina es de Chef Pip, que intenta enseñarle a cocinar. El problema: Pip es un desastre. Ha aprendido muchísimo y ha quemado muchísimo más.
- La cocina guarda un secreto: **recuerda**. Cada loop, los platos, ingredientes y utensilios se convierten en cartas, y algunas cartas guardan fragmentos de la historia de Pip y Brûlée.
- El objetivo parece ser cocinar. El objetivo real acaba siendo **descubrir todo el álbum** y, con él, la historia.

### 6.2 Nombre del jugador

- Se pide al principio (Pip pregunta "¿Cómo te llamas?"). Máximo 12 caracteres. Si se deja vacío: "Aprendiz". Se puede cambiar en Ajustes.
- Se usa en diálogos y subtítulos mediante `{nombre}` (reglas de género neutro en la sección 3.6).
- El nombre nunca se envía a analítica ni sale del dispositivo.

### 6.3 Capítulos y disparadores

| Capítulo | Título | Se desbloquea | Contenido en lanzamiento |
|---|---|---|---|
| 1 | La Cocina | Inicio del juego | Completo |
| 2 | El Aprendiz | Nivel 3 | Completo |
| 3 | El Maestro | Aparición de Brûlée: al terminar el primer loop con ≥ 1.200 puntos a partir del loop 5 (`bruleeFromLoop`); **garantizada al terminar el loop 7** si no ha ocurrido antes | Completo |
| 4 | El Baúl | Comprar la Encimera Rúnica | Estructura + diálogos `draft` |
| 5 | La Cocina Nocturna | Nivel 12 y 3 utensilios comprados | Estructura + diálogos `draft` |
| 6 | Las Recetas Perdidas | Nivel 16 y 3 recetas secretas descubiertas | Estructura + diálogos `draft` |
| 7 | La Gran Cocina | Árbol completo; termina al descubrir La Receta Perdida | Estructura + diálogos `draft` |

- **La historia completa es gratuita.** El capítulo 5 se llama "La Cocina Nocturna" y es gratis; el **tema visual** Cocina Nocturna es lo que incluye el Pase.
- La primera aparición de Brûlée ocurre en la pantalla de resultados, nunca interrumpiendo un loop. Frase de entrada: "Así que por fin has encontrado a alguien que aguanta una cocina."
- Cada capítulo desbloquea diálogos y, según la tabla de desbloqueos, cartas, decoración o recetas.
- Escenas de diálogo: como máximo 3 bocadillos por escena, saltables, nunca durante el gameplay (en partida solo frases sueltas de Pip).

### 6.4 Fragmentos de historia (la segunda narrativa)

- 12 fragmentos de historia repartidos en cartas (`storyFragment: 1…12`).
- Al menos 8 de los 12 están en cartas comunes o raras, para que la historia sea accesible sin suerte.
- El álbum tiene una pestaña **Diario de la cocina** que muestra los fragmentos conseguidos en orden, con huecos para los que faltan.
- Leídos en orden, los fragmentos cuentan el secreto (sección 6.5).

### 6.5 El secreto de la historia **[DECISIÓN D-1 — PROPUESTA, requiere aprobación]**

Mientras Daniel no apruebe esta sección, todo el lore se escribe como `draft`.

1. Hace años, Pip fue el aprendiz más prometedor de Brûlée. Tenía talento, pero prefería improvisar a practicar.
2. Brûlée lo preparaba para **La Gran Cocina**, una prueba que se hace una sola vez: cocinar La Receta Perdida, la receta que el propio Brûlée nunca logró terminar.
3. La noche de la prueba, Pip no se presentó. No le faltaba talento: no había practicado lo suficiente y tuvo miedo de fallar delante de su maestro.
4. Brûlée cerró el baúl de utensilios y dejó de enseñar. Antes de marcharse, encantó la cocina para que **recordara** cada plato cocinado en ella, esperando que algún día alguien digno volviera a llenarla de recuerdos. Por eso los platos se convierten en cartas.
5. Pip nunca dejó de sentirse culpable. La vieja receta que encuentra el jugador es una página arrancada de La Receta Perdida. Pip ve en el jugador la oportunidad de conseguir lo que él no hizo.
6. **Final (capítulo 7)**: el jugador cocina La Receta Perdida con Pip a su lado. Brûlée reconoce que el aprendiz de su aprendiz ha terminado lo que él mismo no pudo, y perdona a Pip. En la última escena, Pip se pone el delantal para presentarse, por fin, a su propia prueba.

---

## 7. MONETIZACIÓN

### 7.1 Principios (no negociables)

- Nunca ensuciar el gameplay: sin banners, sin anuncios durante una partida, sin anuncios obligatorios para continuar.
- Nunca vender ventajas de gameplay, energía, vidas, esperas ni monedas.
- **Nunca vender contenido aleatorio.** Todo lo que se compra con dinero real tiene contenido fijo y visible antes de pagar.
- **No hay cartas exclusivas de pago.** El 100 % del álbum y de la historia es alcanzable gratis.
- Todo anuncio es voluntario y el jugador sabe qué recibe antes de verlo.
- No mostrar tienda, anuncios ni menciones de compra hasta que el jugador haya completado 3 loops. El Almacén se abre en el capítulo 3.

### 7.2 Anuncios recompensados

| Tipo | Botón | Recompensa | Límites |
|---|---|---|---|
| `CARD_PACK` | "ABRIR SOBRE — VER ANUNCIO" | 1 sobre de 3 cartas | Cooldown `freePackCooldown` (6 h) |
| `SECOND_CHANCE` | "SOBORNAR A PIP — VER ANUNCIO" | Vacía 8 casillas + 10 s | Solo en desbordamiento, 1 por loop, `secondChanceDailyCap` (3) al día |
| `TRIAL` | "PROBAR — VER ANUNCIO" | Usar una sartén o un utensilio que no se tiene durante 1 loop | `trialDailyCap` (2) al día; nada permanente |

- **La recompensa solo se entrega cuando el proveedor confirma que el anuncio se completó.** Cerrar el anuncio antes no da nada.
- Si no hay anuncio disponible: el botón se desactiva con "Anuncio no disponible". Nunca se rompe el flujo.
- El mock de anuncios solo existe en desarrollo (`import.meta.env.DEV`). En producción, sin SDK, el estado es siempre "no disponible".

### 7.3 Intersticiales

- **No se implementan.** `interstitialEnabled: false`.
- Si en el futuro se añaden, tras medir retención: solo entre loops, nunca durante el gameplay, nunca justo después de una recompensa, nunca tras cada partida y con un cooldown global.

### 7.4 Productos

| Product ID | Nombre | Precio | Tipo | Contenido |
|---|---|---|---|---|
| `kl_maestro_pass` | Pase del Maestro | 4,99 € | Compra única | Álbum Dorado (tema visual del álbum: páginas doradas y borde animado) · 1 sobre diario sin anuncio **[DECISIÓN D-5]** · tema Cocina Nocturna para los loops (fondo oscuro, lluvia en las ventanas, luces cálidas, ingredientes brillantes, música especial) · Sartén Dorada · 15 frases especiales de Pip · futuras mejoras cosméticas compatibles |
| `kl_skin_rusty` | Sartén Oxidada | 1,99 € | Compra única | Sartén vintage oxidada |
| `kl_skin_pink` | Sartén Rosa de Pip | 1,99 € | Compra única | La sartén rosa de Pip |
| `kl_skin_black` | Sartén Negra | 1,99 € | Compra única | Sartén negra profesional |
| `kl_starter_pack` | Pack de Inicio | 0,99 € | Compra única | **Contenido fijo**: 4 cartas comunes y 1 rara concretas, definidas en datos y mostradas antes de comprar. Si ya tienes alguna, recibes fragmentos (se avisa antes de pagar). |

- La Sartén Dorada no se vende por separado y no da ninguna ventaja.
- El Pack de Inicio solo se ofrece en el Almacén, una vez, y sus cartas también se pueden conseguir gratis.

### 7.5 Sartenes (solo cosméticas)

- La sartén equipada está **siempre visible en el fogón** durante la partida (sección 2.1): todas las sartenes del fogón (una por cliente) tienen su aspecto. Es el objeto que más se mira después de la encimera.
  - **En reposo**: echa un poco de vapor y se balancea levemente.
  - **Al cocinar**: los ingredientes saltan de la encimera a la sartén del cliente y chisporrotean con las partículas propias de esa sartén hasta que el plato sale hacia el cliente (sección 2.6).
  - **En ¡en su punto! y en la fiebre**: animación propia (la dorada resplandece, la oxidada suelta más chispas…), sin tapar nunca la encimera ni los pedidos.
  - **Fuera de la partida**: la sartén equipada aparece en la cocina del menú y todas se exponen en la vitrina del Almacén.
- "PROBAR — VER ANUNCIO" presta una sartén durante un loop entero, para decidir si gusta antes de comprarla.
- Valores de `equippedPan`: `default`, `rusty`, `pink`, `black`, `golden`.
- Cada sartén puede cambiar **únicamente**: apariencia, partículas cosméticas y animación cosmética (por ejemplo, chispas naranjas en la oxidada, destellos rosas en la de Pip, humo fino en la negra, destellos dorados en la dorada).
- **Nunca** cambia: velocidad, puntuación, probabilidad de cartas, tiempo, dificultad ni estadísticas.
- `golden` solo se puede equipar si `hasMaestroPass === true`. Si se pierde el derecho (reembolso), se vuelve automáticamente a `default`.

### 7.6 Propiedad de las compras

- La fuente de verdad es Google Play Billing. Al arrancar y al volver del segundo plano se consultan las compras y se actualiza la caché del guardado.
- Nunca se confirma una compra localmente sin respuesta del sistema de pagos. Nunca se confía en una variable visual.
- Botón "Restaurar compras" en Ajustes.
- No se almacenan datos de tarjetas, credenciales ni información sensible: solo identificadores de producto y estados.

### 7.7 Privacidad y Google Play

- Antes de solicitar cualquier anuncio: formulario de consentimiento con una CMP certificada por Google (UMP SDK), obligatorio en el Espacio Económico Europeo. Se respeta lo que elija el jugador.
- Política de privacidad accesible desde Ajustes y desde la ficha de Google Play. Formulario de Seguridad de los datos completado según lo que realmente recogen AdMob y la analítica.
- Público objetivo **[DECISIÓN D-4]**: por defecto, 13+ y no dirigido a niños. Si se incluyen menores de 13, se aplican las normas de Familias de Google Play (anuncios y analítica restringidos) y habrá que revisar este documento.

### 7.8 Sin conexión

- El gameplay completo, el álbum, el árbol y el guardado funcionan sin Internet.
- Sin conexión, los anuncios muestran "Anuncio no disponible" y las compras muestran "Sin conexión". Nunca se simula una recompensa ni una compra.

---

## 8. PANTALLAS, FLUJO Y TUTORIAL

### 8.1 Primera sesión

Logo → Pip se presenta → "¿Cómo te llamas?" → loop tutorial → resultados → **primera carta garantizada** (Tostada Dudosa) → menú.

Objetivo: que en menos de 3 minutos el jugador piense "ya he empezado mi colección".

### 8.2 Loop tutorial (≤ 90 s)

Secuencia de ingredientes fija. El tiempo no corre hasta el paso 5. En cada gesto guiado, la mano de Pip lo muestra: lleva el ingrediente de la bandeja a la casilla, o toca las casillas que brillan.

1. Pip: arrastra el huevo a la encimera.
2. Arrastra el bacon al lado: las casillas brillan.
3. Toca para cocinar: Bacon con Huevo.
4. Llega un cliente que pide Tostada con Tomate: el pan, el tomate a su lado y tocar para cocinar, también guiados. Se sirve solo.
5. Empieza un loop libre de 30 s con recetas de nivel 1.
6. Resultados y primera carta.

No se puede saltar la primera vez (es corto). Se puede repetir desde Ajustes.

### 8.3 Menú principal

- Escena de la cocina en pixel art (con la decoración comprada y la sartén equipada), logo y Pip animado en reposo.
- Botón grande: **JUGAR**.
- Botones secundarios: **ÁLBUM**, **ALMACÉN** (con candado y la puerta cerrada hasta el capítulo 3), **AJUSTES**.
- Indicadores discretos (un punto) si hay un sobre gratis listo o el calendario disponible. Sin contadores de urgencia.

### 8.4 Antes del loop

- Desde el nivel 4: elegir la especialidad del día (1 de 3).
- Opcional: botón "PROBAR — VER ANUNCIO" si hay algo que probar y queda límite diario.

### 8.5 Pantalla de resultados

- Secuencia animada de ≤ 4 s, saltable con un toque: puntuación (y "¡Nuevo récord!" si procede), mejor combo, pedidos completados, barra de XP, monedas, cartas obtenidas, progreso del álbum, nuevos desbloqueos y frase de Pip.
- Botones: **OTRA VEZ** (grande, principal) y **MENÚ**. Del resultado a un loop nuevo en 1 toque.

### 8.6 Álbum

Pestañas: **Cartas** · **Recetas** · **Diario de la cocina**. Incluye el botón de sobre gratis (con el tiempo restante del cooldown), el sobre diario del Pase si lo tiene, fabricar cartas con fragmentos y variantes brillantes.

### 8.7 Almacén de Brûlée

Una habitación llena de objetos, no una tienda web. Brûlée está presente y comenta.

- **Estantería de utensilios**: el árbol de 9 utensilios presentado como objetos físicos por tiers (monedas).
- **Vitrina**: sartenes y Pase del Maestro (dinero real). Cada objeto muestra sprite, nombre, precio, estado y botón comprar / equipar / probar.
- **Rincón de decoración**: objetos para la cocina (monedas).
- **Baúl pequeño**: Pack de Inicio (una sola vez).
- Los precios en monedas y en euros deben distinguirse a simple vista (icono de moneda frente a "€" y botones de color distinto).

### 8.8 Ajustes

Música (volumen) · Efectos (volumen) · Vibración · Reducir animaciones · Colocar tocando · Cambiar nombre · Notificaciones · Repetir tutorial · Restaurar compras · Política de privacidad · Gestionar consentimiento de anuncios · Créditos · Borrar partida (doble confirmación) · Versión.

### 8.9 Pausa y botón Atrás de Android

- En partida, Atrás o pasar a segundo plano → **pausa**. La pausa oculta el grid (desenfoque) y detiene el tiempo.
- Menú de pausa: Reanudar · Reiniciar · Ajustes rápidos · Salir al menú (el loop abandonado no da recompensas ni castigos).
- En el menú principal, Atrás pide confirmación para salir. En el resto de pantallas, vuelve a la anterior.

---

## 9. PRESENTACIÓN

### 9.1 Arte

- Pixel art cozy, base 16 px. Paleta principal: `#fff8e7`, `#ffcc80`, `#ff7043`, `#a78bfa`, con colores secundarios según el contexto. Retro moderno. No copiar diseños de otros juegos.
- **Resolución lógica**: 360 px de ancho fijo × 640 px de alto (se amplía el alto en pantallas más alargadas, sin franjas). Escalado entero al dispositivo, `imageSmoothingEnabled = false`.
- Casillas: 64 px lógicos en 4x4 (sprites ×4) y 48 px en 5x5 (sprites ×3).
- **Assets existentes** (no modificar ni sustituir; el icono solo se redimensiona si es técnicamente necesario):
  - `assets/ref/icon_final.png`, `assets/ref/album_ref.png`, `assets/ref/premium_pans.png`
  - `assets/pan_rusty.png`, `assets/pan_pink.png`, `assets/pan_golden.png`, `assets/pan_black.png`
- **Resto del arte [DECISIÓN D-2]**: todo sprite se referencia mediante `src/assets/manifest.js`. Si falta un asset, se dibuja un **placeholder procedural** claro (forma y color distintivos, inicial del nombre, marco de rareza). Así el juego está completo y cambiar el arte es solo añadir archivos.

### 9.2 Partículas

- Tipos configurables por datos: `spark`, `star`, `steam`, `crumb`, `gold`, `magic`, `fire`, `confetti`, `smoke`.
- Pool de objetos reutilizados. Máximo `maxParticles` (300) simultáneas; 100 con "Reducir animaciones" o si los FPS bajan de 50 de forma sostenida.
- Cuando coinciden varios efectos, prioridad: legendaria > fiebre > ¡en su punto! > combo > micro.

### 9.3 Jerarquía de feedback

| Nivel | Cuándo | Qué | Duración máx. |
|---|---|---|---|
| Micro | Colocar, brillo de receta, números flotantes | Partículas pequeñas, pops | 200 ms |
| Medio | Recetas, combos, pedidos, cartas raras | Shake leve, partículas, texto | 500 ms |
| Grande | ¡En su punto!, fiebre, nuevo capítulo, receta secreta | Flash breve, animación de Pip | 1,5 s |
| Épico | Legendaria, final de capítulo | Secuencia cinematográfica saltable | 4 s |

### 9.4 Animaciones

- Utilidades reutilizables: `animate()`, `shake()`, `pop()`, `fade()`, `slide()`, `particleBurst()`, `cardReveal()`.
- 60 FPS objetivo, duraciones cortas, lectura clara.
- **Reducir animaciones**: desactiva shakes, flashes, giros y estelas; mantiene fundidos y cambios de escala suaves.

### 9.5 Audio

- **Efectos**: ingrediente colocado, brillo de receta, cocinar, combo, ¡en su punto!, fiebre, pedido completado, cliente que se va, desbordamiento, carta nueva, apertura de sobre, firma por rareza (común: pop · rara: chime · épica: whoosh + chime · legendaria: secuencia especial), compra, equipar.
- Mientras no haya efectos definitivos, se sintetizan por código con Web Audio (`src/audio/sfx.js`).
- **Música [DECISIÓN D-3]**: un tema de menú, un tema de partida con una capa extra para la fiebre y una variante para la Cocina Nocturna. Si no hay música todavía, el juego funciona sin ella.
- El audio se desbloquea con el primer toque y se pausa en segundo plano.

### 9.6 Accesibilidad

- Reducir animaciones, silenciar sonidos, volumen de música y de efectos por separado, vibración activable.
- "Colocar tocando" como alternativa al arrastre.
- La rareza nunca depende solo del color (estrellas + forma del marco).
- Zona táctil mínima de 48 dp. Texto de partida legible sin forzar la vista.
- Flashes limitados (sección 2.9).

### 9.7 Vibración

Mediante Capacitor Haptics: leve al cocinar, media en ¡en su punto!, patrón especial con una legendaria. Todo desactivable.

---

## 10. ARQUITECTURA TÉCNICA

### 10.1 Stack

| Pieza | Elección |
|---|---|
| Base | React + Vite + JavaScript |
| Gameplay | Canvas 2D con `requestAnimationFrame` |
| Empaquetado Android | Capacitor |
| Guardado | `@capacitor/preferences` en Android; `localStorage` solo en el navegador durante el desarrollo |
| Sistema | `@capacitor/app` (botón Atrás, primer y segundo plano), `@capacitor/haptics` |
| Anuncios (fase 7) | Plugin de AdMob para Capacitor + UMP para el consentimiento |
| Pagos (fase 7) | Plugin de Google Play Billing para Capacitor **[DECISIÓN D-7]** |
| Tests | Vitest |

No añadir dependencias fuera de esta lista sin justificarlas en `docs/DECISIONES.md`.

### 10.2 Estructura de carpetas

```
kitchen-loop/
├── CLAUDE.md
├── docs/            KITCHEN_LOOP_SPEC.md · DECISIONES.md · CONTENT_REVIEW.md · ECONOMY_REPORT.md
├── scripts/         simulateEconomy.js
├── assets/          ref/ y sartenes existentes (no tocar)
└── src/
    ├── main.jsx · App.jsx        (App solo enruta pantallas)
    ├── screens/      Splash, NameInput, Menu, PreLoop, Game, Results, Album, Warehouse, Settings
    ├── components/   Button, CardView, PackOpening, DialogBubble…
    ├── game/         engine, grid, tray, recipeMatcher, customers, combo, scoring, abilities, modifiers, renderer/
    ├── systems/      particles, animations, dialogue, unlocks, story, calendar
    ├── cards/        drops, packs, fragments, album
    ├── economy/      rewards, progression
    ├── inventory/    inventory.js
    ├── save/         saveManager, storageAdapter, schema, migrations
    ├── monetization/ adManager, shop, consent, mocks/
    ├── analytics/    analytics.js
    ├── audio/        audioManager, sfx, music
    ├── data/         balance, ingredients, recipes, customers, cards, skins, utensils, unlocks,
    │                 chapters, dialogues, decor, modifiers, calendar, i18n/es.js
    ├── assets/       manifest.js
    └── utils/        rng, time, platform
```

### 10.3 Motor de juego fuera de React

- La lógica de partida (`src/game/`) es JavaScript puro, **sin DOM ni React**, para poder testearla y usarla en el simulador.
- Actualización con paso fijo (1/60 s) y renderizado separado. El HUD de partida se dibuja en el canvas.
- React solo monta el canvas, arranca el motor y recibe eventos (`onLoopEnd`, `onOverflow`, `onPause`). **Nada de `setState` por fotograma.**
- La entrada táctil usa Pointer Events con `touch-action: none` en el canvas, y se traduce a acciones (`placeIngredient`, `cookAt`, `useAbility`).
- Aleatoriedad con un RNG con semilla (`src/utils/rng.js`) para tests y simulación reproducibles.

### 10.4 Idioma

- Todo texto visible sale de `src/data/i18n/es.js` mediante `t(key, vars)`, con interpolación de `{nombre}`.
- Idioma de lanzamiento **[DECISIÓN D-6]**: español e inglés (`src/data/i18n/en.js`, traducción `draft`). Añadir otro idioma es añadir un archivo y registrarlo en `LANGUAGES` (`src/utils/i18n.js`).
- **Selector de idioma**: es la primera pantalla de una partida nueva, antes de que Pip diga nada. Aparece primero, destacado, el idioma del dispositivo si el juego lo tiene; si no, inglés. Se cambia cuando se quiera en Ajustes (`settings.language`). Una clave que falte en un idioma se muestra en español.
- Fuente de pixel art con soporte completo de á, é, í, ó, ú, ü, ñ, ¿ y ¡. Verificarlo en el canvas.

### 10.5 Configuración de balance (`src/data/balance.js`)

Todas estas claves existen con los valores de este documento y ninguna se repite como número en la lógica:

`loopDuration`, `timeBonusPerOrder`, `comboWindow`, `comboMultipliers`, `perfectWindow`, `feverThreshold`, `feverDuration`, `feverMultiplier`, `maxCustomers`, `customerInterval`, `customerPatience`, `orderBias`, `orderBonus`, `counterSaleMultiplier`, `goldenIngredientChance`, `secondChanceTime`, `secondChanceCells`, `secondChanceDailyCap`, `trialDailyCap`, `freePackCooldown`, `adsMinLoops`, `loopCardBase`, `loopCardPerOrder`, `loopCardPerComboStep`, `loopCardMax`, `packRates`, `epicPity`, `legendaryPity`, `legendaryMinPacks`, `newCardBias`, `duplicateFragments`, `craftCost`, `shinyCost`, `xpCurve`, `levelCoinReward`, `packEveryNLevels`, `maxLevel`, `masteryThresholds`, `masteryRewards`, `utensilCosts`, `runicGrid`, `loopModifiersEnabled`, `loopModifiersFromLevel`, `bruleeScoreThreshold`, `bruleeFromLoop`, `bruleeGuaranteedLoop`, `maxParticles`, `interstitialEnabled`.

### 10.6 Ciclo de vida en Android

- Pantalla bloqueada en vertical. Márgenes seguros (notch y barra de navegación) respetados.
- Segundo plano → pausa del loop, del audio y guardado inmediato.
- Vuelta a primer plano → refrescar compras y cooldowns.
- Botón Atrás según la sección 8.9.

### 10.7 Rendimiento

- 60 FPS objetivo en un Android de gama media; jugable sin tirones en gama baja.
- Pools de objetos para partículas y textos flotantes (sin basura por fotograma).
- Capas estáticas (fondo, encimera) pre-renderizadas en un canvas fuera de pantalla.
- Carga diferida de ilustraciones de cartas, contenido del Almacén y animaciones especiales.

---

## 11. ESTADO Y GUARDADO

### 11.1 Esquema del guardado (`saveVersion: 1`)

```js
{
  saveVersion: 1,
  createdAt, lastSavedAt, lastSeenTimestamp,
  player: { name: 'Aprendiz', level: 1, xp: 0 },
  tutorialDone: false,
  stats: { loopsPlayed, bestScore, bestCombo, totalOrders, overflows },
  coins: 0,
  fragments: 0,
  cards: { /* cardId: { count, firstObtainedAt, shiny } */ },
  recipes: { /* recipeId: { discovered, timesCooked } */ },   // la maestría se deriva
  unlockedItems: [],          // utensilios y decoración comprados
  decor: { /* slot: itemId */ },
  story: { chapter: 1, seenScenes: [], bruleeMet: false },
  pity: { packsOpened, packsSinceEpic, packsSinceLegendary },
  cooldowns: { lastFreePackTime, lastPassPackDate },
  dailyCaps: { date, secondChances, trials },
  calendar: { dayIndex: 0, lastClaimDate: null },
  entitlements: { maestroPass, skins: [], starterPack, starterPackGranted, verifiedAt }, // caché de Billing
  equippedPan: 'default',
  grantedRewards: [],         // últimos 50 ids de recompensa, evita dobles entregas
  settings: { music, sfx, vibration, reducedMotion, tapToPlace, notifications },
}
```

`hasMaestroPass` y `ownedSkins` se leen de `entitlements`. No se guardan por duplicado.

### 11.2 saveManager

- Adaptador de almacenamiento: Preferences en Android, `localStorage` en el navegador.
- **Escritura segura**: se escribe en una clave temporal, luego en la principal, y se conserva una copia de la última partida válida.
- **Carga**: validar (tipos, rangos, sin negativos ni `NaN`, ids existentes). Si falla, usar la copia. Si también falla, partida nueva y evento `save_reset`.
- **Migraciones**: `migrations[versión]` aplicadas en orden.
- **Cuándo se guarda**: al terminar un loop, al abrir un sobre, al comprar o cambiar un derecho de compra, al reclamar el calendario, al comprar en el Almacén, al cambiar ajustes o nombre y al pasar a segundo plano.
- No se guarda el estado de un loop en curso: cerrar la app a mitad de loop lo anula, sin castigo.
- Ningún dato crítico vive solo en estado de componentes React.

### 11.3 Inventario (`src/inventory/inventory.js`)

Único punto que modifica monedas, fragmentos, cartas, sartenes, equipamiento, Pase y objetos desbloqueados. Cada operación valida, registra en analítica y marca el guardado como pendiente (`addCoins`, `spendCoins`, `addCard`, `craftCard`, `equipPan`, etc.). Nada más en el código modifica estos datos directamente.

### 11.4 Protección contra exploits

El juego es de un solo jugador y sin rankings, así que manipular el guardado local solo afecta a quien lo hace. Se protege lo razonable:

- **Reloj retrocedido**: si la hora actual es más de 5 minutos anterior a `lastSeenTimestamp`, cooldowns, límites diarios y calendario usan `lastSeenTimestamp` hasta que la hora real lo alcance.
- **Valores absurdos** en el guardado (negativos, fuera de límites, ids desconocidos): se corrigen o eliminan al cargar.
- **Compras**: la propiedad siempre se confirma con Billing. La caché solo sirve sin conexión.
- **Dobles recompensas**: cada recompensa tiene un id único; `finalizeLoop` es idempotente.
- **Pruebas por anuncio**: nunca se guardan; se limpian al terminar el loop y al cargar.
- **Fragmentos**: fabricar cuesta más de lo que da un duplicado y no se desmontan cartas.
- **Pack de Inicio**: se entrega una sola vez (`starterPackGranted`).

---

## 12. MONETIZACIÓN: IMPLEMENTACIÓN

### 12.1 `src/monetization/adManager.js`

```js
isRewardedAvailable(type) → boolean
showRewarded(type, onReward) → Promise<{ status: 'rewarded' | 'dismissed' | 'unavailable' | 'error' }>
// type: 'SECOND_CHANCE' | 'CARD_PACK' | 'TRIAL'
// onReward se llama solo con status 'rewarded' confirmado por el proveedor.
// Nunca lanza excepciones: cualquier fallo devuelve 'error' o 'unavailable'.
```

- Aplica límites y cooldowns antes de mostrar nada.
- No solicita anuncios hasta tener el resultado del consentimiento (`consent.js`).
- Mock solo en desarrollo, con opciones para simular: completado, cerrado antes de tiempo, no disponible y error.

### 12.2 `src/monetization/shop.js`

```js
buyMaestroPass() · buySkin(id) · buyStarterPack()
  → Promise<{ status: 'purchased' | 'pending' | 'cancelled' | 'unavailable' | 'error' }>
getOwnedProducts() · hasMaestroPass() · restorePurchases() · refreshEntitlements()
```

- `pending` (pagos pendientes de Google Play) no entrega nada hasta completarse.
- Reembolsos y revocaciones retiran el derecho y desequipan lo que corresponda.
- Mock en desarrollo con los mismos estados.

---

## 13. ANALÍTICA Y MÉTRICAS

### 13.1 Eventos (`src/analytics/analytics.js`)

`game_start`, `game_complete`, `loop_overflow`, `second_chance_offered`, `second_chance_used`, `loop_modifier_chosen`, `recipe_discovered`, `card_unlocked`, `rare_card_unlocked`, `epic_card_unlocked`, `legendary_card_unlocked`, `pack_opened`, `card_crafted`, `utensil_bought`, `chapter_unlocked`, `calendar_claimed`, `tutorial_step`, `tutorial_complete`, `rewarded_ad_started`, `rewarded_ad_completed`, `rewarded_ad_failed`, `shop_opened`, `purchase_started`, `purchase_completed`, `skin_equipped`, `maestro_pass_owned`, `consent_result`, `save_recovered`, `save_reset`.

- Sin datos personales: nunca el nombre del jugador ni texto libre.
- Al principio es un logger (consola en desarrollo y contadores locales). El proveedor real se decide más adelante y debe figurar en la política de privacidad.

### 13.2 Métricas a observar tras el lanzamiento

DAU, MAU, retención D1/D7/D30, duración media de sesión, loops por sesión, cartas obtenidas, anuncios recompensados vistos, conversión de compras, ingreso por usuario y abandono durante el tutorial. No asumir resultados: el balance se ajusta con datos reales.

---

## 14. FASES DE DESARROLLO

Cada fase termina con su criterio de aceptación cumplido, tests en verde, informe breve y validación de Daniel. **No se avanza de fase sin esa validación.**

> Cambio respecto a la v3.0: la persistencia y la economía pasan a las fases 1–2 (la progresión necesita guardar desde el principio) y Android se prueba antes de integrar pagos reales.

### Fase 0 — Análisis (sin código)

- Leer el documento entero y crear `docs/DECISIONES.md` con: preguntas abiertas, contradicciones que aún detectes, riesgos técnicos, decisiones D-x pendientes y la lista de dependencias propuesta.
- **Aceptación**: Daniel responde a `DECISIONES.md`. No se escribe código en esta fase.

### Fase 1 — Núcleo en cajas grises

- Proyecto Vite + React, motor de canvas, grid 4x4, bandeja con vista previa, arrastrar y "colocar tocando", matcher de recetas (visibles y secretas), tocar para cocinar con prioridades, servir, clientes comunes con paciencia, combos, ¡en su punto!, fiebre (feedback mínimo), desbordamiento, segunda oportunidad con mock, fin de loop, resultados simples, pausa, `balance.js`, `t()`, guardado básico (récord y estadísticas) con el adaptador de almacenamiento y placeholders procedurales.
- **Tests**: matcher (todos los patrones, prioridades, secretas), detección de desbordamiento, ventana de combo, puntuación, generación de ingredientes con semilla.
- **Aceptación**: jugable en el navegador del móvil, 60 FPS, sin errores de consola. **PARADA OBLIGATORIA: Daniel juega 20 loops y confirma que el núcleo divierte.** Si no divierte, se ajusta aquí, no en fases posteriores.

### Fase 2 — Progresión, colección y economía

- XP, niveles, tabla de desbloqueos, monedas, recompensas de loop, cartas, sobres (garantías y prioridad a cartas nuevas), fragmentos, fabricación, variantes brillantes, álbum (3 pestañas), descubrimientos, maestría, calendario de Pip, `inventory.js`, guardado completo con validación, copia de seguridad y migraciones, y `simulateEconomy.js` con su informe.
- **Aceptación**: tests en verde, economía dentro de los objetivos de las secciones 4.10 y 5.4, guardar y recargar sin pérdidas.

### Fase 3 — Presentación

- Partículas, animaciones, revelado de cartas y sobres, Pip (expresiones con placeholder) y sistema de frases, efectos de sonido sintetizados, música si existe, fiebre completa, vibración, "Reducir animaciones" y ajustes de audio.
- **Aceptación**: jerarquía de feedback respetada, todo lo largo es saltable, 60 FPS en gama media.

### Fase 4 — Historia y Brûlée

- Pantalla de nombre, tutorial, capítulos 1–3 completos y estructura de 4–7, aparición de Brûlée, Almacén (vitrina con mock), árbol de utensilios con habilidades, ingredientes especiales y recetas, decoración, especialidad del día, clientes especiales y legendarios, sorpresas.
- **Aceptación**: se cumple la sección 18.1 con alguien que nunca haya visto el juego.

### Fase 5 — Monetización mock

- `adManager` y `shop` con mocks, Pase del Maestro, sartenes, Pack de Inicio, pruebas por anuncio, límites diarios, equipamiento validado, tema Cocina Nocturna y Álbum Dorado.
- **Aceptación**: todos los puntos de monetización del checklist 15.3.

### Fase 6 — Android

- Capacitor, Preferences en el adaptador de guardado, botón Atrás, primer y segundo plano, Haptics, márgenes seguros, orientación vertical, icono y pantalla de inicio, analítica en modo logger.
- **Aceptación**: 100 loops en un dispositivo real de gama media sin cierres inesperados; el guardado sobrevive a forzar el cierre de la app.

### Fase 7 — Monetización real

- AdMob + UMP, Google Play Billing, productos en Play Console, consulta de compras al arrancar, pagos pendientes, reembolsos, política de privacidad y Seguridad de los datos.
- **Aceptación**: pruebas con cuentas de prueba de Google Play y anuncios de prueba (nunca anuncios reales durante el desarrollo).

### Fase 8 — Pulido y prueba interna

- 100 loops internos buscando bugs, exploits, loops aburridos, recompensas excesivas o insuficientes, dificultad injusta y problemas de lectura. Ajuste final de balance y checklist 15.3 completo.

---

## 15. PRUEBAS

### 15.1 Automáticas (Vitest)

- Guardar, cargar, reiniciar, migrar y recuperar un guardado corrupto.
- Matcher de recetas, prioridades y descubrimiento de secretas.
- Desbordamiento, combos, fiebre, puntuación.
- Drops, garantías de épica y legendaria, prioridad a cartas nuevas (con semilla).
- Duplicados → fragmentos, fabricación, variantes.
- Cooldown del sobre gratis, incluido el reloj retrocedido.
- Calendario (días saltados sin reinicio).
- Pase, Sartén Dorada protegida, sartenes, equipamiento y desequipado por reembolso.
- Segunda oportunidad: solo en desbordamiento, una por loop, límite diario y recompensas calculadas después.
- Las pruebas por anuncio no persisten.
- **Integridad de datos**: ids únicos; todos los ingredientes de cada receta se desbloquean antes o a la vez que la receta; cada secreta tiene su carta de descubrimiento; cada carta referenciada existe; todas las claves de texto existen en `es.js`; los fragmentos por duplicado son siempre menores que el coste de fabricar.

### 15.2 Manuales

Pantallas pequeñas (5"), grandes (6,7") y alargadas (20:9) · gama baja · sin conexión · segundo plano a mitad de loop · botón Atrás en cada pantalla · forzar cierre · cambio de hora del sistema.

### 15.3 Checklist final

- [ ] Primera y segunda partida funcionan
- [ ] El tutorial dura menos de 90 s y da la primera carta
- [ ] Guardar, recargar y recuperar un guardado corrupto funcionan
- [ ] Recetas visibles, secretas y de utensilios funcionan
- [ ] Clientes, combos, ¡en su punto! y fiebre funcionan
- [ ] El desbordamiento y la segunda oportunidad funcionan
- [ ] Cartas, sobres, garantías, duplicados, fragmentos y álbum funcionan
- [ ] Calendario, maestría y árbol de Brûlée funcionan
- [ ] Pip y Brûlée funcionan; los capítulos se desbloquean con sus disparadores
- [ ] El Almacén funciona; las sartenes funcionan; la Dorada está protegida por el Pase
- [ ] El Pack de Inicio tiene contenido fijo y visible antes de pagar
- [ ] El mock de anuncios funciona y no existe en producción
- [ ] No hay banners ni anuncios obligatorios ni ventajas de pago
- [ ] No se muestra nada de pago antes de 3 loops ni el Almacén antes del capítulo 3
- [ ] Animaciones, partículas, sonidos, vibración y ajustes funcionan; "Reducir animaciones" funciona
- [ ] El juego básico funciona sin conexión
- [ ] Todas las tildes, ñ, ¿ y ¡ se ven bien en el canvas y en los menús
- [ ] Sin errores críticos de consola ni fugas de memoria evidentes
- [ ] Ningún elemento queda fuera de pantalla en ningún móvil probado
- [ ] 60 FPS objetivo durante el gameplay

---

## 16. DECISIONES PENDIENTES DE DANIEL

Mientras una decisión no esté cerrada, Claude Code usa el valor por defecto y no bloquea el desarrollo, salvo que se indique lo contrario.

| Id | Decisión | Valor por defecto |
|---|---|---|
| D-1 | Secreto de la historia (sección 6.5) | Propuesta incluida; el lore se escribe como `draft` hasta su aprobación |
| D-2 | Origen del arte (Pip, Brûlée, clientes, ingredientes, cartas) | Placeholders procedurales vía `manifest.js` |
| D-3 | Música | Sin música o con loops provisionales; efectos sintetizados |
| D-4 | Público objetivo | 13+, no dirigido a niños |
| D-5 | ¿Mantener el sobre diario extra del Pase? | Se mantiene, porque el 100 % del álbum es alcanzable gratis |
| D-6 | Idioma de lanzamiento | Español e inglés (inglés `draft`), con selector al empezar y en Ajustes |
| D-7 | Plugin de pagos | Se decide en la fase 7 |
| D-8 | Tamaño del álbum y tiempo para completarlo | 48 cartas; 6–8 semanas para un jugador gratuito constante |
| D-9 | Especialidad del día (capa roguelite) | Activada desde el nivel 4, desactivable por configuración |
| D-10 | Segunda oportunidad solo en desbordamiento | Sí |
| D-11 | Nombres y lista de recetas de lanzamiento (sección 3.2) | Los de este documento |

---

## 17. NO HACER

- Energía, vidas limitadas, stamina o esperas obligatorias.
- Pases de batalla agresivos.
- Contenido aleatorio de pago (cajas de botín), con o sin obligación.
- Cartas o contenido de historia exclusivos de pago.
- Publicidad durante el gameplay, banners o anuncios obligatorios.
- Ventajas de pago o estadísticas infinitas.
- Recompensas simuladas en producción.
- Sistemas sociales, multijugador, chat o ranking online.
- Notificaciones alarmistas o más de una al día (y siempre desactivables).
- Castigos excesivos, pérdida agresiva de progreso, FOMO o presión de compra.

---

## 18. CRITERIOS DE ÉXITO Y CALIDAD

### 18.1 Éxito

Una persona que nunca haya visto el juego debe poder, en pocos minutos: abrirlo, empezar una partida, entender qué hacer, completar una combinación, recibir una recompensa, descubrir una carta y querer volver a jugar.

### 18.2 Calidad

El resultado no debe sentirse como "una web convertida en app", sino como "un pequeño videojuego móvil completo": animaciones, sonido, feedback, personajes, colección, historia y descubrimiento integrados.

### 18.3 Instrucción final

Construye KITCHEN LOOP como un producto completo, no como una demo. Eso **no** significa añadir sistemas: significa que los sistemas de este documento estén terminados, conectados y pulidos.

La sensación final debe ser: **"Es pequeño, pero parece un juego de verdad."**
