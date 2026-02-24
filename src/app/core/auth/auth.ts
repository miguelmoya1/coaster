import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Auth as FirebaseAuth,
  GoogleAuthProvider,
  signInAnonymously,
  signInWithPopup,
  signOut,
  user,
} from '@angular/fire/auth';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  readonly #auth = inject(FirebaseAuth);

  public readonly currentUser = toSignal(user(this.#auth), { initialValue: null });

  public async loginOwner() {
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(this.#auth, provider);
  }

  public async startStaffSession() {
    return await signInAnonymously(this.#auth);
  }

  public async logout() {
    await signOut(this.#auth);
  }
}
