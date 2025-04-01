#ifndef CONFIGSERVER_H
#define CONFIGSERVER_H

/*
This class allows setting up a captive server.
This server allows:
-Consulting and deleting networks registered in the ESP's SPIFF
-Connecting the ESP to a new network
-Reading and Modifying sensor-specific information (Name, AP SSID, AP Password)

 /!\ This class cannot ensure the security of passwords and information transmitted on the local network
 /!\ This server is an HTTP server and passwords are stored as-is in text files in the ESP's internal memory

@Author: Robin Gorius
@Date: 12/24

*/

#include <WiFi.h>
#include "esp_eap_client.h"

#include "ESPAsyncWebServer.h"
#include <ArduinoJson.h>
#include <esp_system.h>
#include "ConfigWifi.h"
#include "Sensors.h"

class ConfigServer {
  private:
    AsyncWebServer *server;  // Server declaration
    
    static bool scanning;   // Network scan state (static because used in Async server's static functions)
    static bool connecting; //connection state
    static unsigned long last_send;
    static unsigned long netScanStartTps;

  public:
    static Sensors *sensors;
    static ConfigWifi *SPIFFSWifi;//needs to be public because accessed in asynchronous context by the server

    // Constructor that initializes the server
    ConfigServer(Sensors* snrs, ConfigWifi* SpiffWifi, uint16_t port = 80);//Constructor that initializes internal variables, notably pointers to other functionalities (sensors, display and Wifi/SPIFFS)

    void startConfigServer();//Configure routes and start HTTP server

    static String processor(const String& var);
    static void handleRoot(AsyncWebServerRequest *request);//serves the main html page
    static void handleHotspotDetect(AsyncWebServerRequest *request);//responds to the request sent by IOS to identify a hotspot without internet
    static void handleGenerate204(AsyncWebServerRequest *request);//responds to the request sent by android to identify a hotspot without internet
    static void handleStyleMain(AsyncWebServerRequest *request);//send the CSS
    static void handleScriptMain(AsyncWebServerRequest *request);//send the JavaScript
    static void handleLogo(AsyncWebServerRequest *request);//send the logo
    static void handleNewNetwork(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total);//manages the reception and processing of a new connection request to a network
    static void handleGetMesurements(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total);//Sending the latest sensor data
    static void handleDeleteNetwork(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total);//Manages the deletion of a saved network
    static void handleNewInfos(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total);//Manages the reception of new information for the sensors (name, Ap ssid, Ap pass)
    static void handleNetScan(AsyncWebServerRequest *request);//handles the reception of a network scan request
    static void handleGetScanResults(AsyncWebServerRequest *request);//handles the receipt of a network scan result request
    static void handleNetLoad(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total);//manages the sharing request of registered networks
    static void handleLoadConfig(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total);//manages the request to share sensor information

    bool getScanning();//getters
    bool getConnecting();
    unsigned long getLast_send();
    void setScanning(bool val);//setters
    void setConnecting(bool val);
    void setLast_send(unsigned long val);
};

#endif