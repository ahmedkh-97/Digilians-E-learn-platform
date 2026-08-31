# Digilians E-Learn — Pre-Deploy Checklist

1. Run `QUICK-CHECK.bat` for a fast package sanity check.
2. Run `FULL-QA.bat` before accepting a new ZIP.
3. Run `START-LOCAL.bat` for a safe localhost start; the server only starts after Quick Check passes.
4. For final manual acceptance, run `TEST-LOCAL.bat`: full pre-deploy first, then localhost.
5. Confirm the changed flow in Light/Dark and desktop/mobile where relevant.
6. Confirm protected Question Banks, Official QBank, Exams, Ranking and learner-state data were not unintentionally changed.
