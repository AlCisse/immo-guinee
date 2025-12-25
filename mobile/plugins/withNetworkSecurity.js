const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Network Security Config XML content with SSL pinning
const NETWORK_SECURITY_CONFIG = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system"/>
        </trust-anchors>
    </base-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">immoguinee.com</domain>
        <pin-set expiration="2026-01-01">
            <!-- Primary: Current Let's Encrypt certificate -->
            <pin digest="SHA-256">LOv+QdFaqnOuyIXGtn5hPngBXKLwCylu5Py+5oBPRVo=</pin>
            <!-- Backup: ISRG Root X1 (Let's Encrypt root) -->
            <pin digest="SHA-256">C5+lpZ7tcVwmwQIMcRtPbsQtWLABXhQzejna0wHFr8M=</pin>
        </pin-set>
        <trust-anchors>
            <certificates src="system"/>
        </trust-anchors>
    </domain-config>
</network-security-config>`;

function withNetworkSecurityConfig(config) {
  // Add the network security config file
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const resPath = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res/xml'
      );

      // Create xml directory if it doesn't exist
      if (!fs.existsSync(resPath)) {
        fs.mkdirSync(resPath, { recursive: true });
      }

      // Write network security config
      fs.writeFileSync(
        path.join(resPath, 'network_security_config.xml'),
        NETWORK_SECURITY_CONFIG
      );

      return config;
    },
  ]);

  // Add reference to AndroidManifest.xml
  config = withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;

    // Add networkSecurityConfig to application
    if (manifest.application && manifest.application.length > 0) {
      manifest.application[0].$['android:networkSecurityConfig'] = '@xml/network_security_config';
    }

    return config;
  });

  return config;
}

module.exports = withNetworkSecurityConfig;
