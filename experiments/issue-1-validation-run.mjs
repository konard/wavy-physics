import { runValidation } from '../src/physics/validation.js';
const results = runValidation();
for (const r of results) {
  console.log(
    `${r.pass ? 'PASS' : 'FAIL'} ${r.id.padEnd(20)} ${String(r.computed).slice(0, 14).padEnd(15)} ref ${String(r.reference).slice(0, 14).padEnd(15)} err ${r.error.toExponential(2)} tol ${r.tolerance} ${r.milliseconds}ms`
  );
}
console.log(
  'total ms',
  results.reduce((s, r) => s + r.milliseconds, 0)
);
