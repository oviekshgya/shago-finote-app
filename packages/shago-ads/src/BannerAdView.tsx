import React from 'react';
import {View} from 'react-native';
import type {ShagoBannerOptions} from './core/AdsProvider';
import {ShagoAds} from './core/ShagoAds';

export function ShagoBannerAd(options: ShagoBannerOptions = {}): React.JSX.Element {
  return <View>{ShagoAds.showBanner(options)}</View>;
}
