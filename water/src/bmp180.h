#pragma once
#include <Wire.h>
#include <Adafruit_BMP085.h>

Adafruit_BMP085 bmp;


void setup() {
  Serial.begin(115200);
  Wire.begin(5, 6);
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
    if (!bmp.begin()) {
      Serial.println("Could not find a valid BMP085 sensor, check wiring!");
      client.publish(out_topic, "bmp180 init fail");
    } else {
      lastMsg = now;
      Serial.println("Publish messages...");

      double t = bmp.readTemperature();
      snprintf(msg, MSG_BUFFER_SIZE, "%.4f", t);

      Serial.println(msg);
      client.publish(out_topic, msg);
    }

    Serial.println("DONE");
  }
}
