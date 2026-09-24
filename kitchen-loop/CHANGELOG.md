# Changelog

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
