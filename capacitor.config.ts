import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.zhi.heart',
  appName: 'Zhi',
  webDir: 'out',
  android: {
    backgroundColor: '#ffffff',
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '535312456048-3p0o2d6boen6g01qcool6g7l0t761pmr.apps.googleusercontent.com',
    },
    CapacitorUpdater: {
      autoUpdate: true,
    }
  },
};

export default config;
