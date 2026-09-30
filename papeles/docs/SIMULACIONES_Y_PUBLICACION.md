# Simulaciones y publicación

Decisión de producto: se publica sin pruebas con personas. Las simulaciones con Claude comprueban lo técnico. No pueden medir si la gente vuelve ni si paga: eso se mide después con contadores anónimos opcionales. Este archivo lo deja por escrito para no confundir un resultado simulado con un resultado real.

## Qué prueban las simulaciones y qué no

| Simulación | Sirve para | No sirve para |
| --- | --- | --- |
| Documentos sintéticos con verdad conocida | Medir errores de extracción y regresiones entre versiones | Saber la precisión real: los sintéticos son más limpios que los documentos reales |
| Reloj simulado | Comprobar que ningún aviso se pierde o duplica | Ver cómo se comporta cada fabricante con el ahorro de batería |
| Barrido de cadenas | Impedir que la app afirme errores, reclame o aconseje | Saber cómo interpreta el texto cada persona |
| Personas simuladas (Claude recorre las pantallas) | Encontrar pasos confusos, textos ambiguos y fallos de accesibilidad | Predecir retención ni disposición a pagar |
| Auditoría de red | Comprobar que no salen datos con los contadores desactivados | Cubrir servicios de terceros dentro de Google Play services |

## Puerta 0. Precisión de extracción (umbral 90 %, hipótesis)

1. `tools/synthetic/` genera 300 documentos de 15 formatos: 5 diseños de nómina, 3 de electricidad, 2 de gas, 1 de agua, 2 de telefonía e internet, 1 de seguro, 1 de suscripción. Cada documento tiene un JSON con los valores correctos.
2. Se generan variantes: PDF con capa de texto, PDF solo imagen, foto con giro de ±5°, sombra, desenfoque, JPEG de baja calidad, perspectiva.
3. Medir por campo y por formato: exactitud, campos vacíos y campos incorrectos. Un campo incorrecto pesa más que uno vacío.
4. Un formato que no llega al 90 % no se desactiva del clasificador, pero pasa a "entrada manual asistida" (el usuario confirma los campos).
5. Nunca copiar documentos reales de nadie al repositorio. Si aparecen documentos reales, deben estar anonimizados y cedidos, y fuera del repositorio.

Advertencia que debe figurar en `gates.md`: un 90 % sobre sintéticos no equivale a un 90 % sobre documentos reales.

## Puerta 1. Fiabilidad y seguridad

- **Avisos:** 1.000 casos con reloj simulado (reinicio del móvil, ahorro de batería con `adb shell dumpsys deviceidle force-idle`, cambio de zona horaria, cambio de hora, borrar y recrear documento, editar fecha). Criterio: 0 avisos perdidos y 0 duplicados.
- **Cadenas prohibidas:** el script `tools/lint_strings.py` falla si aparece "error", "reclam", "ilegal", "debes", "fraude" o "abusiv" en textos de la app. También revisa las tildes de una lista de palabras frecuentes.
- **Red:** con los contadores desactivados, capturar tráfico del emulador durante un recorrido completo. Criterio: 0 conexiones.
- **Privacidad de registros:** buscar en el logcat de un recorrido completo cualquier valor del documento de prueba (importes, nombres). Criterio: 0 coincidencias.
- **Accesibilidad:** revisión automática con las comprobaciones de Compose y escalado de fuente al 200 %.

## Personas simuladas

Claude interpreta cada persona y recorre el flujo con capturas en el emulador. Se anotan pasos confusos y textos ambiguos, no valoraciones de "me gusta":

1. Trabajadora a tiempo parcial con dos pagas extra que suben a mano una nómina en foto.
2. Persona de 60 años con letra grande que recibe un PDF por correo y no sabe compartirlo.
3. Usuario con tres suscripciones que solo quiere saber cuál se renueva antes.
4. Persona con un coche antiguo que tiene ITV y seguro en fechas distintas.
5. Usuario que sube por error una foto que no es un documento.
6. Usuario que corrige un importe mal leído y quiere entender qué cambia.

## Contadores para medir después de publicar (opcionales)

