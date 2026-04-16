# Plan ShipIt! 


## Issues Found

| Issue | Location | Root Cause |
| ----- | -------- | ---------- |
| No uninstall data cleanup | No NSIS custom script | Standard uninstaller leaves `%APPDATA%\shipit` intact silently |