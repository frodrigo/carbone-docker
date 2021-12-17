const path = require(`path`);
const fs = require(`fs-extra`);
const util = require(`util`);
const carbone = require(`carbone`);
const fastify = require(`fastify`)({
  logger: true
});
const multer = require(`fastify-multer`);

let maxFileSize = !isNaN(process.env.MAX_FILESIZE) ? parseInt(process.env.MAX_FILESIZE, 10) : 10000000; // 10 MB;
maxFileSize = maxFileSize === 0 ? Infinity : maxFileSize; // 10 MB;
const upload = multer({
  dest: process.env.UPLOAD_DIR || `/tmp/uploads/`,
  limits: {
    fileSize: maxFileSize,
    files: 1
  }
});

const PORT = process.env.PORT || 3030;
const templatesDir = process.env.TEMPLATES_DIR || './templates/';
const render = util.promisify(carbone.render);

fastify.register(multer.contentParser)

if (process.env.DEMO) {
  fastify.get('/', (req, reply) => {
    fastify.log.info('Enable demo site')
    const stream = fs.createReadStream(path.resolve(`./demo/test.html`))
    reply.type('text/html').send(stream);
  });
}

fastify.post('/render/:template?', {preHandler: upload.single('template')}, async function (req, reply) {
  if (!req.file && !req.params.template) {
    return reply.status(400);
  }

  const templatePath = req.file ? req.file.path : path.resolve(templatesDir, req.params.template);
  const templateName = req.file ? req.file.originalname : req.params.template;

  const options = getOptions(req.body.options, templateName);
  const data = getJson(req.body.data);

  fastify.log.info({options}, 'Options')

  let report = null;
  try {
    report = await render(templatePath, data, options);
  } catch (e) {
    fastify.log.error(e);
    if (e.code && e.code === 'ENOENT') {
      return reply.status(404).send(`Template file not found.`);
    } else if (typeof e === 'string' && e.includes('Unknown input file type')) {
      return reply.status(415).send(e);
    }

    return reply.status(500).send(typeof e === 'string' ? e : 'Internal Server Error');
  } finally {
    if (req.file) {
      fastify.log.info({templatePath}, 'Delete uploaded file')
      fs.remove(templatePath);
    }
  }

  reply.header(`Content-Disposition`, `attachment; filename=${options.outputName}`);
  reply.header(`Content-Transfer-Encoding`, `binary`);
  reply.header(`Content-Type`, `application/octet-stream`);

  return reply.send(report);
});

function getOptions(optionsStr, templateName) {
  const originalNameWOExt = templateName
    .split(`.`)
    .slice(0, -1)
    .join(`.`);
  const originalFormat = templateName.split(`.`).reverse()[0];

  let options = getJson(optionsStr)

  options.convertTo = options.convertTo || originalFormat;
  options.outputName = options.outputName || `${originalNameWOExt}.${options.convertTo}`;

  return options;
}

function getJson(data) {
  if (data && typeof data !== `object`) {
    try {
      return JSON.parse(data);
    } catch (e) {
      return {};
    }
  }
  return data || {};
}

const serve = async () => {
  try {
    await fastify.listen(PORT, '0.0.0.0');
    fastify.log.info({maxFileSize}, `Carbone wrapper listening on port ${PORT}!`)
  } catch (e) {
    fastify.log.error(e)
    process.exit(1);
  }
}

serve();