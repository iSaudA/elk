# One small image runs either the replica server or worker using a different command.
# The final USER selects the unprivileged node account inside the container.
FROM node:22-alpine

WORKDIR /app

COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
# Keep the small test suite available for validation on the Azure VM.
COPY --chown=node:node test ./test

USER node

EXPOSE 3000

CMD ["node", "src/server.js"]
