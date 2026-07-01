import type React from 'react';

export type ShagoAdUnit = 'banner' | 'interstitial' | 'rewarded';

export type ShagoBannerSize = 'anchoredAdaptive' | 'largeBanner' | 'mediumRectangle';

export type ShagoBannerOptions = {
  placement?: string;
  size?: ShagoBannerSize;
};

export interface AdsProvider {
  initialize(): Promise<void>;

  showBanner(options?: ShagoBannerOptions): React.JSX.Element;

  showInterstitial(): Promise<void>;

  showRewarded(): Promise<void>;

  isInterstitialLoaded(): boolean;

  isRewardedLoaded(): boolean;

  preloadInterstitial(): void;

  preloadRewarded(): void;
}
