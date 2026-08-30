import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aligoal.app',
  appName: 'AliGOALl',
  webDir: 'dist',
  plugins: {
    AdMob: {
      appId: 'ca-app-pub-3940256099942544/5224354917',
    },
  },
};

export default config;
