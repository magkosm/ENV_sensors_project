#ifndef CONFIGWIFI_H
#define CONFIGWIFI_H

/*
This class allows the management of ESP WiFi networks by storing information in the embedded file manager (SPIFFS).
It allows:
-Management of registered WiFi networks
-Management of WiFi connection and connection error handling
-Management of sensor information (Name, AP SSID, AP Pass);

This class ensures that there is always a configuration file in the ESP's SPIFFS before starting to avoid blocking the sensor. The default values are:
-Name: Sensor
-AP SSID: Sensor
-AP PASS: #MDRS311Sensors!

 /!\ This implementation of a password manager cannot ensure total security of connection information (passwords) as they are stored directly in a .txt file in SPIFFS
 A future improvement will be to implement a system for encrypting .txt files

@Author: Robin Gorius
@Date: 12/24
*/

#include "SPIFFS.h"
#include <WiFi.h>
#include <ESPmDNS.h>
#include <ArduinoJson.h>

class ConfigWifi {

public:
    String nomCapteur;//Public variables for easier access
    String ApName;
    String ApPass;

    int WifiMode; // 0 disconnected, 1 connected, 2 AP

    bool begin();//initializes SPIFFS and class variables
    bool failToConnect();//Returns true if WiFi connection failed or if no response is received from the router in less than 20s
    bool writeNetworkInfoToSPIFFS(String ssid, String pass, String secu, String user, bool connected);//Writes network connection information to a .txt file. If it is connected (connected = true) this function also writes the static IP of the sensor, the default gateway and the subnet mask
    bool deleteNetwork(String ssid);//Deletes the network named ssid from SPIFFS, returns true on success, false otherwise
    JsonDocument loadNetworks();//Returns the Json containing all information of all networks stored in SPIFFS
    int connectFromSPIFFS(String SSID);//Connects to the SSID WiFi network using information in SPIFFS and also creates the sensor's DNS instance on the network using its name
    int initWifiFromSPIFFS();//Compares networks known by ESP and stored in SPIFFS to available networks and tries to connect to the first matching network using connectFromSPIFFS(SSID)
    bool writeConfigFile(String SSID, String pass, String name);//Writes the sensor configuration file
    bool configureAP();//Configures the access point based on information contained in Config.csv in SPIFFS
    bool printSPIFFS();//Displays the contents of SPIFFS in the terminal
    String getEncryptionType(int encryptionType);//Converts the WiFi library code corresponding to a network's security type to String
    String wifiStatString(int index); //Converts the WiFi library code corresponding to WiFi status to String
};

#endif
