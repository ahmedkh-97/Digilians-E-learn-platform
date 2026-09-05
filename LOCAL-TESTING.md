# Local Testing

Ordinary localhost testing with `START-LOCAL.bat` does not require Node.js on Windows.

## Fastest way
Double-click `START-LOCAL.bat`.

- `START-LOCAL.bat` does not depend on Node.js, even if Node is installed.
- It runs the Windows PowerShell basic compatibility check, then starts a loopback-only PowerShell local server on `127.0.0.1`.
- It tries port `4173` first; if that port is already in use, it automatically tries the next available port and prints the exact address.
- If startup fails, the command window stays open so the error can be read instead of disappearing.
- The Windows basic check protects required runtime files, the version marker, and JSON readability. It does not replace JavaScript syntax or regression testing.

Preferred local address: `http://127.0.0.1:4173/`; the actual port may be higher when 4173 is busy.

## Full QA before approving a release
Full QA requires Node.js 20+ because the regression suite and JavaScript syntax gates use Node's test/runtime tooling.

Double-click `FULL-QA.bat` to run the complete pre-deploy suite without starting localhost.

## Full acceptance flow
With Node.js 20+ installed, double-click `TEST-LOCAL.bat`. It runs Full QA first; only on PASS does it start localhost and open the browser.

`RUN-PREFLIGHT.bat` is also developer-only and requires Node.js 20+.
