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

**Listo cuando** — cumplido: [Papeles CI n.º 1](https://github.com/DBMSystem/DBMSystem.github.io/actions/runs/36694734660)
compila (incluida la app con Hilt) y pasa `./gradlew test lint` en los 14 módulos, con ktlint y el script de cadenas
enlazados.

**Cómo probarlo**

```
cd papeles
python3 -m unittest discover -s tools -p 'test_*.py'
./gradlew test lint          # necesita el SDK de Android (ANDROID_HOME o local.properties)
./gradlew :app:installDebug  # opcional, con un móvil o emulador conectado
```

**Pendiente**

- Decidir nombre y `applicationId` antes de M10 (`docs/DECISIONES.md`, punto 2).

Validado por Daniel el 30-09-2026.

## M1 — Modelo de datos y procedencia

**Hecho**

- `core/model` (Kotlin puro): `Origin` de más débil a más fuerte y `weakest(...)` para datos derivados;
  `DocumentType`, `ChangeKind`, `EventKind`, `ReminderKind`/`ReminderStatus` y `BoundingBox`.
- `core/db` (Room): entidades `Series`, `Document`, `Page`, `Field`, `Change`, `Event`, `Reminder` y
  `AppSetting`, con sus DAOs, claves ajenas en cascada, `PapelesDatabase` (sin migración destructiva) y el módulo
  de Hilt que la inyecta.
- Migraciones: esquema exportado en `core/db/schemas`, lista `MIGRATIONS` y `SchemaTest`.
- Tests: procedencia (JVM) y DAOs con Robolectric.

**Listo cuando** — cumplido: ningún `Field` se puede guardar sin origen, confianza y `ruleId`. Lo comprueba
`FieldProvenanceTest`, tanto al construir el objeto como con inserciones SQL directas.
[Papeles CI n.º 4](https://github.com/DBMSystem/DBMSystem.github.io/actions/runs/36698369239): `./gradlew test lint`
en verde, con 10 tests JVM en `core/model` y 15 con Robolectric en `core/db`.

**Cómo probarlo**

```
cd papeles
./gradlew :core:model:test :core:db:testDebugUnitTest
```

Validado por Daniel el 30-09-2026.

## M2 — Captura y texto

**Hecho**

- `core/model`: `TextPage` y `TextBlock` (línea, zona normalizada y confianza), orden de lectura y normalización de
  zonas.
- `core/text`: capa de texto del PDF (PdfBox-Android), páginas escaneadas convertidas en imagen (`PdfRenderer`) y
  leídas con OCR (ML Kit, modelo latino incluido), fotos con su giro EXIF, y `DocumentReader`, que copia la entrada a
  la caché privada, la lee y la borra. Detecta PDF con contraseña.
- `feature/capture`: escanear con la cámara (escáner de ML Kit), elegir fotos (selector de fotos del sistema), elegir
  un PDF y recibir PDF compartidos o abiertos con la app. Sin permisos de almacenamiento ni de cámara.
- Manifiesto sin permisos de red, con una comprobación enlazada a `lint`.
- CI: nuevo trabajo `device-tests` que ejecuta los tests de dispositivo en un emulador.

**Listo cuando** — cumplido. `SameTextPageTest` genera una página de nómina sintética como PDF con texto, como PDF escaneado
y como foto, y comprueba que las tres dan el mismo `TextPage`: mismas líneas, mismo orden y zonas a menos de un 2 %.
[Papeles CI n.º 6](https://github.com/DBMSystem/DBMSystem.github.io/actions/runs/36701635520): el test pasa en un
emulador Android 14, y `./gradlew test lint` pasa en local y en CI.

**Cómo probarlo**

```
cd papeles
./gradlew test lint                           # JVM y Robolectric
./gradlew :core:text:connectedDebugAndroidTest   # con un emulador o un móvil conectado
./gradlew :app:installDebug                   # y probar las cuatro entradas en el móvil
```

**Pendiente**

- Validación de Daniel para pasar a M3.
- Decidir si se piden contraseñas de PDF (`docs/DECISIONES.md`, punto 24).
