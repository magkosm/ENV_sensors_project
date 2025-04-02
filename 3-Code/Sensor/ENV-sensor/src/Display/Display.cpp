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

bool Display::begin() {//Screen initialization
  if (!Adafruit_SSD1306::begin(SSD1306_SWITCHCAPVCC, addr)) {
    return false;
  }
  clearDisplay(); // Clear screen after initialization
  return true;
}

void Display::disp2Lines(String L1, IPAddress Ip, int size1, int size2) {//Display two lines, the second containing an IP address
  disp2Lines(L1, Ip.toString(), size1, size2);
}

void Display::disp2Lines(const char* L1, const char* L2, int size1, int size2){
  disp2Lines(String(L1), String(L2), size1, size2);
}

void Display::disp2Lines(String L1, String L2, int size1, int size2) {//Display two custom lines 
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

void Display::drawTruncatedText(String text, int maxWidth, int xOffset, int yOffset, int textSize) {//cuts the text if it's too long for the specified width
  int totalWidth = 0;                  // Accumulated width
  uint16_t charWidth = 0, charHeight = 0; // Character width and height
  int16_t x1, y1;                      // Rectangle coordinates (not used here)

  for (int i = 0; i < text.length(); i++) {
    char currentChar = text[i];
    char charArray[2] = {currentChar, '\0'}; // Convert character to const char*

    // Get character dimensions
    getTextBounds(charArray, 0, 0, &x1, &y1, &charWidth, &charHeight);

    // If character exceeds allowed width
    if (totalWidth + charWidth > maxWidth) {
      int remainingWidth = maxWidth - totalWidth;

      // If remaining space is sufficient for part of the character
      if (remainingWidth > 0) {
        drawPartialCharacter(currentChar, remainingWidth, xOffset + totalWidth, yOffset, textSize);
      }
      break;
    }

    // Draw complete character
    setCursor(xOffset + totalWidth, yOffset);
    print(currentChar);
    totalWidth += charWidth; // Add character width
  }
}

void Display::drawPartialCharacter(char character, int width, int x, int y, int textSize) {//Display a partial character
  // Current character size
  //int textSize = 2;
  int charWidth = 6 * textSize; // Character width with size
  int charHeight = 8 * textSize; // Character height with size

  // Draw character in limited rectangle
  fillRect(x, y, width, charHeight, SSD1306_BLACK); // Clear area
  setCursor(x, y);
  drawChar(x, y, character, SSD1306_WHITE, SSD1306_BLACK, textSize);

  // Draw black rectangle to mask excess part
  if (width < charWidth) {
    fillRect(x + width, y, charWidth - width, charHeight, SSD1306_BLACK);
  }
}