#include <stdint.h>
#ifndef DISPLAY_h
#define DISPLAY_h

/*
This class inherits from the Ardafruit_SSD1306 class allowing the management of display on the OLED screen. 
@Author: Robin Gorius
@Date: 12/24
*/

#include "Wire.h"
#include <Adafruit_SSD1306.h>
#include <Adafruit_GFX.h>
#include <WiFi.h>

class Display : public Adafruit_SSD1306 {
  private:
    uint8_t addr;//I2C address of the screen
    uint16_t width;//Screen width in pixels
    uint16_t height;//Screen height in pixels

  public:
    Display(uint16_t width, uint16_t height, uint8_t addr);//Class constructor
    bool begin();//Initializes the screen and clears it, overrides the inherited class method
    void drawTruncatedText(String text, int maxWidth, int xOffset = 0, int yOffset = 0, int textSize =  2);//Allows drawing text by cutting it in the middle of a letter if needed if it exceeds
    void drawPartialCharacter(char character, int width, int x, int y, int textSize = 2);//Allows drawing an incomplete character on the screen

    void disp2Lines(String L1, IPAddress Ip, int size1 = 2, int size2 = 1);//Allows displaying a string and an IP address on two lines
    void disp2Lines(const char* L1, const char* L2, int size1 = 2, int size2 = 2);//Allows displaying const Char on two lines
    void disp2Lines(String L1, String L2 = "", int size1 = 2, int size2 = 2);//Allows displaying two strings on two lines while handling character overflow
    
    uint16_t getWidth();//getters
    uint16_t getHeight();
    uint8_t getAddr();
};


#endif