#ifndef GRANDEUR_H
#define GRANDEUR_H

#include <Arduino.h>
#include <ArduinoJson.h>

/*
This class allows performing a simple (very) statistical study on sensor measurements over a given time
@Author: Robin Gorius
@Date: 12/24
*/
class Grandeur {
private:
    String name;

    float min;
    float max;
    float moy;

    float lastVal;

    int nv_mes;
    float raw;

    float offset;//calibration of the magnitude with a gain SUBTRACTED from raw measurements. If the sensor reads 25 instead of 20 put a gain of 5, if the sensor reads 20 instead of 25 put a gain of -5!

public:
    float newVal = -1;

    // Constructor
    Grandeur(String gName, float off);

    // Getters
    float getMin() const;
    float getMax() const;
    float getMoy() const;
    int getNvMes() const;
    float getRaw() const;
    float getLastVal() const;

    void update();// Update sensor data
    void reset();// Reset data to avoid overflow and other issues
    void print();// Display sensor data

    JsonDocument toJson(); //Convert stored data to JSON
};

#endif // GRANDEUR_H
