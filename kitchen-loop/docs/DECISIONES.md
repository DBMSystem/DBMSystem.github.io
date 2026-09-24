# KITCHEN LOOP — Decisiones (Fase 0)

> Documento vivo. Cada punto indica **qué se ha decidido por ahora** y **por qué**.
> Daniel pidió no esperar su respuesta en la Fase 0: toda duda se ha resuelto con el valor por defecto de la sección 16 o con la opción más sencilla. Cualquier línea se puede cambiar; basta con indicarlo.
>
> Estado: **Fase 0 cerrada provisionalmente, Fase 1 implementada. Pendiente: validación de Daniel (parada obligatoria tras la Fase 1).**

---

## 1. Decisiones D-x (sección 16) — se aplica el valor por defecto

| Id | Decisión | Valor aplicado |
|---|---|---|
| D-1 | Secreto de la historia | Propuesta de la sección 6.5. Todo lore se escribirá como `draft` (no afecta a la Fase 1). |
| D-2 | Origen del arte | **Actualizado**: Daniel ha aportado imágenes de referencia (ver sección 7). Los sprites se recortan de ellas y pasan por `src/assets/manifest.js`; lo que no tiene arte sigue usando placeholders procedurales. |
| D-3 | Música | Sin música. Los efectos sintetizados son de la Fase 3: **todavía no hay sonido**. |
| D-4 | Público objetivo | 13+, no dirigido a niños. |
| D-5 | Sobre diario del Pase | Se mantiene (Fase 5). |
| D-6 | Idioma | Español; todo texto sale de `src/data/i18n/es.js` mediante `t()`. |
| D-7 | Plugin de pagos | Se decide en la Fase 7. |
| D-8 | Álbum | 48 cartas; 6–8 semanas (Fase 2). |
| D-9 | Especialidad del día | Activada desde el nivel 4 y desactivable (`loopModifiersEnabled`). Se implementa en la Fase 4. |
| D-10 | Segunda oportunidad solo en desbordamiento | Sí. |
| D-11 | Recetas de lanzamiento | Las de la sección 3.2, sin cambios. |

---

## 2. Contradicciones y ambigüedades detectadas (y cómo se resuelven)

### Núcleo jugable (afectan a la Fase 1)

