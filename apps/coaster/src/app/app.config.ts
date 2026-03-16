import {
  ApplicationConfig,
  isDevMode,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { getAnalytics, provideAnalytics } from '@angular/fire/analytics';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { connectAuthEmulator, getAuth, provideAuth } from '@angular/fire/auth';
import { provideRouter, withViewTransitions } from '@angular/router';
import { appRoutes } from './app.routes';

const firebaseConfig = {
  apiKey: 'AIzaSyBtGgtVUIZBfRuItAZWk1gM_t1cJ19I2Yc',
  authDomain: 'coaster-437f2.firebaseapp.com',
  projectId: 'coaster-437f2',
  storageBucket: 'coaster-437f2.firebasestorage.app',
  messagingSenderId: '774617138158',
  appId: '1:774617138158:web:5be3f0bc2147226ac684ff',
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes, withViewTransitions()),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => {
      const auth = getAuth();

      if (isDevMode()) {
        connectAuthEmulator(auth, 'http://localhost:9099');
      }

      return auth;
    }),
    provideAnalytics(() => getAnalytics()),
  ],
};
