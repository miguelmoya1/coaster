/**
 * A utility to create branded (nominal) types in TypeScript.
 * This prevents accidental assignment of different string IDs to each other.
 *
 * Example:
 * export type ProductId = Brand<string, 'ProductId'>;
 */
declare const __brand: unique symbol;

export type Brand<K, T> = K & { readonly [__brand]: T };
