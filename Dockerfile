FROM node:16-bullseye-slim

WORKDIR /tmp
RUN set -xe \
  && apt-get update \
  && apt-get -y --no-install-recommends install ca-certificates wget libxinerama1 libfontconfig1 libdbus-glib-1-2 libcairo2 libcups2 libglu1-mesa libsm6 \
  && apt-get purge -y --auto-remove \
  && wget https://download.documentfoundation.org/libreoffice/stable/7.2.4/deb/x86_64/LibreOffice_7.2.4_Linux_x86-64_deb.tar.gz && tar -zxvf LibreOffice_7.2.4_Linux_x86-64_deb.tar.gz

WORKDIR /tmp/LibreOffice_7.2.4.1_Linux_x86-64_deb/DEBS
RUN dpkg -i *.deb && rm -rf LibreOffice_7.2.4.1_Linux_x86-64_deb/
 
# install node package
RUN mkdir -p /home/node/carbone-api/node_modules && chown -R node:node /home/node/carbone-api
WORKDIR /home/node/carbone-api
COPY package.json package-lock.json ./
USER node
RUN npm ci
COPY --chown=node:node . .

# runtime server configuration, empty by default
ENV STORAGE_PATH=

ENV SMTP_HOST=
ENV SMTP_PORT=
ENV SMTP_USER=
ENV SMTP_PASSWORD=
ENV SMTP_UNSAFE=

# run HTTP API server by default
EXPOSE 3030
CMD node index
USER root