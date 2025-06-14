// @ts-check
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");

/**
 * @type {import('webpack').Configuration}
 */
const config = {
  mode: "none",
  entry: "./index.js",
  output: {
    filename: "./bundle.js",
  },
  devServer: {
    port: 2025, // host
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./index.html",
    }),

    // @ts-ignore
    new ModuleFederationPlugin({
      name: "hostName",
      remotes: {
        remoteAlias: "remoteName@http://localhost:2024/remoteEntry.js",
      },
    }),
  ],
};

module.exports = config;
