# Decisiones

Decisiones tomadas al construir, con su motivo. Las marcadas **pendiente humano** necesitan que Daniel las confirme.

## M0

1. **Ubicación.** El plan pedía un repositorio vacío; por indicación de Daniel el proyecto vive en `papeles/` dentro de
   DBMSystem.github.io, igual que `kitchen-loop/`. Consecuencia: GitHub Pages sirve también esta carpeta, así que
   el repositorio es público de hecho. Refuerza la regla de no subir nunca documentos reales.
2. **Nombre e identificador (pendiente humano).** Nombre provisional «Papeles al día» (`app_name`, una de las
   propuestas de la ficha) y `applicationId` `com.dbmsystem.papeles`. El `applicationId` no se puede cambiar tras
   publicar en Play: hay que confirmarlo antes de M10.
3. **Módulos de dominio en Kotlin puro.** `core/model`, `core/classify`, `core/extract`, `core/diff` y `core/dates` son
   módulos JVM sin Android: sus tests (incluido el golden set) corren rápido sin Robolectric. Llevan el plugin
   `com.android.lint`, así que `./gradlew lint` también los revisa. `core/db`, `core/text`, `core/notify` y los
   `feature/*` son bibliotecas Android porque dependen de Room, ML Kit, WorkManager o Compose.
4. **ktlint en lugar de detekt.** El plan admite uno u otro. ktlint (estilo `ktlint_official`) se ejecuta dentro de
   `lint` en cada módulo.
5. **Script de cadenas.** Además de la lista del plan («error», «reclam», «ilegal», «debes», «fraude», «abusiv»), prohíbe
   «deberías», que la regla 2 de `CLAUDE.md` nombra expresamente. También falla con texto de interfaz escrito en el
   código Kotlin (`Text("…")`, `contentDescription = "…"`…), requisito de la «Definición de terminado», y con
   caracteres de codificación rota («Ã³»). «Factura sin tilde donde corresponde» se interpreta como: falla «fáctura».
   El script corre en el `lint` de cada módulo y antes de cada compilación de la app (`preBuild`).
6. **Copia de seguridad.** `android:allowBackup="false"` hasta M8, que añadirá la exportación cifrada y las reglas de
   exclusión definitivas. Así la base de datos nunca entra en la copia automática, aunque M1 la cree antes.
7. **Versiones.** AGP 8.13.0, Gradle 8.14.3, Kotlin 2.2.21, KSP 2.2.21-2.0.5, Hilt 2.57.2, Compose BOM 2025.09.00,
   `compileSdk`/`targetSdk` 36, `minSdk` 26. AGP y Gradle coinciden con los que ya compilan Kitchen Loop en CI.
   El nivel de API objetivo exigido por Play se vuelve a comprobar en M10.
8. **Compilación en CI.** El entorno de Claude Code no alcanza `dl.google.com` ni `maven.google.com` (SDK de Android,
   AGP, AndroidX), así que `./gradlew test lint` se valida en GitHub Actions (`.github/workflows/papeles-android.yml`).
   En local se prueban el script de cadenas y ktlint.
