import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aligoal.app',
  appName: 'AliGoal',
  webDir: '.output/public', // Updated from 'dist'
  plugins: {
    AdMob: {
      appId: 'ca-app-pub-3940256099942544~3347511713',
    },
  },
};

export default config;