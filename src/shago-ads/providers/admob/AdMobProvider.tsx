import React from 'react';
import mobileAds, {
  AdEventType,
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import type {
  AdsProvider,
  ShagoBannerOptions,
  ShagoBannerSize,
} from '../../core/AdsProvider';
import {getAdUnitId} from '../../config/ads.config';

const bannerSizes: Record<ShagoBannerSize, BannerAdSize> = {
  anchoredAdaptive: BannerAdSize.ANCHORED_ADAPTIVE_BANNER,
  largeBanner: BannerAdSize.LARGE_BANNER,
  mediumRectangle: BannerAdSize.MEDIUM_RECTANGLE,
};

export class AdMobProvider implements AdsProvider {
  private interstitial: InterstitialAd | null = null;
  private rewarded: RewardedAd | null = null;
  private interstitialLoaded = false;
  private rewardedLoaded = false;

  async initialize() {
    console.log('[Shago Ads][AdMob] Initializing provider');
    await mobileAds().initialize();
    console.log('[Shago Ads][AdMob] Provider ready');
  }

  showBanner(options?: ShagoBannerOptions): React.JSX.Element {
    const size = bannerSizes[options?.size ?? 'anchoredAdaptive'];

    return (
      <BannerAd
        unitId={getAdUnitId('banner')}
        size={size}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
    );
  }

  preloadInterstitial() {
    if (this.interstitialLoaded) {
      return;
    }

    const ad = InterstitialAd.createForAdRequest(getAdUnitId('interstitial'), {
      requestNonPersonalizedAdsOnly: true,
    });

    ad.addAdEventListener(AdEventType.LOADED, () => {
      this.interstitialLoaded = true;
      console.log('[Shago Ads][AdMob] Interstitial loaded');
    });
    ad.addAdEventListener(AdEventType.CLOSED, () => {
      this.interstitialLoaded = false;
      this.preloadInterstitial();
    });
    ad.addAdEventListener(AdEventType.ERROR, error => {
      this.interstitialLoaded = false;
      console.warn('[Shago Ads][AdMob] Interstitial error', error);
    });

    this.interstitial = ad;
    ad.load();
  }

  preloadRewarded() {
    if (this.rewardedLoaded) {
      return;
    }

    const ad = RewardedAd.createForAdRequest(getAdUnitId('rewarded'), {
      requestNonPersonalizedAdsOnly: true,
    });

    ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      this.rewardedLoaded = true;
      console.log('[Shago Ads][AdMob] Rewarded loaded');
    });
    ad.addAdEventListener(AdEventType.CLOSED, () => {
      this.rewardedLoaded = false;
      this.preloadRewarded();
    });
    ad.addAdEventListener(AdEventType.ERROR, error => {
      this.rewardedLoaded = false;
      console.warn('[Shago Ads][AdMob] Rewarded error', error);
    });

    this.rewarded = ad;
    ad.load();
  }

  async showInterstitial() {
    if (!this.interstitial || !this.interstitialLoaded) {
      this.preloadInterstitial();
      console.warn('[Shago Ads][AdMob] Interstitial is not ready');
      return;
    }

    await this.interstitial.show();
    this.interstitialLoaded = false;
  }

  async showRewarded() {
    if (!this.rewarded || !this.rewardedLoaded) {
      this.preloadRewarded();
      console.warn('[Shago Ads][AdMob] Rewarded is not ready');
      return;
    }

    await this.rewarded.show();
    this.rewardedLoaded = false;
  }

  isInterstitialLoaded() {
    return this.interstitialLoaded;
  }

  isRewardedLoaded() {
    return this.rewardedLoaded;
  }
}
