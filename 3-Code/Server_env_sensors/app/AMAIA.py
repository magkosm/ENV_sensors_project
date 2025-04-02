import time
import requests
import json
import paho.mqtt.client as mqtt

# Configuration du serveur HTTP
HTTP_SERVER = "http://127.0.0.1:5000"

# Configuration du broker MQTT
MQTT_BROKER = "192.168.0.10"  # Remplacez par l'adresse IP de votre broker MQTT
MQTT_PORT = 1883               # Port MQTT par défaut (1883 pour non sécurisé)
MQTT_USERNAME = "spaceship"  # Remplacez par votre nom d'utilisateur MQTT
MQTT_PASSWORD = "Space$h!p"  # Remplacez par votre mot de passe MQTT
DISCOVERY_PREFIX = "homeassistant"  # Préfixe utilisé par Home Assistant pour la découverte

# Configuration de l'appareil
DEVICE_MANUFACTURER = "RG corp"
DEVICE_MODEL = "Server Sensor Bridge"

# Créer le client MQTT
mqtt_client = mqtt.Client()

# Configurer les identifiants MQTT
mqtt_client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

# Connecter le client MQTT au broker
mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)


def fetch_config():
    """
    Récupère le fichier de configuration des capteurs depuis le serveur HTTP.
    """
    response = requests.get(f"{HTTP_SERVER}/getConfig")
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Erreur lors de la récupération de la configuration : {response.status_code}")
        return None


def publish_discovery(config):
    """
    Publie les messages de découverte MQTT pour chaque capteur.
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

            # Publier le message de découverte
            mqtt_client.publish(discovery_topic, json.dumps(discovery_message), retain=True)
            print(f"Découverte publiée pour {sensor['name']} - {key}")


def fetch_data():
    """
    Récupère les données des capteurs depuis le serveur HTTP.
    """
    response = requests.post(f"{HTTP_SERVER}/getData")
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Erreur lors de la récupération des données : {response.status_code}")
        return None


def publish_data(data):
    """
    Publie les données des capteurs sur MQTT.
    """
    for sensor in data:
        sensor_id = sensor["name"].replace(" ", "_")

        for key, measurement in sensor["measurements"].items():
            state_topic = f"{sensor_id}/{key}"
            value = measurement.get("LastVal", None)
            if value is not None:
                mqtt_client.publish(state_topic, value)
                print(f"Données publiées pour {sensor['name']} - {key}: {value}")


def main():
    # Étape 1 : Récupérer la configuration
    config = fetch_config()
    if not config:
        return

    # Étape 2 : Publier les messages de découverte
    publish_discovery(config)

    # Étape 3 : Boucle principale pour récupérer et publier les données
    while True:
        try:
            # Récupérer les données
            data = fetch_data()
            if data:
                publish_data(data)

            # Attendre 30 secondes avant la prochaine récupération
            time.sleep(30)
        except KeyboardInterrupt:
            print("Arrêt du script.")
            break
        except Exception as e:
            print(f"Erreur inattendue : {e}")


if __name__ == "__main__":
    main()