# Informe de economía (simulación)

Generado con `node scripts/simulateEconomy.js`: 1000 jugadores, 12 perfiles, hasta 240 días. Usa el código real de recompensas, sobres, calendario y fabricación.

Hábitos: ocasional = 3 loops/día, 4 días/semana, 1 sobre por anuncio; constante = 8 loops/día y 2 sobres por anuncio; intenso = 20 loops/día y 4 sobres por anuncio (máximo por la espera de 6 h). El Pase suma 1 sobre al día.

Objetivos: cartas de sobre en 6–8 semanas para un jugador constante con anuncios (sección 4.10); árbol de Brûlée (13.500 monedas ganadas) en 4–6 semanas (sección 5.4); nivel 10 en unos 29 loops (sección 5.1).

| Perfil | Álbum de sobres (mediana · p10–p90) | Sin completar en 240 d | Monedas del árbol (mediana) | Nivel 10 (mediana) |
|---|---|---|---|---|
| Ocasional + anuncios | 137 d (19,6 sem) · 92–151 d | 0 | 122 d (17,4 sem) | 17 d |
| Ocasional + anuncios + Pase | 94 d (13,4 sem) · 64–107 d | 0 | 122 d (17,4 sem) | 17 d |
| Ocasional | 172 d (24,6 sem) · 151–235 d | 52 | 122 d (17,4 sem) | 17 d |
| Ocasional + Pase | 134 d (19,1 sem) · 93–151 d | 0 | 122 d (17,4 sem) | 17 d |
| Constante + anuncios | 47 d (6,7 sem) · 32–51 d | 0 | 28 d (4,0 sem) | 4 d |
| Constante + anuncios + Pase | 37 d (5,3 sem) · 24–42 d | 0 | 28 d (4,0 sem) | 4 d |
| Constante | 93 d (13,3 sem) · 65–124 d | 0 | 28 d (4,0 sem) | 4 d |
| Constante + Pase | 61 d (8,7 sem) · 40–76 d | 0 | 28 d (4,0 sem) | 4 d |
| Intenso + anuncios | 26 d (3,7 sem) · 18–29 d | 0 | 12 d (1,7 sem) | 2 d |
| Intenso + anuncios + Pase | 22 d (3,1 sem) · 15–27 d | 0 | 12 d (1,7 sem) | 2 d |
| Intenso | 65 d (9,3 sem) · 42–84 d | 0 | 12 d (1,7 sem) | 2 d |
| Intenso + Pase | 47 d (6,7 sem) · 32–59 d | 0 | 12 d (1,7 sem) | 2 d |
