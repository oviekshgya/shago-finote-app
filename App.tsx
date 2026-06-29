import React, {useEffect} from 'react';
import {AppState, DeviceEventEmitter} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import NotificationModule from './src/native/NotificationModule';
import {TransactionCaptureService} from './src/services/TransactionCaptureService';

function AutoNotificationCapture(): null {
  useEffect(() => {
    let running = false;

    const sync = async () => {
      if (running) {
        return;
      }
      running = true;
      try {
        const result = await TransactionCaptureService.syncFromNotificationModule(NotificationModule);
        if (result.captured > 0) {
          DeviceEventEmitter.emit('transactionsUpdated');
        }
      } catch (error) {
        console.warn('[AutoNotificationCapture] sync failed', error);
      } finally {
        running = false;
      }
    };

    sync();
    const timer = setInterval(sync, 5000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        sync();
      }
    });
    const notificationSubscription = DeviceEventEmitter.addListener(
      'notificationCaptured',
      () => {
        sync();
      },
    );

    return () => {
      clearInterval(timer);
      subscription.remove();
      notificationSubscription.remove();
    };
  }, []);

  return null;
}

export default function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AutoNotificationCapture />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
