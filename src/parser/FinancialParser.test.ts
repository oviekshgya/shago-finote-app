import {FinancialParser} from './FinancialParser';
import type {NotificationLog} from '../types/NotificationLog';

jest.mock('react-native-uuid', () => ({
  v4: () => 'test-uuid',
}));

function notification(text: string): NotificationLog {
  return {
    id: `notif-${text}`,
    packageName: 'com.bca.mobilebanking.android',
    notificationId: 1,
    title: 'BCA Transfer',
    text,
    postTime: 1782700010000,
    receivedAt: 1782700010000,
  };
}

describe('FinancialParser amount extraction', () => {
  beforeEach(() => {
    FinancialParser.initialize();
  });

  it.each([
    ['Transaksi berhasil Rp10.000', 10000],
    ['Transaksi berhasil IDR 10,000.00 at merchant', 10000],
    ['Transaksi berhasil IDR 10.000,00 at merchant', 10000],
  ])('parses amount from %s', (message, expectedAmount) => {
    const result = FinancialParser.parse(notification(message));

    expect(result.success).toBe(true);
    expect(result.transaction?.amount).toBe(expectedAmount);
  });
});
