import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.galera.roles',
  appName: 'Galera',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
    backgroundColor: '#E0163B',
  },
  android: {
    backgroundColor: '#E0163B',
  },
};

export default config;
