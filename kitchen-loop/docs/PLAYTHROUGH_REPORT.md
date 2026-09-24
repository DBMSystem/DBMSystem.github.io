# Informe de partidas completas (bot)

Con el balance 0.9.0: combo 4 s, fiebre x5 sin reencendido, Brûlée desde el servicio 5, decoración y rincón mágico nuevos, y sobres por monedas. La versión anterior del informe (0.8.2, combo 3 s y fiebre x6) sirvió para decidir estos cambios (`docs/DECISIONES.md` §23).

## Partida completa simulada (jugador hábil)

Generado con `node scripts/simulatePlaythrough.js skilled`. Un bot juega con el motor real (reacción media 0.9 s, 5 % de colocaciones descuidadas), 8 servicios al día y 2 sobres por anuncio al día, sin pagar nada.

**Resultado:** sin completar en 150 días · 1200 servicios · nivel 30 · capítulo 7/7 · álbum 119/120 · monedas ganadas 84.019.

## En qué se gasta

| Monedas | Fragmentos |
|---|---|
| Utensilios 13.500 · Decoración 18.950 · Sobres 51.300 | Fabricar cartas 5320 · Rincón mágico 11.800 · Brillantes 13.900 |

## Hitos

| Día | Servicio | Hito |
|---|---|---|
| 1 | 2 | Capítulo 2 |
| 1 | 5 | Capítulo 3 |
| 1 | 5 | Utensilio: runic_counter |
| 1 | 5 | Capítulo 4 |
| 1 | 6 | Nivel 5 |
| 1 | 7 | Secreta: bacon_crown (por accidente) |
| 1 | 8 | Secreta: mystic_scramble (por accidente) |
| 2 | 10 | Utensilio: crystal_spatula |
| 2 | 16 | Álbum 25 % |
| 3 | 19 | Nivel 10 |
| 3 | 19 | Utensilio: time_ladle |
| 3 | 24 | Capítulo 5 |
| 4 | 25 | Utensilio: ancient_spice |
| 4 | 32 | Álbum 50 % |
| 5 | 34 | Utensilio: mystic_knife |
| 5 | 37 | Nivel 15 |
| 6 | 45 | Utensilio: golden_whisk |
| 6 | 48 | Álbum 75 % |
| 8 | 61 | Nivel 20 |
| 9 | 67 | Utensilio: enchanted_pot |
| 10 | 77 | Capítulo 6 |
| 10 | 77 | Secreta: master_soup (por accidente) |
| 12 | 90 | Utensilio: frost_tongs |
| 12 | 91 | Nivel 25 |
| 14 | 112 | Utensilio: ember_skewers |
| 14 | 112 | Capítulo 7 |
| 16 | 125 | Secreta: lost_recipe (con pista) |
| 16 | 125 | Final de la historia |
| 16 | 127 | Secreta: exploding_tomato (con pista) |
| 17 | 131 | Nivel 30 |
| 18 | 139 | Secreta: impossible_omelette (con pista) |
| 38 | 304 | Todas las cartas de sobre |
| 48 | 384 | Toda la decoración de monedas |
| 86 | 688 | Rincón mágico completo |

## Cómo se sienten los servicios (medias por tramo de nivel)

| Niveles | Servicios | Puntos | Pedidos | Perdidos | Quemados | Justo a tiempo | Mostrador | Combo máx. | Fiebres | En su punto | Desbordes | Cocina a tope |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1–3 | 4 | 2286 | 7,5 | 0,3 | 0,00 | 0,00 | 10,0 | 12,3 | 2,25 | 0,50 | 0 % | 0,50 |
| 4–6 | 6 | 2303 | 8,3 | 0,5 | 0,17 | 0,33 | 7,3 | 8,7 | 1,83 | 0,33 | 0 % | 0,33 |
| 7–10 | 11 | 3322 | 6,7 | 1,9 | 0,36 | 0,09 | 9,7 | 14,5 | 2,09 | 0,45 | 0 % | 0,18 |
| 11–15 | 19 | 3502 | 8,4 | 1,2 | 0,21 | 0,42 | 8,7 | 12,8 | 2,11 | 0,47 | 0 % | 0,68 |
| 16–20 | 26 | 3570 | 8,2 | 1,3 | 0,08 | 0,42 | 8,4 | 11,9 | 2,08 | 0,35 | 0 % | 0,46 |
| 21–25 | 32 | 3675 | 7,7 | 1,6 | 0,19 | 0,34 | 8,3 | 11,9 | 1,88 | 0,28 | 0 % | 0,53 |
| 26–30 | 1102 | 3536 | 7,3 | 1,8 | 0,09 | 0,49 | 8,8 | 11,5 | 1,85 | 0,24 | 0 % | 0,44 |

**Sartenes a la vez:** al menos 2 en el 60 % de los servicios, 3 en el 0 %, 4 en el 0 %.


**Clientes especiales vistos:** critic 513, rival_chef 319, mystery 195, old_master 50, collector 196, night_visitor 51, legendary_critic 52.

**Especialidades jugadas:** breakfast 208, bruleeNight 207, pipVisit 196, baconFest 197, criticInRoom 200, crazyKitchen 188.

**Secretas:** bacon_crown (por accidente), mystic_scramble (por accidente), master_soup (por accidente), lost_recipe (con pista), exploding_tomato (con pista), impossible_omelette (con pista).

**Cartas que faltan (1):** perfect_trio (rare, discovery).

**Días jugados:** 150. **Fragmentos sobrantes:** 59. **Monedas sobrantes:** 269.

---

## Partida completa simulada (jugador casual)

