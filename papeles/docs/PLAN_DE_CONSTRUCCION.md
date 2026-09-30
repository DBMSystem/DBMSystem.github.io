# Plan de construcción para Claude Code

Cómo usarlo: abre el repositorio vacío, copia `CLAUDE.md` en la raíz y pega los prompts en orden. Cada hito termina con tests en verde y una nota en `docs/HITOS.md`. No pases al siguiente hito si el anterior no cumple su "Listo cuando".

Decisión de producto: la app se publica sin pruebas con personas. Lo técnico se valida con simulaciones (ver `SIMULACIONES_Y_PUBLICACION.md`). Retención y pago se miden después con contadores anónimos que el usuario activa.

---

## M0. Estructura del proyecto

**Prompt:**
> Lee CLAUDE.md. Crea el proyecto Android (Kotlin, Compose, Material 3, Hilt, minSdk 26) con los módulos Gradle descritos. Configura `res/values/strings.xml` en español de España, un `detekt`/`ktlint`, y un script `tools/lint_strings.py` que falle si una cadena contiene palabras prohibidas ("error", "reclam", "ilegal", "debes", "fraude", "abusiv") o si faltan tildes en una lista de palabras frecuentes (nomina, factura sin tilde donde corresponde, renovacion, devolucion). Añade CI local con `./gradlew test lint`.

**Listo cuando:** compila, `./gradlew test lint` pasa, el script de cadenas está enlazado al build.

## M1. Modelo de datos y procedencia

**Prompt:**
> Implementa `core/model` y `core/db`: entidades Room `Document`, `Page`, `Field`, `Series`, `Event`, `Change`, `Reminder`, `AppSetting` con migraciones. Implementa `Origin` y una función `weakest(vararg Origin)` para orígenes derivados (orden de más débil a más fuerte: ESTIMATED, DETECTED, USER_CONFIRMED, VERIFIED_EXTERNAL). Tests unitarios de la procedencia y de los DAOs (Robolectric).

**Listo cuando:** ningún `Field` se puede guardar sin origen, confianza y `ruleId`.

## M2. Captura y texto

**Prompt:**
> Implementa `feature/capture` y `core/text`: ML Kit Document Scanner, Photo Picker, `ACTION_SEND`/`ACTION_VIEW` para PDF. Extrae texto de la capa de texto del PDF y, si no existe, rasteriza con `PdfRenderer` y aplica ML Kit Text Recognition v2 (latino) por página. Devuelve bloques con página y bounding box normalizado. Sin permisos de almacenamiento amplios. Tests con PDFs y fotos de ejemplo.

**Listo cuando:** un PDF con texto, un PDF escaneado y una foto producen el mismo modelo `TextPage`.

## M3. Clasificador

**Prompt:**
> Implementa `core/classify`: clasifica en PAYSLIP, UTILITY_BILL, PURCHASE, SUBSCRIPTION, INSURANCE, VEHICLE, CONTRACT_DATES, OTHER con reglas (palabras clave ponderadas, presencia de estructuras como "IBAN", "CUPS", "Devengos", "Prima", "ITV") y devuelve tipo, confianza y motivos. Si la confianza < 0.7, la UI pregunta al usuario con tres opciones. Cobertura de tests con el conjunto sintético (M9) y con casos negativos.

**Listo cuando:** ≥ 95 % de acierto de tipo en el conjunto sintético y ninguna clasificación sin motivos.

## M4. Extractores sencillos

**Prompt:**
> Implementa extractores de PURCHASE, SUBSCRIPTION, INSURANCE, VEHICLE y CONTRACT_DATES en `core/extract`. Cada campo lleva `ruleId`, confianza, página y bounding box. Para CONTRACT_DATES solo se extraen fechas y frases clave ("renovación", "preaviso", "vigencia", "duración") con la cita textual y la página; nunca se interpreta. Usa el motor de fechas con orígenes DETECTED/ESTIMATED. Nunca inventes una fecha: si falta, el campo queda vacío.

**Listo cuando:** los tests con ground truth sintético pasan y ningún extractor devuelve fechas sin fuente.

## M5. Extractores de nómina y factura + revisión

