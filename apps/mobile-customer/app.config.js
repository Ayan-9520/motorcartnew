/**
 * Dynamic Expo config — production HTTPS builds disable cleartext HTTP.
 * Static defaults live in app.json; this file merges env at build time.
 */
const appJson = require("./app.json");

module.exports = () => {
  const api = String(process.env.EXPO_PUBLIC_API_URL || "").trim();
  const httpsApi = api.startsWith("https://");

  return {
    expo: {
      ...appJson.expo,
      android: {
        ...appJson.expo.android,
        // Local/Docker may use http://; Play Store production uses https://motorcart.in
        usesCleartextTraffic: !httpsApi,
      },
      extra: {
        ...(appJson.expo.extra || {}),
        eas: {
          ...(appJson.expo.extra?.eas || {}),
          projectId: process.env.EAS_PROJECT_ID || appJson.expo.extra?.eas?.projectId,
        },
      },
    },
  };
};
