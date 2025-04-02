#include "ConfigServer.h"

bool ConfigServer::scanning = false;  // Initialisation ici
bool ConfigServer::connecting = false;  // Initialisation ici
unsigned long ConfigServer::last_send = 0;
unsigned long ConfigServer::netScanStartTps = 0;

Sensors* ConfigServer::sensors = nullptr;  // Initialisation à nullptr
ConfigWifi* ConfigServer::SPIFFSWifi = nullptr;

ConfigServer::ConfigServer(Sensors* snrs, ConfigWifi* SpiffWifi, uint16_t port) {
  this->sensors = snrs;
  this->SPIFFSWifi = SpiffWifi;
  server = new AsyncWebServer(port);
}

bool ConfigServer::getScanning() {
  return scanning;
}

bool ConfigServer::getConnecting() {
  return connecting;
}

unsigned long ConfigServer::getLast_send(){
  return last_send;
}

void ConfigServer::setConnecting(bool val) {
  connecting = val;
}

void ConfigServer::setScanning(bool val){
  scanning = val;
}

void ConfigServer::setLast_send(unsigned long val){
  last_send = val;
}

void ConfigServer::startConfigServer() {
    server->on("/", HTTP_GET, ConfigServer::handleRoot);
    server->on("/hotspot-detect.html", HTTP_GET, ConfigServer::handleHotspotDetect);
    server->on("/generate_204", HTTP_GET, ConfigServer::handleGenerate204);
    server->on("/styleMain.css", HTTP_GET, ConfigServer::handleStyleMain);
    server->on("/scriptMain.js", HTTP_GET, ConfigServer::handleScriptMain);
    server->on("/logo.png", HTTP_GET, ConfigServer::handleLogo);
    
    server->on("/NewNetwork", HTTP_POST, [](AsyncWebServerRequest *request) {
        // Rien ici, le corps de la requête sera traité dans onRequestBody
    }, NULL, ConfigServer::handleNewNetwork);

    server->on("/getMesurements", HTTP_POST, [](AsyncWebServerRequest *request) {
        // Rien ici, le corps de la requête sera traité dans onRequestBody
    }, NULL, ConfigServer::handleGetMesurements);

    server->on("/deleteNetwork", HTTP_POST, [](AsyncWebServerRequest *request) {
        // Rien ici, le corps de la requête sera traité dans onRequestBody
    }, NULL, ConfigServer::handleDeleteNetwork);

    server->on("/NewInfos", HTTP_POST, [](AsyncWebServerRequest *request) {
        // Rien ici, le corps de la requête sera traité dans onRequestBody
    }, NULL, ConfigServer::handleNewInfos);

    server->on("/NetScan", HTTP_POST, ConfigServer::handleNetScan);

    server->on("/GetScanResults", HTTP_POST, ConfigServer::handleGetScanResults);

    server->on("/NetLoad", HTTP_POST, [](AsyncWebServerRequest *request) {
        // Rien ici, le corps de la requête sera traité dans onRequestBody
    }, NULL, ConfigServer::handleNetLoad);

    server->on("/LoadConfig", HTTP_POST, [](AsyncWebServerRequest *request) {
        // Rien ici, le corps de la requête sera traité dans onRequestBody
    }, NULL, ConfigServer::handleLoadConfig);

    server->begin();
}

String ConfigServer::processor(const String& var) {
  if (var == "NOM") {
    return SPIFFSWifi->nomCapteur;
  }
  return String();
}

void ConfigServer::handleRoot(AsyncWebServerRequest *request) {
  request->send(SPIFFS, "/Web/main.html", String(), false, processor);
}

void ConfigServer::handleHotspotDetect(AsyncWebServerRequest *request) {
  request->send(SPIFFS, "/Web/main.html", String(), false);
}

void ConfigServer::handleGenerate204(AsyncWebServerRequest *request) {
  request->send(SPIFFS, "/Web/main.html", String(), false);
}

void ConfigServer::handleStyleMain(AsyncWebServerRequest *request) {
  request->send(SPIFFS, "/Web/styleMain.css", "text/css");
}

void ConfigServer::handleScriptMain(AsyncWebServerRequest *request) {
  request->send(SPIFFS, "/Web/scriptMain.js", "text/javascript");
}

void ConfigServer::handleLogo(AsyncWebServerRequest *request) {
  Serial.println("Logo commande reçue");
  request->send(SPIFFS, "/Web/logo.png", "image/png");
}

