# Calorie Log Agent Instructions

These instructions apply only to this `calorie-log` repository.

## Scope

- Work only inside the currently opened `calorie-log` repository.
- Do not access or modify Project_ORION or any other repository/folder.
- Treat files under `work/`, `outputs/`, `.git/`, caches, and temporary folders as non-product artifacts unless a user explicitly asks for them.
- Keep GitHub Pages compatibility for a static site served from a repository subpath.

## Cost And Service Constraints

- Do not introduce external paid APIs, paid databases, paid hosting, metered services, or API keys.
- Maintain zero additional running cost.
- Prefer device-local storage and static assets.
- If a requested feature appears to require a paid service, stop before implementation, propose free alternatives, and record the finding in `HANDOFF.md`.

## Standard Development Flow

For normal development requests, proceed autonomously through:

1. Confirm the current repository state and relevant files.
2. Implement the smallest safe change that satisfies the request.
3. Run automated tests.
4. Investigate any failure.
5. Fix defects inside this repository only.
6. Re-run tests until passing or genuinely blocked.
7. Update `HANDOFF.md` and `CHANGELOG.md`.
8. Create a meaningful git commit.

Do not pause for routine UI, implementation, refactoring, or test decisions when a reasonable safe choice is available.

## Testing Expectations

Use the repository's existing test command when available:

```powershell
node tests/core.test.js
```

If system `node` is not available, use the Codex bundled Node executable.

Minimum checks for relevant changes:

- First launch state
- Meal add/delete
- Quantity change
- kcal recalculation
- P/F/C recalculation
- Date change
- Weight save
- Backup/restore
- Mobile layout
- `manifest.webmanifest`
- `sw.js`
- GitHub Pages subpath behavior

Localhost testing is normal work for this project. Use an available localhost port for the current repository only. If `http://127.0.0.1:8080/` is not serving this repository, use a dedicated temporary port and note that in `HANDOFF.md`.

## Git And GitHub

- Commit completed, tested changes with a clear message.
- Push to GitHub `main` only when:
  - the remote is clearly the `calorie-log` repository,
  - local tests pass,
  - the working tree is clean except intended changes,
  - authentication works without unsafe workarounds.
- Stop before push if authentication fails, Git behaves unexpectedly, or the remote points anywhere other than `calorie-log`.
- Never force-push unless the user explicitly asks and the risk has been explained.
- Do not commit or push changes belonging to other repositories.

## GitHub Pages Verification

After a successful push, verify the public GitHub Pages URL:

```text
https://kazyt0430-sys.github.io/calorie-log/
```

Run a smoke test on the public version:

- Page loads
- Food search
- Meal add
- Quantity change updates kcal/PFC
- Meal delete
- Date switch
- Settings screen
- Analysis screen
- Backup action
- Manifest and Service Worker assets
- No browser console errors

If the public version fails because of the new change, fix it within this repository, re-test locally, commit, push, and re-check Pages.

## Documentation

Keep these files current:

- `HANDOFF.md`: current state, completed work, unfinished work, issues found, next work, test results, commit/push/Pages status.
- `CHANGELOG.md`: user-facing implementation history.
- `ROADMAP.md`: planned v1.x and future work.

When stopping, leave the next agent able to answer:

- What changed?
- What passed?
- What failed or remains blocked?
- What commit is current?
- Was GitHub Pages updated and verified?
