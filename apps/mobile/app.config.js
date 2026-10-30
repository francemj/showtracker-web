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
 * every real user. Hence the flag below rather than a note asking someone to
 * remember to take it out.
 *
 * The flag is SHOWTRACKER_STORE_DOMAINS, declared on the production profile in
 * eas.json, and not EAS_BUILD_PROFILE — see "Why a flag in eas.json" in
 * README.md.
 */
module.exports = ({ config }) => {
  if (process.env.SHOWTRACKER_STORE_DOMAINS === "1") return config

  // The domain stays declared once, in app.json.
  const domains = config.ios?.associatedDomains ?? []

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
