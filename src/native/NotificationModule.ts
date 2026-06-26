import {NativeModules} from 'react-native';

type NotificationNativeModule = {
  openSettings(): Promise<void>;
  isListenerEnabled(): Promise<boolean>;
  getLogs(): Promise<string>;
  clearLogs(): Promise<boolean>;
  getWebhookConfigs(): Promise<string>;
  saveWebhookConfig(configJson: string): Promise<boolean>;
  clearWebhookConfig(packageName: string): Promise<boolean>;
  getInstalledApps(): Promise<string>;
  getCaptureFilter(): Promise<string>;
  saveCaptureFilter(filterJson: string): Promise<boolean>;
};

const nativeModule = NativeModules.NotificationModule as
  | NotificationNativeModule
  | undefined;

if (!nativeModule) {
  throw new Error(
    'NativeModules.NotificationModule tidak tersedia. Pastikan NotificationPackage sudah diregistrasikan di MainApplication.kt.',
  );
}

const NotificationModule: NotificationNativeModule = nativeModule;

export default NotificationModule;
