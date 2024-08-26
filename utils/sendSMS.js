const axios = require("axios");

const sendSMS = async (contactNumber, message) => {
  const apiKey = "nHBzjRiacu090IFfVpZdugx1g";
  const senderId = "Kan Credit";
  const mNotifyUrl = `https://apps.mnotify.net/smsapi?key=${apiKey}&to=${contactNumber}&msg=${encodeURIComponent(
    message
  )}&sender_id=${senderId}`;

  try {
    const response = await axios.post(mNotifyUrl);
    if (response.data.status === "1000") {
      console.log("SMS sent successfully");
    } else {
      console.log(`Failed to send SMS: ${response.data.status}`);
    }
  } catch (error) {
    console.error("Error sending SMS:", error);
  }
};

module.exports = {
  sendSMS,
};
