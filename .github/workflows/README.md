# Android Build Workflow

This GitHub Actions workflow allows you to build Android APKs for your Zynoflix OTT app with customizable options.

## Prerequisites

Before using this workflow, you need to:

1. Set up an Expo token as a repository secret named `EXPO_TOKEN`:
   - Go to your GitHub repository
   - Navigate to Settings > Secrets and variables > Actions
   - Click "New repository secret"
   - Name: `EXPO_TOKEN`
   - Value: Your Expo token (get it from https://expo.dev/accounts/[username]/settings/access-tokens)

## How to Use

1. Go to the "Actions" tab in your GitHub repository
2. Select "Build Android APK" workflow
3. Click "Run workflow"
4. Configure the build parameters:
   - **Build type**: Choose between `debug` or `release`
   - **Version code** (optional): Set a custom version code (integer)
   - **Version name** (optional): Set a custom version name (e.g., 1.0.0)
5. Click "Run workflow" to start the build

## Build Output

Once the workflow completes successfully:

1. The APK will be available as a downloadable artifact in the workflow run
2. For release builds, a GitHub Release will also be created with the APK attached

## Downloading the APK

1. Go to the completed workflow run
2. Scroll down to the "Artifacts" section
3. Click on the artifact named `zynoflixott-{build-type}-apk` to download

## Customization

You can customize the workflow by editing the `.github/workflows/build-android.yml` file:

- Change build profiles
- Modify retention period for artifacts
- Add additional build parameters
- Configure release options 