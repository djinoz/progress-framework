# Firebase Setup Guide (Multi-user)

Follow these steps to configure Firebase for the multi-user Progress Framework:

## 1. Firebase Project & Config
1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Register a **Web App** and copy the `firebaseConfig`.
3.  Update `src/firebase.js` (and `src/services/auth.js`) with your config.

## 2. Enable Authentication (Email Link)
The framework uses passwordless sign-in for a seamless experience:
1.  In the Firebase Console, go to **Authentication** > **Sign-in method**.
2.  Add **Email/Password** provider.
3.  **Enable** the **Email link (passwordless sign-in)** toggle.
4.  Click **Save**.

## 3. Enable Firestore & Update Rules
1.  Go to **Firestore Database** and click **Create Database**.
2.  Navigate to the **Rules** tab and paste these multi-user rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /frameworks/{userId} {
      // Users can only write their own data
      allow write: if request.auth != null && request.auth.uid == userId;
      
      // Users can see their own data, or any data (for sharing)
      // Note: You can further restrict this by adding an 'isPublic' flag
      allow read: if request.auth != null; 
    }
  }
}
```
3.  Click **Publish**.

## 4. Deploying to Hosting
Run the following command to go live:
```bash
npm run deploy
```

---

### Features for Admins:
- **Share**: Use the "Share" icon in the top right to get a view-only link for your framework.
- **Reset**: Use the "Reset" icon to restore your cloud data to the `initial-data.json` baseline.
- **Persistence**: Edits made while logged out are saved locally and can be synced after login!
