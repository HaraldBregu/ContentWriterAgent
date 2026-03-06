# CLAUDE.md

## Formatting

After each file edit, run `yarn format` to format the code with Prettier.

## File Naming Conventions

- **`.ts`** files: lowercase kebab-case (e.g., `my-component.ts`)
- **`.tsx`** files: PascalCase (e.g., `MyComponent.tsx`)
- **`.md`** files: UPPERCASE or UPPER_SNAKE_CASE (e.g., `README.md`, `GETTING_STARTED.md`)
- **`.json`** files: kebab-case, or lowercase if a single word (e.g., `tsconfig.json`, `my-config.json`)
- **Folders**: lowercase snake_case (e.g., `my_folder`, `user_settings`)

## Comments

- Only write comments that explain **why**, not **what** — the code should be self-explanatory.
- Avoid obvious, redundant, or boilerplate comments (e.g., `// constructor`, `// returns the value`).
- Do not add JSDoc or inline comments unless the logic is non-trivial or could confuse a future reader.

## Git Workflow

- Before committing, run `yarn format` to ensure all files are properly formatted.
- After each file change, stage the modified files with `git add` and create a commit describing the change.
- Commit messages should be concise and focus on the **why**, not the **what**.
- Do not batch unrelated changes into a single commit — each commit should represent one logical change.
