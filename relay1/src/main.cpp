#include "blink.h";
#include "wifi-mqtt.h";

const char* in_topic = "relay1/in";
const char* out_topic = "relay1/out";

#define RELAY_PIN 0
#define LED_BUILTIN 2

// HIGH - relay closed
int value = HIGH;

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  for (int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();

  if ((char)payload[0] == '1') {
    value = HIGH;
    digitalWrite(RELAY_PIN, value);
    blink(LED_BUILTIN, 4, 100, true);
  } else {
    value = LOW;
    digitalWrite(RELAY_PIN, value);
    blink(LED_BUILTIN, 4, 100, true);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);     // Initialize the BUILTIN_LED pin as an output
  pinMode(RELAY_PIN, OUTPUT);
  blink(LED_BUILTIN, 8, 100, true);
  digitalWrite(RELAY_PIN, value);
  setup_wifi();
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect(in_topic, out_topic);
  }
  client.loop();

  unsigned long now = millis();
  if (now - lastMsg > 2000) {
    lastMsg = now;
    Serial.println("Publish messages...");

    snprintf (msg, MSG_BUFFER_SIZE, "%d", value);
    Serial.println(msg);
    client.publish(out_topic, msg);

    Serial.println("DONE");
    blink(LED_BUILTIN, 2, 200, true);
  }
}
