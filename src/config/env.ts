declare const process: {
  env: Record<string, string | undefined>;
};

export const ENV = {
  API_BASE_URL: process.env.SHAGO_FINOTE_API_BASE_URL || 'http://localhost:8080',
};
