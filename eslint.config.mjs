import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Vendor files are distributed builds; app lint rules apply to our source.
  globalIgnores(['.next/**', 'out/**', 'node_modules/**', 'scripts/**', 'docs/**', 'public/vendor/**']),
]);
