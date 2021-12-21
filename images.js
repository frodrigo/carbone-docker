const AdmZip = require('adm-zip');
const mimeTypes = require('mime-types');

function replaceImages(images, templatePath, log) {
  if (!Array.isArray(images)) {
    throw new Error('Images must be an array.')
  }

  if (images.length === 0) {
    return;
  }

  const zip = new AdmZip(templatePath);
  images
    .filter(image => typeof image.content === 'string' && image.content.startsWith('data:'))
    .forEach((image, index) => {
      const [mimeType, data] = image.content.substring(5).split(',');
      if (!mimeType || !data) {
        log.info('Image will not be added. Wrong format.')
        return
      }

      let path = image.path;

      if (!path) {
        const [mime] = mimeType.split(';')
        const ext = mimeTypes.extension(mime) || '';
        const contentType = mimeTypes.lookup(templatePath);
        if (!contentType) {
          log.error({templatePath}, 'Unknown content type of the template.')
          return;
        }

        let folder = null;
        switch (contentType) {
          case 'application/vnd.oasis.opendocument.text':
            folder = 'media';
            break;
          case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            folder = 'word/media'
            break
          default:
            log.error('Unsupported content type:' + contentType)
            return;
        }

        path = folder + '/image' + (index + 1) + '.' + ext;
      } else if (path.startsWith('/')) {
        path = path.substring(1);
      }

      const entry = zip.getEntry(path);

      if (!entry) {
        log.error('Image in the path ' + path + ' does not exists.')
        return;
      }

      try {
        const buffer = Buffer.from(data, 'base64');
        log.info({path}, 'Image replaced.')
        zip.addFile(path, buffer);
      } catch (e) {
        log.error(e);
      }
    });

  zip.writeZip();
}

module.exports = {
  replaceImages
}