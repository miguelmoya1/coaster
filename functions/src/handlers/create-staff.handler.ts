import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { firestore } from 'firebase-admin';
import { generateStaffUid } from '../tools/generate-staff-uid.tool';
import { createSaltAndHash } from '../tools/hash-pin.tool';

const db = firestore();

export const createStaffHandler = async (request: CallableRequest<any>) => {
  if (!request.auth || request.auth.token['role'] !== 'owner') {
    throw new HttpsError('permission-denied', 'OWNER_REQUIRED');
  }

  const { name, pin } = request.data;
  const barId = request.auth.token['barId'];

  if (!name || !pin || pin.length < 4)
    throw new HttpsError('invalid-argument', 'STAFF_NAME_REQUIRED');

  const staffUid = generateStaffUid();
  const { salt, hash } = createSaltAndHash(pin);

  try {
    const batch = db.batch();

    const secureRef = db.collection('sys_secure').doc(barId);
    batch.update(secureRef, {
      [`staffAuth.${staffUid}`]: { name, role: 'staff', hash, salt },
    });

    const publicRef = db.collection('bars').doc(barId);
    batch.update(publicRef, {
      staffList: firestore.FieldValue.arrayUnion({ uid: staffUid, name }),
    });

    await batch.commit();
    return { success: true, staffUid };
  } catch (error) {
    throw new HttpsError('internal', 'ERROR_CREATING_STAFF');
  }
};
