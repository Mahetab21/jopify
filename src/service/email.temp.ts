export const emailTemplate = (otp: string, title: string) => `
<!doctype html><html lang="en"><body style="font-family:Arial,sans-serif;background:#f3f5f9;padding:32px;color:#172338">
<div style="max-width:520px;margin:auto;background:white;padding:32px;border-radius:12px">
<p style="font-size:24px;font-weight:bold;color:#2563eb">Jobify</p>
<h1 style="font-size:22px">${title}</h1>
<p>Your verification code is:</p>
<p style="font-size:32px;letter-spacing:8px;font-weight:bold">${otp}</p>
<p>This code expires in 10 minutes. Do not share it with anyone.</p>
<p>If you did not request this, you can ignore this email.</p>
</div></body></html>`;
