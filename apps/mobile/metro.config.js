const { getDefaultConfig } = require("expo/metro-config")
const path = require("path")

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, "../..")

const config = getDefaultConfig(projectRoot)

config.watchFolders = [monorepoRoot]

// Force react and react-native to always resolve from the mobile app's
// node_modules. extraNodeModules is a fallback and loses to the natural
// node_modules walk, so we use resolveRequest (highest priority) to redirect
// any require('react') — including from hoisted root packages like
// @react-navigation/core — to the mobile app's React 19 copy.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === "react" ||
    moduleName === "react/jsx-runtime" ||
    moduleName === "react/jsx-dev-runtime" ||
    moduleName === "react-native"
  ) {
    return {
      filePath: require.resolve(moduleName, { paths: [projectRoot] }),
      type: "sourceFile",
    }
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