void ConfigServer::handleNewNetwork(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
  // Le corps de la requête est reçu ici
  String jsonString = "";
  Serial.print("received string len : ");
  Serial.println(len);
  for (size_t i = 0; i < len; i++) {
    jsonString += (char)data[i];
  }
  Serial.println(jsonString);
  // Analyse du JSON reçu
  JsonDocument jsonDoc;
  DeserializationError error = deserializeJson(jsonDoc, jsonString);

  if (!error) {
    String ssid = jsonDoc["SSID"];  // Récupère la valeur du champ "SSID"
    String pass = jsonDoc["pass"];  // Récupère la valeur du champ "pass"
    String secu = jsonDoc["SECU_TYPE"];
    String userName = "";
    bool WPA2Entr = false;

    if (secu == "WPA2_Enterprise") {
      WPA2Entr = true;
    }

    Serial.print("SSID: ");
    Serial.println(ssid);
    Serial.print("Sécu type: ");
    Serial.println(secu);
    if (WPA2Entr) {
      Serial.print("User: ");
      userName = jsonDoc["USER"].as<String>();
      Serial.println(userName);
    }
    Serial.print("Pass : ");
    Serial.println(pass);

    bool success = SPIFFSWifi->writeNetworkInfoToSPIFFS(ssid, pass,secu, userName, false);
    
    if(success){
      request->send(200, "application/json", "{\"status\":\"success\",\"message\":\"Réseau enregistré\"}");
    }
    else{
      request->send(503, "application/json", "{\"status\":\"error\",\"message\":\"Echec de l'enregistrement\"}");
    }

    Serial.println("Showing done, moving on");
    connecting = true;  //force esp to restart
  } else {
    // En cas d'erreur dans la réception ou le parsing du JSON
    request->send(400, "application/json", "{\"status\":\"error\",\"message\":\"JSON invalide\"}");
  }
}

void ConfigServer::handleGetMesurements(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
  String response;
  JsonDocument jsonResponse;

  jsonResponse["Temp"] = sensors->getTemperature().toJson();
  jsonResponse["Hum"] = sensors->getHumidity().toJson();
  jsonResponse["Pres"] = sensors->getPressure().toJson();

  jsonResponse["Lum"] = sensors->getLux().toJson();
  jsonResponse["IR"] = sensors->getIR().toJson();
  jsonResponse["FullLum"] = sensors->getFullLuminosity().toJson();
  jsonResponse["Visible"] = sensors->getVisibleLuminosity().toJson();

  jsonResponse["CO2"] = sensors->getCO2().toJson();
  jsonResponse["VOC"] = sensors->getVocIndex().toJson();

  serializeJson(jsonResponse, response);
  //Serial.println(response);
  last_send = 0;
  request->send(200, "application/json", response);
}

void ConfigServer::handleDeleteNetwork(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
  // Le corps de la requête est reçu ici
  String jsonString = "";
  for (size_t i = 0; i < len; i++) {
    jsonString += (char)data[i];
  }

  // Analyse du JSON reçu
  JsonDocument jsonDoc;
  DeserializationError error = deserializeJson(jsonDoc, jsonString);

  if (!error) {
    
    String SSID = "";
    JsonObject documentRoot = jsonDoc.as<JsonObject>();
    for (JsonPair keyValue : documentRoot) {
      SSID = keyValue.key().c_str();
      Serial.print("SSID file to delete : ");
      Serial.println(SSID + ".txt");
      SPIFFSWifi->deleteNetwork(SSID);
    }
    // Envoie une réponse JSON au client
    request->send(200, "application/json", "{\"status\":\"success\",\"message\":\"Réseau supprimé\"}");

    SPIFFSWifi->printSPIFFS();

    Serial.println("Showing done, moving on");


  } else {
    // En cas d'erreur dans la réception ou le parsing du JSON
    request->send(400, "application/json", "{\"status\":\"error\",\"message\":\"JSON invalide\"}");
  }
}

void ConfigServer::handleNewInfos(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
  // Le corps de la requête est reçu ici
  String jsonString = "";
  for (size_t i = 0; i < len; i++) {
    jsonString += (char)data[i];
  }

  // Analyse du JSON reçu
  JsonDocument jsonDoc;
  DeserializationError error = deserializeJson(jsonDoc, jsonString);

  Serial.println("Setting event");
  if (!error) {
    String AP_SSID = jsonDoc["AP_SSID"];
    String AP_Pass = jsonDoc["AP_Pass"];
    String name = jsonDoc["Name"];

    Serial.print("AP_SSID : ");
    Serial.println(AP_SSID);
    Serial.print("AP_pass : ");
    Serial.println(AP_Pass);
    Serial.print("Sensor Name : ");
    Serial.println(name);

    if (SPIFFSWifi->writeConfigFile(AP_SSID, AP_Pass, name)) {
      // Envoie une réponse JSON au client
      Serial.println("Setting changed");
      request->send(200, "application/json", "{\"status\":\"success\",\"message\":\"COnfiguration modifiée\"}");
    }

    Serial.println("Showing done, moving on");


  } else {
    // En cas d'erreur dans la réception ou le parsing du JSON
    request->send(400, "application/json", "{\"status\":\"error\",\"message\":\"JSON invalide\"}");
  }
}

void ConfigServer::handleNetScan(AsyncWebServerRequest *request) {
  Serial.println("Received /NetScan request");

  if (!scanning) {
    netScanStartTps = millis();
    WiFi.scanNetworks(true);  // Démarre un scan non bloquant
    scanning = true;          // Signaler que le scan est en cours
    request->send(200, "application/json", "{\"s\":\"success\",\"message\":\"Scan started\"}");
  } 
  else {
    scanning = true;
    request->send(200, "application/json", "{\"s\":\"success\",\"message\":\"Scan already started\"}");
  }
}

