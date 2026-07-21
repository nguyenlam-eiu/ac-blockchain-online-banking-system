---
name: test-coverage
description: Procedure for running contract unit tests and verifying that code coverage exceeds 90%
---

# Test Coverage Verification Skill

Use this skill when running tests to measure contract code coverage and optimize tests to surpass 90% coverage.

## Procedure

1. **Clean previous artifacts**:
   ```bash
   npx hardhat clean
   ```

2. **Run Solidity coverage tool**:
   ```bash
   npx hardhat coverage
   ```

3. **Analyze Coverage Output**:
   - Check percentage values for `% Stmts`, `% Branch`, `% Funcs`, `% Lines` for `VaultManager.sol` and `SavingCore.sol`.
   - Verify that all coverage categories are strictly **> 90%**.

4. **Remediate Uncovered Lines**:
   - If coverage is below 90%, inspect `coverage/index.html` or terminal logs to identify uncovered statements, branches, or revert conditions.
   - Write targeted test cases in `test/` for those edge cases and re-run `npx hardhat coverage`.
