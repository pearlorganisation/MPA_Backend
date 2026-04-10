// import axios from "axios";

// export const submitUrlToCopyleaks = async (fileUrl) => {
//   // 🔐 Step 1: Login
//   const loginRes = await axios.post(
//     "https://id.copyleaks.com/v3/account/login/api",
//     {
//       email: process.env.COPYLEAKS_EMAIL,
//       key: process.env.COPYLEAKS_KEY,
//     }
//   );

//   const token = loginRes.data.access_token;

//   // 🆔 Step 2: Generate Scan ID
//   const scanId = `${Date.now()}`;

//   // 🚀 Step 3: Submit URL (IMPORTANT FIX)
//   await axios.put(
//     `https://api.copyleaks.com/v3/scans/submit/url/${scanId}`,
//     {
//       url: fileUrl, // ✅ FIXED (object format)
//       sandbox: true,
//       webhooks: {
//         status: process.env.COPYLEAKS_WEBHOOK,
//       },
//     },
//     {
//       headers: {
//         Authorization: `Bearer ${token}`,
//         "Content-Type": "application/json",
//       },
//     }
//   );

//   return scanId;
// };

import axios from "axios";

export const submitUrlToCopyleaks = async (fileUrl) => {
  try {
    // 🔐 Step 1: Login
    const loginRes = await axios.post(
      "https://id.copyleaks.com/v3/account/login/api",
      {
        email: process.env.COPYLEAKS_EMAIL,
        key: process.env.COPYLEAKS_KEY,
      }
    );

    const token = loginRes.data.access_token;

    // 🆔 Step 2: Generate Scan ID
    const scanId = `${Date.now()}`;

    // 🚀 Step 3: Submit URL (FIXED)
    await axios.put(
      `https://api.copyleaks.com/v3/scans/submit/url/${scanId}`,
      {
        url: fileUrl,

        // ✅ FIX: wrap inside properties
        properties: {
      sandbox: true,

      // ✅ FIX: inside properties
      webhooks: {
        status: `${process.env.COPYLEAKS_WEBHOOK}/{STATUS}`,
      },
    },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return scanId;
  } catch (error) {
    console.error(
      "Copyleaks Error:",
      error.response?.data || error.message
    );
    throw error;
  }
};