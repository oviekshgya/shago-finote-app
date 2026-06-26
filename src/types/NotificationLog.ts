export type NotificationLog = {
  id: string;
  packageName: string;
  notificationId?: number;
  tag?: string | null;
  title?: string;
  text?: string;
  subText?: string;
  bigText?: string;
  postTime: number;
  receivedAt: number;
  webhookStatus?: 'disabled' | 'pending' | 'sent' | 'failed';
  webhookSentAt?: number;
  webhookHttpStatus?: number;
  webhookError?: string;
};

export type WebhookMethod = 'POST' | 'GET';
export type WebhookAuthType = 'none' | 'bearer' | 'basic' | 'custom';

export type WebhookFields = {
  id: boolean;
  packageName: boolean;
  notificationId: boolean;
  tag: boolean;
  title: boolean;
  text: boolean;
  subText: boolean;
  bigText: boolean;
  postTime: boolean;
  receivedAt: boolean;
};

export type WebhookConfig = {
  packageName: string;
  enabled: boolean;
  url: string;
  method: WebhookMethod;
  authType: WebhookAuthType;
  bearerToken: string;
  basicUsername: string;
  basicPassword: string;
  customHeaders: string;
  fields: WebhookFields;
};

export type InstalledApp = {
  packageName: string;
  label: string;
};

export type CaptureFilter = {
  captureAll: boolean;
  packages: string[];
};
