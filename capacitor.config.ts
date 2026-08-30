import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aligoal.app',
  appName: 'AliGoal',
  webDir: 'dist',
  plugins: {
    AdMob: {
      // Use Google's official public test App ID (notice the tilde '~')
      appId: 'ca-app-pub-3940256099942544~3347511713',
    },
  },
};

export default config;