# KITCHEN LOOP — Biblia de la historia

Daniel: «perfecciona todo el juego para que tenga una historia coherente, entretenida y divertida, que den ganas de seguir».

Este documento es el canon de la historia: quién es cada uno, cómo habla, qué pasa en cada capítulo y cómo se reparte la historia entre las escenas, las frases de Pip, el Almacén, el diario y las cartas. Todo lo que hay aquí es `draft` hasta que Daniel apruebe la decisión D-1 (especificación 6.5). Los textos viven en `src/data/i18n/es.js` (y su traducción en `en.js`).

## 1. La historia en diez líneas

1. Llegas a una cocina pequeña con una hoja vieja y rota que huele a azúcar quemado.
2. La cocina es de Chef Pip: enérgico, teatral, un desastre encantador. Te enseña a cocinar.
3. La cocina **recuerda**: cada plato se convierte en una carta. Algunas cartas guardan recuerdos.
4. Pip fue el aprendiz más prometedor de **Brûlée**, un maestro legendario que colecciona utensilios.
5. Brûlée lo preparaba para **La Gran Cocina**, la prueba que solo se hace una vez: cocinar **La Receta Perdida**, la receta que ni el propio Brûlée terminó.
6. La noche de la prueba, Pip no se presentó. Tenía talento; no había practicado, y tuvo miedo.
7. Brûlée cerró el baúl y dejó de enseñar, pero antes encantó la cocina para que recordara cada plato, esperando que alguien digno volviera a llenarla.
8. Tu hoja vieja es una página arrancada de La Receta Perdida. Por eso Pip se pone nervioso al olerla.
9. Brûlée vuelve cuando ve que su aprendiz tiene un aprendiz. Abre el baúl. Cada utensilio te acerca a la receta.
10. Cocinas La Receta Perdida con Pip a tu lado. Brûlée perdona a Pip. Pip se pone el delantal para presentarse, por fin, a su propia prueba.

## 2. Personajes

### Pip (38)

- **Qué quiere:** que llegues a donde él no llegó. Lo disfraza de «te enseño a cocinar».
- **Qué esconde:** la noche que no se presentó. Cuando se acerca al tema, hace un chiste y cambia de tema.
- **Cómo habla:**
  - Exagera todo: «¡Voy a llorar!», «¡Esto es arte!», «Qué drama».
  - Se corrige a sí mismo a la baja: «el mejor chef del barrio… de esta calle… de esta cocina».
  - Culpa a la cebolla de cualquier lágrima.
  - Habla de Brûlée como quien habla de una tormenta: con respeto y un poco de miedo.
  - Nunca es cruel. Si algo sale mal, lo convierte en comedia.
- **Arco:** del «ya saldrá» al «hoy sale». Al final deja de esconderse y pide su prueba.

### Brûlée (78)

- **Quién es:** maestro legendario, antiguo maestro de Pip. Colecciona utensilios desde hace décadas. Serio con la cocina, humor seco.
- **Qué esconde:** que perdonó a Pip hace mucho. Y que La Receta Perdida no se puede terminar a solas.
- **Cómo habla:**
  - Frases cortas que suenan a refrán, con un giro al final: «El fuego no perdona. Yo tampoco. Pero a veces se me olvida».
  - Nunca grita. Cuando está contento, dice una frase menos.
  - Llama a Pip «mi aprendiz» incluso cuando lo regaña.
- **Frase característica:** «Si mi aprendiz tiene un aprendiz, es hora de desempolvar el baúl».
- **Motivo recurrente:** el olor a azúcar quemado (su nombre es un postre de caramelo quemado). Cuando algo huele a azúcar quemado, Brûlée anda cerca.

### La cocina

- Es un personaje más: recuerda. En el diario habla en primera persona.
- Sus «recuerdos» son las cartas. Las cartas con `storyFragment` son las páginas del diario.

### Clientes recurrentes

- **La abuela** (cliente tranquilo): pide lo mismo cada día; cuando se enfada, sigue dejando propina.
- **El estudiante**: siempre con prisa y sin dinero. Quiere mucho a su sudadera del dinosaurio.
- **La oficinista**: quince minutos de libertad al día. Odia los lunes.
- **El turista** (brócoli de otro mundo): lo fotografía todo. Dice que la tostada es lo mejor del planeta.
- **El crítico**: libreta y monóculo; escribe tres palabras por crítica.
- **El chef rival**: viene a copiar recetas; nunca admite que algo está bueno.
- **El cliente misterioso** (guindilla): pide algo suave y se lo come todo, hasta el adorno.
- **El coleccionista**: quiere comprar el álbum; se va con una carta repetida.
- **El Maestro Antiguo** (gallo rey) y el **Crítico Legendario**: leyendas del barrio.
- **El Visitante Nocturno**: solo viene de noche y pide platos que ya nadie recuerda. Es una pista de que la cocina recuerda.

