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

**Listo cuando** — ningún `Field` se puede guardar sin origen, confianza y `ruleId`: lo comprueba
`FieldProvenanceTest`, tanto al construir el objeto como con inserciones SQL directas.

**Cómo probarlo**

```
cd papeles
./gradlew :core:model:test :core:db:testDebugUnitTest
```

**Pendiente**

- Validación de Daniel para pasar a M2.
