// Particle types (spec 9.2). Colours, speed (logical px/s), life (s), gravity (px/s²), size (px).
export const particleTypes = {
  spark: { colors: ['#ffd54f', '#ffb74d', '#fff8e7'], speed: 140, life: 0.45, gravity: 260, size: 3 },
  star: { colors: ['#fff59d', '#ffffff', '#a78bfa'], speed: 200, life: 0.8, gravity: 120, size: 4 },
  steam: { colors: ['rgba(255,255,255,0.7)'], speed: 30, life: 0.7, gravity: -60, size: 5 },
  crumb: { colors: ['#d7a86e', '#fff3d6'], speed: 70, life: 0.3, gravity: 300, size: 2 },
  fire: { colors: ['#ff7043', '#ffab40', '#ffd54f'], speed: 60, life: 0.6, gravity: -120, size: 4 },
  pinkSpark: { colors: ['#f48fb1', '#fce4ec', '#ffffff'], speed: 120, life: 0.5, gravity: 200, size: 3 },
  goldSpark: { colors: ['#ffd54f', '#fff59d', '#ffffff'], speed: 150, life: 0.6, gravity: 160, size: 3 },
  smoke: { colors: ['rgba(120,120,120,0.6)'], speed: 40, life: 0.6, gravity: -40, size: 6 },
};
