# Changelog

## 0.11.0 — Leyenda de recetas, sonido de premio, fondo pixel art y especialidad épica

- **Guía de recetas durante la partida:** el libro del marcador la activa o la desactiva sin pausar. Aparece translúcida sobre la cocina, justo debajo de los pedidos (que siempre se leen), y se desliza con el dedo. Muestra las recetas desbloqueadas de la que más puntos da a la que menos, con su plato e ingredientes en su forma (línea o cuadrado), pero sin los puntos: esos se ven al acabar la receta en la sartén. Las secretas solo aparecen si ya se han descubierto. El juego recuerda si la dejaste activada. La misma lista, sin puntos, está en la pausa (Encargos y recetas). La guía es de cristal azul noche con una franja de color por tipo de receta, para que no se pierda entre la madera de la cocina.
- **Colores de la cuadrícula:** una receta que pide un cliente se ilumina en verde y una fuera de carta en amarillo, así ya no se confunden cuando hay varias juntas. El ingrediente dorado pasa de recuadro amarillo a halo dorado redondo con una estrella que titila.
- **Tocar cocina lo que ves:** si varias recetas se entrelazan, tocar una casilla verde cocina la receta pedida y tocar una amarilla cocina la fuera de carta. Antes ganaba siempre la más grande, aunque la casilla estuviera en verde.
- **Plato fuera de carta:** el sonido al servirlo en el mostrador pasa a ser un arpegio brillante de premio, en lugar del chisporroteo seco de antes.
- **Fondo de las escenas** (`scripts/story_backdrop.py`): el mismo pixel art de la cocina de la partida, de día y de noche. En lugar de la ristra de pimientos y ajos cuelgan utensilios en pixel art: paleta, cucharón, cazo, pinzas y batidor.
- **Corregido:** las especialidades que se ofrecen antes de un servicio ya no cambian al salir y volver a entrar; son las mismas hasta que juegas ese servicio.
- **Corregido:** bajo los utensilios del fondo de las escenas quedaba una franja lisa donde estaban los pimientos. Ahora solo se borran sus píxeles y el hueco se rellena con la pared de alrededor, con su luz y su textura.
- **Especialidad del día:** se presenta como una ventaja épica. Escenario oscuro con rayos de luz, título dorado y tres cartas que entran repartidas, cada una con su color, medallón, etiqueta (Más puntos, Pedidos, Ayuda, Caos, Reto, Fragmentos) y un brillo. La elegida se ilumina y las otras se apagan.

## 0.10.1 — Progreso de nivel y la historia siempre a la vista

- **Nivel:** el menú y los resultados muestran el porcentaje del nivel y cuánta XP falta para el siguiente («51 % · faltan 77 XP para el nivel 3»).
- **Siguiente capítulo:** el menú enseña el capítulo actual, una frase gancho del siguiente, lo que hace falta para abrirlo y el porcentaje de avance. Los resultados lo repiten en pequeño, también tras el tutorial. Desde el primer servicio se ve que hay una historia que seguir.
- 175 tests.

## 0.10.0 — Historia, cartas y vitrina

- **Historia** (`docs/HISTORIA.md`): todas las escenas reescritas con un hilo claro: la hoja que huele a azúcar quemado, el maestro, el baúl, la cocina que recuerda, la prueba, la noche y el perdón. Cada escena acaba con un gancho o con una risa.
- **Diario de la cocina:** las 12 páginas, contadas por la propia cocina, en cartas que encajan con cada recuerdo (11 comunes o raras y la última en la Tapa Misteriosa).
- **Pip habla según el capítulo:** desde el 3 siente que Brûlée mira, desde el 5 nota que la cocina apunta los platos y, tras el epílogo, ya no se esconde. Brûlée también cambia en el Almacén.
- **Resultados:** Pip comenta lo que de verdad ha pasado (platos quemados, nadie se fue, dos fiebres, desborde).
- **Más vida:** saludo de Pip según la hora del día, tercera reacción de cada cliente y «Ver la historia» en Ajustes repite todo lo visto, en orden.
- **Cartas:** las 120 descripciones reescritas: cada una es un chiste, un cliente de siempre o una pista de la historia.
- **Vitrina del Pase del Maestro:** se ve antes de pagar (la Cocina Nocturna y el Álbum Dorado), con lo que incluye en claro y una frase de Pip. Cada sartén explica cómo es. Tras probar algo con un anuncio, Pip dice dónde está. Sin ventajas, sin avisos fuera del Almacén.
- 173 tests.

