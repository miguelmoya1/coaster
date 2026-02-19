import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { firestore } from 'firebase-admin';
import { createSaltAndHash } from '../tools/hash-pin.tool';

const db = firestore();

export const changeStaffPinHandler = async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'USER_NOT_AUTHENTICATED');
  }

  const { targetStaffUid, newPin } = request.data;
  const token = request.auth.token;
  const barId = token['barId'];

  if (!targetStaffUid || !newPin || newPin.length < 4) {
    throw new HttpsError('invalid-argument', 'STAFF_CREDENTIALS_REQUIRED');
  }

  const isOwner = token['role'] === 'owner';
  const isSelf = token['internalUid'] === targetStaffUid;

  if (!isOwner && !isSelf) {
    throw new HttpsError('permission-denied', 'STAFF_PERMISSION_DENIED');
  }

  const secureRef = db.collection('sys_secure').doc(barId);

  try {
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(secureRef);
      const staffAuthMap = snap.data()?.['staffAuth'] || {};

      if (!staffAuthMap[targetStaffUid]) {
        throw new HttpsError('not-found', 'STAFF_NOT_FOUND');
      }

      const { salt, hash } = createSaltAndHash(newPin);

      transaction.update(secureRef, {
        [`staffAuth.${targetStaffUid}.hash`]: hash,
        [`staffAuth.${targetStaffUid}.salt`]: salt,
      });
    });

    return { success: true };
  } catch {
    throw new HttpsError('internal', 'STAFF_PIN_UPDATE_FAILED');
  }
};
