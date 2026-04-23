export const resolveProfileImage = (photoUrl: string | null | undefined, name: string): string =>
  photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0F172A&color=fff`;
