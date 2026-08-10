require('dotenv').config();
console.log('SID exists:', !!process.env.TWILIO_ACCOUNT_SID);
console.log('Token exists:', !!process.env.TWILIO_AUTH_TOKEN);
console.log('Phone:', process.env.TWILIO_PHONE_NUMBER);