1. **Combo y ¡En su punto! se solapan en el tiempo.** ¡En su punto! (3 recetas en ≤ 4 s) se evalúa con una ventana deslizante. **Decisión**: al activarse, el contador se vacía; hacen falta otras 3 recetas para volver a activarlo.
2. **Fiebre "al llegar a una cadena ≥ 6".** Lectura literal: en cada cocción, si la cadena es ≥ 6 y no hay fiebre activa, se activa. Si el jugador mantiene la cadena al terminar la fiebre, se reactiva en la siguiente cocción. Así "Fiebre Doble" (carta) es alcanzable. La receta que activa la fiebre ya recibe el multiplicador de fiebre.
3. **`comboWindow × 1,5` durante la fiebre** es un número de balance: se añade la clave `feverComboWindowMultiplier` a `balance.js`.
4. **Otros números sin clave en la lista de la sección 10.5** (se añaden a `balance.js`, la lista de la especificación no es exclusiva): `gridSize` (4), `maxRecipeSize` (4), `firstCustomerAt` (1 s), `cookDuration` (0,4 s), `smallOrdersFirst`, `cheapRecipeMaxPoints`, `smallRecipeMaxSize`, `gridNearlyFullCells` (13), `dragLiftOffset` (40 px). Los valores visuales puros (tamaños de dibujo, colores) viven como constantes con nombre en el renderer.
5. **Puntos de una venta de mostrador**: se interpreta como `puntos de receta (con combo y fiebre) × counterSaleMultiplier`. Fórmula única: `base × combo × fiebre × (pedido ? 1 + orderBonus : counterSaleMultiplier)`, redondeado.
6. **"Al principio se priorizan las recetas pequeñas"** (pedidos). **Decisión**: los primeros `smallOrdersFirst` (2) pedidos de cada loop solo piden recetas del tamaño más pequeño disponible.
7. **Filtros de pedido por cliente**: "recetas pequeñas" = tamaño ≤ `smallRecipeMaxSize` (2); "recetas baratas" = puntos ≤ `cheapRecipeMaxPoints` (100); "cualquiera" y "aleatoria" = cualquier receta pedible, al azar uniforme. Si un filtro deja la lista vacía, se usa la lista completa. Se evita repetir un pedido que ya está activo si hay alternativa.
8. **Llegada de clientes con los huecos llenos**: se evalúa cada `customerInterval`; si no hay hueco, ese cliente no llega (el siguiente llega en el siguiente intervalo). Es la regla más simple.
9. **Generación de ingredientes con `orderBias`**: "un ingrediente que falte" = de las recetas de los pedidos activos, los ingredientes cuya cantidad requerida supera la que ya hay en la encimera + bandeja. Si no falta ninguno, se usa la bolsa ponderada normal. La bolsa ponderada es un sorteo por pesos (`weight` en `ingredients.js`, todos 1 por ahora).
10. **Casilla de destino al arrastrar**: como el ingrediente se dibuja 40 px por encima del dedo, la casilla de destino es la que queda bajo el ingrediente dibujado, no bajo el dedo.
11. **Empates al cocinar**: tras las 3 prioridades (tamaño → pedido activo → puntos), se elige la primera coincidencia encontrada (orden estable por casillas). Si una casilla toca dos Bacon con Huevo posibles, se cocina uno de ellos de forma determinista.
12. **Qué es "receta cocinable"** (brillo y desbordamiento): las recetas desbloqueadas conocidas + las secretas con su requisito cumplido aunque no se hayan descubierto (porque al tocarlas se cocinan). Solo brillan las conocidas. Un grid lleno con una secreta posible **no** se desborda.
13. **Casillas durante la animación de cocción**: el ingrediente se retira al tocar (los puntos se dan en ese momento) y la casilla queda bloqueada `cookDuration`. Una casilla bloqueada cuenta como libre para el desbordamiento (se va a liberar), pero no acepta ingredientes.
14. **Segunda oportunidad cuando ya se usó**: el segundo desbordamiento del loop muestra el aviso sin botón de anuncio y termina el loop.
15. **Bacon Fest "Triple Bacon entra en los pedidos"**: Triple Bacon ya es pedible desde el nivel 2. **Decisión (Fase 4)**: en Bacon Fest, Triple Bacon tiene prioridad (más peso) en los pedidos.
16. **Nombres visibles de ingredientes, recetas y clientes**: la sección 3.2 los pone en los datos, pero la regla 5 exige `t()`. **Decisión**: los datos solo llevan `id`; los nombres están en `es.js` (`ingredient.egg`, `recipe.bacon_egg`, `customer.calm`…). En la Fase 2 se aplicará lo mismo a las cartas (`card.<id>.name`).
17. **Pip en la Fase 1**: Pip y su sistema de frases son de la Fase 3. En la Fase 1 su esquina queda reservada y vacía. "Pip reacciona" cuando un cliente se va se sustituye por un aviso visual mínimo.
18. **Tutorial y pantalla de nombre**: Fase 4. La Fase 1 empieza directamente en el menú.
19. **Ingrediente dorado y clientes especiales**: son "sorpresas" (Fase 4). En la Fase 1 solo hay clientes comunes y no hay dorados; las claves de balance ya existen.
20. **Nivel del jugador en la Fase 1**: todavía no hay XP (Fase 2), así que el jugador sería siempre nivel 1 (3 recetas). **Decisión**: el menú muestra un selector **"Nivel de prueba"** (1–7), solo para la Fase 1, que decide qué contenido de la tabla de desbloqueos está activo (ingredientes, recetas, secretas y clientes). No es un sistema del juego: desaparece en la Fase 2, cuando el nivel real venga de la XP.
21. **"Bocadillo de Bacon"**: `line, ordered` con pan-bacon-pan es simétrico; el orden se comprueba en ambos sentidos como dice la sección 2.4.

21b. **"Colocar tocando" sin pantalla de Ajustes**: la pantalla de Ajustes es de fases posteriores. En la Fase 1 el ajuste está en el menú y en los ajustes rápidos de la pausa, y se guarda.
21c. **Pausa en navegador**: botón de pausa en el HUD, tecla Escape y paso a segundo plano (`visibilitychange`). El botón Atrás de Android llega en la Fase 6.
21d. **FPS**: contador pequeño abajo a la derecha, solo en desarrollo/playtest.
21e. **`CLAUDE.md`**: no se ha tocado la línea "Fase actual"; la actualiza Daniel al validar.