## 0.9.4 — Correcciones de Daniel en las cartas

- **El Chef Rival:** su gorro volvía a ser una nube gris; ahora es blanco. Se nota también en la partida.
- **El estudiante:** el pelo estaba cortado en recto; ahora tiene su forma de pelo. Se ve en la carta Estudiante con Prisa, en Casa Llena y en la partida.
- **Propina Caída:** la nevera entera en el suelo y la moneda asomando por debajo, sin la línea suelta.
- **Recuerdo de Viaje:** la foto se ve de verdad: una polaroid con la tostada en su plato.
- **Maestro del Triple Bacon, Tomate Explosivo y Trufa Dorada** (y las otras tres de la referencia): la ilustración llena la carta con su proporción, en vez de ir en un marco pequeño.
- **Ninguna carta se sale del borde:** el dibujo se ajusta solo dentro de la carta.

## 0.9.3 — Cartas revisadas una a una

- Las 120 cartas, revisadas una a una con su texto: 65 rediseñadas (`docs/CARD_ART_REVIEW.md`). Ejemplos:
  - La Tostada Dudosa está medio hecha y medio cruda, el Champiñón Tímido asoma por detrás del huevo y el Pez Fuera del Agua está feliz en la cocina.
  - La Corona de Bacon por fin tiene su huevo, la Tortilla Imposible son cuatro huevos en cuadrado y el Tomate Samurái lleva la katana a la espalda.
  - El Visitante Nocturno ya no es igual que el Turista de Otro Mundo.
- Caras más grandes y expresivas, al estilo de la referencia.
- Las seis ilustraciones de la referencia se ven enteras, enmarcadas, y sin texto en inglés.
- 171 tests.

## 0.9.2 — Cartas coherentes, servicios parejos y mejor tutorial

- **Las 120 cartas, redibujadas a juego con su nombre**, con fondo propio y sin nada recortado (`scripts/card_art.py`). Ejemplos:
  - El Tomate Triste llora, el Queso Perezoso duerme y la Cebolla Llorona llora a chorros.
  - El Huevo de Dos Yemas tiene dos yemas y los Aros de Cebolla son aros rebozados.
  - La Luna de Queso brilla en la ventana y la Nota en la Nevera está en la nevera.
  - La Tapa Misteriosa tiene ojos que brillan debajo.
- **Seis cartas usan las ilustraciones de la referencia:** Vegana Enfadada, Huevo Quemado, DJ del Bacon, Maestro del Triple Bacon, Trufa Dorada y Tomate Explosivo.
- **Servicios más parejos:** los ingredientes salen de una bolsa barajada y según las recetas que los usan. En el nivel 5 los desbordes pasan del 38 % al 2 % (`docs/LOOP_BALANCE.md`).
- **Tutorial:** una mano de Pip en pixel art lleva el ingrediente hasta la casilla. El primer pedido también va guiado paso a paso.
- 171 tests.

## 0.9.1 — Primera pantalla nítida e idiomas

- El fondo de la presentación de Pip y de las escenas se ve nítido: la cocina en pixel art, sin difuminar.
- Idiomas: español e inglés. Se elige en la primera pantalla (el del móvil aparece primero) y se cambia en Ajustes.
- Arreglado: al saltar las animaciones de resultados, la pantalla se recortaba en forma de óvalo.
- 169 tests.

## 0.9.0 — Economía y mejoras de la partida simulada

- **Combo y fiebre:** ventana de combo de 4 s y fiebre en x5, que ya no se reenciende sola al acabar. El jugador casual también vive la fiebre.
- **Brûlée:** llega a partir del 5.º servicio.
- **"¡Cocina a tope!":** también con 2 sartenes en combo x3.
- **"Chef del Vacío":** basta con 2 ingredientes o menos al acabar.
- **Decoración nueva:** reloj de pared y 5 platos de exposición. Cada sitio admite varios objetos y eliges cuál colocar.
- **Rincón mágico de Brûlée:** 5 objetos que se pagan con fragmentos.
- **Sobres de cartas por monedas** en el Almacén (pestaña "Sobres").
- **Economía comprobada con el bot:** monedas y fragmentos siempre tienen en qué gastarse.
- 165 tests.

