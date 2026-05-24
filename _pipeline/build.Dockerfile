# Use a specific LTS version of Node.js on a minimal base image.
FROM node:22-alpine

# Set the working directory inside the container.
WORKDIR /workspace

# Copy package manifests for all workspaces.
# This allows us to install dependencies in a separate layer,
# which is cached by Docker unless the manifests change.
COPY package.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install all dependencies for the monorepo workspaces.
# --legacy-peer-deps is used for compatibility with some package versions.
# This command runs with network access during the `docker build` phase.
RUN npm install --legacy-peer-deps

# Copy the rest of the application source code.
COPY . .

# Set a non-root user for security. The node base image provides a 'node' user.
USER node

# The default command to run when the container starts for the test stage.
# This assumes a root package.json with a "test" script that runs tests
# for all workspaces (e.g., "npm test -w backend && npm test -w frontend").
# The test command will run WITHOUT network access.
CMD ["npm", "test"]