Solo se activan si el usuario los acepta. Miden: instalación, primer documento subido, segundo mes natural con la app abierta, número de documentos por tipo. Nada de contenido, nada de identificadores de publicidad.

- **Puerta 2:** 40 % de quienes tienen los contadores activados abren la app en su segundo mes natural. Hipótesis: los usuarios que aceptan contadores no representan al total.
- **Puerta 3:** en la V2, conversión a Pro cercana al 2 %.

## Lista de publicación

### Cuenta y ficha

- [ ] Cuenta de desarrollador de Google Play activa. Para cuentas personales nuevas, Google exige una prueba cerrada con al menos 12 personas durante 14 días antes de pedir acceso a producción. Si tu cuenta ya cumple ese requisito, no aplica. Verifica el requisito vigente en Play Console.
- [ ] Nombre de la app (máx. 30 caracteres): elegir entre las opciones de abajo.
- [ ] Descripción corta (máx. 80 caracteres) y larga en español de España, con tildes y ñ.
- [ ] Capturas de pantalla (Hoy, Subir documento, Revisar campos, Ficha de cambios, Fechas) generadas desde tests de capturas.
- [ ] Icono de 512 × 512 y gráfico de funciones. Diseño propio: no reproducir logotipos ni marcas de terceros.
- [ ] Categoría: Productividad o Finanzas (elegir con cuidado: "Finanzas" activa más revisión; empezar por Productividad).

### Declaraciones de Play

- [ ] Política de privacidad publicada en una URL estable y enlazada desde la app.
- [ ] Seguridad de los datos: los datos que solo se procesan en el dispositivo y no salen de él no se declaran; si se activan contadores, declarar los datos que sí salen. Verificarlo con el comportamiento real de la versión publicada.
- [ ] Declaración de funciones financieras: obligatoria para todas las apps; incluye la categoría "Insurance". Responder según lo que la app hace realmente y confirmar cómo se clasifica la extracción de datos de pólizas.
- [ ] Clasificación de contenido, público objetivo (adultos), sin anuncios.
- [ ] Nivel de API objetivo: comprobar en Play Console el exigido en la fecha de publicación.

### Compilación

- [ ] Play App Signing activado, AAB de release con R8 y recursos reducidos, `versionCode` y `versionName`.
- [ ] Permisos mínimos: cámara (a través del escáner), notificaciones, arranque (`BOOT_COMPLETED`). Sin lectura amplia de archivos ni de correo. `INTERNET` solo si hay contadores opcionales.
- [ ] Copia de seguridad automática desactivada para la base de datos.
- [ ] Despliegue escalonado en España (por ejemplo, 5 % → 20 % → 100 %) vigilando cierres inesperados y valoraciones.

### Textos de ficha (propuestas, hipótesis)

Opciones de título (≤ 30 caracteres):

- "Papeles al día: avisos" (22)
- "Tus documentos, al día" (22)
- "Nóminas y fechas: avisos" (24)

Descripción corta (≤ 80): "Sube tus documentos y descubre qué ha cambiado y qué fechas se acercan." (73)

Descripción larga (borrador): "Sube una foto o un PDF de tu nómina, factura, seguro, compra o suscripción. La app lo lee en tu móvil, te dice qué ha cambiado respecto al mes anterior y te avisa antes de que llegue una fecha importante. Tus documentos no salen del móvil. La app no da asesoramiento legal, fiscal ni laboral: te señala diferencias que quizá quieras revisar."

### Política de privacidad (esquema para revisar con un profesional)

Responsable y contacto; qué datos se tratan y para qué; que el procesamiento es local; qué ocurre con los contadores opcionales; que no se venden ni comparten datos; cómo borrar todo desde la app; copia de seguridad cifrada por el usuario; derechos RGPD y contacto; cambios en la política. Esta es una plantilla, no asesoramiento legal.

### Pendiente humano (lo que Claude Code no puede hacer)

- Crear o verificar la cuenta de desarrollador y el pago de alta.
- Cargar el AAB, aceptar las declaraciones y enviar a revisión.
- Revisar la política de privacidad y la clasificación de "Insurance" con un profesional.
- Decidir el nombre y comprobar que no infringe marcas.
