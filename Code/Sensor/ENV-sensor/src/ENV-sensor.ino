/*
This code operates the environmental sensors designed for the MDRS.
These sensors measure the following variables:
-Temperature
-Humidity
-Pressure
-CO2 concentration
-VOC index
-Luminosity

@Author : Robin Gorius
@Date : 12/24
*/

#include <Arduino.h>
#include <SPIFFS.h>
#include <ESPmDNS.h>
#include <Wire.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#include "Sensors.h"
#include "Display.h"
#include "ConfigWifi.h"
#include "ConfigServer.h"

#define BUTTON_PIN 18
#define LED_PIN 2
 
Display display;
Sensors sensors(&display, 7, 0, 0, 0, 0);//class that manages all sensors
ConfigWifi SPIFFSWifi;//class that manages internal storage and wifi connection from internal storage
ConfigServer server(&sensors, &SPIFFSWifi, 80);//class that manages the configuration server

volatile unsigned long lastDisplayChange = 0;
const unsigned long debounceDelay = 200;  // Debounce delay in milliseconds
volatile int buttonPresses = 0;
volatile int displaysNumber = 5;
unsigned long last_read = 0;//time of the last sensor read
boolean dispOK = true;//flag to know if displaying measurements is available
//bool sensorStatus = true;

void IRAM_ATTR changeDisplay() {
  unsigned long currentMillis = millis();
  // Debounce
  if (currentMillis - lastDisplayChange > debounceDelay) {
    lastDisplayChange = currentMillis;
    buttonPresses++;
    sensors.index = buttonPresses % displaysNumber;
    //Serial.println("Button pressed, new display mode: " + String(sensors.index));
  }
}

void displayNetInfos(int index){
  switch(index){
    
    case 0:
    display.disp2Lines("Sensor name", SPIFFSWifi.nomCapteur, 2,2);
    break;

    case 1:
    display.disp2Lines("Mode : ", SPIFFSWifi.wifiStatString(SPIFFSWifi.WifiMode),2, 2);
    break;

    case 2:
    if(SPIFFSWifi.WifiMode == 1){
      display.disp2Lines("Network :", WiFi.SSID() ,2, 1);
    }
    else if(SPIFFSWifi.WifiMode == 2){
      display.disp2Lines("AP SSID :", WiFi.softAPSSID() ,2, 1);
    }
   
    break;

    case 3:
    if(SPIFFSWifi.WifiMode == 2){//if the condition is not met, the program automatically continues (Warning message "statement may fall through" at compilation is normal)
      display.disp2Lines("AP Pass :", SPIFFSWifi.ApPass ,2, 1);
      break;
    }
    else{
      displayNetInfos(4);
    }
    break;

    case 4:
    if(SPIFFSWifi.WifiMode == 1){
      display.disp2Lines("Network IP :", WiFi.localIP(), 2, 1);
    }

    else if(SPIFFSWifi.WifiMode == 2){
      display.disp2Lines("Local IP :", WiFi.softAPIP(), 2, 1);
    }

    else{
      display.disp2Lines("No Local IP", "Not connected", 2, 1);
    }

    break;

  }
}

void displayInfos(int index){

  switch(index){
    
    case 0:
    displayNetInfos(0);
    break;

    case 1:
    displayNetInfos(1);
    break;

    case 2:
    displayNetInfos(2);
    break;

    case 3:
    displayNetInfos(3);
    break;

    case 4:
    displayNetInfos(4);
    break;

  }
}

void setup() {

  Serial.begin(115200);

  if (!display.begin()) {
    Serial.println(F("SSD1306 fail to init"));
  }
  display.disp2Lines("    MDRS", "Env sensor", 2, 2);
  delay(1500);

  // Initialize sensors
  sensors.begin();
  sensors.readSensors();

  pinMode(2, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);  // Declare button pin as input
  attachInterrupt(digitalPinToInterrupt(BUTTON_PIN), changeDisplay, FALLING);  // Trigger on button press (low level)
  
  SPIFFSWifi.begin();//start SPIFFS, check if default files exist and create them if not
  SPIFFSWifi.printSPIFFS();
  
  display.clearDisplay();
  display.disp2Lines("Testing", "connections", 2, 2);
  delay(1500);

  Serial.println("Trying to connect to a known wifi");
  if(SPIFFSWifi.StationConnect()){//trying to connect to a known network
    Serial.println("Connection to a known network succeeded");
    for(int i = 0; i < 5; i++){
      digitalWrite(2, HIGH);
      delay(100);
      digitalWrite(2, LOW);
      delay(100);
    } 
  }
  //If connection fails or if no network is saved, start in AP mode
  else{//if the connection to a known network fails, create an AP
    Serial.println("No network saved or connection failed.");
    Serial.println("Starting in AP mode");
    Serial.println("Creating access point");
    dispOK = SPIFFSWifi.APConnect(); 
    
    displayInfos(sensors.index);//display the right info according to the index
  }  

  //Configure and start the captive server
  server.startConfigServer();// create the web route and start server
  last_read = millis();//save the starting time to measure time between readings

  // Set up built-in LED (optional)
  pinMode(LED_PIN, OUTPUT);  // Set the pin as output
  digitalWrite(LED_PIN, HIGH);  // Turn on LED to indicate successful setup
}

void loop() {
  if(SPIFFSWifi.WifiMode == 1){//at each loop check if we're still connected to a local network
    if(WiFi.status() != WL_CONNECTED){//connection lost
      Serial.println("Wifi connection lost");
      SPIFFSWifi.WifiMode = 0;//no connection
      dispOK = SPIFFSWifi.APConnect();
      displayInfos(sensors.index);
    }
  }

  if(server.getConnecting()){//if we received a connection request for a new network on the server
    delay(3000);
    Serial.println("ESP will reset for new connection");
    ESP.restart();
  }
  
  if(millis() - sensors.last_disp > 1000){
    sensors.last_disp = millis();

    if(sensors.index >= 0 && sensors.index <= 4)
    {
      displayInfos(sensors.index);
    }
    else{//if index is out of range, display measurements
      if(dispOK){
        sensors.displayMeasurements();
      }
      else{
        display.clearDisplay();
      }
    }   
  }

  if(millis() - last_read > 3000){//read sensors
    sensors.readSensors();
    last_read = millis();
  }
  
  //if 60s passed without sending the data, reset min, max and average
  if((millis() - server.getLast_send() )> 60000){//reset min, max and avg if a minute passes without sending data
    Serial.println("Resetting min, max and average as no server asked for data");
    sensors.getTemperature().reset();
    sensors.getHumidity().reset();
    sensors.getPressure().reset();
    sensors.getCO2().reset();
    sensors.getIR().reset();
    sensors.getVisibleLuminosity().reset();
    sensors.getFullLuminosity().reset();
    sensors.getLux().reset();
    sensors.getVocIndex().reset();
    sensors.getSraw().reset();
    server.setLast_send(millis());
  }
}
