#ifndef CONFIGSERVER_H
#define CONFIGSERVER_H

/*
Cette classe permet de mettre en place un serveur captif.
Ce serveur permet :
-Consulter et supprimer les réseaux enregitré dans le SPIFF de l'ESP
-Connecter l'ESP à un nouveau réseau
-Lire et Modifier les informations propre au capteur (Nom, SSID du point d'accès, Mot de passe du point d'accès)

 /!\ cette classe ne permet pas d'assurer la sécurité des mots de passes et des informations transmises sur le réseaux local
 /!\ Ce serveur est un serveur HTTP et les mots de passe sont stocké tel quel dans des fichier texte dans la mémoire interne de l'ESP

@Auteur : Robin Gorius
@Date : 12/24

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
    AsyncWebServer *server;  // Déclaration du serveur
    
    static bool scanning;   // État du scan réseau (static car utilisée dans les fonctions static du serveur Async)
    static bool connecting; //etat de la connection
    static unsigned long last_send;
    static unsigned long netScanStartTps;

  public:
    static Sensors *sensors;
    static ConfigWifi *SPIFFSWifi;//besoin d'être publique car accéder dans un contexte asynchrone par le serveur

    // Constructeur qui initialise le serveur
    ConfigServer(Sensors* snrs, ConfigWifi* SpiffWifi, uint16_t port = 80);//Constructeur qui initialise les variables internes, notament les pointeurs vers les autres fonctionnalitées ( capteurs, écran et Wifi/SPIFFS)

    void startConfigServer();//COnfigure les routes et démarre le serveur HTTP

    static String processor(const String& var);
    static void handleRoot(AsyncWebServerRequest *request);//sert la page html principale
    static void handleHotspotDetect(AsyncWebServerRequest *request);//répond à la requête envoyé par IOS pour idetifier un hot spot sans internet
    static void handleGenerate204(AsyncWebServerRequest *request);//répond à la requête envoyé par android pour idetifier un hot spot sans internet
    static void handleStyleMain(AsyncWebServerRequest *request);//envoi le CSS
    static void handleScriptMain(AsyncWebServerRequest *request);//envoi le JavaScript
    static void handleLogo(AsyncWebServerRequest *request);//envoi le logo
    static void handleNewNetwork(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total);//gère la reception et le traitement d'une nouvelle demande de connexion à un réseau
    static void handleGetMesurements(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total);//Envoi les dernières donénes des capteurs
    static void handleDeleteNetwork(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total);//Gère la suppression d'un réseau enregistré
    static void handleNewInfos(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total);//Gère la reception de nouvelle informations pour le capteurs (nom, Ap ssid, Ap pass)
    static void handleNetScan(AsyncWebServerRequest *request);//gère la reception d'une demande de scan réseau
    static void handleGetScanResults(AsyncWebServerRequest *request);//gère la réception d'une demande de résultat de scan réseau
    static void handleNetLoad(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total);//gère la demande de partage des réseaux enregistrés
    static void handleLoadConfig(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total);//gère la demande de partage des informations du capteur

    bool getScanning();//getteurs
    bool getConnecting();
    unsigned long getLast_send();
    void setScanning(bool val);//setteurs
    void setConnecting(bool val);
    void setLast_send(unsigned long val);
};

#endif