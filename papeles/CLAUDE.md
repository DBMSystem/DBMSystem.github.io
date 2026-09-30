# Asistente de vida administrativa (nombre por decidir) — CLAUDE.md

App Android que permite subir documentos cotidianos (nóminas, compras, suscripciones, seguros, coche, facturas, contratos) y que:
entiende el tipo de documento, extrae lo importante, lo compara con el anterior, detecta fechas, avisa y dice qué revisar.
Promesa: "Sube tus documentos. Nosotros detectamos lo importante."

Estado: se construye y publica la V1 sin pruebas con personas. Las puertas 0 y 1 (técnicas) se superan con simulaciones antes de publicar; las puertas 2 y 3 (retorno y pago) se miden después. Otros archivos del paquete: `docs/PLAN_DE_CONSTRUCCION.md` (hitos M0 a M10 con prompts) y `docs/SIMULACIONES_Y_PUBLICACION.md`.

El proyecto vive en la carpeta `papeles/` del repositorio de la web (DBMSystem.github.io); todas las rutas de este archivo son relativas a ella.

**Hito actual: M0 — Estructura del proyecto.** Daniel actualiza esta línea al validar cada hito (registro en `docs/HITOS.md`).

## Reglas no negociables

1. **Local primero.** Sin backend propio, sin cuentas, sin subir documentos por defecto. Todo el procesamiento (captura, OCR, clasificación, extracción, comparación, avisos) ocurre en el dispositivo.
2. **Nunca afirmar; siempre señalar.** El texto de la app no dice "error", "reclama", "ilegal" ni "deberías". Usa "parece indicar…", "Hemos detectado una diferencia que quizá quieras revisar". Los verbos de hecho ("Tu devolución termina en 4 días") solo se usan con datos confirmados por el usuario.
3. **Sin asesoramiento** fiscal, laboral, jurídico ni financiero. No recomendar tarifas ni comercializadoras. No calcular retenciones "correctas". No interpretar coberturas de pólizas.
4. **Procedencia de cada dato.** Todo campo guarda: valor, origen, confianza (0-1), página y zona de origen (bounding box) y `ruleId`.
   Orígenes: `DETECTED`, `USER_CONFIRMED`, `VERIFIED_EXTERNAL`, `ESTIMATED`. Un dato derivado hereda el origen más débil de los que lo componen.
5. **Nunca inventar una fecha.** Si no se puede determinar, se pregunta al usuario. Una fecha estimada se muestra como estimada.
6. **Datos sensibles.** No extraer ni mostrar conceptos de baja médica de nóminas ni coberturas de salud. Sin permisos de lectura amplia de fotos, archivos ni correo.
7. **Registros (logs).** Prohibido registrar texto, campos o imágenes de documentos, también en debug. Los registros de producción no contienen contenido.
8. **Sin anuncios en V1 y analítica mínima opcional.** Sin banners nunca. Anuncios recompensados solo en V2 y con consentimiento (UMP). En V1 solo contadores anónimos que el usuario activa (primer uso, segundo mes natural activo, número de documentos por tipo); nunca contenido ni identificadores de publicidad. Con los contadores desactivados no debe haber tráfico de red.
9. **Textos en español de España con tildes y ñ** en `res/values/strings.xml`. Nada de cadenas de UI en código.
10. **Copia de seguridad.** Excluir la base de datos de la copia automática del sistema. Exportación manual cifrada con contraseña del usuario.

## Stack

- Kotlin, Jetpack Compose (Material 3), Coroutines/Flow, Hilt.
- Room para datos; evaluar SQLCipher con clave del Keystore (recordar: la clave del Keystore no viaja al cambiar de móvil).
- WorkManager + `AlarmManager.setAndAllowWhileIdle` (inexacta, sin permisos de alarma exacta) + reconciliador diario + `BOOT_COMPLETED`.
- ML Kit Document Scanner (en dispositivo, vía Google Play services; no incluye OCR), ML Kit Text Recognition v2 (paquete latino), texto de PDF con capa de texto antes de aplicar OCR.
- Entrada: cámara (escáner), selector de fotos (Photo Picker) y `ACTION_SEND` / `ACTION_VIEW` para PDF compartidos.
- Gemini Nano (ML Kit Prompt API, beta, API 26+, depende de AICore, entrada < 4.000 tokens, cuota por app) solo como mejora opcional detrás de `if (available)`. Nunca es requisito.
- Tests: JUnit, Robolectric, tests de UI con Compose, y **golden set** de documentos reales (ver más abajo).
- minSdk 26. Solo Android en V1.

## Módulos Gradle

```
app/
core/model      // entidades de dominio y enums
core/db         // Room: DAOs, migraciones
core/text       // texto de PDF y OCR
core/classify   // clasificador de tipo de documento (reglas)
core/extract    // extractores por tipo (reglas y plantillas por emisor)
core/diff       // comparación de series (nómina, factura)
core/dates      // motor de fechas y procedencia
core/notify     // avisos, alarmas, reconciliador
feature/today   // pantalla Hoy
feature/capture // subir documento
feature/review  // revisar campos
feature/changes // ficha de cambios
feature/settings// privacidad, exportar, borrar
```

