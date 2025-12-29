# bonesofspring-main

## CI/CD Pipeline

This project uses GitHub Actions for continuous integration and continuous deployment:

- **For Pull Requests**: Build, lint, and test workflows run automatically
- **For Merges to Master**: Build, lint, test, and deployment to VPS via Docker

### Setting up the Project

1. Clone the repository
2. Install dependencies:
   ```
   cd app
   yarn install
   ```
3. Run development server:
   ```
   yarn dev
   ```

### GitHub Secrets Required for Deployment

Set the following secrets in your GitHub repository settings:

- `DOCKERHUB_USERNAME`: Your Docker Hub username
- `DOCKERHUB_PASSWORD`: Your Docker Hub password or access token
- `VPS_HOST`: The hostname or IP address of your VPS
- `VPS_USERNAME`: SSH username for your VPS
- `VPS_SSH_KEY`: SSH private key for accessing your VPS
- `VPS_PROJECT_PATH`: Path on the VPS where the project files are located
- `VPS_PORT_KNOCK`: (Optional) Space-separated list of ports for port-knocking (can be empty)
- `TELEGRAM_TO`: Telegram chat ID for notifications
- `TELEGRAM_TOKEN`: Telegram bot token

See `.github/README.md` for more details on the CI/CD configuration.