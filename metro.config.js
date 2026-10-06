const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */

// Package is now directly copied to node_modules (not symlinked)
// This ensures normal module resolution and prevents multiple React instances
const downloadsDir = path.resolve(__dirname, '..');

const config = {
  // App.tsx requires ../C++.pdf from the Downloads folder beside this project.
  watchFolders: [downloadsDir],
  resolver: {
    // Ensure React, React Native, and related packages are resolved from app's node_modules
    // This prevents multiple React instances and module resolution conflicts
    extraNodeModules: {
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-native': path.resolve(__dirname, 'node_modules/react-native'),
      // Ensure @react-native packages resolve from app's node_modules
      '@react-native/normalize-color': path.resolve(__dirname, 'node_modules/@react-native/normalize-color'),
      'deprecated-react-native-prop-types': path.resolve(__dirname, 'node_modules/deprecated-react-native-prop-types'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