## Tipos de documento de la V1

`PAYSLIP`, `UTILITY_BILL`, `PURCHASE`, `SUBSCRIPTION`, `INSURANCE`, `VEHICLE`, `CONTRACT_DATES`, `OTHER`.

| Tipo | Campos | Comparación |
| --- | --- | --- |
| PAYSLIP | empresa, periodo, bruto, neto, IRPF %, Seguridad Social, complementos, horas, deducciones | contra la nómina anterior de la misma empresa |
| UTILITY_BILL | suministro, periodo, importe, consumo, precio unitario, impuestos | contra la factura anterior del mismo suministro |
| PURCHASE | comercio, fecha, importe, nº pedido, nº serie, plazo de devolución, garantía | no aplica |
| SUBSCRIPTION | nombre, precio, periodicidad, próxima renovación, prueba gratuita | contra el precio anterior |
| INSURANCE | compañía, tipo, precio, renovación, vencimiento, franquicia | contra el precio anterior |
| VEHICLE | ITV, seguro, revisión, vehículo | no aplica |
| CONTRACT_DATES | fechas y frases clave con página y fuente | no aplica; solo "parece indicar" |

## Modelo de datos (Room)

Entidades: `Document`, `Page`, `Field`, `Series`, `Event`, `Change`, `Reminder`, `AppSetting`.

```kotlin
enum class Origin { DETECTED, USER_CONFIRMED, VERIFIED_EXTERNAL, ESTIMATED }

@Entity data class Field(
  @PrimaryKey val id: String,
  val documentId: String,
  val key: String,          // p. ej. "gross", "net", "irpfPercent", "renewalDate"
  val value: String,
  val origin: Origin,
  val confidence: Float,    // 0..1
  val page: Int?,
  val box: String?,         // "l,t,r,b" normalizado
  val ruleId: String        // regla que lo produjo
)

@Entity data class Change(
  @PrimaryKey val id: String,
  val seriesId: String,
  val fromDocumentId: String,
  val toDocumentId: String,
  val fieldKey: String,
  val before: String,
  val after: String,
  val kind: String          // UP, DOWN, ADDED, REMOVED
)
```

## Pipeline

1. Captura o entrada de archivo.
2. Texto: si el PDF tiene capa de texto se usa; si no, OCR por página.
3. Clasificación por reglas (palabras clave y estructura). Si la confianza es baja: preguntar "¿Qué es este documento?" con tres opciones.
4. Extracción por tipo (reglas y plantillas por emisor conocido).
5. Pantalla de revisión: el usuario confirma o corrige (`USER_CONFIRMED`).
6. Guardado y asignación a una serie.
7. Comparación con el documento anterior y creación de `Change`.
8. Creación de `Event` (fechas) y `Reminder`.

## Comparador (parámetros configurables, no fijos)

Marcar diferencia si |Δ| ≥ 1 € o ≥ 1 % en importes; cualquier cambio en IRPF %; concepto que aparece o desaparece. Umbrales en `ComparisonConfig`; son hipótesis.

## Textos fijos de la interfaz

- "Hemos detectado una diferencia que quizá quieras revisar."
- "El documento parece indicar una renovación el {fecha}. Fuente: página {n}."
- "{Servicio} se renueva en {n} días. Precio detectado: {importe}."
- "¿Ha llegado tu nómina de {mes}?"
- Origen de fecha: "Detectada", "Confirmada por ti", "Estimada".

## Pruebas: simulaciones (no hay pruebas con personas)

La app se publica sin pruebas con usuarios. Lo técnico se valida con simulaciones; ver `SIMULACIONES_Y_PUBLICACION.md`.

- `tools/synthetic/` genera 300 documentos sintéticos de 15 formatos con JSON de verdad conocida y ruido de foto.
- Puerta 0: ≥ 90 % de campos correctos en nómina y factura sobre sintéticos. Es un umbral sobre datos más limpios que los reales: no equivale a una precisión real; los formatos que no lleguen pasan a entrada manual asistida.
- Puerta 1: 0 avisos perdidos o duplicados con reloj simulado (1.000 casos), 0 cadenas prohibidas, 0 tráfico de red con contadores desactivados, 0 valores de documentos en logs.
- `build/reports/gates.md` resume las puertas y declara los límites de cada simulación.
- Nunca subir documentos reales de personas al repositorio.
- Retención y pago no se pueden simular: se miden tras publicar con los contadores opcionales.

## Definición de terminado (cada tarea)

- Compila, pasa tests y lint.
- Sin cadenas de UI hardcodeadas ni tildes perdidas.
- Ningún log con contenido de documentos.
- Cada campo nuevo guarda origen, confianza y `ruleId`.
- Textos según "Reglas no negociables".

## Fuera de alcance de la V1

Chatbot, resumen de contratos, conexión a bancos, lectura de Gmail, cuentas y sincronización, recomendación de tarifas, cancelación de suscripciones, anuncios, analítica, iOS.
