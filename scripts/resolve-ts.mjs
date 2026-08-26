/**
 * Test-only resolver hook.
 *
 * The app uses Next's bundler module resolution, so relative imports are
 * written without a file extension. Node's ESM resolver requires one. Rather
 * than litter the source with `.ts` extensions for the benefit of the test
 * runner, this hook retries a failed relative specifier with the extensions a
 * bundler would have tried.
 */
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (!specifier.startsWith(".")) throw err;
    for (const ext of [".ts", ".tsx", "/index.ts", ".js"]) {
      try {
        return await nextResolve(specifier + ext, context);
      } catch {
        // try the next candidate
      }
    }
    throw err;
  }
}
