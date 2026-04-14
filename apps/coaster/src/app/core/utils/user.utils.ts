export const prepareDefaultProfileImage = (profileImage: string | null | undefined, name: string) => {
  if (profileImage) {
    return profileImage;
  }

  return `https://ui-avatars.com/api/?name=${name}`;
};
