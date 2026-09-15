FROM node:22-alpine

WORKDIR /workspace

COPY service/package.json service/pnpm-lock.yaml ./service/
RUN corepack enable && cd service && pnpm install --prod --frozen-lockfile

COPY --chown=node:node app ./app
COPY --chown=node:node data/cities.csv data/preferred_ranges_calibration_results.json data/city_profiles_mvp.json ./data/
COPY --chown=node:node service ./service

USER node
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4173
EXPOSE 4173

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4173/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "service/server.mjs"]
