import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { auth, firestore } from 'firebase-admin';
import { hashPin } from '../tools/hash-pin';

const db = firestore();

export const validateStaffHandler = async (request: CallableRequest) => {
  const { pin, barId } = request.data;
  const hashedPin = hashPin(pin);
  const secureSnap = await db.collection('sys_secure').doc(barId).get();

  if (!secureSnap.exists) {
    throw new HttpsError('not-found', 'BAR_NOT_FOUND');
  }

  const secureData = secureSnap.data();
  const staffData = secureData?.['pins']?.[hashedPin];

  if (staffData) {
    const currentUid = request.auth?.uid;

    if (currentUid) {
      await auth().setCustomUserClaims(currentUid, {
        barId: barId,
        role: 'staff',
        name: staffData.name,
        internalUid: staffData.uid,
      });
    }
    return { success: true, staff: staffData };
  } else {
    throw new HttpsError('permission-denied', 'PIN_INVALID');
  }
};
