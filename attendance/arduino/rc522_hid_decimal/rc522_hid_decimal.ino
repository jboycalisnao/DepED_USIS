#include <SPI.h>
#include <MFRC522.h>

// Update these pins if your RC522 module is wired differently.
constexpr uint8_t SS_PIN = 10;
constexpr uint8_t RST_PIN = 9;

MFRC522 rfid(SS_PIN, RST_PIN);

String formatUidAsHidDecimal(const MFRC522::Uid& uid) {
  if (uid.size < 4) {
    return "";
  }

  const uint8_t start = uid.size - 4;
  uint32_t value = 0;

  // Match common USB HID readers by using the last 4 UID bytes in little-endian order.
  for (int i = 3; i >= 0; --i) {
    value = (value << 8) | uid.uidByte[start + i];
  }

  char output[11];
  snprintf(output, sizeof(output), "%010lu", static_cast<unsigned long>(value));
  return String(output);
}

void setup() {
  Serial.begin(9600);
  SPI.begin();
  rfid.PCD_Init();
}

void loop() {
  if (!rfid.PICC_IsNewCardPresent()) {
    return;
  }

  if (!rfid.PICC_ReadCardSerial()) {
    return;
  }

  String hidDecimal = formatUidAsHidDecimal(rfid.uid);
  if (hidDecimal.length() > 0) {
    Serial.println(hidDecimal);
  }

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  while (rfid.PICC_IsNewCardPresent() || rfid.PICC_ReadCardSerial()) {
    delay(25);
  }
}
