import { calendarDays } from '../data/calendar.js';
import { cards } from '../data/cards.js';
import { addCard, addFragments, addPack, ownsCard } from '../inventory/inventory.js';
import { track } from '../analytics/analytics.js';

// Pip's calendar (spec 5.5): claimable once per local day; skipping days resets nothing.
export const canClaimCalendar = (save, today) => save.calendar.lastClaimDate !== today;

// Card of `rarity` for a gift, preferring one the player does not have.
function giftCard(save, rng, rarity) {
  const pool = cards.filter((c) => c.source === 'pack' && c.rarity === rarity);
  const missing = pool.filter((c) => !ownsCard(save, c.id));
  return rng.pick(missing.length > 0 ? missing : pool).id;
}

export function claimCalendar(save, rng, today, now) {
  if (!canClaimCalendar(save, today)) return null;
  const day = calendarDays[save.calendar.dayIndex];
  const reward = { day: save.calendar.dayIndex + 1, cards: [], fragments: 0, packs: {} };
  if (day.cards) {
    for (let i = 0; i < day.cards.count; i++) reward.cards.push(addCard(save, giftCard(save, rng, day.cards.rarity), now, 'calendar'));
  }
  if (day.fragments) reward.fragments = addFragments(save, day.fragments, 'calendar');
  for (const [kind, count] of Object.entries(day.packs ?? {})) {
    for (let i = 0; i < count; i++) addPack(save, kind);
    reward.packs[kind] = count;
  }
  save.calendar.dayIndex = (save.calendar.dayIndex + 1) % calendarDays.length;
  save.calendar.lastClaimDate = today;
  track('calendar_claimed', { day: reward.day });
  return reward;
}
