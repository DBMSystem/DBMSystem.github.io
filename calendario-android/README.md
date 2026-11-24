# Calendario familiar — APK Android

Envoltorio [Capacitor](https://capacitorjs.com) de la web app de `../calendario` (la única fuente del código).
En la APK los recordatorios son notificaciones del móvil programadas, que saltan aunque la app esté cerrada.

## Cómo se genera

GitHub Actions (`.github/workflows/calendario-android.yml`) la compila en cada push que toque `calendario/`
o `calendario-android/`. En `main` se publica siempre en el mismo enlace:

https://github.com/DBMSystem/DBMSystem.github.io/releases/download/calendario-apk/CalendarioFamiliar.apk

En local (Node 22, JDK 21 y Android SDK):

```sh
npm ci
npm run build:android          # copia ../calendario a www/ y hace cap sync
cd android && ./gradlew assembleDebug
```

La APK queda en `android/app/build/outputs/apk/debug/app-debug.apk`. Se firma siempre con
`android/app/calendario-debug.keystore`, así que cada versión nueva se instala encima y conserva los datos.
