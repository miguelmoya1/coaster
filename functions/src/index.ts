import { setGlobalOptions } from 'firebase-functions';
import { onCall } from 'firebase-functions/https';
import { createBarHandler } from './handlers/create-bar.handler';
import { createStaffHandler } from './handlers/create-staff.handler';
import { initializeApp } from 'firebase-admin';
import { validateStaffHandler } from './handlers/validate-staff.handler';

initializeApp();

setGlobalOptions({ maxInstances: 10 });

export const createBar = onCall(createBarHandler);
export const createStaff = onCall(createStaffHandler);
export const validateStaff = onCall(validateStaffHandler);
