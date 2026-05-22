# Required GitHub Secrets for VPS Deployment

Set these repository secrets before running workflows:

- VPS_HOST: Public IP or DNS of your VPS
- VPS_USER: SSH user on VPS
- VPS_PORT: SSH port (usually 22)
- VPS_SSH_KEY: Private key content for VPS SSH access
- GHCR_USER: GitHub username/org with package pull access
- GHCR_TOKEN: PAT with read:packages (and repo if needed)

## Optional but recommended
- Configure a GitHub environment named `production` and require approvals.
- Ensure package visibility in GHCR allows VPS pull with provided credentials.
