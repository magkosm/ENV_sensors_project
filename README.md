**Date**: 10/2024 - 01/2025  
**Author**: Robin GORIUS 

This sensors were initially created to measure environnemental variables in the Mars Desert Reseach Station in Utah for the CoreData set.
As meant to be used by french students from the futur MDRS crews, a lot of documentation and code comments are in french.

The development was done by Robin GORIUS over the course of 4 months. The sensors are far from perfect but could be considered as advanced fonctionning prototypes.
The main issues is the electrical assembly that should be reduced to pcb soldering. 
Another improvment for easier use would be to shift the data exchange protocol from HTTP to MQTT and make the sensors go to sleep when not measuring.
This change could enable the sensors to run on a battery for easier installation and integration to Home assistant.

The sensors are equipped with 5 sensors and are able to measure the following variables :

```
Temperature in °C
Humidity in %
Luminosity (Infrared, visible, Total) in Lux
Pressure in Pa
CO2 levels in ppm
VOC level without units
```
The sensors are programmed to collect data every seconds and are asked by the collecting server to send their data every 30 seconds.

The code for the sensor is quite versatile as it's written with well separated classes.
WARING : Please note that the network manager implemented in the sensors isn't the most secured as the SSID's and Passwords are stored directly in the ESP32 file system in a .txt file.

The code for the collecting server is a bit messier, especially the part in charged of the graphs. This is due by the nature of the initial application not enabling the su=ystem to access online librairies.

For futher information on the use of the sensors, please check the user manual (French only for now (sorry!)) : 
[Manual](Manual/User_manual.pdf)

Check out the cad files in the [CAD folder](Mechanical_design/CAD/), please note that the design was made with fusion 360 and the .step file may present unwanted defects

The build informations are quickly describe in the [Build instruction](Electronics/Build_instructions.txt), the document is quite short but give guidlines on how the assembly was designed. 