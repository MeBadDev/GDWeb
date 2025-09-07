import admin from 'firebase-admin';

let initialized = false;
let configured = false;

export function initFirebase(config?: {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
}) {
  if (initialized) return admin;

  const projectId = config?.projectId || process.env.FIREBASE_PROJECT_ID;
  const clientEmail = config?.clientEmail || process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (config?.privateKey || process.env.FIREBASE_PRIVATE_KEY) as string | undefined;

  if (projectId && clientEmail && privateKey) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    }
    configured = true;
  } else {
    configured = false;
  }
  initialized = true;
  return admin;
}

export function isFirebaseConfigured() {
  return configured || admin.apps.length > 0;
}

export function getFirestore() {
  if (!initialized && !admin.apps.length) initFirebase();
  if (!isFirebaseConfigured()) throw new Error('FIREBASE_NOT_CONFIGURED');
  return admin.firestore();
}

export function verifyIdToken(token: string) {
  if (!initialized && !admin.apps.length) initFirebase();
  if (!isFirebaseConfigured()) throw new Error('FIREBASE_NOT_CONFIGURED');
  return admin.auth().verifyIdToken(token);
}
