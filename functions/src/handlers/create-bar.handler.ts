import { auth, firestore } from 'firebase-admin';
import { CallableRequest, HttpsError } from 'firebase-functions/https';

const db = firestore();

export const createBarHandler = async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'USER_NOT_AUTHENTICATED');
  }

  const { name } = request.data;

  if (!name) {
    throw new HttpsError('invalid-argument', 'BAR_NAME_REQUIRED');
  }

  try {
    const barRef = db.collection('bars').doc();
    const barId = barRef.id;
    const secureRef = db.collection('sys_secure').doc(barId);
    const batch = db.batch();

    batch.set(barRef, {
      id: barId,
      info: {
        name,
        ownerUid: request.auth.uid,
        createdAt: firestore.FieldValue.serverTimestamp(),
      },
      menu: {
        categories: [],
      },
      staffList: [],
    });

    batch.set(secureRef, {
      barId,
      ownerUid: request.auth.uid,
      pins: {},
      createdAt: firestore.FieldValue.serverTimestamp(),
    });

    await auth().setCustomUserClaims(request.auth.uid, {
      barId,
      role: 'owner',
    });

    await batch.commit();

    return { success: true, barId };
  } catch (error) {
    throw new HttpsError('internal', 'ERROR_CREATING_BAR');
  }
};
