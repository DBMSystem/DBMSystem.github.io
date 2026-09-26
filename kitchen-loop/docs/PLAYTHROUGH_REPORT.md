# Informe de partidas completas (bot)

Con el balance 0.9.2: el reparto de ingredientes sigue a las recetas desbloqueadas y sale de una bolsa barajada (`docs/LOOP_BALANCE.md`), sobre el balance 0.9.0 (combo 4 s, fiebre x5, Brûlée desde el servicio 5, decoración, rincón mágico y sobres por monedas). Frente a 0.9.0, los servicios son más parejos y se ganan un 5 % más de monedas; los hitos llegan unos días antes, sobre todo para el jugador casual.

## Partida completa simulada (jugador hábil)

Generado con `node scripts/simulatePlaythrough.js skilled`. Un bot juega con el motor real (reacción media 0.9 s, 5 % de colocaciones descuidadas), 8 servicios al día y 2 sobres por anuncio al día, sin pagar nada.

**Resultado:** sin completar en 150 días · 1200 servicios · nivel 30 · capítulo 7/7 · álbum 119/120 · monedas ganadas 88.542.

### En qué se gasta

| Monedas | Fragmentos |
|---|---|
| Utensilios 13.500 · Decoración 18.950 · Sobres 55.800 | Fabricar cartas 3960 · Rincón mágico 11.800 · Brillantes 15.900 |

### Hitos

| Día | Servicio | Hito |
|---|---|---|
| 1 | 2 | Capítulo 2 |
| 1 | 3 | Secreta: bacon_crown (por accidente) |
| 1 | 5 | Capítulo 3 |
| 1 | 5 | Nivel 5 |
| 1 | 5 | Utensilio: runic_counter |
| 1 | 5 | Capítulo 4 |
| 2 | 10 | Utensilio: crystal_spatula |
| 2 | 14 | Utensilio: time_ladle |
| 2 | 16 | Nivel 10 |
| 2 | 16 | Álbum 25 % |
| 3 | 22 | Capítulo 5 |
| 3 | 24 | Utensilio: ancient_spice |
| 3 | 24 | Álbum 50 % |
| 4 | 32 | Nivel 15 |
| 5 | 35 | Utensilio: mystic_knife |
| 6 | 42 | Utensilio: golden_whisk |
| 6 | 48 | Álbum 75 % |
| 7 | 54 | Secreta: impossible_omelette (con pista) |
| 7 | 55 | Nivel 20 |
| 8 | 60 | Utensilio: enchanted_pot |
| 8 | 62 | Capítulo 6 |
| 8 | 62 | Secreta: mystic_scramble (con pista) |
| 9 | 66 | Secreta: master_soup (por accidente) |
| 11 | 83 | Nivel 25 |
| 11 | 83 | Utensilio: frost_tongs |
| 13 | 100 | Utensilio: ember_skewers |
| 13 | 100 | Capítulo 7 |
| 14 | 105 | Secreta: exploding_tomato (por accidente) |
| 15 | 119 | Nivel 30 |
| 24 | 188 | Secreta: lost_recipe (con pista) |
| 24 | 188 | Final de la historia |
| 27 | 216 | Todas las cartas de sobre |
| 45 | 356 | Toda la decoración de monedas |
| 77 | 616 | Rincón mágico completo |

### Cómo se sienten los servicios (medias por tramo de nivel)

| Niveles | Servicios | Puntos | Pedidos | Perdidos | Quemados | Justo a tiempo | Mostrador | Combo máx. | Fiebres | En su punto | Desbordes | Cocina a tope |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1–3 | 3 | 2881 | 9,0 | 0,0 | 0,00 | 0,00 | 9,3 | 14,7 | 2,33 | 1,00 | 0 % | 0,67 |
| 4–6 | 5 | 3363 | 8,2 | 0,0 | 0,00 | 0,40 | 8,8 | 13,6 | 2,00 | 0,20 | 0 % | 0,20 |
| 7–10 | 10 | 3406 | 8,3 | 1,0 | 0,20 | 0,40 | 8,7 | 12,9 | 2,20 | 0,20 | 0 % | 0,40 |
| 11–15 | 18 | 3680 | 8,8 | 1,2 | 0,39 | 0,17 | 8,3 | 12,5 | 1,94 | 0,44 | 0 % | 0,50 |
| 16–20 | 24 | 3922 | 9,0 | 1,0 | 0,25 | 0,29 | 8,5 | 13,3 | 2,17 | 0,29 | 0 % | 0,67 |
| 21–25 | 30 | 3918 | 8,4 | 1,0 | 0,10 | 0,43 | 8,5 | 13,4 | 2,13 | 0,27 | 0 % | 0,57 |
| 26–30 | 1110 | 3740 | 7,6 | 1,5 | 0,08 | 0,49 | 8,8 | 12,1 | 1,95 | 0,27 | 0 % | 0,48 |

**Sartenes a la vez:** al menos 2 en el 64 % de los servicios, 3 en el 0 %, 4 en el 0 %.


**Clientes especiales vistos:** rival_chef 285, night_visitor 52, critic 551, mystery 205, old_master 54, collector 201, legendary_critic 40.

**Especialidades jugadas:** crazyKitchen 176, pipVisit 207, bruleeNight 182, baconFest 224, criticInRoom 214, breakfast 194.

**Secretas:** bacon_crown (por accidente), impossible_omelette (con pista), mystic_scramble (con pista), master_soup (por accidente), exploding_tomato (por accidente), lost_recipe (con pista).

**Cartas que faltan (1):** perfect_trio (rare, discovery).

**Días jugados:** 150. **Fragmentos sobrantes:** 54. **Monedas sobrantes:** 292.

