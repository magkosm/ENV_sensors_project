#include <stdint.h>
#ifndef DISPLAY_h
#define DISPLAY_h

/*
Cette classe hérite de la classe Ardafruit_SSD1306 permettant la gestion de l'affichage sur l'écran oled. 
@Auteur : Robin Gorius
@Date : 12/24
*/

#include "Wire.h"
#include <Adafruit_SSD1306.h>
#include <Adafruit_GFX.h>
#include <WiFi.h>

class Display : public Adafruit_SSD1306 {
  private:
    uint8_t addr;//adresse I2C de l'écran
    uint16_t width;//Largeur de l'écran en pixel
    uint16_t height;//hauteur de l'écran en pixel

  public:
    Display(uint16_t width, uint16_t height, uint8_t addr);//Constructeur de la classe
    bool begin();//Initialise l'écran et l'efface, override la méthode de la classe héritée
    void drawTruncatedText(String text, int maxWidth, int xOffset = 0, int yOffset = 0, int textSize =  2);//Permet de dessiner un text en le coupant au milieu d'une lettre si besoin si jamais celui-ci dépasse
    void drawPartialCharacter(char character, int width, int x, int y, int textSize = 2);//Permet de dessiner un caractère incomplet sur l'écran

    void disp2Lines(String L1, IPAddress Ip, int size1 = 2, int size2 = 1);//Permet d'afficher sur deux lignes un string et une adresse IP
    void disp2Lines(const char* L1, const char* L2, int size1 = 2, int size2 = 2);//Permet d'afficher sur deux lignes des const Char
    void disp2Lines(String L1, String L2 = "", int size1 = 2, int size2 = 2);//Permet d'afficher sur deux lignes deux strings en gérant les dépassements de caractères
    
    uint16_t getWidth();//getteurs
    uint16_t getHeight();
    uint8_t getAddr();
};


#endif