---
"plugin-claude-code": patch
---

### Fixed
  - Reorganized plugin files into
  `plugin/` subdirectory for correct
  sparse-checkout behavior during
  marketplace installation
  - Restricted file permissions on
  credential and session files
  (`0o600`) and directories (`0o700`)
  to prevent unauthorized access to
  auth tokens