## Partida completa simulada (jugador casual)

Generado con `node scripts/simulatePlaythrough.js casual`. Un bot juega con el motor real (reacción media 1.5 s, 15 % de colocaciones descuidadas), 4 servicios al día y 1 sobres por anuncio al día, sin pagar nada.

**Resultado:** sin completar en 150 días · 600 servicios · nivel 30 · capítulo 7/7 · álbum 117/120 · monedas ganadas 33.638.

### En qué se gasta

| Monedas | Fragmentos |
|---|---|
| Utensilios 13.500 · Decoración 18.950 · Sobres 900 | Fabricar cartas 7390 · Rincón mágico 6800 · Brillantes 0 |

### Hitos

| Día | Servicio | Hito |
|---|---|---|
| 1 | 4 | Capítulo 2 |
| 2 | 7 | Capítulo 3 |
| 2 | 7 | Utensilio: runic_counter |
| 2 | 7 | Capítulo 4 |
| 3 | 9 | Nivel 5 |
| 4 | 15 | Utensilio: crystal_spatula |
| 4 | 16 | Álbum 25 % |
| 6 | 23 | Utensilio: time_ladle |
| 7 | 28 | Álbum 50 % |
| 8 | 30 | Secreta: bacon_crown (por accidente) |
| 9 | 33 | Nivel 10 |
| 10 | 39 | Utensilio: ancient_spice |
| 11 | 44 | Álbum 75 % |
| 12 | 48 | Capítulo 5 |
| 13 | 52 | Secreta: impossible_omelette (con pista) |
| 14 | 56 | Utensilio: mystic_knife |
| 19 | 74 | Nivel 15 |
| 19 | 74 | Utensilio: golden_whisk |
| 28 | 109 | Utensilio: enchanted_pot |
| 29 | 115 | Capítulo 6 |
| 29 | 115 | Secreta: master_soup (por accidente) |
| 32 | 125 | Secreta: mystic_scramble (con pista) |
| 33 | 129 | Nivel 20 |
| 38 | 149 | Utensilio: frost_tongs |
| 47 | 186 | Utensilio: ember_skewers |
| 47 | 186 | Capítulo 7 |
| 50 | 198 | Nivel 25 |
| 55 | 217 | Secreta: exploding_tomato (con pista) |
| 56 | 224 | Secreta: lost_recipe (con pista) |
| 56 | 224 | Final de la historia |
| 71 | 284 | Nivel 30 |
| 73 | 292 | Todas las cartas de sobre |
| 144 | 573 | Toda la decoración de monedas |

### Cómo se sienten los servicios (medias por tramo de nivel)

| Niveles | Servicios | Puntos | Pedidos | Perdidos | Quemados | Justo a tiempo | Mostrador | Combo máx. | Fiebres | En su punto | Desbordes | Cocina a tope |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1–3 | 6 | 939 | 7,0 | 0,5 | 0,17 | 0,17 | 2,8 | 4,2 | 0,33 | 0,17 | 0 % | 0,17 |
| 4–6 | 12 | 1016 | 7,3 | 1,1 | 0,08 | 0,58 | 1,3 | 3,6 | 0,17 | 0,00 | 0 % | 0,17 |
| 7–10 | 23 | 1261 | 7,0 | 1,8 | 0,09 | 0,65 | 2,3 | 4,4 | 0,48 | 0,00 | 0 % | 0,17 |
| 11–15 | 42 | 1266 | 6,9 | 2,2 | 0,29 | 0,43 | 1,9 | 3,9 | 0,31 | 0,05 | 0 % | 0,05 |
| 16–20 | 58 | 1301 | 6,5 | 2,3 | 0,31 | 0,57 | 2,0 | 3,8 | 0,28 | 0,02 | 0 % | 0,05 |
| 21–25 | 73 | 1336 | 6,2 | 2,6 | 0,21 | 0,44 | 2,2 | 3,9 | 0,29 | 0,04 | 0 % | 0,10 |
| 26–30 | 386 | 1245 | 6,1 | 2,5 | 0,15 | 0,57 | 2,0 | 3,5 | 0,27 | 0,03 | 0 % | 0,06 |

**Sartenes a la vez:** al menos 2 en el 34 % de los servicios, 3 en el 0 %, 4 en el 0 %.


**Clientes especiales vistos:** critic 226, rival_chef 151, mystery 81, collector 90, old_master 17, legendary_critic 30, night_visitor 21.

**Especialidades jugadas:** pipVisit 100, breakfast 103, crazyKitchen 106, baconFest 97, bruleeNight 108, criticInRoom 80.

**Secretas:** bacon_crown (por accidente), impossible_omelette (con pista), master_soup (por accidente), mystic_scramble (con pista), exploding_tomato (con pista), lost_recipe (con pista).

**Cartas que faltan (3):** perfect_trio (rare, discovery), combo_ten (epic, discovery), triple_fever (legendary, discovery).

**Días jugados:** 150. **Fragmentos sobrantes:** 653. **Monedas sobrantes:** 288.

## Prueba de ajuste: combo y fiebre para el jugador casual (40 días)

| Ajuste | Combo máx. (niv. 7–10) | Fiebres por servicio (niv. 1–3 · 7–10 · 16–20) |
|---|---|---|
| Actual (ventana 3 s, fiebre x6) |  1,8  |  0,00  · 0,00  · 0,00  |
| Ventana 4 s |  3,9  |  0,14  · 0,13  · 0,20  |
| Ventana 4 s + fiebre x5 |  3,7  |  0,43  · 0,25  · 0,27  |
| Ventana 4,5 s + fiebre x5 |  3,8  |  0,67  · 0,25  · 0,44  |
