const nodemailer = require('nodemailer');
let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'mohamedragab4368@gmail.com', // ضع بريدك هنا
    pass: 'pozkhkwqdoyreatv'     // ضع App Password هنا
  }
});
transporter.sendMail({
  from: 'info@petrochoice.org',
  to: 'medoragab482@gmail.com',
  subject: 'Test Email',
  text: 'This is a test email from Node.js'
}, (err, info) => {
  if (err) {
    return console.log('Error:', err);
  }
  console.log('Email sent:', info.response);
});