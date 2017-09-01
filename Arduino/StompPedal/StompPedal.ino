

//https://thegarage.dozuki.com/Guide/How+to+reprogram+your+Big+Red+Button+(Teensy+Version)/1

bool debounce = 1;

void setup() {
  Serial.begin(9600);
  pinMode(10, INPUT);
  digitalWrite(10, HIGH);  // C7
}

void loop() {
  // put your main code here, to run repeatedly:
  if (digitalRead(10) == LOW && debounce > 0) {
    Serial.print("d");
    debounce = 0;  // no  spaces allowed anymore
    delay(500);

    /*
     * previous code
    Keyboard.press(KEY_SPACE);
    delay(10);
    Keyboard.release(KEY_SPACE);
    spacesAllowed = 0;  // no  spaces allowed anymore
    delay(1000);
    */

  }
  if (digitalRead(10) == HIGH) {
    delay(5);
    debounce = 1;  // button is up again
  }
}
