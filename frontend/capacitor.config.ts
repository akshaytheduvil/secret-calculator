import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.app.calculator',
  appName: 'Calculator',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
