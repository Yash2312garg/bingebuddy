/**
 * Generates the HTML and text content for an OTP email.
 * @param {string} otp - The one-time password.
 * @param {number} minutes - The number of minutes the OTP is valid for.
 * @returns {{html: string, text: string}} - An object with html and text properties.
 */
export function getOtpEmailContent(otp:string, minutes:number) {
  const companyName = "Binge Buddy"; // Replace with your company name

  // The plain text version of the email
  const text = `
    Hello,

    Your verification code for ${companyName} is:

    ${otp}

    This code is valid for ${minutes} minutes.

    For your security, please do not share this code. If you did not request this, you can safely ignore this email.

    Thank you,
    The ${companyName} Team
  `;

  // The HTML version of the email
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            /* Basic styling */
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 600px;
                margin: 20px auto;
                background-color: #ffffff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                padding-bottom: 20px;
                border-bottom: 1px solid #dddddd;
            }
            .header h1 {
                margin: 0;
                color: #333333;
            }
            .content {
                padding: 20px 0;
                color: #555555;
                line-height: 1.6;
            }
            .otp-code {
                text-align: center;
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 4px;
                color: #ffffff;
                background-color: #007bff;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                font-size: 12px;
                color: #999999;
                padding-top: 20px;
                border-top: 1px solid #dddddd;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${companyName}</h1>
            </div>
            <div class="content">
                <p>Hello,</p>
                <p>Please use the following one-time password (OTP) to complete your verification. This code is valid for <strong>${minutes} minutes</strong>.</p>
                <div class="otp-code">${otp}</div>
                <p>For your security, do not share this code with anyone. If you did not request this verification, please disregard this email.</p>
                <p>Thank you!</p>
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  return { html, text };
}