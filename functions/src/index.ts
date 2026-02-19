import { setGlobalOptions } from 'firebase-functions';
import { onCall } from 'firebase-functions/https';
import { initializeApp } from 'firebase-admin';

initializeApp();
setGlobalOptions({ maxInstances: 10 });

import { createBarHandler } from './handlers/create-bar.handler';
import { createStaffHandler } from './handlers/create-staff.handler';
import { validateStaffHandler } from './handlers/validate-staff.handler';
import { changeStaffPinHandler } from './handlers/change-staff-pin.handler';

export const createBar = onCall(createBarHandler);
export const createStaff = onCall(createStaffHandler);
export const validateStaff = onCall(validateStaffHandler);
export const changeStaffPin = onCall(changeStaffPinHandler);
