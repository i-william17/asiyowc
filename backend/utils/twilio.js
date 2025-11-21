const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

exports.sendSMS = async ({ to, body }) => {
  try {
    await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to
    });
    return true;
  } catch (error) {
    console.error('SMS sending failed:', error);
    return false;
  }
};

exports.sendVerificationCode = async (phone) => {
  try {
    const verification = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: phone, channel: 'sms' });
    
    return verification;
  } catch (error) {
    console.error('Verification code sending failed:', error);
    throw error;
  }
};

exports.verifyCode = async (phone, code) => {
  try {
    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phone, code });
    
    return verificationCheck.status === 'approved';
  } catch (error) {
    console.error('Code verification failed:', error);
    return false;
  }
};