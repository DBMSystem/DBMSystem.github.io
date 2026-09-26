# Equilibrio de cada servicio

Daniel: «revisa más combinaciones y oportunidades que da el juego, para que sea equilibrado en cada partida».

Generado con `node scripts/simulateLoops.js 300`. El bot juega 300 servicios por nivel con el motor real, sin utensilios de Brûlée: hábil (reacción 0,9 s, 5 % de descuidos) y casual (1,5 s, 15 %).

Qué mide cada columna:

- **Puntos:** el 10 % peor, la mediana y el 10 % mejor.
- **Dispersión:** desviación típica / media. Cuanto más baja, más parecidos son los servicios entre sí.
- **Flojos:** servicios por debajo de `weakLoopScore`.
- **Espera p90:** lo que tarda en llegar a la sartén el 10 % de pedidos más lentos.
- **Sin usar:** parte de lo que reparte la bandeja que nunca se cocina.

## Qué fallaba

La bandeja repartía todos los ingredientes desbloqueados por igual, cada uno con una tirada independiente:

- **Nivel 5:** llegan la cebolla y las hierbas, pero las hierbas solo sirven para la ensalada, 1 receta de 10. En cambio, el huevo está en 5.
  - La encimera se llenaba de hierbas y champiñones.
  - Un 38 % de los servicios hábiles acababan desbordados y el 10 % peor bajaba a 558 puntos.
- **Rachas:** con tiradas independientes hay rachas de un mismo ingrediente y sequías del que falta. Un servicio podía salir redondo y el siguiente, imposible, sin que el jugador hiciera nada distinto.

## Qué cambia (`src/game/tray.js`, `balance.js`)

- **Reparto por demanda** (`demandWeighting: 0.5`): cada ingrediente sale en proporción a las recetas desbloqueadas que lo usan. La mitad del peso sigue siendo igual para todos, así que ninguno desaparece.
- **Bolsa barajada** (`ingredientBag: 2`): los ingredientes salen de una bolsa con 2 fichas por ingrediente, repartidas según su peso. Al vaciarse se rellena, como las piezas de un juego de bloques. Dentro de cada bolsa sale todo lo que tiene que salir: no hay sequías ni inundaciones.
- **Se mantiene la ayuda a los pedidos** (`orderBias`): un 35 % de las veces sale lo que falta para un pedido activo.
- **Descartado:** probé repartos más fuertes (0,7 con bolsa de 2, y 0,6 con bolsa de 3). Igualan un poco más los servicios, pero suben demasiado la puntuación.

## Antes (0.9.1)

| Jugador | Nivel | Puntos (p10 · mediana · p90) | Dispersión | Flojos | Servidos | Perdidos | Desborde | Espera p90 | Sin usar |
|---|---|---|---|---|---|---|---|---|---|
| hábil | 1 | 1477 · 2202 · 2768 | 24.3 % | 0 % | 7.9 | 0.2 | 5 % | 5.2 s | 18 % |
| hábil | 3 | 1560 · 2295 · 3230 | 29.5 % | 1 % | 7.5 | 0.3 | 8 % | 5.7 s | 18 % |
| hábil | 4 | 1325 · 2134 · 3303 | 34.5 % | 0 % | 6.7 | 0.7 | 13 % | 6.0 s | 21 % |
| hábil | 5 | 558 · 1731 · 2671 | 46.8 % | 3 % | 5.7 | 0.7 | 38 % | 6.2 s | 28 % |
| hábil | 7 | 1208 · 2323 · 3614 | 38.3 % | 0 % | 6.1 | 0.9 | 18 % | 6.2 s | 21 % |
| hábil | 10 | 1334 · 2269 · 3570 | 37.2 % | 1 % | 6.2 | 0.8 | 15 % | 6.2 s | 21 % |
| casual | 1 | 645 · 736 · 976 | 18.5 % | 0 % | 7.2 | 0.5 | 1 % | 5.9 s | 30 % |
| casual | 3 | 693 · 879 · 1129 | 21.8 % | 0 % | 6.9 | 0.8 | 1 % | 6.0 s | 28 % |
| casual | 4 | 630 · 828 · 1118 | 23.9 % | 0 % | 6.3 | 1.1 | 2 % | 6.1 s | 31 % |
| casual | 5 | 545 · 795 · 1103 | 26.9 % | 2 % | 5.6 | 1.4 | 4 % | 6.3 s | 33 % |
| casual | 7 | 635 · 898 · 1251 | 26.6 % | 0 % | 5.5 | 1.5 | 3 % | 6.3 s | 32 % |
| casual | 10 | 656 · 900 · 1296 | 27.3 % | 1 % | 5.4 | 1.5 | 1 % | 6.3 s | 31 % |

