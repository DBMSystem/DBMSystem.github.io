# AdMob en KITCHEN LOOP

Cómo están hechos los anuncios y qué falta configurar en la consola de AdMob.

## Formato elegido: solo anuncios recompensados

| Formato de AdMob | ¿Se usa? | Por qué |
|---|---|---|
| **Recompensado (Rewarded)** | **Sí** | El jugador elige verlo y sabe qué gana. Es el formato que mejor paga y el que menos daña la retención. |
| Banner | No | Ensucia la pantalla de juego (sección 7.1). |
| Intersticial | No | Anuncio obligatorio entre pantallas (sección 7.3, `interstitialEnabled: false`). |
| Apertura de app (App Open) | No | Obligatorio al abrir el juego. |
| Intersticial recompensado | No | Sale sin que el jugador lo pida (solo se puede saltar). |

Hay tres puntos de anuncio, todos con un botón que dice qué se gana:

| Punto | Botón | Recompensa | Límite |
|---|---|---|---|
| `CARD_PACK` | "ABRIR SOBRE — VER ANUNCIO" (álbum) | 1 sobre | 1 cada 6 h |
| `SECOND_CHANCE` | "SOBORNAR A PIP — VER ANUNCIO" (desbordamiento) | Vacía 8 casillas y +10 s | 1 por loop, 3 al día |
| `TRIAL` | "PROBAR — VER ANUNCIO" (Fase 5) | Probar una sartén o un utensilio 1 loop | 2 al día |

Ningún anuncio se ofrece hasta haber jugado 3 loops.

## Opciones óptimas aplicadas

- **Un bloque de anuncios por cada punto.** AdMob da ingresos y tasa de visualización por bloque, y permite poner precios mínimos (eCPM) distintos: una segunda oportunidad vale más que un sobre.
- **Precarga bajo demanda.** El anuncio se carga cuando la oferta puede salir (el sobre al tener el sobre gratis disponible; la segunda oportunidad al empezar un loop si quedan usos) y se recarga nada más usarse. Así el botón está listo cuando se necesita, sin pedir anuncios que no se van a ver (eso bajaría la tasa de visualización y los ingresos).
- **Reintentos con espera creciente** si no hay anuncio: 30 s, 60 s, 120 s… hasta 10 min (`adRetrySeconds`, `adRetryMaxSeconds` en `balance.js`). Mientras tanto el botón dice "Anuncio no disponible" y el juego sigue.
- **La recompensa solo se da cuando AdMob confirma que el anuncio se completó**, y se entrega al cerrarlo. Si se cierra antes, no hay recompensa.
- **Consentimiento con UMP** (el formulario de Google, obligatorio en Europa):
  - Se pide antes de cualquier anuncio, desde el menú, a partir del loop 3; nunca en mitad de una partida.
  - Si el jugador no da permiso, no se piden anuncios.
  - En Ajustes aparece "Privacidad de los anuncios" cuando Google lo exige, para cambiar la elección.
- **Clasificación del contenido de los anuncios:** como máximo "Parental Guidance" (PG). El público es de 13 años o más y el juego no está dirigido a niños (decisión D-4); se marca `tagForChildDirectedTreatment: false`.
- **Volumen:** el vídeo respeta el volumen de efectos del juego.
- **Ingresos por impresión:** se registran en la analítica (`ad_revenue`).
- **Pantalla completa inmersiva** en Android.
- **Anuncios de prueba** en desarrollo y en la versión de pruebas, y también mientras no estén puestos los bloques reales. Nunca se ven anuncios reales mientras se desarrolla.

## Qué tienes que hacer en la consola de AdMob (Fase 7)

1. Crear la app Android "KITCHEN LOOP" en AdMob y vincularla a Google Play cuando esté publicada.
2. Crear **3 bloques de anuncios recompensados**: `KL Sobre`, `KL Segunda oportunidad` y `KL Probar`. En cada uno, la recompensa puede quedarse en "1 recompensa" (el juego decide qué da).
3. Copiar los tres IDs (`ca-app-pub-…/…`) en `src/data/ads.js` (`adPlacements`) y el ID de la app en el `AndroidManifest.xml` (lo preparo en la Fase 6; ahora está el ID de prueba de Google).
4. En **Privacidad y mensajes**, crear el mensaje de **RGPD** (Europa) y, si quieres, el de estados de EE. UU. Sin ese mensaje, el formulario de consentimiento no sale.
5. `app-ads.txt` ya está en la raíz de la web con tu ID de editor: AdMob lo verificará al vincular la app.
6. Opcional, más adelante: precios mínimos por bloque (empezar sin ellos y ajustar con datos) y mediación con otras redes.

## Código

- `src/data/ads.js`: bloques, IDs de prueba y opciones de audiencia.
- `src/monetization/consent.js`: consentimiento UMP y formulario de privacidad.
- `src/monetization/admobProvider.js`: carga, precarga, reintentos y visualización con `@capacitor-community/admob`.
- `src/monetization/adManager.js`: límites, cooldowns y entrega de la recompensa (igual para AdMob y para el simulador).
- En el navegador no hay AdMob: en desarrollo y en la versión de pruebas sale el simulador; en producción web, "Anuncio no disponible".
