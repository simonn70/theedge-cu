const axios = require("axios");

const sendSMS = async (contactNumber, message) => {
  // const apiKey = "nHBzjRiacu090IFfVpZdugx1g";
  // const senderId = "Kan Credit";
  //  const apiKey = "bIOb9eHhApWR3mw4PzPU6k8a1";
  // const senderId = "The Edge CU";

    const apiKey = "9mIngDQHaZPwEgULgHAAmVFtF";
  const senderId = "GNTDA";

  const mNotifyUrl = `https://apps.mnotify.net/smsapi?key=${apiKey}&to=${contactNumber}&msg=${encodeURIComponent(
    message
  )}&sender_id=${senderId}`;

  try {
    const response = await axios.post(mNotifyUrl);

    console.log(response, 'new dats');
    
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
