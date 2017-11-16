#define PEDAL_PIN 10

//https://thegarage.dozuki.com/Guide/How+to+reprogram+your+Big+Red+Button+(Teensy+Version)/1

bool debounce = 1;
unsigned long nextHeartbeat;


void setup() {
  Serial.begin(9600);
  pinMode(PEDAL_PIN, INPUT);
  digitalWrite(PEDAL_PIN, HIGH);  // C7
  nextHeartbeat = millis() + 1000;
}

void loop() {
  unsigned long now = millis();
  if (now > nextHeartbeat) {
    Serial.print('!');
    nextHeartbeat = now + 1000;
  }


  // put your main code here, to run repeatedly:
  if (digitalRead(PEDAL_PIN) == LOW && debounce > 0) {
    Serial.print("d");
    debounce = 0;  // no  spaces allowed anymore
    delay(500);

    /*
       previous code
      Keyboard.press(KEY_SPACE);
      delay(10);
      Keyboard.release(KEY_SPACE);
      spacesAllowed = 0;  // no  spaces allowed anymore
      delay(1000);
    */

  }
  if (digitalRead(PEDAL_PIN) == HIGH) {
    delay(5);
    debounce = 1;  // button is up again
  }
}
