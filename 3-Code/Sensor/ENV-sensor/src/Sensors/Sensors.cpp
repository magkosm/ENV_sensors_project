#include "Sensors.h"

Sensors::Sensors(Display* oledDisplay, float dt, float dh, float dp, float dco, float dvoc) :
  display(oledDisplay),
  temp("Temperature", dt),
  hum("Humidity", dh),
  pres("Pressure", dp),
  alt("Altitude", 0.0),
  CO2("CO2", dco),
  IR("IR", 0.0),
  Full("Full", 0.0),
  Visible("Visible", 0.0),
  lux("Lux", 0.0),
  sraw("Raw_VOC", 0.0),
  Voc_Index("VOC Index", dvoc)
{
  Serial.println(F("Sensors class created"));
}

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
  // Define which measurement to display based on index
  const char* names[] = {"Temperature", "Humidity", "Pressure", "Altitude", "CO2 level", "Luminosity", "VOC Index"};
  
  switch (index % 7) {
    case 0: // Temperature & Humidity
      display->clearDisplay();
      displayMeasurement("Temperature", temp.getLastVal(), "C", 2);
      displayMeasurement("Humidity", hum.getLastVal(), "%", 2, 16);
      break;
    
    case 1: // Pressure & Altitude
      display->clearDisplay();
      displayMeasurement("Pressure", pres.getLastVal() / 100.0, "hPa", 2);  // Convert Pa to hPa
      displayMeasurement("Altitude", alt.getLastVal(), "m", 2, 16);
      break;
    
    case 2: // CO2
      display->clearDisplay();
      displayMeasurement("CO2", CO2.getLastVal(), "ppm", 2);
      break;
    
    case 3: // VOC
      display->clearDisplay();
      displayMeasurement("VOC Index", Voc_Index.getLastVal(), "", 2);
      displayMeasurement("Raw VOC", sraw.getLastVal(), "", 2, 16);
      break;
    
    case 4: // Lux
      display->clearDisplay();
      displayMeasurement("Luminosity", lux.getLastVal(), "lx", 2);
      break;
    
    case 5: // Luminosity components
      display->clearDisplay();
      displayMeasurement("Full", Full.getLastVal(), "c", 2);
      displayMeasurement("IR", IR.getLastVal(), "c", 2, 16);
      break;
    
    case 6: // Visible
      display->clearDisplay();
      displayMeasurement("Visible", Visible.getLastVal(), "c", 2);
      break;
  }
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

    // Display size with truncation if necessary
    display->drawTruncatedText(grandeur, 128, 0, 0);

    // Calculating position for value
    int x = 0;
    display->setCursor(x, 17);
    display->print(valeur, 2);

    // Get the dimensions of the displayed value
    int16_t x1, y1;
    uint16_t textWidth, textHeight;
    display->getTextBounds(String(valeur).c_str(), x, 17, &x1, &y1, &textWidth, &textHeight);

    // Unit position with spacing
    x += textWidth + space;

    // Display unit with truncation if necessary
    display->drawTruncatedText(unite, 128, x, 17);

    // Show screen
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
