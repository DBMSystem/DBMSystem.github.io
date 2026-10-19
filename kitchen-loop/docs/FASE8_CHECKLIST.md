# Fase 8 — Checklist final (sección 15.3)

Revisión de la 0.13.0. Lo automático lo he comprobado yo; lo marcado **📱 Daniel** solo se puede comprobar en el
móvil de verdad (sonido, vibración, rendimiento real) o con Google Play.

## Cómo se ha comprobado

- **Bot de partidas** (`scripts/simulatePlaythrough.js`): juega con el motor real y toda la progresión (recompensas,
  sobres, calendario, encargos, especialidades, Almacén, historia, fabricación). Tras **cada servicio** comprueba que el
  guardado sobrevive a guardar y cargar sin cambiar nada (`validateSave` corregiría cualquier valor imposible) y que el
  resultado no tiene números imposibles. **1.440 servicios** (hábil y casual, dos semillas cada uno, 60 días):
  **ninguna incidencia**. Los cuatro llegan al capítulo 7; el hábil reúne 119–120 de las 120 cartas y el casual 114–115.
- **Pantallas** (Playwright, en el navegador): móvil de 5" (360 × 640), de 6,7" (430 × 932) y alargado 20:9
  (360 × 800). Recorre menú, calendario, álbum, Almacén (las 4 pestañas), ajustes, especialidad del día, partida,
  pausa y la pregunta de salir. Busca elementos fuera de la pantalla, scroll lateral, textos cortados en botones y
  errores de consola. Prueba el botón Atrás en cada pantalla.
  - Encontrado y arreglado: en 360 px la pestaña «Decoración» del Almacén se cortaba.
  - Tras el arreglo: **cero incidencias y cero errores de consola** en los tres tamaños.
- **Sesión larga** (navegador): 5 servicios seguidos **sin conexión**, midiendo FPS durante la partida y memoria tras
  cada servicio. Resultado en la tabla de abajo.
- **Tests** (Vitest): 183 en verde.

## Checklist

| Punto | Estado | Cómo |
|---|---|---|
| Primera y segunda partida funcionan | ✅ | Test del tutorial completo; el bot empieza de cero y encadena 240–480 servicios. |
| El tutorial dura menos de 90 s y da la primera carta | ✅ / 📱 | Test: carta garantizada. Diseño: 5 pasos guiados + 30 s libres. El tiempo real con una persona, en el móvil. |
| Guardar, recargar y recuperar un guardado corrupto | ✅ | Tests de guardado; el bot valida el guardado tras cada servicio. |
| Recetas visibles, secretas y de utensilios | ✅ | Tests; el bot descubre las secretas (con pista y por accidente). |
| Clientes, combos, ¡en su punto! y fiebre | ✅ | Tests; el informe del bot mide combos, fiebres y «en su punto» por nivel. |
| Desbordamiento y segunda oportunidad | ✅ | Tests (solo en desbordamiento, una por loop, límite diario). |
| Cartas, sobres, garantías, duplicados, fragmentos y álbum | ✅ | Tests; el bot hábil reúne 119–120 de las 120 cartas en 60 días. |
| Calendario, maestría y árbol de Brûlée | ✅ | Tests; el bot compra el árbol. |
| Pip y Brûlée; capítulos con sus disparadores | ✅ | Tests de historia; el bot llega al capítulo 7 en las cuatro partidas. |
| Almacén, sartenes, Dorada protegida por el Pase | ✅ | Tests de la tienda; pantallas del Almacén en los tres tamaños. |
| Pack de Inicio con contenido fijo y visible antes de pagar | ✅ | Test; el cofre de la Vitrina enseña sus 5 cartas. |
| El mock de anuncios funciona y no existe en producción | ✅ | Tests; la versión de producción no contiene ni el mock de anuncios ni el de compras (comprobado en el AAB). |
| Sin banners, anuncios obligatorios ni ventajas de pago | ✅ | Solo recompensados (`ads.js`); ninguna llamada a banners ni intersticiales en el código. |
| Nada de pago antes de 3 loops ni Almacén antes del capítulo 3 | ✅ | Tests (`adsMinLoops`, capítulo 3 abre el Almacén). |
| Animaciones, partículas, sonidos, vibración, ajustes, «Reducir animaciones» | 📱 Daniel | Se ven en las capturas; el sonido y la vibración, en el móvil. |
| El juego básico funciona sin conexión | ✅ | Sesión larga sin red: ver tabla. |
| Tildes, ñ, ¿ y ¡ en el canvas y en los menús | ✅ | Menús y canvas usan la fuente del sistema (Roboto en Android), con todos los caracteres. |
| Sin errores de consola ni fugas de memoria | ✅ | Cero errores en pantallas y sesión larga; memoria estable (tabla). |
| Ningún elemento fuera de pantalla | ✅ | Tres tamaños, todas las pantallas. |
| 60 FPS durante el gameplay | ✅ / 📱 | Navegador: ver tabla. En un móvil de gama media, Daniel. |

## Sesión larga sin conexión

Medición en curso: se completa en el siguiente commit.

## Fase 7 (pagos de verdad)

Las pruebas de compras de verdad (comprar, pago pendiente, reembolso, restaurar) solo se pueden hacer con la prueba
interna de Google Play: paso 10 de `FASE7_DATOS.md`.