## 3. Reglas de escritura

- Frases en partida: máximo 60 caracteres. Escenas: tres bocadillos, cada uno de una o dos frases cortas.
- Al jugador siempre en forma neutra (`{nombre}`, «chef», «¡A por ello!»). Nunca «listo/a», «bienvenido/a».
- Cada escena termina con un gancho (una pregunta sin responder) o con una risa.
- Las revelaciones van en este orden y no se adelantan: el olor → el maestro → el baúl → la cocina recuerda → la prueba → la noche → el perdón.
- Humor: siempre a costa de Pip o de la comida, nunca del jugador.

## 4. Capítulos (escenas de tres bocadillos)

| Capítulo | Se abre | Qué revela | Gancho final |
|---|---|---|---|
| Intro + premisa | Primera sesión | Pip, la cocina que recuerda, la hoja que huele a azúcar quemado | «Algún día verás por qué» |
| 2. El Aprendiz | Nivel 3 | Pip también fue aprendiz, de alguien muy exigente | «Pero esa es otra historia» |
| 3. El Maestro | Brûlée aparece tras un buen servicio (desde el 5.º; seguro en el 7.º) | Brûlée existe y vuelve: abre el baúl | «Es hora de desempolvar el baúl» |
| 4. El Baúl | Comprar la Encimera Rúnica | Hubo una noche en que la cocina se quedó fría | «Veamos si {nombre} la calienta mejor» |
| 5. La Cocina Nocturna | Nivel 12 y 3 utensilios | Brûlée encantó la cocina: por eso los platos son cartas | «Por eso tus platos se vuelven cartas» |
| 6. Las Recetas Perdidas | Nivel 16 y 3 secretas | La Receta Perdida; tu hoja es una página suya | «Tu hoja vieja es una página suya» |
| 7. La Gran Cocina | Árbol completo | La confesión de Pip: la noche de su prueba | «Cocinad juntos La Receta Perdida» |
| Epílogo | Cocinar La Receta Perdida | El perdón; Pip pide su prueba | Pip se pone el delantal |

## 5. Dónde más vive la historia

- **Frases de Pip en partida por capítulo** (`fromChapter` en `src/data/dialogues.js`, especificación 6.3: «cada capítulo desbloquea diálogos»): a partir del capítulo 3 Pip siente que Brûlée mira; a partir del 5 nota que la cocina apunta los platos; después del epílogo habla como alguien que ya no se esconde.
- **Brûlée en el Almacén**: sus comentarios también cambian con el capítulo. Primero pone a prueba; luego cuenta; al final, agradece.
- **Resultados**: Pip comenta lo que de verdad ha pasado (récord, servicio flojo, platos quemados, nadie se fue, la fiebre) y, si has probado algo con un anuncio, te dice dónde está.
- **Diario de la cocina** (12 páginas en cartas, 11 de ellas comunes o raras): la cocina cuenta la historia en primera persona, en orden, con un gancho en cada página. La página 12 va en una carta épica, la Tapa Misteriosa: lo último que se levanta.
- **Cartas**: cada texto de carta es una miniatura del mundo: un chiste, un cliente recurrente o una pista. Ninguna contradice las escenas.
- **Reacciones de los clientes**: tres por cliente, con su personalidad.
- **Menú**: Pip saluda según la hora del día.

## 6. Diario de la cocina (las 12 páginas)

| Página | Carta | Beat |
|---|---|---|
| 1 | Tostada Dudosa (común) | La cocina recuerda. Tu primera huella. |
| 2 | Huevo Quemado (común) | Hubo un aprendiz con talento que lo quemaba todo. |
| 3 | Tostada de la Casa (común) | Prefería improvisar: «ya saldrá». |
| 4 | El Delantal de Pip (común) | El maestro lo preparaba para La Gran Cocina. |
| 5 | Carta de Amor (rara) | La Receta Perdida: la escribió el maestro y nunca la terminó. |
| 6 | Sartén Abollada (común) | El baúl: cada utensilio tiene una historia. |
| 7 | Reloj de Cocina (común) | La noche de la prueba: el maestro esperó. |
| 8 | Pip Preocupado (común) | No le faltaba talento. Tuvo miedo. |
| 9 | Cocina de Medianoche (rara) | El maestro cerró el baúl. La cocina se quedó sola. |
| 10 | Nota en la Nevera (común) | El encantamiento: por eso los platos son cartas. |
| 11 | Cocina al Amanecer (común) | La esperanza: alguien digno, y el aprendiz con esa persona. |
| 12 | Tapa Misteriosa (épica) | Tu hoja es una página de La Receta Perdida. |
