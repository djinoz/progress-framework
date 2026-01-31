import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase config (duplicated for standalone script utility)
const firebaseConfig = {
    apiKey: "AIzaSyD3MLfwHcta3CrjKWAuoX7UQK7D3fDoZNU",
    authDomain: "post-scarcity-framework.firebaseapp.com",
    projectId: "post-scarcity-framework",
    storageBucket: "post-scarcity-framework.firebasestorage.app",
    messagingSenderId: "691009251006",
    appId: "1:691009251006:web:93fded4957396682b020ef",
    measurementId: "G-CCX0QGN5LB"
};

async function resetDatabase() {
    console.log("🚀 Starting database reset...");

    try {
        // 1. Read initial data
        const dataPath = path.resolve(__dirname, "../public/initial-data.json");
        const rawData = fs.readFileSync(dataPath, "utf-8");
        const initialData = JSON.parse(rawData);
        console.log("📖 Read initial-data.json successfully.");

        // 2. Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        const userDocRef = doc(db, 'users', 'default-user', 'framework', 'data');

        // 3. Reset document
        console.log("⏳ Uploading to Firestore (users/default-user/framework/data)...");
        await setDoc(userDocRef, initialData);

        console.log("✅ Database reset successful!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Reset failed:", error);
        process.exit(1);
    }
}

resetDatabase();
