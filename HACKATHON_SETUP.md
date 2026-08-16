Hackathon: Android SDK & Expo setup

Summary

This document records the environment and steps used to get the Android SDK and Expo app running locally for the hackathon.

What was installed/configured
- OpenJDK 17 (Microsoft build) installed and JAVA_HOME set for the user
- Android SDK located at %LOCALAPPDATA%\Android\Sdk
- Android command-line tools installed to %LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest
- Installed SDK packages: platform-tools, emulator, build-tools (33.0.2), platforms;android-33
- Accepted Android SDK licenses
- Pixel_7 AVD exists and was used to validate the app

Project notes
- The app uses Expo (see app/package.json). Use "npm install" in app/ then "npm run android" to start and launch on a running emulator.
- app/node_modules is intentionally ignored and should not be committed.

Verification commands (run in a new shell after restarting terminal):

where sdkmanager
sdkmanager --list
adb --version
emulator -list-avds
adb devices
adb -s emulator-5554 logcat

How to start the emulator (UI):
"%LOCALAPPDATA%\Android\Sdk\emulator\emulator.exe" -avd Pixel_7

How to stop the emulator:
adb -s emulator-5554 emu kill

Notes about this repo
- Session artifacts and logs were stored in the Copilot session-state directory and are not included here by default. If you want those copied in, request which specific files to add.

Co-authored-by: Copilot App <223556219+Copilot@users.noreply.github.com>
