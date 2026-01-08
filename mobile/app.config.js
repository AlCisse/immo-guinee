// Dynamic Expo config for EAS Build
// Allows referencing file secrets via environment variables

module.exports = {
  expo: {
    name: 'ImmoGuinee',
    slug: 'immoguinee',
    owner: 'alcisse',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'immoguinee',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/images/splash.png',
      resizeMode: 'cover',
      backgroundColor: '#FFFFFF',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.immoguinee.app',
      buildNumber: '1',
      associatedDomains: [
        'applinks:immoguinee.com',
        'applinks:www.immoguinee.com',
      ],
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false,
          NSPinnedDomains: {
            'immoguinee.com': {
              NSIncludesSubdomains: true,
              NSPinnedLeafIdentities: [
                {
                  'SPKI-SHA256-BASE64':
                    'LOv+QdFaqnOuyIXGtn5hPngBXKLwCylu5Py+5oBPRVo=',
                },
              ],
            },
          },
        },
        UIBackgroundModes: ['remote-notification'],
        NSMicrophoneUsageDescription:
          'Cette application utilise le microphone pour enregistrer des messages vocaux.',
        NSPhotoLibraryUsageDescription:
          'Cette application utilise votre galerie photo pour envoyer des images et vidéos.',
        NSCameraUsageDescription:
          'Cette application utilise la caméra pour prendre des photos et vidéos.',
        NSLocationWhenInUseUsageDescription:
          'Cette application utilise votre position pour localiser les biens immobiliers proches de vous.',
        NSFaceIDUsageDescription:
          'Utilisez Face ID pour securiser l\'acces a votre compte.',
      },
    },
    android: {
      package: 'com.immoguinee.app',
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#FFFFFF',
      },
      splash: {
        image: './assets/images/splash.png',
        resizeMode: 'cover',
        backgroundColor: '#FFFFFF',
      },
      permissions: [
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.RECORD_AUDIO',
        'android.permission.VIBRATE',
        'android.permission.RECEIVE_BOOT_COMPLETED',
        'android.permission.USE_BIOMETRIC',
        'android.permission.USE_FINGERPRINT',
        'android.permission.MODIFY_AUDIO_SETTINGS',
      ],
      blockedPermissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'ACCESS_BACKGROUND_LOCATION',
      ],
      // Use EAS secret if available, otherwise fallback to local file
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON || './google-services.json',
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'https',
              host: 'immoguinee.com',
              pathPrefix: '/bien',
            },
            {
              scheme: 'https',
              host: 'www.immoguinee.com',
              pathPrefix: '/bien',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-build-properties',
        {
          android: {
            usesCleartextTraffic: false,
          },
          ios: {
            deploymentTarget: '15.1',
          },
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/images/notification-icon.png',
          color: '#10B981',
          defaultChannel: 'messages',
          sounds: [],
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission:
            'Cette application utilise votre galerie photo pour envoyer des images et vidéos dans les messages.',
          cameraPermission:
            'Cette application utilise la caméra pour prendre des photos et vidéos dans les messages.',
        },
      ],
      './plugins/withNetworkSecurity.js',
      '@react-native-community/datetimepicker',
      'expo-localization',
      'expo-audio',
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      eas: {
        projectId: '9dcbadbd-d11e-43a9-95e9-958d8e21d53d',
      },
      router: {},
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    updates: {
      url: 'https://u.expo.dev/9dcbadbd-d11e-43a9-95e9-958d8e21d53d',
    },
  },
};
