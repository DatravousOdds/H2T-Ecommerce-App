---
name: create-review-pr
description: Open a GitHub pull request so a commit or branch in the Hexxo repo can be reviewed before it reaches master. Use this whenever the user asks to "create a PR", "open a pull request", "put this up for review", "push this branch for review", or wants a reviewable link for a commit they just made, even if they only name a commit hash or branch and never say "PR". Handles branch setup, a secret scan, the PR description, an explicit approval gate before anything is pushed, and opening the PR with gh or a prefilled GitHub link.
---

# Create a Review PR

Turn a local commit or branch into a **draft** pull request against the default branch. The PR is where the user reviews the change before merging, so its description should help them understand the change, not just list files.

Nothing leaves the machine until the user explicitly approves. Pushing to GitHub is outward-facing and hard to take back, and the project's CLAUDE.md says not to push without explicit approval. Approving a commit is not approving a push.

## 1. Work out what to put up for review

- **Target:** the commit hash or branch the user named. If they named nothing, use the current branch's HEAD and say which one you picked.
- **Remote:** don't assume a name. `git remote` can list several (this repo has `origin` and `H2T-Ecommerce-App`, both pointing at the same GitHub repo). Pick in this order: the remote the target branch already tracks, then the remote the base branch tracks (`git rev-parse --abbrev-ref <base>@{upstream}` → `origin/master` means `origin`). Ask only if remotes point at *different* repos and neither rule decides.
- **Base branch:** `git symbolic-ref --short refs/remotes/<remote>/HEAD` returns `<remote>/master`; strip the `<remote>/` prefix to get the branch name. Fall back to `master` if the command fails.
- **The target must be on its own branch.** A PR compares two branches, so a commit sitting on master has nothing to compare against. If the target is on the base branch, propose creating a branch at that commit (e.g. `git branch <descriptive-name> <sha>`) and ask before doing it. Point out that local master would still be ahead of the remote, and ask whether to reset it. Never reset without a yes.

## 2. Gather what the PR needs

```bash
git log --oneline <remote>/<base>..<branch>        # commits in the PR
git diff --stat <remote>/<base>...<branch>         # size of the change
git diff <remote>/<base>...<branch>                # read it; the description depends on it
```

Run `git fetch <remote> <base>` first so the comparison isn't against a stale base. If the branch includes commits the user didn't mention, list them and confirm they belong in this PR.

## 3. Scan for secrets before anything else

This project uses live Stripe and Firebase keys. A key pushed to GitHub has to be rotated, even if it's deleted a minute later. Check the diff for:

- `.env`, service-account JSON, or `*.pem` files being added
- patterns like `sk_live_`, `rk_live_`, `whsec_`, `AIza`, `"private_key"`, `-----BEGIN`

Use `git diff ... | grep -nE '<patterns>'` and report **only the file and line number** of a match, never the matched value. If anything turns up, stop and tell the user; don't continue to the push.

## 4. Write the title and description

**Title:** under 70 characters, imperative, saying what the change does ("Honor Global Privacy Control by skipping Google Analytics").

**Body:** use this structure. The user is learning the codebase, so explain the reasoning in Why and Review focus.

```markdown
## Summary
One or two sentences: what changes for users or the system.

## Why
The problem or requirement behind it, and why this approach over the obvious alternative.

## Changes
- Grouped by area, not one bullet per file. Describe repeated edits once ("35 pages: inline gtag snippet → one module script").

## How it was tested
Only what was actually run in this session or that the user confirmed, with results.
If nothing was tested, write "Not tested yet". Never invent test results.

## Risks & rollback
What could break, who would notice, and how to undo it (usually "revert this PR").

## Review focus
The 1–3 places where a reviewer's attention matters most, and why.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Write the body to a temp file in the scratchpad (e.g. `pr-body.md`). Both `gh` and the link script read it from there.

## 5. Approval gate

Show the user, in one message:

- the branch → base, and the remote it will be pushed to
- the commits it contains (`git log --oneline`)
- the title and the full body
- the secret scan result

Then ask for explicit approval to push and open the PR. Stop and wait. If the user wants edits, revise and show it again.

## 6. Push and open the PR

After a clear yes:

```bash
git push -u <remote> <branch>
```

Then check for the GitHub CLI: `command -v gh && gh auth status`.

**gh available and logged in:**

```bash
gh pr create --draft --base <base> --head <branch> --title "<title>" --body-file <body-file>
```

**gh missing or not logged in:** build a prefilled link with the bundled script:

```bash
node .claude/skills/create-review-pr/scripts/prCompareUrl.js \
  --remote-url "$(git remote get-url <remote>)" \
  --base <base> --head <branch> --title "<title>" --body-file <body-file>
```

It prints the URL. If the body is too long to fit in a URL, it prints the link without the body and says so. In that case run `pbcopy < <body-file>` so the user can paste it in. Tell the user to open the link, choose **Create draft pull request** from the button's dropdown (a link can't preselect draft), and click it. Mention once that `brew install gh` followed by `! gh auth login` lets future PRs open in one step.

## 7. Report

Give the PR URL (or the link and what to click), the branch, and the base. Stop there. Don't merge, mark it ready for review, or delete branches unless the user asks; those are their review decisions.
