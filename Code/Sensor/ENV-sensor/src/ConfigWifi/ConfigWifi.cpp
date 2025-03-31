#include "ConfigWifi.h"

bool ConfigWifi::begin(){

  nomCapteur = "";
  ApPass = "";
  ApName ="";
  WifiMode = 0;

  Serial.println("setting Wifi Mode to 0 in configWifi begin");

  if (!SPIFFS.begin(true)) {
    Serial.println("Erreur lors du montage du SPIFFS");
    return false;
  }
  else{
    // Vérifie si le fichier existe
    if (SPIFFS.exists("/Config/Config.csv")) {
      Serial.println("Config file exist");
    } 
    else {
      Serial.println("Config file n'existe pas, création");
      writeConfigFile("Capteur", "#MDRS311sensors!", "Capteur");//ssid, mdp, nom par defaut
    }

  }

  return true;
}

bool ConfigWifi::failToConnect() {
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED) {//fonctionnement non bloquant car l'esp à 2 cores
    delay(500);
    Serial.print(".");

    if ((millis() - start) > 40000) {
      Serial.println("Connexion failed");
      return true;
    }
  }
  return false;
}

bool ConfigWifi::writeNetworkInfoToSPIFFS(String ssid, String pass, String secu, String user, bool connected) {
  /*
  Add the network info to the file system. This function assume that the esp is connected to the SSID wifi if connected is set to true
  the file stucture is:
  Name : SSID.txt
  Content:
  SSID
  Secu type
  user (if secu == WPA2_Entreprise)
  PASS
  IP
  Gateway IP
  Subnet mask
  fails
  */

  IPAddress Ip;
  IPAddress defaultGateway;
  IPAddress maskSubnet;

  if(connected){
    Ip = WiFi.localIP();
    defaultGateway = WiFi.gatewayIP();
    maskSubnet = WiFi.subnetMask();
  }

  if (!SPIFFS.begin(true)) {
    Serial.println("An Error has occurred while mounting SPIFFS");
    return false;
  }

  File file = SPIFFS.open("/Networks/" + ssid + ".txt", FILE_WRITE);

  if (!file) {
    Serial.println("Failed to open file for writing");
    file.close();
    return false;  // Sortie de la fonction ici
  }

  if (file.println(ssid)) {
    Serial.println("writting down network infos");
    if(connected){
      Serial.print("-Ip written : ");
      Serial.println(Ip.toString());
      Serial.print("--Gateway written : ");
      Serial.println(defaultGateway.toString());
      Serial.print("---Subnet mask written : ");
      Serial.println(maskSubnet.toString());
    }
    file.println(secu);
    if(secu == "WPA2_Enterprise"){
      file.println(user);
      Serial.println("USER WRITTEN");
    }
    file.println(pass);
    if(connected){
      file.println(Ip.toString());
      file.println(defaultGateway.toString());
      file.println(maskSubnet.toString());
      file.println(0);  //failure count, if connected = 0
    }
    else{
      file.println(-1);  //static ip
      file.println(-1);  //default gateway
      file.println(-1);  //subnetmask
      file.println(-1);  //fail counter
    }
    file.close();
  } else {
      file.close();
      Serial.println("Fail to write");
    return false;
  }

  //Serial.println("----------------------------");
  return true;
}

bool ConfigWifi::deleteNetwork(String SSID){

  if(SPIFFS.remove("/Networks" + SSID + ".txt")){
    return true;
  }
  else{
    return false;
  }

}