## Después (0.9.2)

| Jugador | Nivel | Puntos (p10 · mediana · p90) | Dispersión | Flojos | Servidos | Perdidos | Desborde | Espera p90 | Sin usar |
|---|---|---|---|---|---|---|---|---|---|
| hábil | 1 | 1968 · 2474 · 2936 | 14.5 % | 0 % | 8.2 | 0.1 | 0 % | 5.2 s | 13 % |
| hábil | 3 | 2276 · 2953 · 3607 | 17.0 % | 0 % | 8.1 | 0.2 | 0 % | 5.4 s | 11 % |
| hábil | 4 | 2252 · 2864 · 3693 | 20.2 % | 0 % | 7.7 | 0.3 | 0 % | 5.8 s | 13 % |
| hábil | 5 | 1857 · 2441 · 3248 | 24.4 % | 0 % | 7.2 | 0.5 | 2 % | 6.0 s | 18 % |
| hábil | 7 | 1898 · 2639 · 3742 | 25.5 % | 0 % | 6.8 | 0.7 | 1 % | 6.3 s | 17 % |
| hábil | 10 | 1983 · 2655 · 3536 | 24.0 % | 0 % | 7.0 | 0.6 | 1 % | 6.1 s | 17 % |
| casual | 1 | 660 · 803 · 1125 | 20.4 % | 0 % | 7.3 | 0.5 | 0 % | 5.8 s | 26 % |
| casual | 3 | 758 · 941 · 1263 | 19.0 % | 0 % | 7.2 | 0.6 | 0 % | 5.8 s | 24 % |
| casual | 4 | 728 · 948 · 1221 | 20.1 % | 0 % | 6.8 | 0.9 | 0 % | 6.0 s | 25 % |
| casual | 5 | 690 · 881 · 1143 | 19.8 % | 0 % | 6.4 | 1.1 | 0 % | 6.1 s | 30 % |
| casual | 7 | 739 · 967 · 1376 | 26.6 % | 0 % | 5.8 | 1.3 | 0 % | 6.4 s | 29 % |
| casual | 10 | 730 · 970 · 1292 | 23.6 % | 0 % | 5.7 | 1.4 | 1 % | 6.3 s | 29 % |

## Resultado

- **Nivel 5, jugador hábil:**
  - Los desbordes bajan del 38 % al 2 %.
  - La dispersión baja del 47 % al 24 %.
  - El 10 % peor sube de 558 a 1857 puntos.
- **Todos los niveles:**
  - La dispersión del jugador hábil queda entre el 15 % y el 26 %; antes llegaba al 47 %.
  - Se pierden menos clientes y se desperdicia menos de lo que reparte la bandeja.
- **Jugador casual:** cambia menos, porque su límite es la velocidad y no el reparto. Aun así, sirve más pedidos y deja de desbordarse.
- **Economía** (`docs/PLAYTHROUGH_REPORT.md`):
  - Se gana un 5 % más de monedas en 150 días.
  - Los hitos del jugador casual llegan unos días antes: el árbol el día 47 (antes, el 48) y el nivel 30 el día 71 (antes, el 77).
  - No hace falta tocar precios.
