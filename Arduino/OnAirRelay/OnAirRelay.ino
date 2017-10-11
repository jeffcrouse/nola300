#define RELAY_PIN 12
#define ONBOARD_LED 13

void setup() {
  pinMode(ONBOARD_LED, OUTPUT);
  pinMode(RELAY_PIN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
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