### Resto del documento (no afectan a la Fase 1; se revisarán en su fase)

22. **Monedas por pedido** (2.14) usan "multiplicador de pago del cliente"; en la venta de mostrador no hay cliente → multiplicador 0 (no suma a `pedidos servidos`).
23. **Sección 7.1 "no mostrar tienda hasta 3 loops"** frente a la segunda oportunidad con anuncio (2.11), que puede aparecer en el primer desbordamiento. **Decisión provisional**: la segunda oportunidad no es tienda, pero sí es "mención de anuncio". Para respetar 7.1 se ofrecerá solo a partir de `adsMinLoops` (3) loops completados. En la Fase 1 se aplica ya (clave `adsMinLoops`).
24. **Estructura de carta** (4.2) tiene `name`, `description` y `lore` en datos: se moverán a `es.js` por la decisión 16.
25. **Capítulo 3 "a partir del loop 3"** y **segunda oportunidad** cuentan loops terminados, no abandonados.
26. **Reloj retrocedido** (11.4): se implementa en la Fase 2 junto a cooldowns y calendario. En la Fase 1 el límite diario de segunda oportunidad usa la fecha local sin esa protección.

---

## 3. Riesgos técnicos

| Riesgo | Mitigación |
|---|---|
| Escalado entero (9.1) con anchos de pantalla que no son múltiplo de 360 dejaría franjas laterales. | Fase 1: escala fraccionaria con el ancho lógico fijo de 360 y `imageSmoothingEnabled = false`; el texto y las formas se ven nítidos. El escalado entero se revisará cuando llegue el pixel art real (D-2). |
| Fuente pixel art con á, é, í, ó, ú, ü, ñ, ¿, ¡ (10.4). | Fase 1 usa la fuente del sistema (soporta todos los caracteres). La fuente pixel se elige en la Fase 3 y se verifica en canvas. |
| Rendimiento del matcher (enumerar recetas en cada cambio). | Se enumeran subconjuntos conexos de ≤ 4 casillas (pocos cientos en 4x4/5x5) solo cuando cambia el grid, no por fotograma. |
| React y 60 FPS. | El motor es JS puro con paso fijo 1/60; React solo monta el canvas y recibe `onLoopEnd`, `onOverflow`, `onPause`. |
| Mock de anuncios en la versión de prueba del móvil. | La regla dice "solo en desarrollo". Se define un modo de compilación **`playtest`** (compilación de pruebas, no producción) que también activa el mock. La compilación `production` (la de Android) nunca lo incluye. |
| Assets de referencia recibidos como **capturas de pantalla JPEG** del móvil (con la barra de Meta AI). | Guardados tal cual en `assets/ref/originals/` y recortados en `assets/ref/`. Los sprites derivados tienen menos calidad que los PNG originales: si Daniel tiene los archivos originales, sustituyen a las capturas y se vuelve a ejecutar el script (sección 7). |
| Guardado en navegador (`localStorage`) puede borrarse al limpiar datos. | Aceptable en desarrollo; en Android se usará `@capacitor/preferences` (Fase 6) mediante el mismo adaptador. |
| Repositorio = web de GitHub Pages (`dbmsystem.github.io`), con `app-ads.txt` en la raíz. | El proyecto vive en `kitchen-loop/` y no toca la raíz salvo un `.nojekyll` (para que Pages sirva los archivos tal cual) y un `CLAUDE.md` que apunta al del proyecto. La compilación de pruebas se publica en `kitchen-loop/play/`. |

---

## 4. Ubicación del proyecto y cómo se prueba

- Código en `kitchen-loop/` (estructura de la sección 10.2).
- `npm run dev` — servidor de desarrollo (con `--host` para abrirlo desde el móvil en la misma wifi).
- `npm run build:playtest` — compila la versión de pruebas en `kitchen-loop/play/`, que se sube al repositorio para poder jugarla desde GitHub Pages (`https://dbmsystem.github.io/kitchen-loop/play/`) cuando la rama esté publicada. Es la única carpeta compilada que se versiona.
- `npm test` — Vitest.

---

## 5. Dependencias propuestas

