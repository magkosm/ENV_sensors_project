const path = require('path');
const TerserPlugin = require('terser-webpack-plugin'); // Importer le plugin Terser

module.exports = {
  entry: './src/scriptGraphsRaw.js', // Le fichier d'entrée pour Webpack
  output: {
    filename: 'scriptGraphs.js', // Nom du fichier de sortie (le bundle compilé)
    path: path.resolve(__dirname, 'app/static/js') // Dossier où le bundle sera généré
  },
  mode: 'production', // Mode production
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      terserOptions: {
        compress: {
          drop_console: true, // Supprime les appels console.log
        },
      },
    })],
  },
  module: {
    rules: [
      {
        test: /\.js$/,              // Fichier à traiter (tout fichier .js)
        exclude: /node_modules/,    // Ne pas traiter les fichiers dans node_modules
        use: {
          loader: 'babel-loader',   // Utiliser Babel pour la transpilation
          options: {
            presets: ['@babel/preset-env'] // Utiliser le preset pour la transpilation vers une version compatible des navigateurs
          }
        }
      }
    ]
  }
};
