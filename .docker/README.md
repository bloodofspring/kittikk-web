# Docker Configuration for BonesOfSpring

This directory contains Docker configuration files for both development and production environments.

## Development

To start the development environment:

```bash
docker compose -f .docker/docker-compose.yml up app-dev
```

This will:
- Build the development Docker image
- Mount your local `app` directory into the container
- Start the Next.js development server with hot-reloading
- Make the app available at http://localhost:3000

## Production

To start the production environment:

```bash
docker compose -f .docker/docker-compose.yml up app-prod
```

This will:
- Build a multi-stage production Docker image
- Run the optimized Next.js application in SSR mode
- Make the app available at http://localhost:3000

## Building images separately

You can also build the images separately:

```bash
# Build development image
docker build -t bonesofspring-dev -f .docker/Dockerfile.development .

# Build production image
docker build -t bonesofspring-prod -f .docker/Dockerfile.production .
```

## Notes

- The production build uses Next.js's `standalone` output option for optimized container size
- Node.js 24 is used in both environments
- For production deployments, you may want to adjust resource limits in the docker-compose.yml file 