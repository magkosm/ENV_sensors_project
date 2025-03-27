#ifndef GRANDEUR_H
#define GRANDEUR_H

#include <Arduino.h>
#include <ArduinoJson.h>

/*
Cette classe permet de réaliser une étude statistique simple (très) sur les mesures issues de capteurs sur un temps données
@Auteur : Robin Gorius
@Date : 12/24
*/
class Grandeur {
private:
    String name;

    float min;
    float max;
    float moy;

    float lastVal;

    int nv_mes;
    float raw;

    float offset;//étalonnage de la grandeur avec un gain SOUSTRAIT au mesures brutes. Si le capteur lit 25 au lieu de 20 mettre un gain de 5, si  le capteur lit 20 au lieu de 25 mettre un gain de -5!

public:
    float newVal = -1;

    // Constructeur
    Grandeur(String gName, float off);

    // Getteurs
    float getMin() const;
    float getMax() const;
    float getMoy() const;
    int getNvMes() const;
    float getRaw() const;
    float getLastVal() const;

    void update();// Mise à jour des données du capteur
    void reset();// Réinitialisation des données pour éviter les overflow et autres joyeuseries
    void print();// Affichage des données du capteur

    JsonDocument toJson(); //Convertit les données stockée en un JSON
};

#endif // GRANDEUR_H
