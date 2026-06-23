# gh-self-runner

Quickly provision a self-hosted GitHub Actions runner on your local development machine.

## Usage

```bash
npx gh-self-runner <token> [repo-url]
```

### Arguments

| Argument  | Description                                                                 |
|-----------|-----------------------------------------------------------------------------|
| `token`   | GitHub Actions runner registration token (required)                         |
| `repo-url`| Repository or organisation URL (optional – auto-detected from `git remote`) |

### Examples

```bash
# Auto-detect repo URL from the current git remote
npx gh-self-runner AABBCC1234567890

# Provide the repo URL explicitly
npx gh-self-runner AABBCC1234567890 https://github.com/my-org/my-repo
```

> **How to get a registration token:**  
> Go to your repository → *Settings* → *Actions* → *Runners* → *New self-hosted runner*, then copy the token shown in the configuration step.

---

## GitHub Copilot Instructions

Create a new Node.js CLI tool project designed to quickly provision a self-hosted GitHub Actions runner on a local development machine. The tool should be executable via `npx`.

### Project Requirements:
1. Architecture & Entrypoint:
   - Use modern ES Modules (import/export).
   - Set up `bin/index.js` as the executable entrypoint.
   - Use standard Node.js built-ins (`os`, `fs`, `path`, `child_process`, `https`) to keep external dependencies to zero.
   - Accepts two positional CLI arguments:
     1. `token` – the GitHub Actions runner registration token (required).
     2. `repo-url` – the repository or organisation URL (optional; auto-detect from `git remote get-url origin` if omitted).
