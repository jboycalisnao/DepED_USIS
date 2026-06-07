#include <SPI.h>
#include <MFRC522.h>

// Update these pins if your RC522 module is wired differently.
constexpr uint8_t SS_PIN = 10;
constexpr uint8_t RST_PIN = 9;

// Wire the buzzer signal pin here.
constexpr uint8_t BUZZER_PIN = 8;

// Optional allow-list for valid taps.
// Leave empty to accept every readable card, or paste approved 10-digit HID decimal IDs here.
const char* const VALID_UIDS[] = {
  // "0388957530",
};
constexpr size_t VALID_UID_COUNT = sizeof(VALID_UIDS) / sizeof(VALID_UIDS[0]);

constexpr unsigned int SUCCESS_BEEP_FREQUENCY_HZ = 2200;
constexpr unsigned int SUCCESS_BEEP_DURATION_MS = 110;
constexpr unsigned int DUPLICATE_BEEP_FREQUENCY_HZ = 1800;
constexpr unsigned int DUPLICATE_BEEP_DURATION_MS = 120;
constexpr unsigned int DUPLICATE_BEEP_GAP_MS = 110;
constexpr unsigned int INVALID_BEEP_FREQUENCY_HZ = 1400;
constexpr unsigned int INVALID_BEEP_DURATION_MS = 520;

MFRC522 rfid(SS_PIN, RST_PIN);
String serialCommandBuffer;

String formatUidAsHidDecimal(const MFRC522::Uid& uid) {
  // DepED USIS compatibility rule:
  // Take the first 4 bytes of the UID, reverse them into little-endian order,
  // and format the result as a 10-digit decimal string.
  if (uid.size < 4) {
    return "";
  }

  uint32_t value = 0;
  for (int i = 3; i >= 0; --i) {
    value = (value << 8) | uid.uidByte[i];
  }

  char output[11];
  snprintf(output, sizeof(output), "%010lu", static_cast<unsigned long>(value));
  return String(output);
}

bool isAllowedUid(const String& hidDecimal) {
  if (hidDecimal.length() == 0) {
    return false;
  }

  if (VALID_UID_COUNT == 0) {
    return true;
  }

  for (size_t index = 0; index < VALID_UID_COUNT; ++index) {
    if (hidDecimal == VALID_UIDS[index]) {
      return true;
    }
  }

  return false;
}

void beepOnce(unsigned int frequencyHz, unsigned int durationMs) {
  tone(BUZZER_PIN, frequencyHz, durationMs);
  delay(durationMs + 20);
  noTone(BUZZER_PIN);
}

void beepSuccess() {
  beepOnce(SUCCESS_BEEP_FREQUENCY_HZ, SUCCESS_BEEP_DURATION_MS);
}

void beepDuplicate() {
  beepOnce(DUPLICATE_BEEP_FREQUENCY_HZ, DUPLICATE_BEEP_DURATION_MS);
  delay(DUPLICATE_BEEP_GAP_MS);
  beepOnce(DUPLICATE_BEEP_FREQUENCY_HZ, DUPLICATE_BEEP_DURATION_MS);
}

void beepInvalid() {
  beepOnce(INVALID_BEEP_FREQUENCY_HZ, INVALID_BEEP_DURATION_MS);
}

void handleSerialCommand(const String& command) {
  if (command.length() == 0) {
    return;
  }

  if (command.startsWith("DISPLAY|")) {
    beepSuccess();
    return;
  }

  if (command.startsWith("ERROR|Already Logged")) {
    beepDuplicate();
    return;
  }

  if (command.startsWith("ERROR|Unknown Card") || command.startsWith("INVALID")) {
    beepInvalid();
    return;
  }
}

void pollSerialCommands() {
  while (Serial.available() > 0) {
    const char incoming = static_cast<char>(Serial.read());

    if (incoming == '\n' || incoming == '\r') {
      if (serialCommandBuffer.length() > 0) {
        handleSerialCommand(serialCommandBuffer);
        serialCommandBuffer = "";
      }
      continue;
    }

    serialCommandBuffer += incoming;
    if (serialCommandBuffer.length() > 80) {
      serialCommandBuffer.remove(0, serialCommandBuffer.length() - 80);
    }
  }
}

void setup() {
  Serial.begin(9600);
  SPI.begin();
  rfid.PCD_Init();
  pinMode(BUZZER_PIN, OUTPUT);
  noTone(BUZZER_PIN);
}

void loop() {
  pollSerialCommands();

  if (!rfid.PICC_IsNewCardPresent()) {
    return;
  }

  if (!rfid.PICC_ReadCardSerial()) {
    beepInvalid();
    Serial.println("INVALID");
    return;
  }

  const String hidDecimal = formatUidAsHidDecimal(rfid.uid);
  if (!isAllowedUid(hidDecimal)) {
    beepInvalid();
    Serial.println("INVALID");
  } else {
    Serial.println(hidDecimal);
  }

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  while (rfid.PICC_IsNewCardPresent() || rfid.PICC_ReadCardSerial()) {
    pollSerialCommands();
    delay(25);
  }
}
