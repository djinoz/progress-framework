# Firebase Setup Guide

Follow these steps to set up Firebase for the Progress Framework:

## 1. Create a Firebase Project
- Go to the [Firebase Console](https://console.firebase.google.com/).
- Click **"Add project"** and follow the prompts.
- Disable Google Analytics if not needed.

## 2. Register Your Web App
- In your project overview, click the **Web icon** (`</>`) to register a new app.
- Give it a nickname (e.g., `progress-framework-dev`).
- **Copy the `firebaseConfig` object** provided in the setup instructions. You will need it for the next step.

## 3. Enable Firestore Database
- In the left sidebar, go to **Build > Firestore Database**.
- Click **"Create database"**.
- Choose a location (e.g., `us-east1`).
- Start in **Test Mode** (this allows initial access).

## 4. Set Firestore Security Rules
If you are seeing "Missing or insufficient permissions," you need to update your rules:
- Go to the **Rules** tab in the Firestore Database section.
- Paste the following rules (this allows anyone to read/write for now):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
- Click **"Publish"**.

> [!NOTE]
> Firebase will show a warning saying "Your security rules are defined as public." This is **expected** for development. We are using "Test Mode" to get things running quickly. We will secure this later with Authentication once the foundations are solid.

## 5. Add Configuration to the App
Open the file at `src/firebase.js` and replace the placeholder `firebaseConfig` with your actual configuration from step 2.

## 5. Seed Your Data (Automated)
Instead of manual entry, I have built a sync feature into the app:
- Refresh the application once your config is saved.
- The app will detect the empty cloud database and load from `initial-data.json` as a fallback.
- Click the **"Sync to Cloud"** button in the top-right corner.
- Your data will be automatically uploaded to Firestore in the correct structure!
