# Fase 7 — Datos que hay que pedir a Daniel, paso a paso

Plantilla de Daniel (26/09/2026) adaptada a KITCHEN LOOP. Lo que ya fija la especificación (secciones 7, 12 y 14)
viene rellenado; solo se pregunta lo que falta. Un paso cada vez: no se pasa al siguiente hasta tener el anterior.
Si falta un dato, el código lleva una constante vacía con el comentario `PENDIENTE` y se avisa (no se inventa nada).

Nunca se piden por el chat contraseñas, claves de firma ni el archivo `.keystore`: van a los secretos de GitHub.

## Lo que la plantilla trae y el juego no usa

| Plantilla | En KITCHEN LOOP | Por qué |
|---|---|---|
| Banner | **No se usa** | Especificación 7.1: sin banners. |
| Intersticial | **No se usa** | Especificación 7.3: `interstitialEnabled: false`. |
| `premium_lifetime` "sin anuncios + todo desbloqueado" | **No existe** | No se vende contenido de juego (7.1); los anuncios ya son voluntarios. Ver paso 8. |
| `donacion_1` consumible | **No existe** | Todos los productos son compras únicas (7.4). Añadir uno sería un sistema nuevo: solo si Daniel cambia la especificación. |

## Paso 1 — La app

- **Package name:** `com.dbmsystem.kitchenloop`, el que ya usan el proyecto y los APK de prueba.
  - Pregunta: ¿se queda este? Tras la primera subida a Play Console **no se puede cambiar nunca**.
- **versionCode:** lo pone la CI con el número de ejecución (siempre sube, como exige Play).
- **versionName:** ahora es 0.9.1.
  - Pregunta: ¿el lanzamiento sale como `1.0.0`?

## Paso 2 — Clave de firma de publicación (la hace Daniel en su ordenador)

1. Generar la clave de subida (una sola vez; guardarla en dos sitios seguros):
   `keytool -genkeypair -v -keystore kitchenloop-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000`
2. En GitHub, en el repositorio, ir a **Settings → Secrets and variables → Actions** y crear estos secretos:
   - `KL_UPLOAD_KEYSTORE_BASE64`: el `.jks` en base64 (`base64 -w0 kitchenloop-upload.jks`).
   - `KL_UPLOAD_STORE_PASSWORD`
   - `KL_UPLOAD_KEY_ALIAS` (`upload`)
   - `KL_UPLOAD_KEY_PASSWORD`
3. Avisar cuando estén creados. Con eso, la CI genera además el **AAB firmado** para Play Console. La clave de depuración actual solo sirve para los APK de prueba.
4. En Play Console se activa **Firma de apps de Google Play**: Google guarda la clave final y la tuya es solo la de subida.

## Paso 3 — Play Console: crear la app y la prueba interna

1. Crear la app "Kitchen Loop": juego, gratuita.
2. En **Probar → Prueba interna**, subir el primer AAB del paso 2. Sin un AAB subido con el permiso de facturación, Play Console **no deja crear productos**.
3. En **Configuración → Pruebas de licencias**, añadir tu cuenta de Gmail (y las de quien vaya a probar). Así las compras de prueba no cobran.
4. Pregunta: ¿qué correos van en la lista de la prueba interna?

## Paso 4 — Productos (Monetizar → Productos → Productos únicos)

Los identificadores ya están en el código (`src/data/products.js`) y deben crearse **exactamente así**:

| ID del producto | Tipo | Precio (especificación) | Qué desbloquea |
|---|---|---|---|
| `kl_maestro_pass` | Único, no consumible | 4,99 € | Pase del Maestro: Álbum Dorado, sobre diario sin anuncio, Cocina Nocturna, Sartén Dorada, frases de Pip |
| `kl_skin_rusty` | Único, no consumible | 1,99 € | Sartén Oxidada (cosmética) |
| `kl_skin_pink` | Único, no consumible | 1,99 € | Sartén Rosa de Pip (cosmética) |
| `kl_skin_black` | Único, no consumible | 1,99 € | Sartén Negra (cosmética) |
| `kl_starter_pack` | Único, no consumible | 0,99 € | Pack de Inicio: 4 comunes y 1 rara concretas |

- Preguntas:
  - ¿Precios iguales o distintos?
  - ¿Ofertas o descuentos? Por defecto: ninguna.
- El juego muestra el precio localizado que devuelve Google Play. El precio escrito en `products.js` solo se usa en el navegador de pruebas.

## Paso 5 — Plugin de pagos (decisión D-7)

