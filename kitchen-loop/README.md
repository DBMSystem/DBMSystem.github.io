# KITCHEN LOOP

Juego móvil de puzle de cocina + colección de cartas. Especificación: `docs/KITCHEN_LOOP_SPEC.md`. Decisiones: `docs/DECISIONES.md`.

```bash
npm install
npm run dev -- --host   # servidor de desarrollo, accesible desde el móvil en la misma wifi
npm test                # Vitest
npm run build:playtest  # versión de pruebas en play/ (con anuncio simulado)
npm run build           # versión de producción en dist/ (sin mocks)
node scripts/simulateEconomy.js > docs/ECONOMY_REPORT.md   # simulación de economía
python3 scripts/extract_sprites.py                        # regenerar sprites (Pillow + numpy)
npm run build:android   # web + sincronizar el proyecto Android (Capacitor)
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
