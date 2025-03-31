**Date**: 10/2024 - 01/2025  
**Author**: Robin GORIUS  
***Prelimenery Translations*** Michail Magkos

These sensors were initially created to measure environmental variables in the Mars Desert Research Station in Utah for the CoreData set.  
As they are meant to be used by French students from future MDRS crews, a lot of documentation and code comments are in French.  

The development was done by Robin GORIUS over the course of 4 months. The sensors are far from perfect but could be considered as functioning prototypes for futur developpment.  
The main issue is the electrical assembly, which should be reduced to PCB soldering.  
Another improvement for easier use would be to shift the data exchange protocol from HTTP to MQTT and make the sensors go to sleep when not measuring.  
This change could enable the sensors to run on a battery for easier installation and integration with Home Assistant.  

The sensors are equipped with 5 sensors and are able to measure the following variables:  

```
Temperature in °C  
Humidity in %  
Luminosity (Infrared, Visible, Total) in Lux  
Pressure in Pa  
CO2 levels in ppm  
VOC levels (unitless)  
```

The sensors are programmed to collect data every second and are asked by the collecting server to send their data every 30 seconds.  

The code for the sensor is quite versatile as it's written with well-separated classes.  
**WARNING**: Please note that the network manager implemented in the sensors isn't the most secure, as the SSIDs and passwords are stored directly in the ESP32 file system in a `.txt` file.  

The code for the collecting server is a bit messier, especially the part in charge of the graphs. This is due to the nature of the initial application not enabling the system to access online libraries.  

For further information on the use of the sensors, please check the user manual (French only for now, sorry!):  
[Manual](Manual/User_manual.pdf)  

Check out the CAD files in the [CAD folder](Mechanical_design/CAD/). Please note that the design was made with Fusion 360, and the `.step` file may present unwanted defects.  

The build information is briefly described in the [Build instructions](Electronics/Build_instructions.txt). The document is quite short but provides guidelines on how the assembly was designed.  