export interface Environment {
  production: boolean;
  useEmulators: boolean;
  defaultLanguage: string;
  defaultLanguagePath: string;
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
  apiUrl: string;
}
