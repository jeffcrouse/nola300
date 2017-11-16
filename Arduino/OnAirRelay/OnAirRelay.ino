#define RELAY_PIN 12
#define ONBOARD_LED 13

unsigned long nextHeartbeat;

void setup() {
  pinMode(ONBOARD_LED, OUTPUT);
  pinMode(RELAY_PIN, OUTPUT);
  Serial.begin(9600);
  nextHeartbeat = millis() + 1000;
}

void loop() {
  unsigned long now = millis();
  if (now > nextHeartbeat) {
    Serial.print('.');
    nextHeartbeat = now + 1000;
  }

  while (Serial.available()) {
    // get the new byte:
    char inChar = (char)Serial.read();
    if (inChar == '0') {
      digitalWrite(RELAY_PIN, LOW);
      digitalWrite(ONBOARD_LED, LOW);
    }
    if (inChar == '1') {
      digitalWrite(RELAY_PIN, HIGH);
      digitalWrite(ONBOARD_LED, HIGH);
    }
  }
}
