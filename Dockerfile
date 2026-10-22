FROM node:24-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8081 DATA_DIR=/var/lib/apex-gp
WORKDIR /app
COPY --chown=node:node package.json server.mjs ctf-coordinator.mjs ctf-instance.mjs ./
COPY --chown=node:node lib/ ./lib/
COPY --chown=node:node dist/ ./dist/
RUN mkdir -p /var/lib/apex-gp && chown node:node /var/lib/apex-gp
USER node
EXPOSE 8080 8081
CMD ["node", "ctf-coordinator.mjs"]
