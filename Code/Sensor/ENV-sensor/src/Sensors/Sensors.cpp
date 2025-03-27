#include "Sensors.h"

Sensors::Sensors(Display* oledDisplay, float dt, float dh, float dp, float dco, float dvoc):
  temp("Température", dt),
  hum("Humidité", dh),
  pres("Pression", dp),
  alt("Altitude", 0),
  CO2("CO2 level", dco), 
  IR("IR lum level", 0),
  Full("Full lum level", 0),
  Visible("Visible lum level", 0),
  lux("Intensité lum (lux)", 0),
  sraw("Sraw", 0),
  Voc_Index("VOC index", dvoc),
  display(oledDisplay)
  //display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET)
{}

void Sensors::begin() {
  Wire.begin();

  if (!bme.begin(BME280_ADDR)) {
    Serial.println("BME280 fail to init");
  } else {
    getBMEValues(temp.newVal, pres.newVal, hum.newVal, alt.newVal);
  }

  if (!SCD40.begin()) {
    Serial.println("SCD40 fail to init");
  } else {
    calibrateSCD40(SCD40, 5, alt.newVal, pres.newVal);
  }

  if (!tsl.begin()) {
    Serial.println(F("TSL2591 fail to init"));
  }

  if (!sgp.begin()) {
    Serial.println("SGP40 fail to init");
  }
}

Grandeur& Sensors::getTemperature() { 
  return temp; 
}
Grandeur& Sensors::getHumidity() { 
  return hum; 
}
Grandeur& Sensors::getPressure() { 
  return pres; 
}
Grandeur& Sensors::getAltitude() { 
  return alt; 
}
Grandeur& Sensors::getCO2() { 
  return CO2; 
}
Grandeur& Sensors::getIR() { 
  return IR; 
}
Grandeur& Sensors::getFullLuminosity() { 
  return Full; 
}
Grandeur& Sensors::getVisibleLuminosity() { 
  return Visible; 
}
Grandeur& Sensors::getLux() { 
  return lux; 
}
Grandeur& Sensors::getSraw() { 
  return sraw; 
}
Grandeur& Sensors::getVocIndex() { 
  return Voc_Index; 
}

void Sensors::readSensors() {
  getBMEValues(temp.newVal, pres.newVal, hum.newVal, alt.newVal);
  getSGPValues(temp.newVal, hum.newVal, sraw.newVal, Voc_Index.newVal);
  getTSLValues(IR.newVal, Full.newVal, Visible.newVal, lux.newVal);

  if(getSCDValues(CO2.newVal)){
    CO2.update();
  }

  temp.update();
  hum.update();
  pres.update();
  alt.update();
  sraw.update();
  Voc_Index.update();
  IR.update();
  Full.update();
  Visible.update();
  lux.update();
}

void Sensors::displayMeasurements() {
  const char* names[] = {"Temperature", "Humidite", "Pression", "Altitude", "CO2 level", "Luminosite", "VOC Index"};
  const char* units[] = {"C", "%", "hPa", "m", "ppm", "lux",""};

  //display->clearDisplay();

  switch(index) {
    case 0:  
      afficheGrandeur(names[index], temp.getLastVal(), units[index]);
      break;
    case 1:  
      afficheGrandeur(names[index], hum.getLastVal(), units[index]);
      break;
    case 2:  
      afficheGrandeur(names[index], (pres.getLastVal()) / 100.0F, units[index]);
      break;
    case 3:  
      afficheGrandeur(names[index], alt.getLastVal(), units[index]);
      break;
    case 4:  
      afficheGrandeur(names[index], CO2.getLastVal(), units[index]);
      break;
    case 5:  
      afficheGrandeur(names[index], lux.getLastVal(), units[index]);
      break;
    case 6:  
      afficheGrandeur(names[index], Voc_Index.getLastVal(), "");
      break;
    default:
      afficheGrandeur("Erreur", 0.0, "Index inconnu");
      break;
  }

  display->display();
}

