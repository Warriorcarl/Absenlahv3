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

## 5. Frequently Asked Questions (FAQ)

### Q: Which Client ID should I use in the `setup_absenlah.sh` script?
**A: Always use the "Web Application" Client ID.** The backend needs this ID to verify the token sent by the mobile app. The mobile app also uses this ID in its configuration to request the correct token from Google.

### Q: Why do I get `developer_error` even after following the guide?
**A:** This is almost always caused by a mismatch in the Android configuration:
1. **SHA-1 Fingerprint:** Ensure the SHA-1 in your Google Cloud Console matches the one from your build. If using Expo EAS, get it from `eas credentials`. If building locally, get it from your local keystore.
2. **Package Name:** Ensure the package name in Google Cloud Console is exactly `com.absenlah.app`.
3. **Internal vs External:** If your OAuth status is "Testing", you MUST add your email address under "Test Users" in the OAuth Consent Screen.

### Q: Do I need both Web and Android Client IDs?
**A: Yes.**
- The **Android Client ID** allows the Android app to talk to Google services.
- The **Web Client ID** is the "audience" for the identity token. Without it, the backend cannot securely verify who is logging in.

### Q: Detailed steps to resolve DEVELOPER_ERROR?
**A:** If you see `DEVELOPER_ERROR` on your phone:
1. **Match IDs:** Go to Google Cloud Console. Ensure your **Android Client ID** and **Web Client ID** are in the **SAME project**.
2. **SHA-1 Check:**
   - Open your terminal and run `eas credentials -p android`.
   - Find the "SHA1 Fingerprint" for your production build.
   - Go to Google Cloud Console -> Credentials -> Edit your Android Client ID.
   - Ensure the SHA-1 there matches EXACTLY.
3. **App ID Check:** Ensure the Package Name in the Android Client ID is `com.absenlah.app`.
4. **Web ID in Script:** Ensure the `GOOGLE_WEB_CLIENT_ID` you gave to `setup_absenlah.sh` is the **Web Application** ID, not the Android one.

## 6. Setup Script
When running `setup_absenlah.sh`, provide the **Web Client ID** when prompted for `GOOGLE_WEB_CLIENT_ID`.
