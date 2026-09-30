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

## M1

9. **Orden de `Origin`.** El enum se declara de más débil a más fuerte (ESTIMATED, DETECTED, USER_CONFIRMED,
   VERIFIED_EXTERNAL), el orden que fija M1, en lugar del orden del ejemplo de `CLAUDE.md`. Se guarda por nombre,
   así que el orden nunca afecta a los datos guardados.
10. **Procedencia obligatoria.** `origin`, `confidence` y `ruleId` son columnas NOT NULL, y `Field` rechaza al
    construirse un `ruleId` vacío, una confianza fuera de 0..1 y una página menor que 1. `page` y `box` pueden ser
    nulos: un dato derivado o escrito por el usuario no tiene una única zona de origen.
11. **`box`** se guarda como texto «l,t,r,b» (como indica `CLAUDE.md`), pero en el código es un `BoundingBox`
    que valida que las coordenadas estén normalizadas.
12. **`Change`.** `before` y `after` pueden ser nulos (ADDED no tiene «antes» y REMOVED no tiene «después») y
    `kind` es el enum `ChangeKind`. Se añade `origin`: un cambio es un dato derivado y hereda el origen más débil
    (regla 4).
13. **Campos de las demás entidades** (no los fija `CLAUDE.md`):
    - `Document`: tipo con su propio origen y confianza (lo detecta el clasificador o lo elige el usuario), serie y
      fecha de alta.
    - `Page`: número desde 1 y ruta opcional de la imagen en el almacenamiento privado de la app.
    - `Series`: tipo y clave normalizada del emisor, únicos juntos.
    - `Event`: tipo de fecha (una por cada fecha de la tabla de tipos de documento), fecha, origen y, si la hay, el
      campo del que se leyó.
    - `Reminder`: los tres tipos de M7, a qué se refiere (fecha, cambio o serie), cuándo salta y su estado.
    - `AppSetting`: clave y valor.
    Al borrar un documento se borra en cascada todo lo que depende de él.
14. **Migraciones.** Esquemas exportados en `core/db/schemas` (subidos al repositorio; CI falla si no lo están),
    lista `MIGRATIONS` y `SchemaTest`, que abre cada versión exportada como la actual. Sin migración destructiva:
    si falta una migración, la app falla en vez de borrar los datos.
15. **SQLCipher (pendiente).** `CLAUDE.md` pide evaluarlo; se deja para M8, junto con la exportación cifrada.
    Recordatorio: la clave del Keystore no viaja al cambiar de móvil.

## M2

16. **Texto de PDF con PdfBox-Android** (Apache 2.0). Android no extrae la capa de texto de un PDF antes de la API 35,
    así que se usa esta librería, que trabaja en el móvil. `PdfRenderer` (del sistema) solo se usa para convertir en
    imagen las páginas escaneadas.
17. **Página escaneada o con texto, página a página.** Una página cuya capa de texto tiene menos de 25 letras y cifras
    se trata como escaneada y pasa por OCR; así un sello o un «Pág. 1» no hacen pasar por texto una página que es
    una imagen. Umbral, resolución (250 ppp) y tamaño máximo de imagen (3.000 px) están en `TextExtractionConfig`
    y son hipótesis que se ajustarán con el conjunto sintético (M9).
18. **Bloques = líneas.** Tanto del PDF como del OCR salen líneas con su zona. En el PDF, un hueco ancho dentro de una
    línea (más de 1,5 veces la altura de la línea) abre un bloque nuevo, como hace el OCR con las columnas de una
    tabla. Todo se ordena igual: de arriba abajo y de izquierda a derecha.
19. **OCR con el modelo latino incluido en la app** (`com.google.mlkit:text-recognition`), no el que descarga Google
    Play: funciona sin red desde el primer uso. Cuesta unos MB de tamaño.
20. **Sin permisos de red.** ML Kit declara `INTERNET` para enviar estadísticas de uso a Google. El manifiesto de la
    app lo elimina (y también `ACCESS_NETWORK_STATE`), y la tarea `checkNoNetworkPermission`, enlazada a `lint`,
    falla si el manifiesto final vuelve a pedirlos. El escáner de documentos se ejecuta dentro de Google Play
    services, no en la app. `INTERNET` volverá solo con los contadores opcionales (M8).
21. **Entrada «Elegir un PDF».** Además del escáner, el selector de fotos y los PDF compartidos, la pantalla ofrece
    abrir un PDF con el selector del sistema (sin permisos). Motivo: la persona simulada 2 no sabe compartir un
    PDF desde el correo. Se puede quitar si no encaja.
22. **Copia temporal.** El archivo recibido se copia a la caché privada de la app para leerlo (las URI compartidas
    pueden caducar) y se borra al terminar. Guardar las páginas para enseñarlas como fuente llegará con el guardado
    del documento (M5 y M6).
23. **Límite de 10 páginas** por escaneo o selección de fotos. Hipótesis.
24. **PDF con contraseña (pendiente).** Muchas nóminas llegan protegidas con el DNI. En M2 la app lo detecta y lo
    explica; pedir la contraseña sería una función nueva y queda pendiente de tu decisión.
25. **Pantalla provisional.** Hasta que exista la revisión de campos (M5), la pantalla de captura enseña el texto
    leído página a página, para poder comprobar el OCR a simple vista.
26. **Registros de librerías (pendiente para M10).** PdfBox-Android escribe avisos en el registro del sistema. Antes de
    publicar, R8 eliminará todas las llamadas a `android.util.Log` en la versión de publicación
    (`-assumenosideeffects`), y la auditoría de registros de la puerta 1 lo comprobará.