| Paquete | Uso | Fase |
|---|---|---|
| `react`, `react-dom` | Pantallas | 1 |
| `vite`, `@vitejs/plugin-react` | Build y servidor de desarrollo | 1 |
| `vitest` | Tests | 1 |
| Python + Pillow + numpy (fuera de `package.json`) | Solo `scripts/extract_sprites.py`, para regenerar los sprites a partir de las referencias | Herramienta de desarrollo |
| `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` | Empaquetado Android | 6 |
| `@capacitor/preferences`, `@capacitor/app`, `@capacitor/haptics` | Guardado, ciclo de vida, vibración | 6 (Haptics puede adelantarse a la 3 con fallback web) |
| `@capacitor-community/admob` (o equivalente) + UMP | Anuncios recompensados y consentimiento | 7 |
| Plugin de Google Play Billing | Compras | 7 (D-7) |

No se añade nada más. En particular: sin librerías de estado, de UI, de animación ni de canvas; sin `jsdom` (los tests son de lógica pura).

---

## 6. Preguntas abiertas para Daniel (no bloquean)

1. ¿Te vale el selector "Nivel de prueba" para evaluar la diversión con más recetas, o prefieres probar solo el nivel 1?
2. ¿Subes los assets existentes (`assets/ref/` y sartenes) al repositorio?
3. ¿Confirmas la decisión 23 (segunda oportunidad solo tras 3 loops completados)?
4. ¿Publicamos la versión de pruebas en `dbmsystem.github.io/kitchen-loop/play/` (requiere fusionar la rama en `main`) o prefieres probar solo con el servidor local?

---

## 7. Imágenes de referencia de Daniel (arte)

Recibidas 16 capturas. Originales sin tocar en `assets/ref/originals/`; recortes sin la interfaz del móvil en `assets/ref/`. `scripts/extract_sprites.py` (Python + Pillow, herramienta de desarrollo, no forma parte del juego) recorta los sprites, quita el fondo y los deja en:

| Salida | De dónde sale | Se usa |
|---|---|---|
| `src/assets/sprites/ingredients/` egg, bacon, cheese, tomato, mushroom, onion, potato, truffle | `ingredients_ref.jpg` | Fase 1: encimera, bandeja y pedidos |
| `src/assets/sprites/ingredients/` bread, fish, herbs | Iconos pequeños del `ui_kit_ref.jpg` (ampliados) | Fase 1. **Calidad menor**: conviene un sprite grande de pan, pescado y hierbas |
| `src/assets/sprites/customers/` 8 retratos | `customers_ref.jpg` (asignación en `CONTENT_REVIEW.md`) | Fase 1: tarjetas de cliente (solo aparecen los comunes) |
| `src/assets/sprites/ui/menu_scene.jpg` | Ilustración de carga sin el texto en inglés ni la barra | Menú principal (cocina + logo + Pip) |
| `assets/pan_rusty.png`, `pan_pink.png`, `pan_golden.png`, `pan_black.png` | Capturas 1–4 (numeración de Daniel: 1 oxidada, 2 rosa, 3 dorada, 4 negra) | Fases 3 y 5 (sartenes) |
| `assets/ref/icon_final.png` → `public/favicon.png`, `apple-touch-icon.png`, `icon-512.png` | Icono huevo + bacon con fondo lila | Icono de la web; icono de Android en la Fase 6 |
| `assets/ref/album_ref.png`, `premium_pans.png` | Collage de cartas con sartén; fila de 4 sartenes | Nombres de la sección 9.1 |

Solo como **referencia visual** para fases posteriores (no se usan todavía): `pip_expressions_ref.jpg` (8 de las 15 expresiones de Pip, Fase 3), `brulee_ref.jpg` (Fase 4), `skill_tree_ref.jpg` (Almacén, Fase 4), `cards_ref.jpg` (marcos de carta, Fase 2), `icon_kitchen_ref.jpg` (icono alternativo), `ui_kit_ref.jpg` (estilo de botones y baldosas).

**Diferencias entre las referencias y la especificación** (manda la especificación; se toma solo el estilo visual):
- El árbol de habilidades muestra bonus de estadísticas (+10 % velocidad, +25 % crítico, "puntos de habilidad"). La sección 5.4 prohíbe estadísticas: los utensilios desbloquean contenido y se pagan con monedas.
- Las cartas tienen HP, habilidades y textos en inglés. Las cartas del juego no tienen estadísticas (4.2) y sus textos van en español.
- Hay ingredientes que no están en el juego (aguacate, guindilla, gamba, brócoli, zanahoria, ajo). No se añaden.
- La ilustración de carga y el logo dicen "Kitchen Loop" / "Loading..."; en el menú se usa solo la parte superior (el logo en inglés es el nombre del juego).
- Solo hay 8 expresiones de Pip; la sección 3.4 pide 15.

