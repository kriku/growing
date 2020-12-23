#include <ESP8266WiFi.h>
#include <PubSubClient.h>

#include "blink.h";
#include "wifi-mqtt.h";
#include "temperature.h";

const char* in_topic = "water/in";
const char* out_topic = "water/out";
const char* temperature_topic = "water/temperature";

#define PIN_D1 5  // gpio5 = D1  PWM_A
#define PIN_D2 4  // gpio4 = D2  PWM_B
#define PIN_D3 0  // gpio0 = D3  DA (A- A+) подключается двигатель
#define PIN_D4 2  // gpio2 = D4  DB (B- B+) подключается двигатель

int pump0 = LOW;
int pump1 = LOW;

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  for (int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();

  if ((char)payload[0] == '1') {
    pump0 = HIGH;
    digitalWrite(PIN_D1, pump0);
  } else {
    pump0 = LOW;
    digitalWrite(PIN_D1, pump0);
  }

  if ((char)payload[1] == '1') {
    pump1 = HIGH;
    digitalWrite(PIN_D2, pump1);
  } else {
    pump1 = LOW;
    digitalWrite(PIN_D2, pump1);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);     // Initialize the BUILTIN_LED pin as an output
  pinMode(PIN_D1, OUTPUT);
  pinMode(PIN_D2, OUTPUT);
  pinMode(PIN_D3, OUTPUT);
  pinMode(PIN_D4, OUTPUT);
  blink(LED_BUILTIN, 8, 100, true);
  digitalWrite(PIN_D3, HIGH);
  digitalWrite(PIN_D4, HIGH);
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
    Serial.println("Publish messages...");
    lastMsg = now;

    float tempC = get_temperature();
    sprintf(msg, "%.2f", tempC);
    Serial.println(msg);
    client.publish(temperature_topic, msg);

    snprintf (msg, MSG_BUFFER_SIZE, "%d%d", pump0, pump1);
    Serial.println(msg);
    client.publish(out_topic, msg);

    Serial.println("DONE");
  }
}
