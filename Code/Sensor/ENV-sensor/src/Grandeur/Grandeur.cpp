#include "Grandeur.h"

// Constructor
Grandeur::Grandeur(String gName, float off) : 
  name(gName), 
  offset(off), 
  min(100000), 
  max(0.0), 
  moy(0.0), 
  lastVal(0.0), 
  nv_mes(0), 
  raw(0.0), 
  newVal(-1) 
{}


// Access methods
float Grandeur::getMin() const {
    return min;
}

float Grandeur::getMax() const {
    return max;
}

float Grandeur::getMoy() const {
    return moy;
}

int Grandeur::getNvMes() const {
    return nv_mes;
}

float Grandeur::getRaw() const {
    return raw;
}

float Grandeur::getLastVal() const {
    return lastVal;
}

// Update sensor data
void Grandeur::update() {

  if(newVal != -1){
    lastVal = newVal - offset;
    
    raw += lastVal;
    nv_mes++;

    if (newVal < min) {
        min = newVal;
    }
    if (newVal > max) {
        max = newVal;
    }

    moy = raw / nv_mes;
    newVal = -1;
  }
}

// Reset data
void Grandeur::reset() {
    min = lastVal;
    max = lastVal;
    nv_mes = 1;
    raw = lastVal;
    newVal = -1;
    moy = lastVal;
}

// Display sensor data
void Grandeur::print(){
    Serial.print(name);
    Serial.print(" -> ");
    Serial.print("Min : ");
    Serial.print(min);
    Serial.print(" Moy : ");
    Serial.print(moy);
    Serial.print(" Max : ");
    Serial.println(max);
}

JsonDocument Grandeur::toJson() {
  String response;
  JsonDocument jsonResponse;

  jsonResponse["Min"] = min;
  jsonResponse["Max"] = max;
  jsonResponse["Moy"] = moy;
  jsonResponse["LastVal"] = lastVal;

  return jsonResponse;
}
