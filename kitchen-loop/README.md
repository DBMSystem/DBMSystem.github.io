# KITCHEN LOOP

Juego móvil de puzle de cocina + colección de cartas. Especificación: `docs/KITCHEN_LOOP_SPEC.md`. Decisiones: `docs/DECISIONES.md`. Historia: `docs/HISTORIA.md`.

```bash
npm install
npm run dev -- --host   # servidor de desarrollo, accesible desde el móvil en la misma wifi
npm test                # Vitest
npm run build:playtest  # versión de pruebas en play/ (con anuncio simulado)
npm run build           # versión de producción en dist/ (sin mocks)
node scripts/simulateEconomy.js > docs/ECONOMY_REPORT.md   # simulación de economía
node scripts/simulatePlaythrough.js skilled > docs/PLAYTHROUGH_REPORT.md   # un bot se pasa el juego (skilled|casual)
python3 scripts/extract_sprites.py                        # regenerar sprites (Pillow + numpy)
python3 scripts/card_art.py                               # ilustraciones de las cartas
python3 scripts/story_backdrop.py                         # fondo pixel art de las escenas (utensilios)
python3 scripts/figures.py                                # clientes recortados enteros (pelos y gorros)
python3 scripts/menu_scene.py                             # dibujo del menú (sin la sartén de la ventana)
node scripts/simulateLoops.js 300                          # equilibrio de cada servicio (docs/LOOP_BALANCE.md)
npm run build:android   # web + sincronizar el proyecto Android (Capacitor)
npm run build:release   # igual, pero en modo producción: la versión para Google Play
python3 scripts/android_assets.py                         # icono y pantalla de inicio de Android
```

## Android (APK de prueba)

- **Descargar la última:** https://github.com/DBMSystem/DBMSystem.github.io/releases/download/kitchen-loop-apk/KitchenLoop.apk
- GitHub Actions (`.github/workflows/kitchen-loop-android.yml`) compila el APK en cada cambio del juego. En `main` lo publica en la prerelease `kitchen-loop-apk`; en las demás ramas queda como artefacto de la ejecución.
- **Instalar:**
  1. Abre el enlace desde el móvil y descarga el APK.
  2. Ábrelo y permite "Instalar apps desconocidas" para el navegador cuando Android lo pida.
  3. Las siguientes versiones se instalan encima y conservan la partida: todas se firman con la misma clave de prueba (`android/app/kitchenloop-debug.keystore`, contraseña `android`). La clave de la Play Store será otra, privada (Fase 7).
- **Contenido:** es la versión de pruebas (contador de FPS y herramientas de prueba), con anuncios de prueba de Google y compras simuladas.
- **Compilar en local:** necesitas Android Studio (o el SDK) y JDK 21. Ejecuta `npm run build:android` y después `cd android && ./gradlew assembleDebug`.

## Android (Google Play)

- **Pagos:** Google Play Billing con un plugin propio (`android/app/src/main/java/com/dbmsystem/kitchenloop/PlayBillingPlugin.java` y `src/monetization/playBilling.js`). Solo en la versión de producción; el APK de prueba mantiene las compras simuladas.
- **AAB firmado:** la CI lo genera en `main` cuando existen los secretos `KL_UPLOAD_KEYSTORE_BASE64`, `KL_UPLOAD_STORE_PASSWORD`, `KL_UPLOAD_KEY_ALIAS` y `KL_UPLOAD_KEY_PASSWORD` (ver `docs/FASE7_DATOS.md`). Queda como artefacto `…-play` de la ejecución, para subirlo a Play Console.
- **En local:** `npm run build:release` y `cd android && ./gradlew bundleRelease` (sin la clave, el AAB sale sin firmar).
- **Lo que falta para publicar:** los datos de Daniel de `docs/FASE7_DATOS.md`; la revisión final, en `docs/FASE8_CHECKLIST.md`.
