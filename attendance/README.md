<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/3f2efc89-d7fd-4876-9390-90cc4b9b6d51

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## RFID Compatibility

This project normalizes Arduino RC522 UIDs to match the output of the MLE00790 / R20XC USB RFID reader.

Source-of-truth sample:

- RC522 raw UID: `5A052F170C4189`
- USB reader output: `0388957530`

Conversion rule used by the app:

1. Take the first 4 bytes of the 7-byte hex UID.
2. Reverse those bytes into little-endian order.
3. Convert to decimal.
4. Pad to 10 digits.

The normalization logic lives in [utils/rfid.ts](./utils/rfid.ts) and is used so the app can accept either:

- raw 7-byte RC522 hex input
- 10-digit decimal reader-style input

If this hardware mapping ever changes, re-verify it with real card samples before updating the conversion logic.
