const {Storage} = require('./storage');
const nodemailer = require('nodemailer');

const config = configureSmtp();
const transport = nodemailer.createTransport(config.smtp);

function configureStorage() {
  const rootPath = process.env.STORAGE_PATH;

  if (!rootPath) {
    console.log(
      'no file storage configured; generated files will not be stored.'
    );
    return undefined;
  }

  const storage = new Storage(rootPath);

  storage.validate();
  console.log(`working file storage on ${rootPath} configured`);

  return storage;
}

function configureSmtp() {
  const from = process.env.SMTP_SENDER;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT && parseInt(process.env.SMTP_PORT);

  const unsafe = process.env.SMTP_UNSAFE;

  const auth = user && pass ? {user, pass} : undefined;

  const smtp = {
    ignoreTLS: unsafe,
    auth,
    host,
    port
  };

  return {
    user,
    smtp,
    from
  };
}

function getOptions(optionsStr, templateName) {
  const originalNameWOExt = templateName
    .split(`.`)
    .slice(0, -1)
    .join(`.`);
  const originalFormat = templateName.split(`.`).reverse()[0];

  let options = {}
  try {
    options = JSON.parse(optionsStr);
  } catch (e) {
    console.error('Parse options error', e);
  }

  options.convertTo = options.convertTo || originalFormat;
  options.outputName = options.outputName || `${originalNameWOExt}.${options.convertTo}`;

  return options;
}

/**
 * Send mail, if requested
 *
 * @param req
 * @param filename
 * @param report
 * @returns {Promise<boolean>}
 */
async function sendMail(req, filename, report) {
  const emailAddress = req.body.email;

  if (!emailAddress || !config.from) {
    return false
  }

  if (!config.smtp.host) {
    throw new Error(`SMTP Host is not configured`);
  }

  const email = JSON.parse(emailAddress);

  if (!Array.isArray(email.to)) {
    throw new Error(`email.to is not an array`);
  }
  if (email.to.some(entry => typeof entry !== 'string')) {
    throw new Error(`email.to contains non-string entries`);
  }
  if (!email.subject || !(typeof email.subject === 'string')) {
    throw new Error(`email.subject is missing or not a string`);
  }
  if (!email.subject || !(typeof email.subject === 'string')) {
    throw new Error(`email.text is missing or not a string`);
  }

  if (email.to.length > 0) {
    await transport.sendMail({
      from: config.from,
      to: email.to,
      subject: email.subject,
      text: email.text,
      attachments: [
        {
          filename: filename,
          content: report
        }
      ]
    });
    return true;
  }

  console.info(`no email recipients given, won't send any mails`);
  return false;
}

function setHeaders(res, outputName) {
  res.setHeader(
    `Content-Disposition`,
    `attachment; filename=${outputName}`
  );
  res.setHeader(`Content-Transfer-Encoding`, `binary`);
  res.setHeader(`Content-Type`, `application/octet-stream`);
  res.setHeader(`Carbone-Report-Name`, outputName);
}

function getData(req) {
  let data = req.body.data;
  if (typeof data !== `object` || data === null) {
    try {
      data = JSON.parse(req.body.data);
    } catch (e) {
      data = {};
    }
  }
  return data;
}

function sendReport(res, options, report) {
  setHeaders(res, options.outputName);

  return res.send(report);
}

module.exports = {
  configureStorage,
  getOptions,
  sendMail,
  getData,
  sendReport
}