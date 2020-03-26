FROM node:12

ENV LIBREOFFICE_VERSION=6.3.3.1

# install LibreOffice and its dependencies
WORKDIR /tmp
RUN wget -nv \
  http://downloadarchive.documentfoundation.org/libreoffice/old/${LIBREOFFICE_VERSION}/deb/x86_64/LibreOffice_${LIBREOFFICE_VERSION}_Linux_x86-64_deb.tar.gz \
  -O libo.tar.gz
RUN apt update \
  && apt install -y libxinerama1 libfontconfig1 libdbus-glib-1-2 libcairo2 libcups2 libglu1-mesa libsm6 unzip \
  && tar -zxf libo.tar.gz
WORKDIR /tmp/LibreOffice_${LIBREOFFICE_VERSION}_Linux_x86-64_deb/DEBS
RUN dpkg -i *.deb

# install node package
RUN mkdir -p /home/node/carbone-api/node_modules && chown -R node:node /home/node/carbone-api
WORKDIR /home/node/carbone-api
COPY package.json package-lock.json ./
USER node
RUN npm install
COPY --chown=node:node . .

# create cache directory
EXPOSE 3030
CMD node index