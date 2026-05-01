export const prepareDefaultProfileImage = (profileImage: string | null | undefined, name: string) => {
  if (!profileImage) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0F172A&color=fff`;
  }

  return profileImage;
};
