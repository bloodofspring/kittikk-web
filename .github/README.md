# CI/CD Workflows

ToDo: Updated contents
This project uses GitHub Actions for continuous integration, continuous deployment, and automated releases.

## Workflows

### PR Checks (`pr-checks.yml`)

This workflow runs when:
- A pull request is opened, synchronized, or reopened targeting the `master` or `main` branch
- Code is pushed to any branch other than `master` or `main`

It performs the following checks:
- Installs dependencies with Yarn
- Runs linters
- Type checks the codebase
- (Optionally) builds the application and runs tests (uncomment in workflow if needed)

### Release (`release.yml`)

This workflow runs when code is pushed to the `main` or `master` branch.

It performs:
- Installs dependencies with Yarn
- Runs [semantic-release](https://semantic-release.gitbook.io/semantic-release/) to automatically determine the next version, generate release notes, update the changelog, and publish a GitHub release
- Updates `package.json` and `CHANGELOG.md` in the repository

**Required secrets:**
- `GITHUB_TOKEN`: Provided by GitHub Actions automatically (no manual setup required)

### Deploy (`deploy.yml`)

This workflow runs when code is pushed to the `main` or `master` branch (e.g., when a PR is merged).

It performs:
1. Notifies about deploy start in Telegram
2. Runs semantic-release to generate a GitHub release
3. Builds a Docker image using the production Dockerfile
4. Pushes the image to Docker Hub
5. Deploys the application to a VPS using SSH
6. Notifies about deploy result in Telegram

**Required secrets:**
- `DOCKERHUB_USERNAME`: Your Docker Hub username
- `DOCKERHUB_PASSWORD`: Your Docker Hub password or access token
- `VPS_HOST`: The hostname or IP address of your VPS
- `VPS_USERNAME`: SSH username for your VPS
- `VPS_SSH_KEY`: SSH private key for accessing your VPS
- `VPS_PROJECT_PATH`: Path on the VPS where the project files are located
- `VPS_PORT_KNOCK`: (Optional) Space-separated list of ports for port-knocking (can be empty)
- `TELEGRAM_TO`: Telegram chat ID for notifications
- `TELEGRAM_TOKEN`: Telegram bot token

## Local Setup

To test the workflows locally before pushing to GitHub, you can use [act](https://github.com/nektos/act). 
