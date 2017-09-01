#define RELAY_PIN 13

void setup() {
  pinMode(RELAY_PIN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  while (Serial.available()) {
    // get the new byte:
    char inChar = (char)Serial.read();
    if (inChar == '0') {
      digitalWrite(RELAY_PIN, LOW);
    }
    if (inChar == '1') {
      digitalWrite(RELAY_PIN, HIGH);
    }
  }
}
