# Digilians E-Learn — Pre-Deploy Checklist

1. Run `tools/windows/QUICK-CHECK.bat` for a fast package sanity check.
2. Run `tools/windows/FULL-QA.bat` before accepting a new ZIP.
3. Run `tools/windows/START-LOCAL.bat` for a safe localhost start; the server only starts after Quick Check passes.
4. For final manual acceptance, run `tools/windows/TEST-LOCAL.bat`: full pre-deploy first, then localhost.
5. Confirm the changed flow in Light/Dark and desktop/mobile where relevant.
6. Confirm protected Question Banks, Official QBank, Exams, Ranking and learner-state data were not unintentionally changed.
