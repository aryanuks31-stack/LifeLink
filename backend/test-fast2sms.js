require('dotenv').config();
const axios = require('axios');

axios.post(
  'https://www.fast2sms.com/dev/bulkV2',
  {
    route: 'q',
    message: 'Test message from LifeLink',
    language: 'english',
    flash: 0,
    numbers: '9948450173',
  },
  {
    headers: {
      authorization: process.env.FAST2SMS_API_KEY,
      'Content-Type': 'application/json',
    },
  }
)
  .then((res) => console.log('SUCCESS:', res.data))
  .catch((err) => console.log('FAILED:', err.response ? err.response.data : err.message));