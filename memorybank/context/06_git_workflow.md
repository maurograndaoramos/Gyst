## 10. Git Workflow

When we take a card from Kanban, we then clone the project from Github. Then we move to the Dev branch and from there, we create a new branch. The branch should be named "feature/US<User story ID><name-of-the-feature>". Like so: feature/US1.1.1-feature-name-that-you-are-developing
We then develop.
Once we are happy with the results, we push to remote with that new branch. Use "git push -u origin feature/US<User story ID><name-of-the-feature>" to that effect.
While branches are typically named `feature/US<User story ID><name-of-the-feature>` to track overall feature development, the commit message's semantic prefix (e.g., `feat:`, `fix:`, `docs:`) must accurately describe the specific changes within that commit. For instance, if you are adding documentation related to the feature, the commit should start with `docs:`. If you are implementing a piece of the feature, it would be `feat:`. The commit scope should still generally align with the feature being developed. Keep commit messages concise.

Adapt the commit message to any of the following semantic messages that are appropriate for the commit. Try to keep things separate.
feat: (new feature for the user, not a new feature for build script)
fix: (bug fix for the user, not a fix to a build script)
docs: (changes to the documentation)
style: (formatting, missing semi colons, etc; no production code change)
refactor: (refactoring production code, eg. renaming a variable)
test: (adding missing tests, refactoring tests; no production code change)
chore: (updating grunt tasks etc; no production code change)


When the user asks for a final commit, ask them if they want the PR template filled. If so, please provide the user with the following description filled with the recent changes you made in the task.

## Description

This pull request will have a description of the feature that was introduced.

**Key Changes:**

1.  **Frontend Project Initialization (`frontend/`):**
    *   A new Next.js (v15+) project has been created in the `frontend/` directory.
    *   The project is configured with:
        *   TypeScript
        *   Tailwind CSS
        *   ESLint
        *   App Router (`app` directory)
        *   `src` directory structure
        *   Import alias `@/*`
    *   This provides the foundational structure for the frontend development team to begin implementing user stories.

2.  **Databank Update (`databank/gyst_databank.md`):**
    *   Added a new section "10. Git Workflow" to the project databank.
    *   This section details the agreed-upon process for branching, committing, and pushing changes, ensuring consistency across the team.

## How to Review/Verify

*   Navigate to the `frontend/` directory.
*   Confirm the Next.js project structure and configuration files (e.g., `package.json`, `tsconfig.json`, `tailwind.config.ts`).
*   Optionally, run `npm run dev` (or `yarn dev`) inside `frontend/` to ensure the default Next.js page loads.
*   Review the `databank/gyst_databank.md` file to confirm the new "10. Git Workflow" section is present and accurate.

## Additional Notes

This PR establishes the baseline for frontend development. Further configuration and component scaffolding will follow in subsequent PRs based on specific user stories.
