import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-expect-error
globalThis['__dirname'] = path.dirname(fileURLToPath(import.meta.url));

import * as runtime from '@prisma/client/runtime/client';
import * as $Class from './internal/class.js';
import * as Prisma from './internal/prismaNamespace.js';

export * from './enums.js';
export * as $Enums from './enums.js';
export { Prisma };
/**
 * ## Prisma Client
 *
 * Type-safe database client for TypeScript
 * @example
 * ```
 * const prisma = new PrismaClient({
 *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
 * })
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 * Read more in our [docs](https://pris.ly/d/client).
 */
export const PrismaClient = $Class.getPrismaClientClass();
export type PrismaClient<
  LogOpts extends Prisma.LogLevel = never,
  OmitOpts extends Prisma.PrismaClientOptions['omit'] = Prisma.PrismaClientOptions['omit'],
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = $Class.PrismaClient<LogOpts, OmitOpts, ExtArgs>;

/**
 * Model User
 *
 */
export type User = Prisma.UserModel;
/**
 * Model Bar
 *
 */
export type Bar = Prisma.BarModel;
/**
 * Model BarMember
 *
 */
export type BarMember = Prisma.BarMemberModel;
/**
 * Model Shift
 *
 */
export type Shift = Prisma.ShiftModel;
/**
 * Model ShiftExchange
 *
 */
export type ShiftExchange = Prisma.ShiftExchangeModel;
/**
 * Model Category
 *
 */
export type Category = Prisma.CategoryModel;
/**
 * Model Product
 *
 */
export type Product = Prisma.ProductModel;
/**
 * Model CategoryTemplate
 *
 */
export type CategoryTemplate = Prisma.CategoryTemplateModel;
/**
 * Model ProductTemplate
 *
 */
export type ProductTemplate = Prisma.ProductTemplateModel;
/**
 * Model Table
 *
 */
export type Table = Prisma.TableModel;
/**
 * Model Order
 *
 */
export type Order = Prisma.OrderModel;
/**
 * Model OrderItem
 *
 */
export type OrderItem = Prisma.OrderItemModel;
