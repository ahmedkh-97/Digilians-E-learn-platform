# Local Testing

Requires Node.js 20+.

## Fastest way
Double-click `START-LOCAL.bat`. It runs the quick safety check first and refuses to start localhost if a gate fails.

## Before approving a new ZIP
Double-click `FULL-QA.bat`. All automated tests must pass.

## Full acceptance flow
Double-click `TEST-LOCAL.bat`. It runs full pre-deploy QA first; only on PASS does it start the local server and open the browser.

Default local address: `http://127.0.0.1:4173/`.
