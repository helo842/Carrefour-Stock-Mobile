import type { z } from 'zod';
import { validationError } from './errors.js';

/**
 * Parses untrusted input at the HTTP boundary. Zod issues are returned as a
 * stable machine-readable structure instead of leaking library internals.
 */
export function parseInput<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
): z.infer<TSchema> {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw validationError(
      'Los datos enviados no son válidos.',
      result.error.issues.map((issue) => ({
        field: issue.path.join('.') || '(root)',
        message: issue.message,
      })),
    );
  }

  return result.data;
}
