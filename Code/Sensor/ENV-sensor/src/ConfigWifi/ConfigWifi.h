#ifndef CONFIGWIFI_H
#define CONFIGWIFI_H

/*
Cette classe permet la gestion des réseaux Wifi de l'ESP en stockant les informations dans le gestionnaire de fichier embarqué (SPIFFS).
Elle permet : 
-Gestion des réseaux Wifi enregistré
-Gestion de la connection au Wifi et gestion des erreurs de connexion
-Gestion des informations sur le capteur (Nom, AP SSID, AP Pass);

Cette classe s'assure qu'il existe toujours un fichier de configuration dans le SPIFFS de l'ESP avant de démarrer afin d'éviter un bloquage du capteur. Les valuers par défauts sont :
-Nom : Capteur
-AP SSID : Capteur
-AP PASS : #MDRS311Sensors!

 /!\ Cette implémentation d'un gestionnaire de mot de passe ne permet pas d'assurer la sécurité totale des informations de connexion (mot de passe) car ceci sont stockés directement dans un fichier .txt dans le SPIFFS
 Une amélioration futur sera d'implémenter un système de cryptage des fichier .txt

@Auteur : Robin Gorius
@Date : 12/24
*/


#include "SPIFFS.h"
#include <WiFi.h>
#include <ESPmDNS.h>
#include <ArduinoJson.h>

class ConfigWifi {

public:
    String nomCapteur;//Variables publique pour faciliter l'accès
    String ApName;
    String ApPass;

    int WifiMode; // 0 disconnected, 1 connected, 2 AP

    bool begin();//initialise le SPIFFS et les variables de la classe
    bool failToConnect();//Renvoi true si la connection au Wifi a échouée ou si aucune réponse n'est donnée par le routeur en moins de 20s
    bool writeNetworkInfoToSPIFFS(String ssid, String pass, String secu, String user, bool connected);//Ecrit dans un fichier .txt les informations de connections du réseau. Si celui ci est connecté (connected = true) cette fonction écrit également l'ip statique du capteur, la défaut=lt gateway et le masque de sous réseau
    bool deleteNetwork(String ssid);//Supprime du SPIFFS le réseau dont le nom est ssid, return true en cas de succès, false sinon
    JsonDocument loadNetworks();//Renvoie le Json contenant toutes les informations de tout les réseaux stocké dans le SPIFFS
    int connectFromSPIFFS(String SSID);//Se connecte au réseau WiFi SSID en utilisant les informations dans le SPIFFS et créer également l'instance DNS du capteur sur le réseau en utilisant son nom
    int initWifiFromSPIFFS();//Compare les réseaux connu par l'ESP et stocké dans le SPIFFS aux réseaux disponible et essai de se connecter au premier réseau qui correspond et utilisant connectFromSPIFFS(SSID)
    bool writeConfigFile(String SSID, String pass, String name);//Ecrit le fichier de configuration du capteur
    bool configureAP();//Configure le point d'accès en fonction des informations contenues dans Config.csv dans le SPIFFS
    bool printSPIFFS();//Affiche le contenue du SPIFFS dans le terminal
    String getEncryptionType(int encryptionType);//Convertit le code de la bibliothèque WiFi correspondant au type de sécurité d'un réseau en String
    String wifiStatString(int index); //Convertit le code de la bibliothèque WiFi correspondant au statut du WiFi en String
};

#endif
