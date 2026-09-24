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

  // Surprises
  goldenIngredientChance: 0.01,

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
  loopCardBase: 0.15,
  loopCardPerOrder: 0.03,
  loopCardPerComboStep: 0.01,
  loopCardMax: 0.6,
  packRates: {
    standard: { common: 0.75, rare: 0.195, epic: 0.05, legendary: 0.005 },
    last: { common: 0, rare: 0.8, epic: 0.18, legendary: 0.02 },
    special: { common: 0, rare: 0, epic: 0.9, legendary: 0.1 },
  },
  packSize: 3,
  epicPity: 10,
  legendaryPity: 40,
  legendaryMinPacks: 5,
  newCardBias: 0.6,
  duplicateFragments: { common: 5, rare: 15, epic: 40, legendary: 120 },
  craftCost: { common: 40, rare: 120, epic: 320, legendary: 960 },
  shinyCost: { common: 60, rare: 150, epic: 400, legendary: 1000 },

  // Progression (phase 2)
  xpCurve: { base: 100, perLevel: 60 },
  levelCoinReward: 20,
  packEveryNLevels: 3,
  maxLevel: 30,
  masteryThresholds: [0, 10, 50],
  masteryRewards: [null, { coins: 50, fragments: 10 }, { coins: 200, fragments: 40 }],
  utensilCosts: { t1: 400, t2: 700, t3: 1400, t4: 2500 },
  runicGrid: { gridSize: 5, maxCustomers: 4, customerInterval: 6 },
  loopModifiersEnabled: true,
  loopModifiersFromLevel: 4,

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

  // Presentation
  maxParticles: 300,
  maxParticlesReduced: 100,
  dragLiftOffset: 40,
  perfectFlashMaxOpacity: 0.35,
  perfectFlashMinInterval: 1,
};
