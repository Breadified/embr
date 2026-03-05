module.exports = function (api) {
  api.cache(true);

  const isProduction = process.env.NODE_ENV === 'production';

  const plugins = [
    'react-native-reanimated/plugin', // Must be last
  ];

  // Remove console logs in production
  if (isProduction) {
    plugins.unshift('transform-remove-console');
  }

  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins,
  };
};
