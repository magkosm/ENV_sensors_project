import time
import requests
import json
import paho.mqtt.client as mqtt

# HTTP Server Configuration
HTTP_SERVER = "http://127.0.0.1:5000"

# MQTT Broker Configuration
MQTT_BROKER = "192.168.0.10"  # Replace with the IP address of your MQTT broker
MQTT_PORT = 1883               # Default MQTT port (1883 for insecure)
MQTT_USERNAME = "spaceship"  # Replace with your MQTT username
MQTT_PASSWORD = "Space$h!p"  # Replace with your MQTT password
DISCOVERY_PREFIX = "homeassistant"  # Prefix used by Home Assistant for discovery

# Device configuration
DEVICE_MANUFACTURER = "RG corp"
DEVICE_MODEL = "Server Sensor Bridge"

# Create the MQTT client
mqtt_client = mqtt.Client()

# Configure MQTT credentials
mqtt_client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

# Connect the MQTT client to the broker
mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)


def fetch_config():
    """
    Retrieves the sensors configuration file from the HTTP server.
    """
    response = requests.get(f"{HTTP_SERVER}/getConfig")
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error retrieving configuration : {response.status_code}")
        return None


def publish_discovery(config):
    """
    Publishes MQTT discovery messages for each sensor.
    """
    for sensor in config["sensors"]:
        sensor_id = sensor["name"].replace(" ", "_")
        device_info = {
            "identifiers": [sensor_id],
            "manufacturer": DEVICE_MANUFACTURER,
            "model": DEVICE_MODEL,
            "name": sensor["name"]
        }

        for key, measurement in sensor["measurements"].items():
            discovery_topic = f"{DISCOVERY_PREFIX}/sensor/{sensor_id}_{key}/config"
            discovery_message = {
                "name": f"{sensor['name']} {measurement['name']}",
                "state_topic": f"{sensor_id}/{key}",
                "unique_id": f"{sensor_id}_{key}",
                "unit_of_measurement": measurement["unit"],
                "device": device_info
            }

            # Publish the discovery message
            mqtt_client.publish(discovery_topic, json.dumps(discovery_message), retain=True)
            print(f"Discovery published for {sensor['name']} - {key}")


def fetch_data():
    """
    Retrieves sensor data from the HTTP server.
    """
    response = requests.post(f"{HTTP_SERVER}/getData")
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error retrieving data : {response.status_code}")
        return None


def publish_data(data):
    """
    Publishes sensor data to MQTT.
    """
    for sensor in data:
        sensor_id = sensor["name"].replace(" ", "_")

        for key, measurement in sensor["measurements"].items():
            state_topic = f"{sensor_id}/{key}"
            value = measurement.get("LastVal", None)
            if value is not None:
                mqtt_client.publish(state_topic, value)
                print(f"Data published for {sensor['name']} - {key}: {value}")


def main():
    # Step 1: Retrieve the configuration
    config = fetch_config()
    if not config:
        return

    # Step 2: Publish Discovery Messages
    publish_discovery(config)

    # Step 3: Main loop to fetch and publish data
    while True:
        try:
            # Recover data
            data = fetch_data()
            if data:
                publish_data(data)

            # Wait 30 seconds before the next recovery
            time.sleep(30)
        except KeyboardInterrupt:
            print("Stop the script.")
            break
        except Exception as e:
            print(f"Unexpected error : {e}")


if __name__ == "__main__":
    main()