JsonDocument ConfigWifi::loadNetworks(){
  JsonDocument jsonResponse;

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
  String Rssid = "";
  String Rsecu = "";
  String Ruser = "";
  String Rpass = "";
  String RIp = "";
  String RdefaultGateway = "";
  String RmaskSubnet = "";

  Serial.println("Loading networks from SPIFFS...");

  File root = SPIFFS.open("/Networks");

  if (!root || !root.isDirectory()) {
    Serial.println("fail to open root");
    jsonResponse["s"] = "error";
    return jsonResponse;
  }

  File file = root.openNextFile();
  String fname;

  while (file) {
    yield();  // Permettre au WDT de se réinitialiser

    fname = file.name();
    if (fname.endsWith(".txt")) {

      Rssid = file.readStringUntil('\n');
      Rsecu = file.readStringUntil('\n');

      Rsecu.remove(Rsecu.length() - 1);  //remove /n

      if (Rsecu == "WPA2_Entreprise") {  //si on a besoin d'un identifiant
        Ruser = file.readStringUntil('\n');
      }

      Rpass = file.readStringUntil('\n');
      RIp = file.readStringUntil('\n');
      RdefaultGateway = file.readStringUntil('\n');
      RmaskSubnet = file.readStringUntil('\n');

      Rssid.remove(Rssid.length() - 1);
      Rpass.remove(Rpass.length() - 1);
      Ruser.remove(Ruser.length() - 1);
      RIp.remove(RIp.length() - 1);  //remove \n caracter
      RdefaultGateway.remove(RdefaultGateway.length() - 1);
      RmaskSubnet.remove(RmaskSubnet.length() - 1);

      JsonObject networkInfo = jsonResponse[Rssid].to<JsonObject>();;
      networkInfo["Pass"] = Rpass;
      networkInfo["SECU_TYPE"] = Rsecu;

      if (Rsecu == "WPA2_Entreprise") {  //si on a besoin d'un identifiant
        networkInfo["USER"] = Ruser;
      }

      networkInfo["Ip"] = RIp;
      networkInfo["Default_Gateway"] = RdefaultGateway;
      networkInfo["Subnet_mask"] = RmaskSubnet;
      /*{
                "Network_1": {
                    "Pass": blablabla,
                    "SECU_TYPE": "WPA2_PSK",
                    "USER" : blabla,
                    "Ip" : 10.0.0.14,
                    "Default_Gateway" : 10.0.0.1,
                    "Subnet_mask" : 255.255.255.0
                },
                "Network_2": {
                    ....
                },
                "s": "success"
              }
            */

      //jsonResponse[fname.substring(0, fname.length() - 4)] = true;  // Supprime ".txt" de l'affichage
    }

    file = root.openNextFile();  // Passe au fichier suivant
  }

  file.close();
  root.close();

  jsonResponse["s"] = "success";


  return jsonResponse;
}

