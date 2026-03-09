const twilio = require('twilio');

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER;

let twilioClient = null;

// Initialize Twilio client if credentials are provided
if (accountSid && authToken && twilioPhoneNumber) {
  twilioClient = twilio(accountSid, authToken);
}

/**
 * Send a bill notification via WhatsApp
 * @param {string} phoneNumber - Customer's WhatsApp number (with country code, e.g., +919876543210)
 * @param {Buffer} pdfBuffer - PDF file buffer (not used for WhatsApp, but kept for compatibility)
 * @param {string} billNumber - Bill number for the message
 * @param {string} customerName - Customer's name (optional, for personalization)
 * @param {number} grandTotal - Total bill amount
 * @param {Array} billItems - Array of bill items with descriptions
 * @returns {Promise<object>} - Twilio response
 */
async function sendBillPDF(phoneNumber, pdfBuffer, billNumber, customerName = null, grandTotal = 0, billItems = []) {
  if (!twilioClient) {
    console.warn('Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env');
    return { success: false, error: 'Twilio not configured' };
  }

  try {
    let itemName = 'Jewellery';
    if (billItems && billItems.length > 0) {
      if (billItems.length === 1) {
        itemName = billItems[0].itemDescription || 'Jewellery';
      } else {
        itemName = `${billItems[0].itemDescription} and ${billItems.length - 1} more`;
      }
    }

    const fromTarget = twilioPhoneNumber.startsWith('whatsapp:') ? twilioPhoneNumber : `whatsapp:${twilioPhoneNumber}`;
    const toTarget = phoneNumber.startsWith('whatsapp:') ? phoneNumber : `whatsapp:${phoneNumber}`;

    const message = await twilioClient.messages.create({
      contentSid: process.env.TEMPLATE_ID,
      from: fromTarget,
      to: toTarget,
      contentVariables: JSON.stringify({
        '1': itemName,
        '2': customerName || 'Customer',
        '3': grandTotal.toFixed(2)
      })
    });

    console.log(`Bill notification sent successfully to ${phoneNumber}. Message SID: ${message.sid}`);
    return { success: true, messageSid: message.sid };

  } catch (error) {
    console.error('Error sending bill PDF via WhatsApp:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send a welcome message to a new customer
 * @param {string} phoneNumber - Customer's WhatsApp number (with country code, e.g., +919876543210)
 * @param {string} customerName - Customer's name
 * @returns {Promise<object>} - Twilio response
 */
async function sendWelcomeMessage(phoneNumber, customerName) {
  if (!twilioClient) {
    console.warn('Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER in .env');
    return { success: false, error: 'Twilio not configured' };
  }

  try {
    const fromTarget = twilioPhoneNumber.startsWith('whatsapp:') ? twilioPhoneNumber : `whatsapp:${twilioPhoneNumber}`;
    const toTarget = phoneNumber.startsWith('whatsapp:') ? phoneNumber : `whatsapp:${phoneNumber}`;

    const message = await twilioClient.messages.create({
      from: fromTarget,
      to: toTarget,
      body: `ରାଧାଗୋବିନ୍ଦ ଜୁଏଲର୍ସକୁ ସ୍ୱାଗତମ, ${customerName}! 👋\n\nଆମ ସୁନ୍ଦର ଗହଣ ଗୁଡିକ ଆପଙ୍କ ସେବା କରିବାକୁ ଆମ ଆନନ୍ଦିତ। ଯଦି ଆପଙ୍କର ଅଧିକ ସୂଚନା ଦରକାର, ଆମକୁ ଯୋଗାଯୋଗ କରନ୍ତୁ!\n\nଆନନ୍ଦରେ ସିଆଙ୍ଗ କରନ୍ତୁ! 💎`
    });

    console.log(`Welcome message sent successfully to ${phoneNumber}. Message SID: ${message.sid}`);
    return { success: true, messageSid: message.sid };
  } catch (error) {
    console.error('Error sending welcome message via WhatsApp:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send a custom message via WhatsApp
 * @param {string} phoneNumber - Customer's WhatsApp number (with country code, e.g., +919876543210)
 * @param {string} message - Message to send
 * @returns {Promise<object>} - Twilio response
 */
async function sendCustomMessage(phoneNumber, message) {
  if (!twilioClient) {
    console.warn('Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER in .env');
    return { success: false, error: 'Twilio not configured' };
  }

  try {
    const fromTarget = twilioPhoneNumber.startsWith('whatsapp:') ? twilioPhoneNumber : `whatsapp:${twilioPhoneNumber}`;
    const toTarget = phoneNumber.startsWith('whatsapp:') ? phoneNumber : `whatsapp:${phoneNumber}`;

    const response = await twilioClient.messages.create({
      from: fromTarget,
      to: toTarget,
      body: message
    });

    console.log(`Custom message sent successfully to ${phoneNumber}. Message SID: ${response.sid}`);
    return { success: true, messageSid: response.sid };
  } catch (error) {
    console.error('Error sending custom message via WhatsApp:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendBillPDF,
  sendWelcomeMessage,
  sendCustomMessage
};
