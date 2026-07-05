# Google OAuth Setup Guide for Absenlah

To enable Google Authentication in the Absenlah application, you need to configure a project in the Google Cloud Console and obtain a Web Client ID.

## 1. Create a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named "Absenlah".

## 2. Configure OAuth Consent Screen
1. Navigate to **APIs & Services > OAuth consent screen**.
2. Choose **External** (unless you have a Google Workspace organization).
3. Fill in the required app information (App name: Absenlah, User support email, etc.).
4. Add the `.../auth/userinfo.email` and `.../auth/userinfo.profile` scopes.
5. Add your own email as a test user if you are in "Testing" mode.

## 3. Create OAuth 2.0 Client IDs

### A. Web Client ID (Required for Backend & Login Configuration)
1. Navigate to **APIs & Services > Credentials**.
2. Click **Create Credentials > OAuth client ID**.
3. Select **Web application**.
4. Name: "Absenlah Web Client".
5. **Authorized JavaScript origins**: Add `https://your-domain.com` (your public domain).
6. **Authorized redirect URIs**: Add `https://your-domain.com/auth/google-login`.
7. Click **Create**.
8. Copy the **Client ID**. This is your `GOOGLE_CLIENT_ID` for the `setup_absenlah.sh` script.

### B. Android Client ID (Required for React Native App)
1. Click **Create Credentials > OAuth client ID**.
2. Select **Android**.
3. Name: "Absenlah Android Client".
4. **Package name**: Use `com.absenlah.app` (as defined in `app.json`).
5. **SHA-1 certificate fingerprint**:
   - If using **EAS Build**:
     1. Run `eas credentials -p android`.
     2. Select the `production` profile.
     3. Copy the `SHA1` fingerprint from the build credentials.
   - If building **locally**:
     1. Run `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`.
     2. Copy the `SHA1` fingerprint.
6. Click **Create**.

## 4. Troubleshooting `developer_error`
If you see `developer_error` in the mobile app:
- Ensure the `webClientId` used in `GoogleSignin.configure` matches the **Web Client ID** (not the Android Client ID).
- Ensure you have created the **Android Client ID** with the correct **Package Name** and **SHA-1** fingerprint.
- Ensure you have added your email as a **Test User** in the OAuth Consent Screen if the app is still in "Testing" status.
- Wait a few minutes after configuration, as Google sometimes takes time to propagate changes.

## 5. Setup Script
When running `setup_absenlah.sh`, provide the **Web Client ID** when prompted for `GOOGLE_CLIENT_ID`.