- Pregunta: ¿usas RevenueCat? Si la respuesta es sí, necesito la *Public Android API key* (`goog_…`) y el nombre del *entitlement*.
- **Recomendación: sin RevenueCat.** Son 5 compras únicas; basta un plugin propio pequeño (Kotlin) sobre **Google Play Billing Library 8.x**.
  - Da control total de la versión (Play exige 8.0.0 o superior).
  - No añade otro SDK ni otra empresa que trate datos, así que el formulario de Seguridad de los datos queda más simple.
  - No necesita cuenta extra.
- Se implemente como se implemente, `shop.js` mantiene su contrato (sección 12.2):
  - Compras pendientes que no entregan nada.
  - Reembolsos que retiran la compra y desequipan la sartén.
  - Consulta de compras al arrancar y al volver del segundo plano.
  - Caché en el guardado para jugar sin conexión.
  - "Restaurar compras" en Ajustes (ya existe).
  - Confirmación (*acknowledge*) de cada compra, obligatoria en 3 días.
- Nada de enlaces ni pagos externos.

## Paso 6 — AdMob

Solo anuncios recompensados (ver `docs/ADMOB.md`).

1. **App ID** (`ca-app-pub-…~…`): va en `AndroidManifest.xml`; ahora está el de prueba de Google.
2. **Tres bloques recompensados** (`ca-app-pub-…/…`), que van en `src/data/ads.js`:
   - `KL Sobre` (`CARD_PACK`)
   - `KL Segunda oportunidad` (`SECOND_CHANCE`)
   - `KL Probar` (`TRIAL`)
3. **Mensaje RGPD (UMP)** creado en *Privacidad y mensajes*.
   - Pregunta: ¿sí o no? Si no está creado, el formulario de consentimiento no sale y en Europa no se piden anuncios.
4. **ID de tu móvil como dispositivo de prueba**, que sale en el logcat al abrir la app.
   - Si todavía no lo tienes, queda la constante vacía con `PENDIENTE`.
   - Mientras tanto, las versiones de prueba usan los bloques de prueba de Google: nunca se ven anuncios reales al desarrollar.
5. **Dónde va cada anuncio y cada cuánto:** ya lo fija la especificación.
   - Sobre: 1 cada 6 h.
   - Segunda oportunidad: 1 por loop y 3 al día.
   - Probar: 2 al día.
   - Nada durante la partida y nada hasta haber jugado 3 loops.
   - Pregunta: ¿se mantiene así?

## Paso 7 — Política de privacidad y Seguridad de los datos

- La política se puede publicar en esta misma web: `https://dbmsystem.github.io/kitchen-loop/privacidad/`. Yo la redacto y va enlazada desde Ajustes y desde la ficha de Play.
- Preguntas:
  - Nombre del responsable (persona o empresa).
  - Correo de contacto.
  - País.
- Datos que se tratan:
  - AdMob: identificador de publicidad, datos de diagnóstico y uso de anuncios.
  - Google Play: compras.
  - La analítica del juego es local (no envía nada). No hay cuentas ni datos personales.
- Con eso preparo las respuestas del formulario **Seguridad de los datos**.

## Paso 8 — Usuarios de pago y anuncios (decisión nueva)

La plantilla pide que los usuarios premium no inicialicen AdMob ni vean anuncios. En KITCHEN LOOP no existe "premium sin anuncios": los anuncios son voluntarios y dan recompensas. Si "premium" es el Pase del Maestro:

- **A (especificación, por defecto):** quien tenga el Pase puede seguir usando los anuncios voluntarios si quiere.
  - El sobre diario del Pase ya evita el anuncio del sobre.
- **B (plantilla):** con el Pase, AdMob no se inicializa.
  - Esa persona pierde "Segunda oportunidad" y "Probar", porque darlas gratis sería vender ventaja (7.1).
- Pregunta: ¿A o B? Hasta que Daniel decida, se aplica A (manda la especificación) y queda anotado en `DECISIONES.md`.

## Paso 9 — Público y clasificación

- Público D-4: 13 años o más y no dirigido a niños.
  - Pregunta: ¿confirmado? Si incluye menores de 13, cambian las normas de anuncios (Familias).
- Cuestionario de clasificación de contenido (IARC) en Play Console. Lo rellena Daniel; yo le paso las respuestas: sin violencia, sin compras aleatorias, con compras y con anuncios.

## Paso 10 — Prueba de aceptación de la Fase 7

Con la prueba interna instalada desde Play y una cuenta de prueba de licencias:

- [ ] Comprar cada producto.
- [ ] Probar un pago pendiente (tarjeta de prueba "lenta").
- [ ] Probar un reembolso desde Play Console: la compra desaparece y la Sartén Dorada vuelve a la normal.
- [ ] Restaurar compras tras desinstalar.
- [ ] Jugar sin conexión con las compras en caché.
- [ ] Ver el formulario RGPD.
- [ ] Ver los 3 anuncios de prueba y recibir su recompensa solo al completarlos.
