const path = require(`path`);
const fs = require(`fs-extra`);
const util = require(`util`);
const carbone = require(`carbone`);
const express = require(`express`);
const bodyParser = require(`body-parser`);
const app = express();
const upload = require(`multer`)({dest: `/tmp/uploads/`});
const port = process.env.CARBONE_PORT || 3030;
const basicAuth = require('express-basic-auth');

const {configureStorage, getOptions, sendMail, getData, sendReport} = require('./utils');

const username = process.env.USERNAME || undefined;
const password = process.env.PASSWORD || undefined;
const templatesDir = process.env.TEMPLATES || './templates/';

const storage = configureStorage();

if (username && password) {
  app.use(basicAuth({
    users: {[username]: password}
  }));
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

const render = util.promisify(carbone.render);

if (process.env.TESTSITE) {
  app.get('/', (req, res) => {
    res.sendFile(path.resolve(`./demo/test.html`));
  });
}

app.get('/files/:hash', async (req, res) => {
  if (!storage) {
    return res.sendStatus(404);
  }

  const hash = req.params.hash;
  if (!storage.isHash(hash)) {
    return res.sendStatus(404);
  }

  const filePath = storage.path(hash);
  res.setHeader('Content-Disposition', 'attachment; filename="report.pdf"');
  res.sendFile(filePath);
});

app.post('/render/:template?', upload.single(`template`), async (req, res) => {
  if (!req.file && !req.params.template) {
    return res.sendStatus(400);
  }

  const templatePath = req.file ? req.file.path : path.resolve(`${templatesDir}${req.params.template}`);
  const templateName = req.file ? req.file.originalname : req.params.template;

  const options = getOptions(req.body.options, templateName);
  const data = getData(req);

  console.log('Options', options)
  console.log('Data', data)

  console.time('render time');
  let report = null;
  try {
    report = await render(templatePath, data, options);
  } catch (e) {
    console.log(e);
    return res.status(500).send(`Internal server error`);
  } finally {
    if (req.file) {
      fs.remove(templatePath);
    }
  }
  console.timeEnd('render time');

  sendMail(req, options.outputName, report).then(() => {
    console.log('Email was send')
  }).catch(e => {
    console.log(e)
  });

/*  if (storage) {
    const id = storage.store(report);
    res.setHeader('Location', `/files/${id}`);
    return res.sendStatus(301);
  }*/

  return sendReport(res, options, report);
});

app.listen(port, () =>
  console.log(`Carbone wrapper listenning on port ${port}!`)
);

process.on('SIGINT', shutdown);

// Do graceful shutdown
function shutdown() {
  console.log('graceful shutdown Carbone');
  app.close(function () {
    console.log('closed Carbone');
  });
}