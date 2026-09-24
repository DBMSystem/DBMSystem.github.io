# KITCHEN LOOP

Juego móvil de puzle de cocina + colección de cartas. Especificación: `docs/KITCHEN_LOOP_SPEC.md`. Decisiones: `docs/DECISIONES.md`.

```bash
npm install
npm run dev -- --host   # servidor de desarrollo, accesible desde el móvil en la misma wifi
npm test                # Vitest
npm run build:playtest  # versión de pruebas en play/ (con anuncio simulado)
npm run build           # versión de producción en dist/ (sin mocks)
```
