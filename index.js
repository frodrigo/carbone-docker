const path = require(`path`);
const fs = require(`fs-extra`);
const crypto = require("crypto");
const _ = require(`lodash`);
const util = require(`util`);
const carbone = require(`carbone`);
const telejson = require(`telejson`);
const express = require(`express`);
const bodyParser = require(`body-parser`);
const app = express();
const upload = require(`multer`)({ dest: `/tmp/reports/` });
const port = process.env.CARBONE_PORT || 3030;
const basicAuth = require("express-basic-auth");
const nodemailer = require("nodemailer");

const username = process.env.USERNAME || undefined;
const password = process.env.PASSWORD || undefined;

if (!username || !password) {
  console.error(
    "missing authentication credentials. Please pass USERNAME and PASSWORD environment variables"
  );
  process.exit(-1);
}

function configureStorage(rootPath) {
  if (typeof rootPath !== "string") {
    console.log(
      "no file storage configured; generated files will not be stored."
    );
    return undefined;
  }

  // try writing a file to confirm the location to store files
  // at works as intended
  const testFilePath = path.join(rootPath, "test.txt");
  const testFileContent =
    "This is a test file to confirm the carbone server can write to this directory.";
  fs.writeFileSync(testFilePath, testFileContent, "utf8");
  const content = fs.readFileSync(testFilePath, "utf8");

  if (content !== testFileContent) {
    throw new Error(`file storage location ${rootPath} can't store files`);
  }

  console.log(`file storage ${rootPath} confirmed!`);

  return {
    store: data => {
      const hasher = crypto.createHash("sha256");
      hasher.update(data);
      const hash = hasher.digest("hex");

      const directoryPath = path.join(rootPath, hash);
      fs.mkdirSync(directoryPath);
      const filePath = path.join(directoryPath, "result.pdf");
      fs.writeFileSync(filePath, data);
    },

    path: hash => {
      return path.join(rootPath, hash, "result.pdf");
    }
  };
}

function configureSmtp() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT && parseInt(process.env.SMTP_PORT);

  const unsafe = process.env.SMTP_UNSAFE;

  const auth = user && pass ? { user, pass } : undefined;

  const smtp = {
    ignoreTLS: unsafe,
    auth,
    host,
    port
  };

  const config = {
    user,
    smtp
  };

  return config;
}

const config = configureSmtp();

const transport = nodemailer.createTransport(config.smtp);

const storage = configureStorage(process.env.STORAGE_PATH);

function auth() {
  return basicAuth({
    users: { [username]: password }
  });
}

app.use(auth());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const render = util.promisify(carbone.render);

// Flagging default formatters to remove custom ones later
_.forEach(carbone.formatters, formatter => (formatter.$isDefault = true));

app.get("/", (req, res) => {
  res.sendFile(path.resolve(`./test.html`));
});

function isHash(value) {
  return typeof value === "string" && /^\/file\/[0-9a-f]{64}$/.test;
}

app.get("/file/:hash", async (req, res) => {
  const hash = req.params.hash;
  if (!isHash(hash)) {
    return res.sendStatus(404);
  }

  const filePath = storage.path(hash);
  res.setHeader("Content-Disposition", 'attachment; filename="report.pdf"');
  res.sendFile(filePath);
});

app.post("/render", upload.single(`template`), async (req, res) => {
  const template = req.file;
  const originalNameWOExt = template.originalname
    .split(`.`)
    .slice(0, -1)
    .join(`.`);
  const originalFormat = template.originalname.split(`.`).reverse()[0];
  let data = req.body.data;
  let options = {};
  let formatters = {};

  try {
    options = JSON.parse(req.body.options);
  } catch (e) {}

  options.convertTo = options.convertTo || originalFormat;
  options.outputName =
    options.outputName || `${originalNameWOExt}.${options.convertTo}`;
  if (typeof data !== `object` || data === null) {
    try {
      data = JSON.parse(req.body.data);
    } catch (e) {
      data = {};
    }
  }

  try {
    formatters = telejson.parse(req.body.formatters);
  } catch (e) {}

  // Removing previous custom formatters before adding new ones
  carbone.formatters = _.filter(
    carbone.formatters,
    formatter => formatter.$isDefault === true
  );

  carbone.addFormatters(formatters);

  let report = null;

  try {
    report = await render(template.path, data, options);
  } catch (e) {
    console.log(e);
    return res.status(500).send(`Internal server error`);
  }

  fs.remove(template.path);

  /* ------------------------------------------------------
  Send mail, if requested
  ------------------------------------------------------ */

  if (req.body.email) {
    try {
      const email = JSON.parse(req.body.email);
      if (!Array.isArray(email.to)) {
        throw new Error(`email.to is not an array`);
      }
      if (email.to.some(entry => typeof entry !== "string")) {
        throw new Error(`email.to contains non-string entries`);
      }
      if (!email.subject || !(typeof email.subject === "string")) {
        throw new Error(`email.subject is missing or not a string`);
      }
      if (!email.subject || !(typeof email.subject === "string")) {
        throw new Error(`email.text is missing or not a string`);
      }

      if (email.to.length > 0) {
        await transport.sendMail({
          from: config.user,
          to: email.to,
          subject: email.subject,
          text: email.text,
          attachments: [
            {
              filename: "report.pdf",
              content: report
            }
          ]
        });
      } else {
        console.info(`no email recipients given, won't send any mails`);
      }
    } catch (e) {
      console.error(`cannot send emails: ${e}`);
    }
  }

  if (storage) {
    storage.store(report);
    // TODO: store file and return info on how to get it
  }

  res.setHeader(
    `Content-Disposition`,
    `attachment; filename=${options.outputName}`
  );
  res.setHeader(`Content-Transfer-Encoding`, `binary`);
  res.setHeader(`Content-Type`, `application/octet-stream`);
  res.setHeader(`Carbone-Report-Name`, options.outputName);

  return res.send(report);
});

app.listen(port, () =>
  console.log(`Carbone wrapper listenning on port ${port}!`)
);
