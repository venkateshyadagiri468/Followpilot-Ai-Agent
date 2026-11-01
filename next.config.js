/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@react-three/fiber', '@react-three/drei', 'three'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Force @react-three/fiber and @react-three/drei to use local React 18
      // instead of Next's internal React 19. Use NormalModuleReplacementPlugin
      // to only redirect imports originating from these packages.
      const webpack = require('webpack');
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^react$/,
          (resource) => {
            // Only redirect if the request comes from @react-three packages
            const issuer = resource.context || '';
            if (issuer.includes('@react-three/fiber') || issuer.includes('@react-three/drei')) {
              resource.request = require.resolve('react');
            }
          }
        ),
        new webpack.NormalModuleReplacementPlugin(
          /^react-dom$/,
          (resource) => {
            const issuer = resource.context || '';
            if (issuer.includes('@react-three/fiber') || issuer.includes('@react-three/drei')) {
              resource.request = require.resolve('react-dom');
            }
          }
        )
      );
    }
    return config;
  },
};

module.exports = nextConfig;