void ConfigServer::handleGetScanResults(AsyncWebServerRequest *request) {
  JsonDocument jsonResponse;
  int nbNetworks = WiFi.scanComplete();

  Serial.print("Received /GetScanResults request : ");

  if((scanning) && (millis() -  netScanStartTps > 60000)){
    scanning = false;
    Serial.println("fail to finish scanning in a minute");
    request->send(200, "application/json", "{\"s\":\"error\",\"message\":\"Scan failled to finish in time\"}");
  }

  else if (scanning && nbNetworks >= 0) {
    nbNetworks = WiFi.scanComplete(); // Nombre de réseaux trouvés
    scanning = false; // Indiquer que le scan est terminé
    Serial.println("Scan finished");
  }

  else if (scanning) {
    Serial.println("Scan in progress");
    request->send(200, "application/json", "{\"s\":\"in_progress\",\"message\":\"Scan still in progress\"}");
    return;
  }

  else{
    Serial.println("Scan not started");
    request->send(200, "application/json", "{\"s\":\"error\",\"message\":\"Scan not started yet\"}");
  }
  

  // Construire la réponse JSON
  if (nbNetworks > 0) {
    for (int i = 0; i < nbNetworks; i++) {
      String ssid = WiFi.SSID(i);
      int rssi = WiFi.RSSI(i);

      String securityType = SPIFFSWifi->getEncryptionType(WiFi.encryptionType(i));
      JsonObject networkInfo = jsonResponse[ssid].to<JsonObject>();
      networkInfo["RSSI"] = rssi;
      networkInfo["SECU_TYPE"] = securityType;
      /*{
                "Network_1": {
                    "RSSI": -45,
                    "SECU_TYPE": "WPA2_PSK"
                },
                "Network_2": {
                    "RSSI": -80,
                    "SSECU_TYPE": "Non sécurisé"
                },
                "Network_3": {
                    "RSSI": -60,
                    "SECU_TYPE": "WPA_PSK"
                }
              }
            */
    }
    jsonResponse["s"] = "success";
  } else {
    jsonResponse["s"] = "error";
    jsonResponse["message"] = "No networks found.";
  }

  // Nettoyer les résultats du scan
  WiFi.scanDelete();
  scanning = false;

  // Sérialiser et envoyer la réponse
  String response = "";
  serializeJson(jsonResponse, response);
  request->send(200, "application/json", response);
}

void ConfigServer::handleNetLoad(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
  String response = "";

  /*
      Read the network infos from the file SSID.txt (already exist)
      Recover :
      -SSID
      -secu type
      -user id (if needed)
      -Password
      -Static IP
      -Default gateway IP
      -Subnet mask 
      -failures

      Configure the wifi with this infos
      Connect to the wifi
      */

  JsonDocument jsonResponse = ConfigServer::SPIFFSWifi->loadNetworks();

  if(jsonResponse["s"] == "error"){
    request->send(500, "application/json", "{\"status\":\"error\",\"message\":\"Failed to load networks list\"}");
    return;
  }

  serializeJson(jsonResponse, response);

  Serial.println("SPIFFS files loaded successfully. Sending response...");
  request->send(200, "application/json", response);
}

void ConfigServer::handleLoadConfig(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
  String response = "";
  JsonDocument jsonResponse;
  String AP_ssid = "";
  String AP_pass = "";
  String nom = "";

  Serial.println("Loading config from SPIFFS...");

 /* if (!SPIFFS.begin(true)) {
    request->send(400, "application/json", "{\"status\":\"error\",\"message\":\"SPIFFS mounting failed\"}");
    return;
  }

  File setting = SPIFFS.open("/Config/Config.csv", FILE_READ);

  AP_ssid = setting.readStringUntil('\n');  //Read AP ssid
  AP_pass = setting.readStringUntil('\n');  //read AP pass
  nom = setting.readStringUntil('\n');      //read sensor hostname

  AP_ssid.remove(AP_ssid.length() - 1);
  AP_pass.remove(AP_pass.length() - 1);
  nom.remove(nom.length() - 1);

  setting.close();
*/

  AP_ssid =  SPIFFSWifi->ApName;
  AP_pass =  SPIFFSWifi->ApPass;
  nom =  SPIFFSWifi->nomCapteur;
  
  Serial.println("read infos");

  Serial.println(AP_ssid);
  Serial.println(AP_pass);
  Serial.println(nom);

  if ((AP_ssid != "") && (AP_pass != "") && (nom != "")) {
    jsonResponse["AP_SSID"] = AP_ssid;
    jsonResponse["AP_pass"] = AP_pass;
    jsonResponse["nom"] = nom;
    jsonResponse["s"] = "success";

    serializeJson(jsonResponse, response);

    Serial.println("Succès de la lecture des infos");
    request->send(200, "application/json", response);

  } else {
    Serial.println("fail to read empty ?");
    request->send(500, "application/json", "{\"status\":\"error\",\"message\":\"Config file is empty\"}");
  }
}