import type { CapacitorConfig } from '@capacitor/cli'

// appId is permanent: changing it makes Android treat the build as a different app.
const config: CapacitorConfig = {
  appId: 'com.browsination.app',
  appName: 'Browsination',
  webDir: 'dist',
  plugins: {
    CapacitorSQLite: {
      androidIsEncryption: false,
    },
  },
}

export default config
