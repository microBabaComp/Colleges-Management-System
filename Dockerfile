FROM node:24.21.0-alpine3.22
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY --chown=node:node src ./src
COPY --chown=node:node db ./db
COPY --chown=node:node index.html styles.css app.js about.html about.css ./
COPY --chown=node:node login.html students.html colleges.html academics.html auth.css login.js students.js colleges.js academics.css academics.js ./
USER node
EXPOSE 8080
CMD ["node", "src/server.mjs"]