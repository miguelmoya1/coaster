const { execSync } = require('child_process');
try {
  execSync('npx playwright test e2e/tests/bars.spec.ts --project=chromium --debug', { stdio: 'inherit' });
} catch (e) {}
