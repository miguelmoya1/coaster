import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { firestore } from 'firebase-admin';
import { hashPin } from '../tools/hash-pin';
import { generateStaffUid } from '../tools/generate-staff-uid';

const db = firestore();

export const createStaffHandler = async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'USER_NOT_AUTHENTICATED');
  }

  if (request.auth.token['role'] !== 'owner') {
    throw new HttpsError('unauthenticated', 'USER_NOT_AUTHENTICATED');
  }

  const { name, pin } = request.data;
  const barId = request.auth.token['barId'];

  if (!name || !pin || pin.length !== 4 || !/^[0-9]{4}$/.test(pin)) {
    throw new HttpsError('invalid-argument', 'MISSING_REQUIRED_FIELDS');
  }

  const hashedPin = hashPin(pin);
  const staffUid = generateStaffUid();

  try {
    const batch = db.batch();
    const secureRef = db.collection('sys_secure').doc(barId);

    batch.update(secureRef, {
      [`pins.${hashedPin}`]: {
        name,
        role: 'staff',
        uid: staffUid,
      },
    });

    const publicRef = db.collection('bars').doc(barId);
    batch.update(publicRef, {
      staffList: firestore.FieldValue.arrayUnion({
        uid: staffUid,
        name,
      }),
    });

    await batch.commit();

    return { success: true };
  } catch (error) {
    throw new HttpsError('internal', 'ERROR_CREATING_STAFF');
  }
};
