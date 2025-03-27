#include <stdint.h>
#include "Display.h"

Display::Display(uint16_t width, uint16_t height, uint8_t addr):
  Adafruit_SSD1306(width, height, &Wire, -1), 
  addr(addr),
  width(width),
  height(height)
{}

uint16_t Display::getWidth(){
  return this->width;
}

uint16_t Display::getHeight(){
  return this->height;
}

uint8_t Display::getAddr(){
  return this->addr;
}

bool Display::begin() {//Initialisation de l'écran
  if (!Adafruit_SSD1306::begin(SSD1306_SWITCHCAPVCC, addr)) {
    return false;
  }
  clearDisplay(); // Effacer l'écran après initialisation
  return true;
}

void Display::disp2Lines(String L1, IPAddress Ip, int size1, int size2) {//Affichage de deux lignes, la seconde contenant une adresse IP
  disp2Lines(L1, Ip.toString(), size1, size2);
}

void Display::disp2Lines(const char* L1, const char* L2, int size1, int size2){
  disp2Lines(String(L1), String(L2), size1, size2);
}

void Display::disp2Lines(String L1, String L2, int size1, int size2) {//Affichage de deux lignes personnalisées 
  clearDisplay();
  setTextSize(size1);
  setTextColor(SSD1306_WHITE);
  drawTruncatedText(L1, this->width, 0, 0, size1);

  setTextSize(size2);
  int yoff = 17;
  if(size2 == 1){
    yoff = 22;
  }
  drawTruncatedText(L2, this->width, 0, yoff, size2);

  display();
}

void Display::drawTruncatedText(String text, int maxWidth, int xOffset, int yOffset, int textSize) {//coupe le texte s'il est trop long pour la largeur spécifiée
  int totalWidth = 0;                  // Largeur accumulée
  uint16_t charWidth = 0, charHeight = 0; // Largeur et hauteur du caractère
  int16_t x1, y1;                      // Coordonnées du rectangle (non utilisées ici)

  for (int i = 0; i < text.length(); i++) {
    char currentChar = text[i];
    char charArray[2] = {currentChar, '\0'}; // Convertir le caractère en const char*

    // Obtenir les dimensions du caractère
    getTextBounds(charArray, 0, 0, &x1, &y1, &charWidth, &charHeight);

    // Si le caractère dépasse la largeur autorisée
    if (totalWidth + charWidth > maxWidth) {
      int remainingWidth = maxWidth - totalWidth;

      // Si l'espace restant est suffisant pour une partie du caractère
      if (remainingWidth > 0) {
        drawPartialCharacter(currentChar, remainingWidth, xOffset + totalWidth, yOffset, textSize);
      }
      break;
    }

    // Dessiner le caractère complet
    setCursor(xOffset + totalWidth, yOffset);
    print(currentChar);
    totalWidth += charWidth; // Ajouter la largeur du caractère
  }
}

void Display::drawPartialCharacter(char character, int width, int x, int y, int textSize) {//Affiche partiellement un caractère
  // Taille des caractères actuels
  //int textSize = 2;
  int charWidth = 6 * textSize; // Largeur d'un caractère avec taille
  int charHeight = 8 * textSize; // Hauteur d'un caractère avec taille

  // Dessiner le caractère dans un rectangle limité
  fillRect(x, y, width, charHeight, SSD1306_BLACK); // Effacer la zone
  setCursor(x, y);
  drawChar(x, y, character, SSD1306_WHITE, SSD1306_BLACK, textSize);

  // Dessiner un rectangle noir pour masquer la partie excédentaire
  if (width < charWidth) {
    fillRect(x + width, y, charWidth - width, charHeight, SSD1306_BLACK);
  }
}