# ZynoflixOTT Mobile App

A mobile application for Android and iOS that displays the ZynoflixOTT website (zynoflixott.com) in a WebView with native capabilities for handling file uploads.

## Features

- Displays the ZynoflixOTT website in a native mobile application
- Handles back navigation for Android devices
- Supports full multimedia playback
- Implements native file upload capabilities:
  - Image selection from the device gallery
  - Video selection from the device gallery
  - Document selection for other file types
- Automatic permission handling for media access

## Development Setup

### Prerequisites

- Node.js (v18 or newer)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- For iOS: macOS with Xcode installed
- For Android: Android Studio with Android SDK

### Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
4. Follow the instructions in the terminal to run on a simulator/emulator or physical device

### Building for Production

#### Android APK

```bash
npm run android
```

Then follow the Expo EAS build instructions:

```bash
npx eas build --platform android
```

#### iOS IPA

```bash
npm run ios
```

Then follow the Expo EAS build instructions:

```bash
npx eas build --platform ios
```

## File Upload Implementation

The app intercepts file input clicks on the website and handles them with native pickers:

1. When a user clicks on a file input element on the website, the event is captured
2. Based on the accepted file types, the appropriate native picker is presented
3. After selection, file data is sent back to the WebView via custom events

## Permissions

The app requests the following permissions:

### Android
- Camera access
- Read external storage
- Write external storage
- Record audio

### iOS
- Camera access
- Photo library access
- Microphone access

## Technology Stack

- React Native
- Expo
- React Navigation
- WebView
- Expo Document Picker
- Expo Image Picker

## License

[Your License Here]
