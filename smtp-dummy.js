const { SMTPServer } = require("smtp-server");
const { simpleParser } = require("mailparser");

const server = new SMTPServer({
  // disable encryption and auth for very easy access
  secure: false,
  authOptional: true,

  // important: call callback!
  onConnect: (session, callback) => {
    console.log("connection established");
    callback();
  },

  // no callback here, close event is purely informational
  onClose: () => console.log("connection closed"),

  // important: consume the stream with listeners on 'data' and
  // call callback
  onData: (stream, session, callback) => {
    simpleParser(stream, (err, parsed) => {
      const { from, to, attachments, subject, text } = parsed;
      if (err) {
        return callback(err);
      }

      console.log("GOT MAIL");
      console.log(`  from: ${from.text}`);
      console.log(`  to: ${to.value.map(addr => addr.address).join(", ")}`);
      console.log(`  subject: ${subject}`);
      console.log(`  text: ${text}`);

      if (attachments.length > 0) {
        console.log("  attachments:");
        for (const attachment of attachments) {
          console.log(`    ${attachment.filename} (${attachment.size}B)`);
        }
      } else {
        console.log("  no attachments D:");
      }

      callback();
    });
  }
});

const port = 3535;
// inform the user about the port that's used
server.listen(port, () => console.log(`listening on localhost:${port}`));
