import { SetMetadata } from '@nestjs/common';

export const ADMIN_KEY = 'admin_role';
export const Admin = () => SetMetadata(ADMIN_KEY, true);
