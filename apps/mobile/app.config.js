/**
 * Everything lives in app.json. This file exists only to vary one field by
 * build profile.
 *
 * iOS fetches apple-app-site-association through Apple's CDN and caches it, so
 * a correction can take hours to reach a device — which is a miserable way to
 * debug passkey setup. `?mode=developer` makes iOS fetch the file straight from
 * the domain instead.
 *
 * It must not ship: the device has to be in Developer Mode for that entry to
 * resolve, so a store build carrying it would silently fail to associate for
 * every real user. Hence the profile check rather than a note asking someone to
 * remember to take it out.
 */
module.exports = ({ config }) => {
  // The domain stays declared once, in app.json.
  const domains = config.ios?.associatedDomains ?? []
  if (process.env.EAS_BUILD_PROFILE === "production") return config

  return {
    ...config,
    ios: {
      ...config.ios,
      associatedDomains: domains.map((entry) =>
        entry.includes("?") ? entry : `${entry}?mode=developer`
      ),
    },
  }
}
