import React from 'react';
import {AdMobProvider} from '../providers/admob/AdMobProvider';
import type {AdsProvider, ShagoBannerOptions} from './AdsProvider';

type ShagoAdsConfig = {
  provider?: AdsProvider;
};

class ShagoAdsCore {
  private provider: AdsProvider = new AdMobProvider();
  private initialized = false;

  configure(config: ShagoAdsConfig) {
    if (config.provider) {
      this.provider = config.provider;
      this.initialized = false;
    }
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    console.log('[Shago Ads] Initializing SDK');
    await this.provider.initialize();
    this.provider.preloadInterstitial();
    this.provider.preloadRewarded();
    this.initialized = true;
    console.log('[Shago Ads] SDK ready');
  }

  showBanner(options?: ShagoBannerOptions): React.JSX.Element {
    return this.provider.showBanner(options);
  }

  async showInterstitial() {
    await this.provider.showInterstitial();
  }

  async showRewarded() {
    await this.provider.showRewarded();
  }

  preloadInterstitial() {
    this.provider.preloadInterstitial();
  }

  preloadRewarded() {
    this.provider.preloadRewarded();
  }

  isInterstitialLoaded() {
    return this.provider.isInterstitialLoaded();
  }

  isRewardedLoaded() {
    return this.provider.isRewardedLoaded();
  }
}

export const ShagoAds = new ShagoAdsCore();