## 0.8.2 — Partida completa simulada

- Bot jugador (`scripts/bot.js`) y `scripts/simulatePlaythrough.js`. El bot se pasa el juego con el motor y la progresión reales, y el informe queda en `docs/PLAYTHROUGH_REPORT.md`.
- Sin cambios de balance: las propuestas esperan la decisión de Daniel.

## 0.8.1 — Música y sonidos

- Música provisional: tema del menú, tema de partida con capa extra en la fiebre y tema de la Cocina Nocturna con lluvia. Volumen en Ajustes.
- Sonidos de botón, compra, equipar sartén y combo; voces de Pip y Brûlée al hablar.
- El calendario de Pip se abre solo una vez por sesión.
- 161 tests.

## 0.8.0 — Fase 6: Android

- App Android con Capacitor: vertical, icono y pantalla de inicio de Kitchen Loop, márgenes seguros.
- Guardado en Preferences, vibración nativa, pausa y guardado al pasar a segundo plano.
- Botón Atrás: pausa en partida, vuelve atrás en las pantallas y pregunta antes de cerrar desde el menú.
- APK de prueba compilado por GitHub Actions en cada cambio y publicado en un enlace fijo (ver README).
- Poses contenta y enfadada para los clientes especiales y legendarios.
- 159 tests.

## 0.7.1 — Más vida en la cocina

- Los clientes reaccionan a su sartén: contentos y dando saltitos mientras su plato llega a tiempo, enfadados si se va a quemar, y con una frase propia al servirles.
- ¡Justo a tiempo!: celebración al servir en los últimos segundos de paciencia.
- ¡Cocina a tope!: aviso, fogón brillante y sonido cuando todas las sartenes cocinan a la vez.
- 158 tests.

## 0.7.0 — Una sartén por cliente

- Cada cliente tiene su sartén en el fogón. El pedido chisporrotea 2,5 s con sonido, vapor y un anillo de progreso, y sale al cliente con un "ding".
- Si la paciencia del cliente se acaba antes, el plato se quema: humo negro, comentario de Pip y cliente perdido. El anillo avisa en rojo.
- Combo y fiebre cuentan al tocar; puntos y monedas, al servir. Paciencia base 22 s.
- Al acabar el tiempo, las sartenes terminan y sirven antes de los resultados.
- Tutorial con el paso "¡A la sartén!".
- Arreglo: el crítico de "Crítico en Sala" ya no se pierde si el mostrador está lleno.
- 156 tests.

## 0.6.1 — El fogón (especificación v3.2)

- Fogón con la sartén equipada siempre visible: vapor en reposo, recorrido encimera → sartén → cliente, salto y brillo en ¡En su punto!, llama y partículas en la fiebre.
- La sartén equipada aparece en la cocina del menú.

## 0.6.0 — Fase 5: monetización simulada

- Tienda (`shop.js`) con tienda simulada: comprar, pendiente, cancelar y error; restaurar compras y reembolsos.
- Vitrina del Almacén: sartenes (equipar o comprar), Pase del Maestro y Pack de Inicio con su contenido visible antes de pagar.
- Sartenes cosméticas visibles al cocinar, cada una con sus partículas.
- Pase del Maestro: Álbum Dorado, sobre diario, tema Cocina Nocturna, Sartén Dorada y 15 frases de Pip.
- Probar utensilios y sartenes con anuncio (2 al día; nunca se guarda).
- Ajustes: restaurar compras y tema nocturno.
- 150 tests.

## 0.5.3 — Platos coherentes

- Tomate rallado y queso fundido pintados sobre el pan; desayuno completo, huevos rotos, crema de champiñones y recetas secretas repintados en su pixel art.
- Patata nueva (antes parecía una salchicha).

## 0.5.2 — Pixel art coherente y AdMob

- Iconos de comida originales (sin reescalar); coherencia de tamaño aplicada al dibujar.
- Build de pruebas que conserva los archivos del anterior: nada de imágenes rotas por la caché de GitHub Pages.
- Decoración recortada de la cocina de referencia (10 objetos nuevos), 9 platos para las recetas de utensilio y secretas, tarro de especias y llama en el mismo estilo.
- AdMob: solo recompensados, un bloque por punto de anuncio, precarga bajo demanda, reintentos, consentimiento UMP y "Privacidad de los anuncios" en Ajustes (`docs/ADMOB.md`).