int ConfigWifi::connectFromSPIFFS(String SSID) {
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

  IPAddress RIp;
  IPAddress RdefaultGateway;
  IPAddress RmaskSubnet;

  String nom = "";

  String Rssid = "";
  String Rpass = "";
  String Rsecu = "";
  String Ruser = "";
  int failCount = 0;
  bool connectFail = false;

  if (!SPIFFS.begin(true)) {
    Serial.println("An Error has occurred while mounting SPIFFS");
    return false;
  }

  File setting = SPIFFS.open("/Config/Config.csv", FILE_READ);

  ApName = setting.readStringUntil('\n');//Read AP ssid
  //Serial.println(nom);
  ApPass = setting.readStringUntil('\n');//read AP pass
  //Serial.println(nom);
  nomCapteur = setting.readStringUntil('\n');//read sensor hostname
  //Serial.println(nom);

  nomCapteur.remove(nomCapteur.length() - 1);
  ApPass.remove(ApPass.length() - 1);
  ApName.remove(ApName.length() - 1);

  setting.close();

  File filer = SPIFFS.open("/Networks/" + SSID + ".txt", FILE_READ);

  if (!filer) {
    Serial.println("There was an error opening the file for reading");
    return false;
  }

  Rssid = filer.readStringUntil('\n');

  Rsecu = filer.readStringUntil('\n');

  Rsecu.remove(Rsecu.length() -1);//remove /n

  if(Rsecu == "WPA2_Enterprise"){//si on a besoin d'un identifiant
    Ruser = filer.readStringUntil('\n');
  }

  Rpass = filer.readStringUntil('\n');
  
  String Rips = filer.readStringUntil('\n');
  String Rdefgats = filer.readStringUntil('\n');
  String Rmasks = filer.readStringUntil('\n');
  String fail_count = filer.readStringUntil('\n');

  Rssid.remove(Rssid.length() - 1);
  Rpass.remove(Rpass.length() - 1);
  Ruser.remove(Ruser.length() - 1);
  Rips.remove(Rips.length() - 1);  //remove \n caracter
  Rdefgats.remove(Rdefgats.length() - 1);
  Rmasks.remove(Rmasks.length() - 1);
  fail_count.remove(fail_count.length() - 1);

  filer.close();

  Serial.print("-SSID : ");
  Serial.println(Rssid);
  Serial.print("-Secu : ");
  Serial.println(Rsecu);
  Serial.print("-User : ");
  Serial.println(Ruser);
  Serial.print("-Pass : ");
  Serial.println(Rpass);
  Serial.print("Ip read : ");
  Serial.println(Rips);
  Serial.print("Gateway read : ");
  Serial.println(Rdefgats);
  Serial.print("Subnet mask read : ");
  Serial.println(Rmasks);
  Serial.print("Fail count : ");
  Serial.println(fail_count);
  Serial.print("Setting device name : ");
  Serial.println(nom);

  if (fail_count == "-1" || Rsecu == "WPA2_Enterprise") {  //first connection
    Serial.println("First connection");
    WiFi.setHostname(nom.c_str());
    fail_count = "0";
    
    if(Rsecu == "WPA2_Enterprise"){//réseau d'entreprise
    
      WiFi.disconnect(true);  //disconnect form wifi to set new wifi connection
      WiFi.mode(WIFI_STA);    //init wifi mode

      WiFi.begin(Rssid, WPA2_AUTH_PEAP, Ruser, Ruser, Rpass);
    }
    else{
      WiFi.begin(Rssid, Rpass);
    }
    connectFail = failToConnect();
    if (!connectFail) {  //connexion succeed
      Serial.println("First connexion sucess, saving network infos");
      //String ssid, String pass, String secu, String user = " "
      writeNetworkInfoToSPIFFS(Rssid, Rpass, Rsecu, Ruser, true);
    }
  } 
  else {
      Serial.println("Conecting with static ip");
      RIp.fromString(Rips);
      RdefaultGateway.fromString(Rdefgats);
      RmaskSubnet.fromString(Rmasks);

      if(WiFi.config(RIp, RdefaultGateway, RmaskSubnet)){
        Serial.print("SSID : ");
        Serial.println(Rssid);
        Serial.print("Pass : ");
        Serial.println(Rpass);
        WiFi.setHostname(nom.c_str());

        if(Rsecu == "WPA2_Enterprise"){//réseau d'entreprise
    
          WiFi.disconnect(true);  //disconnect form wifi to set new wifi connection
          WiFi.mode(WIFI_STA);    //init wifi mode

          // Example1 (most common): a cert-file-free eduroam with PEAP (or TTLS)
          WiFi.begin(Rssid, WPA2_AUTH_PEAP, Ruser, Ruser, Rpass);
        }
        else{
          WiFi.begin(Rssid, Rpass);
        }

        connectFail = failToConnect();
      }
  }

  if (connectFail) {

    
    failCount = fail_count.toInt() + 1;

    Serial.print("Connection fail, nb fail : ");
    Serial.print(failCount);
    /*
    if (failCount > 3) {
      SPIFFS.remove("/Networks" + SSID + ".txt");
      Serial.println("Fail 4 times, deleting network");
      return false;
    }*/
  } 
  else {
    failCount = 0;
  }

  if (fail_count.toInt() != failCount) {  //if fail_count changed and need to be updated
    
    Serial.println("Updating fail count ");
    File file = SPIFFS.open("/Networks/" + SSID + ".txt", FILE_WRITE);

    if (!file) {
      Serial.println("Erreur d'ouverture du fichier pour écriture");
      return false;
    }

    file.println(Rssid);
    file.println(Rsecu);
    if(Rsecu == "WPA2_Enterprise"){
      file.println(Ruser);
    }
    file.println(Rpass);
    file.println(Rips);
    file.println(Rdefgats);
    file.println(Rmasks);
    file.println(failCount);

    file.close();
  }

 // Serial.println("----------------------------");
  return failCount;
}

int ConfigWifi::initWifiFromSPIFFS() {
  /*
  Compared all the already knowed network to all available network.
  When a knowed network is available, it try to connect.
  If it fail to connect it remove the knowed network (maybe add a fail counter to the file ?)
  */
  String nom = "";

  String storedSSID[5];
  int n = 0;
  int nbNetworks = 0;

  //Serial.println("Liste des fichiers texte dans le répertoire: /Networks/");

  if (!SPIFFS.begin(true)) {
    Serial.println("An Error has occurred while mounting SPIFFS");
    return false;
  }

  File root = SPIFFS.open("/Networks");

  if (!root) {
    Serial.println("Erreur d'ouverture du répertoire");
    return -1;
  }

  File file = root.openNextFile();

  while (file) {
    if (!file.isDirectory()) {
      String filename = String(file.name());

      // Vérifie si le fichier a l'extension ".txt"
      if (filename.endsWith(".txt")) {
        // Supprime l'extension ".txt" du nom du fichier
        storedSSID[n] = filename.substring(0, filename.lastIndexOf('.'));
        Serial.println("Fichier texte : " + storedSSID[n]);
        n++;
        // Affiche le nom du fichier sans l'extension
      }
    }
    file = root.openNextFile();  // Passe au fichier suivant
  }

  //Wifi part

  nbNetworks = WiFi.scanNetworks();

  // Si aucun réseau n'est trouvé
  if (nbNetworks == 0) {
    Serial.println("Aucun réseau trouvé.");
  } 
  else {

    // Affichage du nombre de réseaux trouvés
    Serial.print(nbNetworks);
    Serial.println(" réseaux trouvés:");

    for (int i = 0; i < nbNetworks; ++i) {  //comparaison réseau capté réseaux enregistrés
      for (int j = 0; j < n; j++) {
        if (WiFi.SSID(i) == storedSSID[j]) {
          int nb_fail = connectFromSPIFFS(storedSSID[j]);
          Serial.print("nb Fails : ");
          Serial.println(nb_fail);
          if (nb_fail == 0) {
            Serial.print("Wifi now connected with static Ip : ");
            Serial.println(WiFi.localIP());

            if (!MDNS.begin(nomCapteur)) {  // Set the hostname to "esp32.local"
              Serial.println("Error setting up MDNS responder!");
              return false;
            }
            else{
              Serial.println("mDNS setup with name : " + nomCapteur);
            }

            return 0;
          } 
          else if (nb_fail == 2) {  //Fail to connect
            SPIFFS.remove("/Networks" + storedSSID[j] + ".txt");
            Serial.println("Removing network");
            return -2;
          }
        }
      }
    }
  }

  //Serial.println("----------------------------");
  return -2;
}

