# Changelog

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