void Sensors::getTSLValues(float &ir, float &full, float &visible, float &lux) {
  uint32_t lum = tsl.getFullLuminosity();
  ir = lum >> 16;
  full = lum & 0xFFFF;

  if (full == 37888) {
    tsl.setGain(TSL2591_GAIN_LOW);
    lum = tsl.getFullLuminosity();
    ir = lum >> 16;
    full = lum & 0xFFFF;
  }

  if (full < 100) {
    if (tsl.getGain() == TSL2591_GAIN_LOW) {
      tsl.setGain(TSL2591_GAIN_MED);
    } else if (tsl.getGain() == TSL2591_GAIN_MED) {
      tsl.setGain(TSL2591_GAIN_HIGH);
    }
    lum = tsl.getFullLuminosity();
    ir = lum >> 16;
    full = lum & 0xFFFF;
  }

  if (full > 37888 - 100) {
    if (tsl.getGain() == TSL2591_GAIN_HIGH) {
      tsl.setGain(TSL2591_GAIN_MED);
    } else if (tsl.getGain() == TSL2591_GAIN_MED) {
      tsl.setGain(TSL2591_GAIN_LOW);
    }
    lum = tsl.getFullLuminosity();
    ir = lum >> 16;
    full = lum & 0xFFFF;
  }

  visible = full - ir;
  lux = tsl.calculateLux(full, ir);
}

bool Sensors::calibrateSCD40(SCD4x &sensor, float tempOffset, float sensorAltitude, float ambientPressure) {
  if (!sensor.stopPeriodicMeasurement()) return false;
  if (!sensor.setTemperatureOffset(tempOffset)) return false;
  if (!sensor.setSensorAltitude(sensorAltitude)) return false;
  if (!sensor.setAmbientPressure(ambientPressure)) return false;
  if (!sensor.persistSettings()) return false;
  if (!sensor.startPeriodicMeasurement()) return false;
  return true;
}

bool Sensors::getSCDValues(float &co2) {
  if (SCD40.readMeasurement()) {
    co2 = SCD40.getCO2();
    return true;
  } 
  else {
    co2 = -1;
    return false;
  }
}

void Sensors::getBMEValues(float &t, float &p, float &h, float &a, float seaLevel) {
  t = bme.readTemperature();
  p = bme.readPressure();
  h = bme.readHumidity();
  a = bme.readAltitude(seaLevel);
}

void Sensors::getSGPValues(float t, float h, float &sraw, float &voc_index) {
  sraw = sgp.measureRaw(t, h);
  voc_index = sgp.measureVocIndex(t, h);
}

void Sensors::afficheGrandeur(String grandeur, float valeur, String unite, int space) {
    display->clearDisplay();
    display->setTextSize(2);
    display->setTextColor(SSD1306_WHITE);

    // Afficher la grandeur avec troncature si nécessaire
    display->drawTruncatedText(grandeur, 128, 0, 0);

    // Calcul de la position pour la valeur
    int x = 0;
    display->setCursor(x, 17);
    display->print(valeur, 2);

    // Obtenir les dimensions de la valeur affichée
    int16_t x1, y1;
    uint16_t textWidth, textHeight;
    display->getTextBounds(String(valeur).c_str(), x, 17, &x1, &y1, &textWidth, &textHeight);

    // Position de l'unité avec espacement
    x += textWidth + space;

    // Afficher l'unité avec troncature si nécessaire
    display->drawTruncatedText(unite, 128, x, 17);

    // Afficher l'écran
    display->display();
}

void Sensors::printTSLValues() {
    Serial.println("--> TSL2591 Reading:");
    IR.print();
    Full.print();
    Visible.print();
    lux.print();
    Serial.println();
}

void Sensors::printSCDValues() {
    Serial.println("--> SCD40 Reading:");
    CO2.print();
    Serial.println();
}

void Sensors::printBMEValues() {
    Serial.println("--> BME280 Reading:");
    temp.print();
    pres.print();
    hum.print();
    alt.print();

    Serial.println();
}

void Sensors::printSGPValues() {
    Serial.println("--> SGP40 Reading:");
    sraw.print();
    Voc_Index.print();
    Serial.println();
}
