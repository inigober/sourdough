import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.inigo.sourdough',
  appName: 'Sourdough',
  webDir: 'dist',
  ios: {
    scheme: 'Sourdough',
  },
};

export default config;
