/**
 * Test-only resolver hook.
 *
 * The app uses Next's bundler module resolution, so imports are written the way
 * the bundler accepts them: relative specifiers carry no file extension, and
 * `@/` maps to `src/` (tsconfig `paths`). Node's ESM resolver does neither.
 * Rather than litter the source with `.ts` extensions and relative ladders for
 * the benefit of the test runner, this hook rewrites the alias and retries a
 * failed specifier with the extensions a bundler would have tried.
 */
import { pathToFileURL } from "node:url";
import path from "node:path";

const SRC = pathToFileURL(path.join(process.cwd(), "src") + "/").href;
const EXTENSIONS = [".ts", ".tsx", "/index.ts", "/index.tsx", ".js"];

export async function resolve(specifier, context, nextResolve) {
  // `@/foo` -> <cwd>/src/foo, matching tsconfig paths. Done before the first
  // attempt because Node would otherwise read it as a bare package name and
  // fail with a confusing "cannot find package '@/features'".
  const resolved = specifier.startsWith("@/") ? SRC + specifier.slice(2) : specifier;

  try {
    return await nextResolve(resolved, context);
  } catch (err) {
    if (!resolved.startsWith(".") && !resolved.startsWith(SRC)) throw err;
    for (const ext of EXTENSIONS) {
      try {
        return await nextResolve(resolved + ext, context);
      } catch {
        // try the next candidate
      }
    }
    throw err;
  }
}
