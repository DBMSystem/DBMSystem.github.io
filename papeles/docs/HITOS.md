# Hitos

## M0 — Estructura del proyecto

**Hecho**

- Proyecto Android en Kotlin con Compose (Material 3), Hilt y `minSdk` 26, y los 14 módulos de `CLAUDE.md`
  (vacíos salvo `app`). Configuración común en `build-logic/` (plugins de convención) y versiones en
  `gradle/libs.versions.toml`.
- `app/src/main/res/values/strings.xml` en español de España; la pantalla inicial solo muestra la promesa de la app.
  Sin permiso `INTERNET`.
- `tools/lint_strings.py` con sus tests (`tools/test_lint_strings.py`), enlazado al `lint` de todos los módulos y al
  `preBuild` de la app.
- ktlint en todos los módulos a través de `lint`.
- CI: `.github/workflows/papeles-android.yml` ejecuta los tests del script y `./gradlew test lint`.

**Cómo probarlo**

```
cd papeles
python3 -m unittest discover -s tools -p 'test_*.py'
./gradlew test lint          # necesita el SDK de Android (ANDROID_HOME o local.properties)
./gradlew :app:installDebug  # opcional, con un móvil o emulador conectado
```

**Pendiente**

- Validación de Daniel para pasar a M1.
- Decidir nombre y `applicationId` antes de M10 (`docs/DECISIONES.md`, punto 2).
