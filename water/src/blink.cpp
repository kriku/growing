#pragma once
#include <Arduino.h>

void blink(int led_pin, int count, int delay_time, bool led) {
  if (count > 0) {
    digitalWrite(led_pin, led);
    delay(delay_time);
    blink(led_pin, count - 1, delay_time, !led);
  }
}
