const path = require('path');
const TerserPlugin = require('terser-webpack-plugin'); // Import the Terser plugin

module.exports = {
  entry: './src/scriptGraphsRaw.js', // Input file for Webpack
  output: {
    filename: 'scriptGraphs.js', // Output file name (the compiled bundle)
    path: path.resolve(__dirname, 'app/static/js') // Directory where the bundle will be generated
  },
  mode: 'production', // Production mode
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      terserOptions: {
        compress: {
          drop_console: true, // Remove console.log calls
        },
      },
    })],
  },
  module: {
    rules: [
      {
        test: /\.js$/,              // Files to process (all .js files)
        exclude: /node_modules/,    // Don't process files in node_modules
        use: {
          loader: 'babel-loader',   // Use Babel for transpilation
          options: {
            presets: ['@babel/preset-env'] // Use the preset for transpilation to a compatible browser version
          }
        }
      }
    ]
  }
};
