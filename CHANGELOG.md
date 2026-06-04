# plugin-claude-code

## 1.0.4

### Patch Changes

- 9f7cdd6: fix: correct release workflow trigger condition to detect Version Packages PR merge

## 1.0.3

### Patch Changes

- 7fe3994: fix: replace changeset publish with gh release create for private package releases

## 1.0.2

### Patch Changes

- 9b72492: ### Fixed
  - Release workflow now correctly creates git tags and GitHub releases for
    private packages (replaced `changeset publish` with `changeset tag`)

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
