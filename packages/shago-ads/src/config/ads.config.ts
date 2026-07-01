import {TestIds} from 'react-native-google-mobile-ads';

export const ADS_CONFIG = {
  provider: 'admob',
  production: false,

  admob: {
    appId: 'ca-app-pub-6656393838608208~4245169206',

    testUnitIds: {
      banner: TestIds.BANNER,
      interstitial: TestIds.INTERSTITIAL,
      rewarded: TestIds.REWARDED,
    },

    productionUnitIds: {
      banner: 'ISI_BANNER_PRODUCTION_ID_NANTI',
      interstitial: 'ca-app-pub-6656393838608208/6300908364',
      rewarded: 'ISI_REWARDED_PRODUCTION_ID_NANTI',
    },
  },
};

export const getAdUnitId = (
  type: 'banner' | 'interstitial' | 'rewarded',
) => {
  return ADS_CONFIG.production
    ? ADS_CONFIG.admob.productionUnitIds[type]
    : ADS_CONFIG.admob.testUnitIds[type];
};