**Prompt:**
> Implementa extractores de PAYSLIP (empresa, periodo, bruto, neto, IRPF %, Seguridad Social, complementos, horas, deducciones) y UTILITY_BILL (suministro, periodo, importe, consumo, precio unitario, impuestos). Usa plantillas por emisor conocido y un extractor genérico por etiquetas y tablas. No extraigas ni muestres conceptos de baja médica. Implementa `feature/review`: campos con su fuente y confianza, resaltado de dudosos, corrección con teclado numérico; al corregir, el origen pasa a USER_CONFIRMED. Registra la tasa de campos correctos por formato en un informe `build/reports/extraction.json`.

**Listo cuando:** informe de extracción disponible; los formatos que no llegan al 90 % se marcan "entrada manual asistida".

## M6. Comparador y pantallas Hoy y Cambios

**Prompt:**
> Implementa `core/diff` con `ComparisonConfig` (umbrales configurables), asignación de documentos a series (misma empresa / mismo suministro) y `Change` con UP, DOWN, ADDED, REMOVED. Implementa `feature/today` (máximo 3 tarjetas arriba y "Este mes" debajo) y `feature/changes` (ficha "Septiembre frente a octubre"). Los textos vienen de strings.xml según CLAUDE.md. Tests de UI con Compose y de capturas.

**Listo cuando:** dos nóminas sintéticas distintas producen la ficha correcta y el texto exacto "Hemos detectado una diferencia que quizá quieras revisar."

## M7. Avisos

**Prompt:**
> Implementa `core/notify`: programación con WorkManager y `AlarmManager.setAndAllowWhileIdle`, reconciliador diario y `BOOT_COMPLETED`. Tres tipos: aviso de fecha (con antelación configurable), aviso de cambio tras subir documento y aviso mensual opcional el día de cobro ("¿Ha llegado tu nómina de {mes}?"). Máximo dos avisos a la semana por defecto. Permiso POST_NOTIFICATIONS solicitado en contexto. Inyecta un `Clock` para poder simular el tiempo en tests.

**Listo cuando:** la suite de reloj simulado (1.000 casos) no pierde ni duplica avisos.

## M8. Privacidad y ajustes

**Prompt:**
> Implementa `feature/settings`: "Borrar todos mis datos", exportación manual cifrada con contraseña del usuario (AES-GCM con clave derivada), bloqueo biométrico opcional, exclusión de la base de datos de la copia automática (`android:fullBackupContent`/`dataExtractionRules`), y contadores anónimos opcionales (activados por el usuario) con solo: primer uso, segundo mes natural activo, número de documentos por tipo. Sin identificadores de publicidad. Verifica que con los contadores desactivados no hay tráfico de red.

**Listo cuando:** auditoría de red con contadores desactivados = 0 conexiones; política de privacidad enlazada desde Ajustes.

## M9. Generador sintético y suite de simulaciones

**Prompt:**
> Sigue `SIMULACIONES_Y_PUBLICACION.md`. Crea `tools/synthetic/` que genere 300 documentos sintéticos de 15 formatos con JSON de verdad conocida y ruido de foto, y `tools/sim/` que ejecute: precisión de extracción, reloj simulado, barrido de cadenas prohibidas y auditoría de red. Genera `build/reports/gates.md` con el estado de las puertas 0 y 1 y los límites de cada simulación.

**Listo cuando:** `gates.md` indica puerta 0 (≥ 90 % de campos) y puerta 1 (0 avisos perdidos o duplicados, 0 cadenas prohibidas, 0 tráfico) en verde, o lista los formatos desactivados.

## M10. Publicación

**Prompt:**
> Prepara la publicación según el apartado "Lista de publicación" de `SIMULACIONES_Y_PUBLICACION.md`: firma con Play App Signing, AAB de release con R8, `versionCode`, capturas de pantalla generadas desde tests de capturas, ficha en español, política de privacidad, y `docs/play-declaraciones.md` con las respuestas de Seguridad de los datos, funciones financieras y clasificación de contenido. No subas nada: deja todo listo para cargar en Play Console.

**Listo cuando:** existen el AAB firmado por la clave de subida, la ficha y las declaraciones, y `docs/pendiente-humano.md` enumera lo único que tiene que hacer una persona (crear la cuenta si falta, cargar el AAB, aceptar declaraciones, revisar la política con un profesional).