---

## 8. Feedback de Daniel tras probar la Fase 1 (adelantos de fases posteriores)

Daniel pidió contexto, historia, tutorial, un menú de combinaciones, pedidos como personajes con bocadillo y animaciones. Como la petición es suya, se adelanta sin añadir sistemas nuevos (todo está en la especificación):

| Pedido | Qué se ha hecho | Sección de la especificación |
|---|---|---|
| Historia y contexto | Primera sesión: Pip se presenta (3 bocadillos) → "¿Cómo te llamas?" → premisa (3 bocadillos) → tutorial. Botón HISTORIA en el menú para verla otra vez. Textos `draft` (D-1). | 6.1, 6.2, 6.3, 8.1 |
| Tutorial | Loop guiado: huevo → bacon → cocinar → cliente con Tostada con Tomate → 30 s libres. Reloj parado hasta el paso 5, casillas guiadas, dedo animado. No se salta la primera vez; botón TUTORIAL para repetirlo. La primera carta garantizada llegará con las cartas (Fase 2). | 8.2 |
| Menú de combinaciones | RECETARIO (menú y pausa): recetas conocidas con su forma, puntos, nivel de desbloqueo y acertijos de las secretas. | 4.9 (pestaña Recetas) |
| Pedidos como personaje | Cada cliente es su retrato detrás del mostrador y pide con un bocadillo (nombre, ingredientes dibujados según la forma y paciencia). | 2.1, 3.3 |
| Animaciones | Clientes: entran caminando, respiran, se impacientan (temblor + marca de enfado), saltan contentos al ser servidos o se van enfadados. Pip: respira, salta al hablar, cambia de expresión, texto a máquina. Ingredientes: flotan en la bandeja, se aplastan al caer, rebotan al brillar, giran al cocinarse. Todo respeta "Reducir animaciones". | 3.3, 9.3, 9.4 |
| Frases de Pip en partida | Sistema de frases por disparador, sin repetir las 5 últimas y con 4 s entre frases (las de eventos importantes tienen prioridad). | 3.6 |

**¿Por qué puedo cocinar recetas que nadie ha pedido?** Es la "venta de mostrador" de la sección 2.6: cualquier receta conocida que brille se puede cocinar; si nadie la pidió, da la mitad de puntos pero cuenta para el combo. Sirve para hacer hueco y mantener la cadena. Ahora se explica en el recetario y Pip lo cuenta la primera vez que ocurre. Si Daniel prefiere que solo se puedan cocinar los pedidos, es un cambio de diseño: habría que decidirlo (afecta al desbordamiento y a los combos).

**Decisiones menores:**
- Las animaciones de personajes se hacen por código (respirar, saltar, temblar, girar) sobre cada imagen fija, porque de momento hay una sola imagen por personaje. Con más poses (lista en `docs/ASSET_REQUESTS.md`) se podrán cambiar de imagen según el estado.
- La historia de fondo difumina la ilustración del menú, porque esa imagen ya incluye a Pip. Pedido un fondo de cocina sin Pip.
- El texto de Pip en partida cabe en ≤ 60 caracteres (test automático); las escenas de historia no tienen ese límite.
- Pip usa las 8 expresiones disponibles; las otras 7 de la sección 3.4 están pedidas.
- Los consejos que Pip da una sola vez se guardan en `story.seenScenes` (`tip.counterSale`).
- La línea "Fase actual" de `CLAUDE.md` sigue sin tocar: la actualiza Daniel.

---

## 9. Segundo lote de arte (Meta AI) — "úsalos con libertad de diseño"

Originales en `assets/ref/originals/17–20`. Recortes con `scripts/extract_sprites.py`.

