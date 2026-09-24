// AdMob configuration (spec 7.2, 7.7, 12.1). Only rewarded ads: no banners, interstitials, app-open or
// rewarded interstitials (spec 7.1, 7.3: every ad is voluntary and never in the middle of play).
// One rewarded ad unit per placement, so AdMob reports revenue per placement and floors can differ.
// `adUnit`: fill in with the ids from the AdMob console before publishing (phase 7). Until then, and in every
// development or testing build, Google's official test unit is used (never real ads while developing).
export const ADMOB_TEST_REWARDED = 'ca-app-pub-3940256099942544/5224354917';
export const ADMOB_TEST_APP_ID = 'ca-app-pub-3940256099942544~3347511713'; // AndroidManifest (phase 6)

export const adPlacements = {
  CARD_PACK: { adUnit: '' },
  SECOND_CHANCE: { adUnit: '' },
  TRIAL: { adUnit: '' },
};

// Audience D-4 (13+, not aimed at children): cozy content, so ads are capped at "parental guidance".
export const admobOptions = {
  maxAdContentRating: 'ParentalGuidance',
  tagForChildDirectedTreatment: false,
  tagForUnderAgeOfConsent: false,
  immersiveMode: true,
};

export const adUnitsReady = () => Object.values(adPlacements).every((p) => p.adUnit);
