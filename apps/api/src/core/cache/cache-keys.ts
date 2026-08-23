export const CacheKeys = {
  userRole: (userId: string) => `user:${userId}:role`,
  userByFirebaseUid: (firebaseUid: string) => `user:firebase:${firebaseUid}`,
  membership: (establishmentId: string, userId: string) => `establishment:${establishmentId}:member:${userId}`,
  modules: (establishmentId: string) => `establishment:${establishmentId}:modules`,
  subscription: (establishmentId: string) => `establishment:${establishmentId}:subscription`,
} as const;

export const CACHE_TTL_SECONDS = 8 * 60 * 60;
