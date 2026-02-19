import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { auth, firestore } from 'firebase-admin';
import { verifyPin } from '../tools/hash-pin.tool';

const db = firestore();

export const validateStaffHandler = async (request: CallableRequest) => {
  const { barId, staffUid, pin } = request.data;

  if (!barId || !staffUid || !pin) {
    throw new HttpsError('invalid-argument', 'STAFF_CREDENTIALS_REQUIRED');
  }

  const secureSnap = await db.collection('sys_secure').doc(barId).get();

  if (!secureSnap.exists) {
    throw new HttpsError('not-found', 'BAR_NOT_FOUND');
  }

  const staffRecord = secureSnap.data()?.['staffAuth']?.[staffUid];
  if (!staffRecord) {
    throw new HttpsError('permission-denied', 'STAFF_NOT_FOUND');
  }
  const isValid = verifyPin(pin, staffRecord.salt, staffRecord.hash);

  if (isValid) {
    const currentAuthUid = request.auth?.uid;
    if (currentAuthUid) {
      await auth().setCustomUserClaims(currentAuthUid, {
        barId: barId,
        role: staffRecord.role,
        name: staffRecord.name,
        internalUid: staffUid,
      });
    }
    return { success: true, staffName: staffRecord.name };
  } else {
    throw new HttpsError('permission-denied', 'PIN_INCORRECT');
  }
};
