# Informe de economía (simulación)

Generado con `node scripts/simulateEconomy.js`: 1000 jugadores, 12 perfiles, hasta 240 días. Usa el código real de recompensas, sobres, calendario y fabricación.

Hábitos: ocasional = 3 loops/día, 4 días/semana, 1 sobre por anuncio; constante = 8 loops/día y 2 sobres por anuncio; intenso = 20 loops/día y 4 sobres por anuncio (máximo por la espera de 6 h). El Pase suma 1 sobre al día.

Objetivos: cartas de sobre en 6–8 semanas para un jugador constante con anuncios (sección 4.10); árbol de Brûlée (13.500 monedas ganadas) en 4–6 semanas (sección 5.4); nivel 10 en unos 29 loops (sección 5.1).

| Perfil | Álbum de sobres (mediana · p10–p90) | Sin completar en 240 d | Monedas del árbol (mediana) | Nivel 10 (mediana) |
|---|---|---|---|---|
| Ocasional + anuncios | 114 d (16,3 sem) · 52–142 d | 0 | 142 d (20,3 sem) | 17 d |
| Ocasional + anuncios + Pase | 92 d (13,1 sem) · 22–94 d | 0 | 142 d (20,3 sem) | 17 d |
| Ocasional | 143 d (20,4 sem) · 58–218 d | 30 | 142 d (20,3 sem) | 17 d |
| Ocasional + Pase | 120 d (17,1 sem) · 44–141 d | 0 | 142 d (20,3 sem) | 17 d |
| Constante + anuncios | 46 d (6,6 sem) · 20–50 d | 0 | 31 d (4,4 sem) | 4 d |
| Constante + anuncios + Pase | 36 d (5,1 sem) · 16–38 d | 0 | 31 d (4,4 sem) | 4 d |
| Constante | 104 d (14,9 sem) · 34–124 d | 1 | 31 d (4,4 sem) | 4 d |
| Constante + Pase | 63 d (9,0 sem) · 20–72 d | 0 | 31 d (4,4 sem) | 4 d |
| Intenso + anuncios | 26 d (3,7 sem) · 12–28 d | 0 | 13 d (1,9 sem) | 2 d |
| Intenso + anuncios + Pase | 21 d (3,0 sem) · 7–24 d | 0 | 13 d (1,9 sem) | 2 d |
| Intenso | 72 d (10,3 sem) · 27–84 d | 0 | 13 d (1,9 sem) | 2 d |
| Intenso + Pase | 53 d (7,6 sem) · 22–67 d | 0 | 13 d (1,9 sem) | 2 d |

## Conclusiones

**Objetivos cumplidos con el balance actual:**
- Jugador constante con anuncios: completa las 37 cartas de sobre en **46 días (6,6 semanas)**. Objetivo: 6–8 semanas.
- Sin anuncios ni Pase: **104 días**. El 100 % del álbum es alcanzable gratis; solo 1 de cada 1.000 jugadores de ese perfil no termina en 240 días.
- Monedas para el árbol de Brûlée (13.500): **31 días (4,4 semanas)** para el jugador constante. Objetivo: 4–6 semanas.
- Nivel 10 en unos 32 loops (4 días a 8 loops/día). Referencia de la especificación: ~29 loops.

**Por qué hubo que tocar números de la especificación.** Con los valores originales, el jugador constante con anuncios completaba el álbum en **12 días** y el árbol en **21**. La causa es que recibe unas 10 cartas al día: 2 sobres (6 cartas), unas 3 por loops y el calendario. Frente a 37 cartas de sobre, los duplicados producen muchos fragmentos, y con ellos se fabricaban hasta las legendarias.

**Forma de la colección (importante para el diseño).** Aun con el ajuste, comunes, raras y épicas se completan en **menos de una semana**: con ~10 cartas diarias es inevitable. Lo que alarga el álbum a 6–8 semanas son las **2 legendarias de sobre**. Si se quiere que la colección se sienta viva durante semanas en todas las rarezas, hay dos caminos (decisión de Daniel):
1. **Ampliar el álbum** (la estructura admite 120+ cartas sin cambiar código), sobre todo con comunes y raras.
2. **Dar menos cartas al día**: por ejemplo, sobres de 2 cartas o 1 sobre por anuncio al día.

**Cambios en `balance.js`** (el valor de la especificación está comentado junto a cada uno):

| Clave | Especificación | Ahora | Motivo |
|---|---|---|---|
| `loopCardBase` / `PerOrder` / `Max` | 0,15 / 0,03 / 0,6 | 0,10 / 0,02 / 0,4 | Menos cartas por loop |
| `packRates` legendaria (huecos 1–2 / 3) | 0,5 % / 2 % | 0,15 % / 0,6 % | Las legendarias marcan el final del álbum |
| `legendaryPity` | 40 sobres | 100 sobres | Idem |
| `newCardBias` | 0,6 | 0,4 | Menos atajo hacia lo que falta |
| `craftCost` (C / R / É / L) | 40 / 120 / 320 / 960 | 60 / 250 / 1.000 / 6.000 | Fabricar es el último recurso, no el camino normal |
| `levelCoinReward` | 20 × nivel | 6 × nivel | Árbol en 4–6 semanas |

Los fragmentos por duplicado siguen siendo los de la especificación y siempre menores que el coste de fabricar (test automático).

**Límites del modelo:** los loops son aleatorios (puntuación ~1.300–2.000 según el nivel, ~6 pedidos) y las recetas secretas se descubren con un 4 % por loop. Las cartas de descubrimiento que dependen de la Fase 4 (clientes especiales, utensilios) no se cuentan. Hay que repetir la simulación con datos reales tras la prueba interna (sección 13.2).
