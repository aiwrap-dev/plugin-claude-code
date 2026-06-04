# plugin-claude-code

## 1.0.1

### Patch Changes

- 06223e0: ### Fixed
  - Reorganized plugin files into
    `plugin/` subdirectory for correct
    sparse-checkout behavior during
    marketplace installation
  - Restricted file permissions on
    credential and session files
    (`0o600`) and directories (`0o700`)
    to prevent unauthorized access to
    auth tokens

## 1.0.0

### Major Changes

- 5e403da: Initial release of the AIWrap Claude
