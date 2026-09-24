# KITCHEN LOOP — Instrucciones para Claude Code

Juego móvil Android (vertical) de puzle de cocina + colección de cartas + cozy.
React + Vite + JavaScript, Canvas 2D para el gameplay, Capacitor para Android.

## Documento de referencia

La especificación completa está en `docs/KITCHEN_LOOP_SPEC.md` (v3.2).

- Al empezar la Fase 0, léela entera.
- En cada sesión posterior, relee como mínimo la sección 0 y las secciones de la fase en curso antes de programar.
- Si algo de este archivo contradice la especificación, manda la especificación y lo anotas en `docs/DECISIONES.md`.

## Fase actual

**Fase 0 — Análisis (sin código).** Daniel actualiza esta línea al validar cada fase.

## Reglas permanentes

1. No sustituyas la visión del juego. No añadas sistemas ni mecánicas: solo contenido (frases, cartas, clientes, decoración), marcado `draft: true` y listado en `docs/CONTENT_REVIEW.md`.
2. Trabaja por fases (sección 14). No empieces una fase sin la validación de Daniel de la anterior. Tras la Fase 1 hay una parada obligatoria para probar que el núcleo divierte.
3. Si falta información crítica, detente y documéntala en `docs/DECISIONES.md`. Las decisiones D-x pendientes usan su valor por defecto (sección 16).
4. Todos los números de balance viven en `src/data/balance.js`. Todo el contenido vive en `src/data/`.
5. Todo texto visible pasa por `t()` desde `src/data/i18n/es.js`, en UTF-8, respetando siempre tildes, ñ, ¿ y ¡ (también en el canvas). Frases dirigidas al jugador en forma neutra de género.
6. La lógica de `src/game/` es JavaScript puro, sin React ni DOM. Nada de `setState` por fotograma.
7. Monedas, cartas, fragmentos, sartenes y derechos de compra solo se modifican a través de `src/inventory/inventory.js`.
8. Nunca: anuncios durante el gameplay, banners, anuncios obligatorios, ventajas de pago, contenido aleatorio de pago, recompensas simuladas fuera de desarrollo.
9. Las sartenes son solo cosméticas. La Sartén Dorada requiere el Pase del Maestro.
10. No modifiques ni sustituyas los assets de `assets/ref/` ni las sartenes existentes de `assets/`.
11. Código en inglés, textos del juego en español. Sin lógica duplicada ni código innecesario.
12. Al cerrar cada fase: tests en verde (Vitest), `CHANGELOG.md` actualizado e informe breve (hecho, pendiente, cómo probarlo).

## Prioridades

Diversión > monetización · Calidad > cantidad · Legibilidad > efectos.
GAMEPLAY → FEEDBACK → PROGRESIÓN → COLECCIÓN → HISTORIA → MONETIZACIÓN.
