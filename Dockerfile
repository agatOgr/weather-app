# --------- ETAP 1: Budowanie Node.js z minirootfs ---------
    FROM scratch AS app_build

    ADD alpine-minirootfs-3.21.3-aarch64.tar /
    
    # Instalacja narzędzi w warstwie tymczasowej
    RUN ["/bin/sh", "-c", "\
        apk update && \
        apk upgrade && \
        apk add --no-cache nodejs npm && \
        addgroup -S node && adduser -S node -G node \
    "]
    
    WORKDIR /home/node/app
    
    COPY --chown=node:node package.json .
    COPY --chown=node:node server.js .
    COPY --chown=node:node public ./public
    
    RUN npm install
    
    # --------- ETAP 2: Ostateczny obraz aplikacji ---------
    FROM node:22-alpine3.19
    
    LABEL org.opencontainers.image.authors="Agata Ogrodnik"
    
    WORKDIR /home/node/app
    
    COPY --from=app_build /home/node/app .
    
    EXPOSE 3000
    
    HEALTHCHECK --interval=5s --timeout=3s --start-period=3s --retries=2 \
        CMD wget -q --spider http://localhost:3000/ || exit 1
    
    CMD ["node", "server.js"]



    
    