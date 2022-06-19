const AdmZip = require('adm-zip');
const mimeTypes = require('mime-types');
const sharp = require('sharp');

function imagePath(mimeType, image, index, log) {
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

  return path;
}


async function scaleImage(originalImage, newImage) {
  const originalMetadata = await sharp(originalImage).metadata();
  return await sharp(newImage)
    .resize(
      originalMetadata.width,
      originalMetadata.height, {
      fit: 'contain',
      background: {r: 255, g: 255, b: 255, alpha: 1},
    })
    .toBuffer();
}


async function replaceImages(images, templatePath, log) {
  if (!Array.isArray(images)) {
    throw new Error('Images must be an array.')
  }

  if (images.length === 0) {
    return;
  }

  let zip = new AdmZip(templatePath);
  images = images
    .filter(image => typeof image.content === 'string' && image.content.startsWith('data:'))

  // Async loop
  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];

    const [mimeType, data] = image.content.substring(5).split(',');
    if (!mimeType || !data) {
      log.info('Image will not be added. Wrong format.')
      continue
    }

    const path = imagePath(mimeType, image, index, log);
    const entry = zip.getEntry(path);
    if (!entry) {
      log.error('Image in the path ' + path + ' does not exists.')
      continue
    }

    try {
      const originalImage = entry.getData();
      const newImage = Buffer.from(data, 'base64');
      const scaledImage = await scaleImage(originalImage, newImage);

      zip.addFile(path, scaledImage);
      log.info({path}, 'Image replaced.');
    } catch (e) {
      log.error(e);
    }
  }
  zip.writeZip();
}

module.exports = {
  replaceImages
}