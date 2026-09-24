// Every balance number of the game lives here (spec 10.5). Times in seconds unless noted.
export const balance = {
  // Loop
  loopDuration: 60,
  timeBonusPerOrder: 0,
  gridSize: 4,
  maxRecipeSize: 4,
  cookDuration: 0.4,

  // Combos, ¡En su punto!, fiebre
  comboWindow: 3.0,
  comboMultipliers: [
    { chain: 1, multiplier: 1.0 },
    { chain: 2, multiplier: 1.2 },
    { chain: 3, multiplier: 1.5 },
    { chain: 5, multiplier: 2.0 },
    { chain: 10, multiplier: 3.0 },
  ],
  perfectWindow: 4,
  perfectRecipes: 3,
  feverThreshold: 6,
  feverDuration: 5,
  feverMultiplier: 1.5,
  feverComboWindowMultiplier: 1.5,

  // Customers and orders
  maxCustomers: 3,
  customerInterval: 7,
  firstCustomerAt: 1,
  customerPatience: 20,
  smallOrdersFirst: 2,
  smallRecipeMaxSize: 2,
  cheapRecipeMaxPoints: 100,
  orderBias: 0.35,
  orderBonus: 0.5,
  counterSaleMultiplier: 0.5,
  gridNearlyFullCells: 13,

  // Surprises (spec 2.13) and special / legendary customers (spec 3.3)
  goldenIngredientChance: 0.01,
  goldenPointsMultiplier: 2,
  goldenCardBonus: 0.05, // per golden dish, on top of the end-of-loop card chance
  maxSpecialCustomers: 1, // special or legendary at the same time
  legendaryPerLoop: 1,

  // Second chance and ads
  secondChanceTime: 10,
  secondChanceCells: 8,
  secondChanceDailyCap: 3,
  trialDailyCap: 2,
  freePackCooldown: 6 * 60 * 60,
  adsMinLoops: 3,
  interstitialEnabled: false,

  // Loop rewards (spec 2.14)
  coinsPerOrder: 5,
  pointsPerCoin: 200,
  pointsPerXp: 20,
  xpPerOrder: 5,

  // Cards (phase 2)
  // Values tuned with scripts/simulateEconomy.js (docs/ECONOMY_REPORT.md); the spec's originals in comments.
  loopCardBase: 0.1, // spec 0.15
  loopCardPerOrder: 0.02, // spec 0.03
  loopCardPerComboStep: 0.01,
  loopCardMax: 0.4, // spec 0.6
  packRates: {
    standard: { common: 0.75, rare: 0.195, epic: 0.0535, legendary: 0.0015 }, // spec epic 0.05, legendary 0.005
    last: { common: 0, rare: 0.82, epic: 0.174, legendary: 0.006 }, // spec rare 0.8, epic 0.18, legendary 0.02
    special: { common: 0, rare: 0, epic: 0.9, legendary: 0.1 },
  },
  packSize: 3,
  epicPity: 10,
  legendaryPity: 60, // spec 40 (48 cards); 120-card album: 60
  legendaryMinPacks: 5,
  newCardBias: 0.6,
  duplicateFragments: { common: 5, rare: 15, epic: 40, legendary: 120 },
  craftCost: { common: 40, rare: 150, epic: 600, legendary: 3000 }, // spec 40 / 120 / 320 / 960 (48 cards)
  shinyCost: { common: 60, rare: 150, epic: 400, legendary: 1000 },

  // Pip's daily orders: targets by tier (levels 1–2, 3–5, 6–9, 10+) and rewards per order.
  challenges: {
    perDay: 3,
    bonusPacks: 1, // for completing all of the day's orders
    templates: {
      combo: { targets: [3, 4, 5, 7], reward: { coins: 20, fragments: 10 } },
      orders: { targets: [4, 6, 8, 10], reward: { coins: 20, fragments: 10 } },
      score: { targets: [800, 1200, 1600, 2200], reward: { coins: 25, fragments: 10 } },
      noLoss: { targets: [1, 1, 1, 1], reward: { coins: 25, fragments: 15 } },
      cook: { targets: [3, 5, 7, 10], reward: { coins: 15, fragments: 10 } },
      perfect: { targets: [1, 2, 3, 4], reward: { coins: 20, fragments: 15 } },
      fever: { targets: [1, 1, 2, 3], reward: { coins: 30, fragments: 20 } },
      recipes: { targets: [8, 12, 18, 25], reward: { coins: 15, fragments: 5 } },
    },
  },

  // Progression (phase 2)
  xpCurve: { base: 100, perLevel: 60 },
  levelCoinReward: 6, // spec 20 (tree in 4–6 weeks, spec 5.4)
  packEveryNLevels: 3,
  maxLevel: 30,
  masteryThresholds: [0, 10, 50],
  masteryRewards: [null, { coins: 50, fragments: 10 }, { coins: 200, fragments: 40 }],
  utensilCosts: { t1: 400, t2: 700, t3: 1400, t4: 2500 },
  runicGrid: { gridSize: 5, maxCustomers: 4, customerInterval: 6 },
  loopModifiersEnabled: true,
  loopModifiersFromLevel: 4,

  // Utensils in play (spec 3.1, 5.4)
  specialIngredientChance: 0.05, // per generated ingredient, among the unlocked special ones
  specialIngredientCaps: { clock: 2, spice: 2 }, // per loop
  clockTime: 4,
  truffleChance: 0.15, // once per loop at most
  spiceMinRecipeSize: 3,
  abilityUses: { move: 3, discard: 2, freeze: 1 }, // per loop
  discardHold: 0.5,
  freezeDuration: 5,

  // Daily specialty (spec 2.12)
  specialtyChoices: 3,
  specialties: {
    breakfast: { ingredient: 'egg', weight: 2, pointsBonus: 0.25 },
    baconFest: { ingredient: 'bacon', weight: 2, recipe: 'triple_bacon', orderChance: 0.3 },
    pipVisit: { interval: 15 },
    crazyKitchen: { interval: 10 },
    criticInRoom: { customer: 'critic', arrivalAt: 20 },
    bruleeNight: { orderChance: 0.5, fragmentsPerOrder: 1 },
  },

  // Save protections (spec 11.4)
  clockRollbackTolerance: 5 * 60,
  grantedRewardsKept: 50,

  // Tutorial and Pip (spec 8.2, 3.6)
  tutorialLoopDuration: 30,
  pipLineInterval: 4,
  pipLineDuration: 3.2,
  tutorialLineDuration: 5,
  dialogueHistory: 5,
  closeCallPatience: 0.15,
  weakLoopScore: 300,

  // Story (phase 4)
  bruleeScoreThreshold: 1200,
  bruleeFromLoop: 3,
  bruleeGuaranteedLoop: 6,
  chapterTriggers: { 5: { level: 12, utensils: 3 }, 6: { level: 16, secrets: 3 } },

  // Presentation
  maxParticles: 300,
  maxParticlesReduced: 100,
  dragLiftOffset: 40,
  perfectFlashMaxOpacity: 0.35,
  perfectFlashMinInterval: 1,
};
