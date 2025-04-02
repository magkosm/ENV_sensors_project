#ifndef SENSORS_H
#define SENSORS_H

/*
Cette classe permet de gérer l'ensemble des capteurs contenue dans les capteurs environnementaux de la MDRS.
Les grandeurs mesurées sont : 
-Température
-Humidité
-Pression
-Concentration en CO2
-Indice VOC
-Luminosité Visible, Infrarouge, Totale, Lux

Cette classe s'appuie sur la classe Grandeur ainsi que sur les bibliothèques (= classes) spécifiques à chaque capteur

@Auteur : Robin Gorius
@Date : 12/24
*/

#include <Wire.h>//I2C sur l'ESP
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
#define BME280_ADDR 0x76//adresse I2C du BME280

class Sensors {
  private:
    SCD4x SCD40;
    Adafruit_BME280 bme; // use I2C interface
    Adafruit_TSL2591 tsl = Adafruit_TSL2591(2591); // pass in a number for the sensor identifier (for your use later)
    Adafruit_SGP40 sgp;
    Display* display;

    // Objets de type Grandeur pour chaque grandeur mesurées par les capteurs
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
    
    Sensors(Display* oledDisplay, float dt, float dh, float dp, float dco, float dvoc);  // Constructeur de la classe permettant aussi un étalonage grosssier des grandeurs
    void begin();  // Initialisation des capteurs
    void readSensors();  // Lecture des valeurs des capteurs
    void displayMeasurements();  // Affichage des mesures sur l'écran OLED
    void printTSLValues();
    void printSCDValues();
    void printBMEValues();
    void printSGPValues();
    /*void drawTruncatedText(String text, int maxWidth, int xOffset, int yOffset);
    void drawPartialCharacter(char character, int width, int x, int y);*/
    
    // Getters pour chaque grandeur
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
    void afficheGrandeur(String grandeur, float valeur, String unite, int space = 3);
    
};

#endif // SENSORS_H
