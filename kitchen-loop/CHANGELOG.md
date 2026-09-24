# Changelog

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