| Recurso | Uso |
|---|---|
| Fondo de cocina de día | Detrás de los clientes en la partida (con el mostrador delante) y fondo de las escenas de historia (ya no aparecen dos Pip). |
| Fondo de cocina de noche | Guardado para el tema Cocina Nocturna del Pase (Fase 5). |
| Icono con sartén y cartas holográficas | Nuevo `assets/ref/icon_final.png` por indicación de Daniel ("ICONO OFICIAL"); el anterior pasa a `icon_final_v1.png`. Favicon e iconos de la app sobre un cuadrado crema. |
| Pan, pescado y hierbas HD | Sustituyen a los iconos pequeños del UI kit. Huevo, bacon y queso HD no se usan: el huevo frito y el bacon en tiras de la primera hoja cuadran mejor con los platos y con el resto de ingredientes. |
| 4 clientes × 3 poses | Clientes comunes con poses: llegar (solo el estudiante), esperar y contento al ser servidos. Asignación en `CONTENT_REVIEW.md`. Los retratos detallados anteriores quedan para clientes especiales. |
| Platos | Solo 5 de los 15 corresponden a recetas del juego: Pescado a las Hierbas, Tortilla de Champiñones, Guiso Marinero, Ensalada de la Huerta, Brocheta de la Huerta. Cuando existe el plato, es el plato lo que vuela al cliente al cocinar y aparece en el recetario. |
| Brûlée (hoja de 7 expresiones grande) | Recortado para la Fase 4 (capítulo 3). No aparece antes para respetar la historia (sección 3.5). |
| Iconos de interfaz | Reloj en el HUD; recetario, sartén y anuncio en los botones. Moneda, rara y legendaria, para las Fases 2 y 5. |

**No usado, y por qué:**
- **Icono "LIFE" (corazón)**: la sección 17 prohíbe vidas.
- **Las 7 expresiones nuevas de Pip y las 7 de Brûlée del mega pack**: son bustos con otra ropa (Pip con chaqueta azul), no cuadran con el Pip de cuerpo entero que ya usamos.
- **Primera columna de clientes del mega pack**: en tres de las cuatro filas la primera pose es otro personaje (otra chica, otro chico con cascos, otra ropa de la abuela).
- **10 platos que no son recetas del juego** (ramen, filete, sushi, tortitas, croissant…).
- **`vfx_sheet.png`** (efectos): el texto lo menciona, pero la imagen no ha llegado.
- Las ideas de efectos del texto de Meta AI (humo al fallar, sartén en llamas con el tiempo crítico, pausa del juego en la legendaria) quedan como propuestas para la Fase 3; las cartas "Seta Dorada" no existen en la especificación (la legendaria es la Trufa Dorada).

---

## 10. Tercer lote de arte

Originales en `assets/ref/originals/21–24`.

| Recurso | Uso |
|---|---|
| Hoja de efectos | Chispas doradas: combo ×3 o más. Corazones: cliente servido. Humo: cliente que se va (pequeño) y desbordamiento (grande). Espiral arcoíris: receta secreta descubierta. Estrella azul: ¡En su punto! Sartén en llamas: a los lados del cartel de ¡Fiebre en la cocina! Monedas: guardadas para la Fase 2. Duraciones dentro de la tabla 9.3. |
| 8 platos | Bacon con Huevo, Tostada con Tomate, Triple Bacon, Revuelto con Queso, Bocadillo de Bacon, Patatas Bravas, Tortilla de Patatas, Pescado con Patatas. Faltan Tostada Especial y Desayuno Completo. |
| Caras de enfado | Pose "enfadado" de los 4 clientes comunes: se ve cuando les queda poca paciencia y cuando se van sin comer. Es un busto, se dibuja al 80 % para que la cabeza cuadre con las poses de cuerpo entero. |

**Cambio de personajes para que cada cliente sea siempre la misma persona** (las caras de enfado no coinciden con todas las poses anteriores):
- Oficinista: ahora la chica de media melena castaña y camiseta verde (antes, la chica de pelo verde, que no tiene cara de enfado).
- Cliente tranquilo: ahora la abuela de rebeca lila, como en su cara de enfado (antes, la de rebeca beige).
- Estudiante y Turista: sin cambios.
- Oficinista y Cliente tranquilo no tienen pose "contento": usan la de espera con un salto.

**No usado**: la hoja de 7 expresiones de Pip de este lote es **otro personaje** (piel más oscura, bigote, sin pelo castaño), no el Pip del juego. Se guarda en `assets/ref/originals/23_pip_expressions_2.webp`.
