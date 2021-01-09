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

struct water {
  int pin;
  bool enabled;
  int tick;
  int left;
};

struct water A;
struct water B;

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  for (int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();

  if ((char)payload[0] == '1') {
    A.enabled = true;
  }

  if ((char)payload[1] == '1') {
    B.enabled = true;
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

  A.pin = PIN_D1;
  A.tick = 3;
  A.left = 3;
  B.pin = PIN_D2;
  B.tick = 3;
  B.left = 3;
}

void watering(struct water *W) {
  if (W->enabled) {
    digitalWrite(W->pin, HIGH);

    if (W->left-- == 0) {
      W->enabled = false;
      W->left = W->tick;
      digitalWrite(W->pin, LOW);
    }
  }
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

    watering(&A);
    watering(&B);

    snprintf(msg, MSG_BUFFER_SIZE, "%d%d", A.enabled, B.enabled);
    Serial.println(msg);
    client.publish(out_topic, msg);

    Serial.println("DONE");
  }
}
