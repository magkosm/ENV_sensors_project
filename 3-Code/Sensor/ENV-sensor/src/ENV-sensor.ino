/*
Ce code permet de faire fonctionner les capteurs environnementaux destiné à la MDRS.
Ces capteurs mesures les grandeurs suivantes:

-Température
-Humidité
-Pression
-Concentration en CO2
-Indice VOC
-Luminosité Visible, Infrarouge, Totale, Lux

Ces grandeurs sont ensuites exporté vers une base de donnée centrale au travers d'un serveurs HTTP.

@Auteur : Robin Gorius
@Date : 12/2024
*/
#include <Arduino.h>
#include "Display.h"
#include "Sensors.h"
#include "ConfigWifi.h"
#include "ConfigServer.h"

#define OLED_ADDR 0x3C
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 32

#define BUTTON_PIN  26 // Pin du bouton (connecté à D1)

Display display(SCREEN_WIDTH, SCREEN_HEIGHT, OLED_ADDR);//classe qui gère l'affichage sur l'écran et qui hérite de la classe display d'ardafruit
Sensors sensors(&display, 7, 0, 0, 0, 0);//classe qui gère tout les capteurs
ConfigWifi SPIFFSWifi;//classe qui gère le stockage interne et la connexion au wifi depuis le stockage interne
ConfigServer server(&sensors, &SPIFFSWifi, 80);// classe qui gère le serveur local

unsigned long last_read = 0;
volatile unsigned long last_disp = 0;

volatile unsigned long last_press = 0;
volatile bool disp_stat = 0;//0 sensors, 1 wifi infos
volatile int nb_press = 0;

unsigned long startLow = 0;
volatile bool start = false;

void changeDisplay() {//Vecteur d'interrupt, appélé à chaque fois qu'une interrupt est généré. Permet de gérer les différents affichage sur l'écran
  // Fonction appelée lors de l'interruption
  unsigned long dt = millis() - last_press;
  
  if(dt > 200){
    if(disp_stat){
      nb_press = (nb_press + 1)%5;
    }
    else{
      sensors.index = (sensors.index + 1) % 7;  // Incrémente l'index et le remet à 0 après 7
    }

    start = false;
    last_disp = 0;
    last_press = millis();
  } 
}

void displayNetInfos(int index){
  switch(index){
    
    case 0:
    display.disp2Lines("Nom capteur", SPIFFSWifi.nomCapteur, 2,2);
    break;

    case 1:
    display.disp2Lines("Mode : ", SPIFFSWifi.wifiStatString(SPIFFSWifi.WifiMode),2, 2);
    break;

    case 2:
    if(SPIFFSWifi.WifiMode == 1){
      display.disp2Lines("Reseau :", WiFi.SSID() ,2, 1);
    }
    else if(SPIFFSWifi.WifiMode == 2){
      display.disp2Lines("AP SSID :", WiFi.softAPSSID() ,2, 1);
    }
   
    break;

    case 3:
    if(SPIFFSWifi.WifiMode == 2){//si la condition n'est pas rempli, le programme passe tout seul à la suite (Message de warning tatement may fall through à la compilation normal)
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

void setup() {

  Serial.begin(115200);

  if (!display.begin()) {
    Serial.println(F("SSD1306 fail to init"));
  }
  display.disp2Lines("    MDRS", "Env sensor", 2, 2);
  delay(1500);

  // Initialisation des capteurs
  sensors.begin();
  sensors.readSensors();

  pinMode(2, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);  // Déclaration du pin du bouton comme un entrée
  attachInterrupt(digitalPinToInterrupt(BUTTON_PIN), changeDisplay, FALLING);  // Déclenchement lors de l'appui (niveau bas)
  
  SPIFFSWifi.begin();//démarre le SPIFFS, vérifie si les fichiers par défauts sont là et les créer sinon
  SPIFFSWifi.printSPIFFS();

  if(digitalRead(BUTTON_PIN) == LOW){
    display.disp2Lines("Launching", "   AP", 2, 2);
    delay(1500);//laisser du temps à l'utilisateur pour voir le message
    SPIFFSWifi.configureAP();
  }
  else{
    display.disp2Lines("Connecting", "...", 2, 2);
    if(SPIFFSWifi.initWifiFromSPIFFS() != 0){//Si on arrive pas à se connecter à un réseau connu
      display.disp2Lines("Launching", "   AP", 2, 2);
      delay(1500);//laisser du temps à l'utilisateur pour voir le message
      SPIFFSWifi.configureAP();
      Serial.println(WiFi.softAPIP());

    }
  }
  server.startConfigServer();//création du serveu HTTP peux importe sur le mode WiFi
}

void loop() {

  if(digitalRead(BUTTON_PIN) == LOW){//détection des appuis long sur le bnt
    if(!start){
      startLow = millis();
      start = true;
      //Serial.println("Long press starting");
    }
    else if(millis() - startLow > 500){
      disp_stat = !disp_stat;
      nb_press = 0;
      sensors.index = 0;
      Serial.println("Long press detected");
      start = false;
      last_press = millis();
      last_disp = 0;//display the change
    }
  }
  else if(start){
    start = false;
    if(millis() - startLow > 500){
      disp_stat = !disp_stat;
      Serial.println("Long press detected");
      start = false;
      last_press = millis();
      last_disp = 0;//display the change
    }
  }

  if(server.getConnecting()){//si on a reçu sur le serveur une demande de connexion à un nouveau réseau
    server.setConnecting(false);
    Serial.println("restarting esp now");
    display.disp2Lines("New Infos", "Restarting",2,2);
    delay(2000);
    MDNS.end();
    WiFi.disconnect();
    digitalWrite(2, LOW);
    esp_restart();
  }
    yield();  // Laissez le CPU respirer (= le laisser aller voir ce qu'il se passe sur l'autre corps)


    if(millis() - last_read > 3000){//lecture des capteurs
      last_read = millis();
      sensors.readSensors();
      /*
      sensors.printBMEValues();
      sensors.printSCDValues();
      yield();  // Laissez le CPU respirer
      sensors.printTSLValues();
      sensors.printSGPValues();*/
    }

    if(millis() - last_disp > 1000){//Affichage sur l'écran
      last_disp = millis();

      if (WiFi.status() != WL_CONNECTED) {
        digitalWrite(2, LOW);
        if(!(WiFi.getMode() == WIFI_AP || WiFi.getMode() == WIFI_AP_STA)){//si on est pas en mode point d'accès
          SPIFFSWifi.WifiMode = 0; //not connected
        }
      }
      else {
        digitalWrite(2, HIGH);
        SPIFFSWifi.WifiMode = 1; // connected
        
      }

      if(disp_stat == 0){
        sensors.displayMeasurements();
      }
      else{
        displayNetInfos(nb_press);
      }
    }

    if((millis() - server.getLast_send() )> 60000){//reset des min, max et moy si jamais une minute passe sans envoyé les données
      server.setLast_send(millis());

      sensors.getTemperature().reset();
      sensors.getHumidity().reset();
      sensors.getPressure().reset();
      sensors.getAltitude().reset();

      sensors.getCO2().reset();

      sensors.getVocIndex().reset();
      sensors.getSraw().reset();

      sensors.getIR().reset();
      sensors.getFullLuminosity().reset();
      sensors.getVisibleLuminosity().reset();
      sensors.getLux().reset();

      sensors.readSensors();
    }
  
  yield();  // Laissez le CPU respirer
}
