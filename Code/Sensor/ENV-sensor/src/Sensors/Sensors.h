#ifndef SENSORS_H
#define SENSORS_H

/*
This class manages all sensors contained in the MDRS environmental sensors.
The measured quantities are:
-Temperature
-Humidity
-Pressure
-CO2 Concentration
-VOC Index
-Visible, Infrared, Total Luminosity, Lux

This class relies on the Grandeur class and on specific libraries (= classes) for each sensor

@Author: Robin Gorius
@Date: 12/24
*/

#include <Wire.h>//I2C on ESP
#include "SparkFun_SCD4x_Arduino_Library.h" // SCD40
#include <Adafruit_Sensor.h> 
#include <Adafruit_BME280.h> 
#include "Adafruit_TSL2591.h"
#include "Adafruit_SGP40.h"
#include "Display.h"
#include <Adafruit_GFX.h>
#include "Grandeur.h"

#define SEALEVELPRESSURE_HPA (1013.25)
#define SCD40_ADDR
#define SGP40_ADDR
#define BME280_ADDR 0x76//I2C address of BME280

class Sensors {
  private:
    SCD4x SCD40;
    Adafruit_BME280 bme; // use I2C interface
    Adafruit_TSL2591 tsl = Adafruit_TSL2591(2591); // pass in a number for the sensor identifier (for your use later)
    Adafruit_SGP40 sgp;
    Display* display;

    // Objects of type Grandeur for each quantity measured by the sensors
    Grandeur temp;
    Grandeur hum;
    Grandeur pres;
    Grandeur alt;
    Grandeur CO2;
    Grandeur IR;
    Grandeur Full;
    Grandeur Visible;
    Grandeur lux;
    Grandeur sraw;
    Grandeur Voc_Index;

    
  public:
    volatile int index = 0;
    volatile unsigned long last_disp = 0;
    
    Sensors(Display* oledDisplay, float dt, float dh, float dp, float dco, float dvoc);  // Class constructor that also allows rough calibration of quantities
    void begin();  // Initialize sensors
    void readSensors();  // Read sensor values
    void displayMeasurements();  // Display measurements on OLED screen
    void printTSLValues();
    void printSCDValues();
    void printBMEValues();
    void printSGPValues();
    /*void drawTruncatedText(String text, int maxWidth, int xOffset, int yOffset);
    void drawPartialCharacter(char character, int width, int x, int y);*/
    
    // Getters for each quantity
    Grandeur& getTemperature();
    Grandeur& getHumidity();
    Grandeur& getPressure();
    Grandeur& getAltitude();
    Grandeur& getCO2();
    Grandeur& getIR();
    Grandeur& getFullLuminosity();
    Grandeur& getVisibleLuminosity();
    Grandeur& getLux();
    Grandeur& getSraw();
    Grandeur& getVocIndex();

  private:
    void getTSLValues(float &ir, float &full, float &visible, float &lux);
    bool calibrateSCD40(SCD4x &sensor, float tempOffset = 5.0, float sensorAltitude = 0, float ambientPressure = 101325);
    bool getSCDValues(float &co2);
    void getBMEValues(float &t, float &p, float &h, float &a, float seaLevel = SEALEVELPRESSURE_HPA);
    void getSGPValues(float t, float h, float &sraw, float &voc_index);
    void displayMeasurement(String measurement, float value, String unit, int space = 3);
    
};

#endif // SENSORS_H