bool ConfigWifi::writeConfigFile(String SSID, String pass, String name) {

  if (!SPIFFS.begin(true)) {  //start spiffs
    Serial.println("An Error has occurred while mounting SPIFFS");
    return false;
  }
  Serial.println("writting down config");

  File setting = SPIFFS.open("/Config/Config.csv", FILE_WRITE);

  if (setting.println(SSID)) {
    setting.println(pass);
    setting.println(name);
    Serial.println("Writting success");
  } else {
    setting.close();
    return false;
  }
  setting.close();

  Serial.println("Done writting");
  Serial.println("----------------------------");
  return true;
}

bool ConfigWifi::configureAP() {

  String ssid;
  String pass;
  String nom;

  if (!SPIFFS.begin(true)) {  //start spiffs
    Serial.println("An Error has occurred while mounting SPIFFS");
    return false;
  }

  Serial.println("Setting up AP");
  File setting = SPIFFS.open("/Config/Config.csv", FILE_READ);

  ssid = setting.readStringUntil('\n');
  pass = setting.readStringUntil('\n');
  nom = setting.readStringUntil('\n');

  ssid.remove(ssid.length() - 1);
  pass.remove(pass.length() - 1);
  nom.remove(nom.length() -1);

  nomCapteur = nom;
  ApName = ssid;
  ApPass = pass;

  setting.close();
  Serial.print("SSID : ");
  Serial.println(ssid);
  Serial.print("Password : ");
  Serial.println(pass);

  WiFi.disconnect();
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid, pass);

  WifiMode = 2;

  if (!MDNS.begin("gestionnaire")) {  // Set the hostname to "esp32.local"
    Serial.println("Error setting up MDNS responder!");
    return false;
  }

  Serial.println("----------------------------");
  return true;
}

bool ConfigWifi::printSPIFFS() {
  Serial.println("SPIFFS content : ");

  if (!SPIFFS.begin(true)) {  //start spiffs
    Serial.println("An Error has occurred while mounting SPIFFS");
    return false;
  }

  File root = SPIFFS.open("/Networks");
  File file = root.openNextFile();

  while (file) {
    if (!file.isDirectory()) {
      String filename = String(file.name());
      Serial.println("-"+filename);
    }
    file = root.openNextFile();  // Passe au fichier suivant
  }
  file.close();
  root.close();
  Serial.println("----------------------------");
  return true;
}

String ConfigWifi::getEncryptionType(int encryptionType) {
    switch (encryptionType) {
        case WIFI_AUTH_OPEN: return "Open";
        case WIFI_AUTH_WEP: return "WEP";
        case WIFI_AUTH_WPA_PSK: return "WPA_PSK";
        case WIFI_AUTH_WPA2_PSK: return "WPA2_PSK";
        case WIFI_AUTH_WPA_WPA2_PSK: return "WPA_WPA2_PSK";
        case WIFI_AUTH_WPA2_ENTERPRISE: return "WPA2_Enterprise";//Username + password
        case WIFI_AUTH_WPA3_PSK: return "WPA3_PSK";
        case WIFI_AUTH_WPA2_WPA3_PSK: return "WPA2_WPA3_PSK";
        default: return "Unknown type";
    }
}

String ConfigWifi::wifiStatString(int index){
  switch(index){
    case 0:
    return "Not connected";
    break;

    case 1:
    return "Connected";
    break;

    case 2:
    return "AP on";
    break;

    default:
    return "Unknown";
    break;
  }
}