## 0.5.1 — Tamaños coherentes

- Ingredientes y platos con el mismo tamaño visual; los clientes especiales y la turista, con la cabeza del mismo tamaño que el resto.
- La decoración usa el mismo tamaño de píxel que la cocina del menú; Brûlée y Pip del mismo tamaño en todas las pantallas.
- Botón VOLVER en el selector de especialidad.

## 0.5.0 — Fase 4: historia y Brûlée

- Capítulos 2–7 y epílogo con escenas de Pip y Brûlée. Brûlée aparece en los resultados (loop 3 con 1.200 puntos o seguro en el loop 6).
- Almacén de Brûlée: árbol de 9 utensilios (13.500 monedas), 10 objetos de decoración que se ven en la cocina del menú y vitrina (próximamente).
- Encimera Rúnica (5x5 y 4 clientes), habilidades Mover, Descartar y Congelar, e ingredientes Reloj, Especia comodín, Llama y Trufa.
- Recetas de utensilio en el recetario; La Receta Perdida con el árbol completo.
- Clientes especiales y legendarios con estrella o corona; el coleccionista da fragmentos.
- Ingrediente dorado (×2 puntos y más probabilidad de carta).
- Especialidad del día desde el nivel 4 (6 especialidades).
- Corregido: las recetas secretas ya no se anuncian al subir de nivel.
- Arte: medallones de utensilios de la referencia, decoración en pixel art, clientes e ingredientes especiales.
- 136 tests.

## 0.4.0 — Encargos de Pip y álbum de 120 cartas

- Encargos de Pip: 3 retos diarios (combo, pedidos, puntos, sin perder clientes, receta concreta, ¡En su punto!, fiebre, recetas) con monedas y fragmentos; sobre de regalo al cumplir los tres.
- Botón rápido en el HUD que pausa y abre Encargos/Recetas; aviso "¡Encargo cumplido!" en partida.
- Encargos en el menú y en resultados; el botón de resultados pasa a "SIGUIENTE SERVICIO".
- Álbum ampliado de 48 a 120 cartas (72 nuevas en borrador) con filtro por rareza.
- 4 nuevas condiciones de descubrimiento: combo x10, 3 ¡En su punto!, 3000 puntos y 8 pedidos sin perder clientes.
- Economía reajustada con el simulador: álbum en 6,7 semanas y árbol en 4 para un jugador constante con anuncios.
- 106 tests.

## 0.3.0 — Fase 2: progresión, colección y economía · sonido y vibración

- XP y niveles reales (sin selector de prueba): desbloqueos desde la tabla, monedas por nivel y un sobre cada 3 niveles.
- Recompensas del loop idempotentes: monedas, XP, carta al final del loop, cartas de descubrimiento, maestría de recetas.
- 48 cartas con marco por rareza, estrellas, número y arte compuesto; álbum con 3 pestañas (Cartas, Recetas con maestría, Diario de la cocina con 12 fragmentos).
- Sobres con garantías de épica y legendaria, prioridad a cartas nuevas, sobre especial; apertura y revelado animados y saltables; la legendaria con secuencia especial.
- Duplicados → fragmentos, fabricar cartas y variantes brillantes.
- Calendario de Pip (7 días, sin reinicio al faltar) y sobre gratis por anuncio con espera de 6 h (mock en desarrollo).
- Primera carta garantizada al terminar el tutorial.
- Guardado con validación completa, protección del reloj atrasado y borrado de partida.
- Menú con nivel, XP y monedas; resultados con barra de XP, subidas de nivel, desbloqueos y cartas.
- Efectos de sonido sintetizados, vibración y pantalla de Ajustes.
- `scripts/simulateEconomy.js` + `docs/ECONOMY_REPORT.md`: balance ajustado a 6–8 semanas de álbum y 4–6 de árbol.
- Arte generado: 7 expresiones de Pip, 2 platos y poses contentas.
- 96 tests.

## 0.2.2 — Tercer lote de arte: efectos, platos y enfados

