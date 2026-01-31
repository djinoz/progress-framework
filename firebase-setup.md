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
    match /frameworks/{frameworkId} {
      // Anyone can read a framework (for shared links)
      allow read: if true;
      
      // Only the authenticated owner can write to it
      allow write: if request.auth != null && (
        (resource == null && request.resource.data.ownerId == request.auth.uid) ||
        (resource != null && resource.data.ownerId == request.auth.uid)
      );
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

### Multi-user Features:
- **Collections**: Maintain multiple named frameworks. Use the bubbles below the title to switch or create new ones.
- **Sharing**: Use the "Share" icon to copy a unique URL. Anyone with the link can view your progress.
- **Forking**: Found a framework you like? Click **Fork** while viewing a shared link to save a personal copy.
- **Persistence**: Any edits made while logged out are saved locally and can be "Synced to Cloud" as a new framework after login.