Generado con `node scripts/simulatePlaythrough.js casual`. Un bot juega con el motor real (reacción media 1.5 s, 15 % de colocaciones descuidadas), 4 servicios al día y 1 sobres por anuncio al día, sin pagar nada.

**Resultado:** sin completar en 150 días · 600 servicios · nivel 30 · capítulo 7/7 · álbum 117/120 · monedas ganadas 31.969.

## En qué se gasta

| Monedas | Fragmentos |
|---|---|
| Utensilios 13.500 · Decoración 16.350 · Sobres 0 | Fabricar cartas 7980 · Rincón mágico 3800 · Brillantes 0 |

## Hitos

| Día | Servicio | Hito |
|---|---|---|
| 1 | 4 | Capítulo 2 |
| 2 | 7 | Capítulo 3 |
| 2 | 7 | Utensilio: runic_counter |
| 2 | 7 | Capítulo 4 |
| 3 | 10 | Nivel 5 |
| 3 | 12 | Álbum 25 % |
| 4 | 16 | Utensilio: crystal_spatula |
| 6 | 24 | Utensilio: time_ladle |
| 7 | 28 | Álbum 50 % |
| 9 | 34 | Secreta: bacon_crown (con pista) |
| 9 | 36 | Nivel 10 |
| 10 | 39 | Utensilio: ancient_spice |
| 12 | 48 | Álbum 75 % |
| 13 | 50 | Capítulo 5 |
| 14 | 56 | Utensilio: mystic_knife |
| 15 | 57 | Secreta: mystic_scramble (con pista) |
| 19 | 75 | Utensilio: golden_whisk |
| 20 | 77 | Nivel 15 |
| 30 | 117 | Utensilio: enchanted_pot |
| 30 | 118 | Capítulo 6 |
| 30 | 118 | Secreta: master_soup (por accidente) |
| 35 | 138 | Nivel 20 |
| 35 | 140 | Secreta: impossible_omelette (con pista) |
| 38 | 151 | Utensilio: frost_tongs |
| 48 | 191 | Utensilio: ember_skewers |
| 48 | 191 | Capítulo 7 |
| 54 | 215 | Nivel 25 |
| 56 | 222 | Secreta: exploding_tomato (con pista) |
| 77 | 308 | Nivel 30 |
| 85 | 340 | Todas las cartas de sobre |
| 91 | 364 | Secreta: lost_recipe (con pista) |
| 91 | 364 | Final de la historia |

## Cómo se sienten los servicios (medias por tramo de nivel)

| Niveles | Servicios | Puntos | Pedidos | Perdidos | Quemados | Justo a tiempo | Mostrador | Combo máx. | Fiebres | En su punto | Desbordes | Cocina a tope |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1–3 | 7 | 884 | 6,7 | 1,1 | 0,14 | 0,00 | 2,9 | 4,0 | 0,57 | 0,00 | 0 % | 0,29 |
| 4–6 | 12 | 912 | 7,3 | 1,5 | 0,25 | 0,17 | 1,1 | 3,1 | 0,08 | 0,00 | 0 % | 0,08 |
| 7–10 | 23 | 1247 | 6,7 | 2,1 | 0,30 | 0,52 | 2,2 | 4,3 | 0,43 | 0,00 | 0 % | 0,00 |
| 11–15 | 46 | 1142 | 6,7 | 2,3 | 0,28 | 0,52 | 1,8 | 3,5 | 0,20 | 0,02 | 0 % | 0,02 |
| 16–20 | 63 | 1181 | 6,0 | 2,5 | 0,37 | 0,63 | 1,7 | 3,3 | 0,24 | 0,02 | 0 % | 0,05 |
| 21–25 | 81 | 1176 | 5,8 | 2,8 | 0,15 | 0,40 | 2,0 | 3,1 | 0,22 | 0,01 | 0 % | 0,06 |
| 26–30 | 368 | 1149 | 5,6 | 2,8 | 0,17 | 0,57 | 2,0 | 3,1 | 0,20 | 0,02 | 0 % | 0,05 |

**Sartenes a la vez:** al menos 2 en el 27 % de los servicios, 3 en el 0 %, 4 en el 0 %.


**Clientes especiales vistos:** critic 260, rival_chef 152, mystery 94, night_visitor 21, collector 82, legendary_critic 23, old_master 25.

**Especialidades jugadas:** bruleeNight 105, baconFest 107, crazyKitchen 104, pipVisit 84, breakfast 104, criticInRoom 89.

**Secretas:** bacon_crown (con pista), mystic_scramble (con pista), master_soup (por accidente), impossible_omelette (con pista), exploding_tomato (con pista), lost_recipe (con pista).

**Cartas que faltan (3):** perfect_trio (rare, discovery), high_score (epic, discovery), triple_fever (legendary, discovery).

**Días jugados:** 150. **Fragmentos sobrantes:** 2370. **Monedas sobrantes:** 2119.

---


## Prueba de ajuste: combo y fiebre para el jugador casual (40 días)

| Ajuste | Combo máx. (niv. 7–10) | Fiebres por servicio (niv. 1–3 · 7–10 · 16–20) |
|---|---|---|
| Actual (ventana 3 s, fiebre x6) |  1,8  |  0,00  · 0,00  · 0,00  |
| Ventana 4 s |  3,9  |  0,14  · 0,13  · 0,20  |
| Ventana 4 s + fiebre x5 |  3,7  |  0,43  · 0,25  · 0,27  |
| Ventana 4,5 s + fiebre x5 |  3,8  |  0,67  · 0,25  · 0,44  |
