## Plan: Resume Release and Guard Dirty Worktrees

Finish the interrupted v1.5.2 release first from the post-PR checkpoint, then harden the release script with an explicit resume mode and a reusable auto-stash guard around Git-sensitive regions. Recommended approach: keep the current skip flags for backward compatibility, add `--resume-from` as the preferred interface, and wrap the entire Step 9 branch-sync region in one stash/apply lifecycle so local edits are only restored after the script is back on `dev`.

**Steps**
1. Phase 1 — Operational recovery for the current v1.5.2 release.
   Verify the checkpoint before changing code: local branch should still be `dev`, `package.json` is already `1.5.2`, `CHANGELOG.md` already contains the `1.5.2` entry, `origin/main` already has `1.5.2`, and tag `v1.5.2` does not exist yet.
2. Resume the interrupted release with the current script from the post-PR checkpoint using the existing flow: `python docs/scripts/release.py --version 1.5.2 --skip-commit --skip-changelog --skip-pull-request`. Note that the current script will still prompt because the package version already matches.
3. If the worktree is still dirty before Step 9, use a one-off manual safeguard for this run: create a named stash such as `git stash push -u -m "shipit-release-manual-resume-v1.5.2"`, rerun the command above, and only reapply after the tag/sync region completes. This is an operational workaround, not the final fix.
4. Phase 2 — CLI and flow hardening in `docs/scripts/release.py`.
   Add an explicit `--resume-from` argument with checkpoint names instead of raw step numbers. Recommended checkpoints: `tag`, `draft`, `workflow`, `publish`.
5. Normalize CLI state in one place so `--resume-from` is mutually exclusive with `--skip-commit`, `--skip-changelog`, and `--skip-pull-request`, while those older flags remain supported for manual/legacy usage.
6. Refactor `main()` to dispatch from the selected checkpoint instead of always walking Steps 2-13. `--resume-from tag` should start with `verify_release_on_main()` and then run current Steps 9-13 without re-entering bump/changelog logic.
7. Phase 3 — Reusable worktree-protection guard.
   Introduce a helper that inspects the worktree with `git status --porcelain` and summarizes staged, unstaged, and untracked files.
8. Add a guarded Git-region helper that prints a prominent red warning banner, uses ANSI blink when supported and repeated red banners as fallback on terminals that do not support blink, creates a named stash with `git stash push -u -m "shipit-release-safeguard-<timestamp>-<reason>"`, records recovery metadata (stash ref/name, timestamp, branch, affected files, restore commands) in a temp file, and echoes that recovery path to the console.
9. Keep ignored files out of the safeguard by using `-u`, not `-a`, so build output and caches are not accidentally stashed.
10. If `git stash apply` fails, abort with the stash still intact, print the exact manual recovery commands, and do not attempt automatic conflict resolution.
11. Phase 4 — Integrate the guard at the correct boundary.
   Wrap the entire Step 9 sync region in one guarded lifecycle: checkout `main`, pull `origin/main`, create/push the tag, checkout `dev`, merge `main`, push `origin/dev`, then restore the stash. Do not stash/apply around each individual checkout, because restoring too early would put the dirty worktree back on the wrong branch.
12. Keep `verify_release_on_main()` read-only and outside the guarded region for now, but structure the helper so future branch-switch or worktree-mutating Git flows can reuse it.
13. Preserve current idempotent behavior: existing local tag, existing remote tag, existing release, and dry-run mode should all avoid creating/restoring a stash unless the guarded region is actually entered.
14. Phase 5 — Documentation.
   Update `docs/scripts/RELEASE_GUIDE.md` to document the new resume flow and correct the current mismatch between the guide and the actual 13-step script.
15. Update `docs/scripts/RELEASE_TROUBLESHOOTING.md` with the concrete dirty-worktree failure (`git checkout main` blocked by local changes), the temporary manual workaround, and the automatic safeguard behavior.
16. Document the warning semantics clearly: once the safeguard banner appears, the operator should not edit/save files until the guarded region finishes because the script will restore the saved worktree at the end.
17. Phase 6 — Verification.
   Syntax-check with `python -m py_compile docs/scripts/release.py`.
18. Exercise `python docs/scripts/release.py --help` and `python docs/scripts/release.py --dry-run --resume-from tag --version 1.5.2` to confirm CLI behavior and checkpoint dispatch.
19. Reproduce the original failure safely with disposable tracked and untracked edits, then confirm the warning banner, named stash creation, recovery file logging, and final `git stash apply` behavior.
20. Force a restore conflict in a disposable scenario and confirm the script stops safely with the stash preserved and manual commands printed.
21. Re-read the release docs after edits so the checkpoint names, help text, and operator steps all match the implementation.

**Relevant files**
- `d:/Programacao/Electron/ship-it/docs/scripts/release.py` — add `--resume-from`, centralize checkpoint dispatch in `main()`, and implement the reusable stash/recovery guard around `create_and_push_tag()`.
- `d:/Programacao/Electron/ship-it/docs/scripts/RELEASE_GUIDE.md` — update the documented resume path, step table, and operator guidance.
- `d:/Programacao/Electron/ship-it/docs/scripts/RELEASE_TROUBLESHOOTING.md` — add the dirty-worktree failure and recovery guidance.
- `d:/Programacao/Electron/ship-it/package.json` — read-only verification anchor; current version is already `1.5.2`, so the interrupted release should resume from the post-PR/tag checkpoint rather than rebumping.
- `d:/Programacao/Electron/ship-it/CHANGELOG.md` — read-only verification anchor; the `1.5.2` entry already exists, so the current release should not regenerate changelog content.

**Verification**
1. Confirm `package.json` and `CHANGELOG.md` already reflect `1.5.2`, `origin/main` already contains that version, and `v1.5.2` is absent before resuming the current release.
2. Finish the current pending release once using the existing skip-flag flow before relying on the new CLI.
3. After implementation, run `python docs/scripts/release.py --help` and verify the new `--resume-from` help text is unambiguous and mutually exclusive behavior is enforced.
4. Run `python docs/scripts/release.py --dry-run --resume-from tag --version 1.5.2` on a clean tree.
5. Run the same dry-run with disposable local tracked and untracked edits and confirm the stash warning / restore flow.
6. Manually inspect the GitHub release state after a real resume: draft exists, workflow completes, all expected assets are present, then publish.

**Decisions**
- Use a named checkpoint CLI (`--resume-from`) instead of numeric step identifiers.
- Keep legacy skip flags for backward compatibility, but make them secondary to the explicit resume flow.
- Generalize the stash safeguard so future Git-sensitive regions can reuse it, but only Step 9 needs integration in this change set.
- Stash staged, unstaged, and untracked files only; ignored files stay untouched.
- On restore conflict, stop and preserve the stash for manual recovery instead of trying to auto-merge.

**Further Considerations**
1. Prefer checkpoint names like `tag`, `draft`, `workflow`, and `publish` over raw numbers such as `step9`; they remain stable if the script gains or reorders steps later.
2. The current guide overstates resumability by simple re-execution; the doc update should explicitly show the checkpoint-based resume flow and the remaining manual fallback for pre-fix releases.