- Efectos de la hoja de VFX en combo, servir, cliente que se va, desbordamiento, receta secreta, ¡En su punto! y fiebre.
- 13 platos cocinados (8 nuevos) vuelan al cliente y aparecen en el recetario.
- Clientes con cara de enfado cuando se impacientan y al irse; personajes reasignados para que cada cliente sea siempre la misma persona.

## 0.2.1 — Segundo lote de arte

- Cocina de fondo detrás de los clientes y en las escenas de historia.
- Clientes comunes con poses (llegar, esperar, contento).
- Pan, pescado y hierbas HD; platos cocinados que vuelan al cliente y aparecen en el recetario.
- Nuevo icono oficial (sartén con cartas) como favicon e iconos de la app.
- Iconos de reloj, recetario, sartén y anuncio en el HUD y los botones.
- Brûlée (7 expresiones), fondo nocturno e iconos de moneda y rareza recortados para fases posteriores.

## 0.2.0 — Historia, tutorial, recetario y personajes animados (feedback de Daniel)

- Primera sesión con historia: Pip se presenta, pide el nombre y cuenta la premisa (escenas saltables, texto a máquina).
- Tutorial guiado (sección 8.2) con dedo animado, casillas guiadas y reloj parado hasta el loop libre de 30 s.
- Recetario en el menú y en la pausa: forma de cada receta, puntos, nivel de desbloqueo, acertijos de secretas y explicación de la venta de mostrador.
- Clientes como personajes detrás del mostrador que piden con un bocadillo; entran, respiran, se impacientan, celebran o se van enfadados.
- Pip en partida con frases por disparador (sección 3.6) y 8 expresiones; frase de Pip en resultados.
- Ingredientes animados (flotar, aplastarse al caer, rebotar al brillar, girar al cocinarse).
- Motor: cola de ingredientes, reloj detenible, casillas permitidas y pedidos guionizados para el tutorial.
- 66 tests (nuevos: diálogo, Pip, tutorial, contenido de frases).

## 0.1.1 — Arte de referencia

- Imágenes de referencia de Daniel guardadas en `assets/ref/` (originales y recortes).
- `scripts/extract_sprites.py`: recorta los sprites y les quita el fondo.
- `src/assets/manifest.js`: los sprites se cargan al arrancar; si falta alguno, se usa el placeholder.
- Ingredientes y clientes con sprites en la partida; menú con la ilustración de la cocina, el logo y Pip; favicon e iconos.
- Sartenes (`assets/pan_*.png`) extraídas para las fases 3 y 5.

## 0.1.0 — Fase 1: núcleo en cajas grises

- Proyecto Vite + React con motor de juego en JavaScript puro (`src/game/`), paso fijo 1/60 s y render en Canvas 2D.
- Encimera 4x4, bandeja de 3 ingredientes con vista previa, arrastrar (ingrediente 40 px por encima del dedo) y "Colocar tocando".
- Matcher de recetas con patrones `group`, `line` (con y sin orden) y `square`; brillo de recetas conocidas; tocar para cocinar con prioridades (tamaño → pedido → puntos); recetas secretas que se descubren al cocinarlas.
- Servir automático (cliente con menos paciencia) y venta de mostrador; clientes comunes con paciencia y pedidos filtrados por tipo.
- Combos con ventana y multiplicadores, ¡En su punto!, ¡Fiebre en la cocina! (feedback mínimo), desbordamiento y segunda oportunidad con anuncio simulado (solo desarrollo/playtest).
- Fin de loop, pantalla de resultados simple, pausa (botón, Escape y paso a segundo plano) con reanudar, reiniciar, ajustes rápidos y salir.
- `balance.js`, textos en `es.js` mediante `t()`, guardado básico (récord, estadísticas, recetas cocinadas/descubiertas, ajustes) con escritura segura, copia de seguridad y recuperación.
- Placeholders procedurales para ingredientes y clientes; partículas con pool.
- Selector "Nivel de prueba" (solo Fase 1) para probar el contenido de los niveles 1–7.
- 54 tests de Vitest: matcher, prioridades, secretas, desbordamiento, segunda oportunidad, combos, fiebre, puntuación, generación con semilla, guardado, anuncios e integridad de datos.

## 0.0.0 — Fase 0: análisis

- `docs/DECISIONES.md` con contradicciones, riesgos, decisiones por defecto y dependencias.
