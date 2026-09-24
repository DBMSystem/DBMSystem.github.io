// Ad consent with Google's UMP (spec 7.7), through the AdMob plugin: asked before any ad is requested and
// respected as the player chose. Also exposes the privacy options form for Settings.
export function createConsent(AdMob, { testing = false } = {}) {
  let info = { canRequestAds: false, privacyOptionsRequirementStatus: 'UNKNOWN' };

  async function gather() {
    try {
      info = await AdMob.requestConsentInfo(testing ? { debugGeography: 1 } : {}); // 1 = EEA, to test the form
      if (info.status === 'REQUIRED' && info.isConsentFormAvailable) info = await AdMob.showConsentForm();
    } catch {
      // No network or no form: UMP keeps the previous choice; without it, no ads are requested.
    }
    return info.canRequestAds;
  }

  return {
    gather,
    canRequestAds: () => info.canRequestAds,
    privacyOptionsRequired: () => info.privacyOptionsRequirementStatus === 'REQUIRED',
    async showPrivacyOptions() {
      try {
        await AdMob.showPrivacyOptionsForm();
        info = await AdMob.requestConsentInfo();
      } catch {
        // The form could not open: nothing changes.
      }
    },
  };
}
