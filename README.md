# Photo Filter

Ionic camera app with face filters and a PHP photo backend.

## Install on Android using a QR code

After the first successful workflow run, the latest download is available here:

[![Scan to download Photo Filter](https://github.com/aaronmarayaa/Photo-Filter/releases/latest/download/install-qr.png)](https://github.com/aaronmarayaa/Photo-Filter/releases/latest/download/photo-filter.apk)

[Download the Android APK](https://github.com/aaronmarayaa/Photo-Filter/releases/latest/download/photo-filter.apk) · [View releases](https://github.com/aaronmarayaa/Photo-Filter/releases)

1. Scan the QR code with your Android phone's camera.
2. Open the downloaded `photo-filter.apk`. Allow your browser to install apps when Android asks.
3. Open **Photo Filter** and allow camera access.

Android 7 or newer is required. For a private repository, sign in to GitHub in your phone's browser with an account that can access the repository before downloading. In the Android app, **Save photo** opens the system file picker. Choose a folder, such as Downloads, and tap **Save** to keep the PNG on your phone.

## Set up the GitHub workflow

The workflow is [Android APK and QR code](.github/workflows/android-download.yml). It runs on pushes to `master` or `main`, and can also be run from the repository's **Actions** tab.

1. Make the PHP backend available at an HTTPS address that your phone can reach. Include the full API path, for example `https://your-backend.example/photo-filter-backend/api`.
2. To preconfigure the APK, set the GitHub Actions variable `PHOTO_FILTER_API_URL` to that address. The workflow also accepts a secret of the same name. If both are empty, the APK asks for the backend address before the first login and remembers it on the phone. Use **Change backend address** on the login screen to edit it.
3. Commit and push this project to GitHub. Open **Actions → Android APK and QR code** and wait for the run to finish. To start another build, choose **Run workflow**. The optional `api_url` input overrides the saved variable or secret for that build.
4. Open the run's **Summary** or the new **Release** to see its QR code. Each release contains the APK, QR image, and APK SHA-256 checksum. The README QR code above always points to the latest successful release.

The workflow installs Node.js 24, Java 21, and Android SDK 36, checks lint and unit tests, builds the app, and publishes the download. No personal GitHub token or signing secrets are required. The workflow requests `contents: write` to publish releases; repository or organization policies must allow that permission.

The PHP backend and database are separate from the APK. `localhost` and `127.0.0.1` on a phone refer to the phone itself. The current XAMPP backend uses Apache `Require local`, so direct access from a phone is blocked until backend hosting/access is configured. A locally running HTTPS tunnel can also provide a reachable address while testing; it and XAMPP must stay running. API authentication and images use Capacitor's native HTTP transport, so the web app's development proxy is not needed in Android.

These are debug-signed test builds. `android/app/debug.keystore` is an intentionally public development key so subsequent builds can update the installed app. Use a private release signing key and a release build before distributing through an app store. The generated Capacitor launcher icon is a placeholder.

## Local development

```powershell
npm ci
npm start
```

The development server proxies `/photo-filter-backend/api` to local XAMPP.

To prepare Android locally, install [Capacitor's Android prerequisites](https://capacitorjs.com/docs/getting-started/environment-setup), then run:

```powershell
npm run build:android
npm run android:open
```

`build:android` generates the ignored `src/environments/environment.android.ts` file, builds production web assets, and syncs them into the Android project. Browser builds continue using the local API path.
