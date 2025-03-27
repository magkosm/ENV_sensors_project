import threading
import requests
import json
import time
import signal
import sys
from flask import Flask, render_template, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import aliased
from sqlalchemy import func

app = Flask(__name__, static_folder="static")
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///donnees.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Définir les modèles de la base de données
class Sensor(db.Model):
    __tablename__ = 'Sensors'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    ip = db.Column(db.String(255), nullable=False)
    active = db.Column(db.Boolean, default=True)  # Nouveau champ pour indiquer si le capteur est actif

class MeasurementType(db.Model):
    __tablename__ = 'MeasurementTypes'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    unité = db.Column(db.String(255), nullable=True)  # Nouveau champ unité
    clef = db.Column(db.String(255), nullable=False)  # Nouveau champ clef

class Measurement(db.Model):
    __tablename__ = 'Measurements'
    id = db.Column(db.Integer, primary_key=True)
    sensor_id = db.Column(db.Integer, db.ForeignKey('Sensors.id'), nullable=False)
    measurement_type_id = db.Column(db.Integer, db.ForeignKey('MeasurementTypes.id'), nullable=False)
    value_min = db.Column(db.Float)
    value_max = db.Column(db.Float)
    value_avg = db.Column(db.Float)
    timestamp_start = db.Column(db.DateTime, nullable=False)
    timestamp_end = db.Column(db.DateTime, nullable=False)

    # Relation avec MeasurementType
    measurement_type = db.relationship('MeasurementType', backref='measurements')

# Créer une session SQLAlchemy à l'intérieur du contexte de l'application
with app.app_context():
    db.create_all()  # Crée la base de données et les tables si elles n'existent pas

    # Création du moteur de gestion d'accès
    engine = create_engine(
        'sqlite:///donnees.db',
        pool_size=20,
        max_overflow=20,
        pool_timeout=60,
        pool_recycle=3600
    )

    session = sessionmaker(bind=engine)

class SensorThread(threading.Thread):
    def __init__(self, sensor_config):
        super().__init__()
        print(f"Initialisation du capteur {sensor_config['name']}")
        global db

        self.name = sensor_config["name"]
        self.ip = sensor_config["ip"]
        self.measurements = sensor_config["measurements"]
        self.data = {
            'ip': self.ip,
            'measurements': {},
            'timestamp': None
        }
        self.latest_data = {}  # Nouveau dictionnaire pour stocker les dernières valeurs
        self.lock = threading.Lock()  # Verrou pour sécuriser l'accès au dictionnaire
        self.init = False

        # Event pour signaler l'arrêt du thread
        self.stop_event = threading.Event()

        # Ajouter le capteur à la base de données lors de l'initialisation
        with app.app_context():
            sensor = db.session.query(Sensor).filter_by(name=self.name).first()
            if not sensor:
                print(f"Initialisation: Capteur {self.name} non trouvé. Ajout du capteur avec IP {self.ip}.")
                sensor = Sensor(name=self.name, ip=self.ip)
                db.session.add(sensor)
                db.session.commit()
                print(f"Initialisation: Capteur {self.name} ajouté avec succès.")
            else:
                print(f"Initialisation: Capteur {self.name} déjà présent dans la base de données.")

            for measurement_key, measurement_info in self.measurements.items():
                measurement_type = db.session.query(MeasurementType).filter_by(clef=measurement_key).first()
                if not measurement_type:
                    print(f"Initialisation: Type de mesure {measurement_info['name']} non trouvé. Ajout du type de mesure.")
                    measurement_type = MeasurementType(name=measurement_info['name'], unité=measurement_info['unit'], clef=measurement_key)
                    db.session.add(measurement_type)
                    db.session.commit()
                    print(f"Initialisation: Type de mesure {measurement_info['name']} ajouté avec succès.")
            
            db.session.close()

    def update_data(self, url):
        """Méthode pour faire une requête HTTP et récupérer les données."""
        try:
            print(f"update_data: Envoi de la requête à {url}")
            response = requests.post(url, json={})
            if response.status_code == 200:
                data = response.json()
                data['ip'] = self.ip

                # Mettre à jour les données des capteurs
                for key in self.measurements:
                    if self.measurements[key]:
                        self.data['measurements'][key] = data.get(key, None)

                self.data['timestamp'] = datetime.now(timezone.utc).isoformat()

                # Mise à jour du dictionnaire des dernières valeurs
                with self.lock:
                    self.latest_data = {
                        'ip': self.ip,
                        'measurements': self.data['measurements'],
                        'timestamp': self.data['timestamp']
                    }

                print(f"update_data: Données reçues pour le capteur {self.name}")
                return True
            else:
                print(f"update_data: Erreur - status code {response.status_code} pour le capteur {self.name}")
                return False
        except requests.exceptions.RequestException as e:
            print(f"update_data: Erreur lors de la récupération des données pour {self.name} : {e}")
            return False

    def get_latest_data(self):
        """Récupérer les dernières données stockées."""
        with self.lock:
            return self.latest_data.copy()  # Renvoie une copie pour éviter les conflits

    def writeToDB(self):
        try:
            with app.app_context():
                print(f"writeToDB: Début pour le capteur {self.name} avec IP {self.ip}")
                TS_end = datetime.now()
                TS_start = TS_end - timedelta(seconds=30)

                sensor = db.session.query(Sensor).filter_by(name=self.name).first()
                if not sensor:
                    raise ValueError(f"Capteur {self.name} non trouvé dans la base de données.")

                for measurement_key, values in self.data['measurements'].items():
                    measurement_type = db.session.query(MeasurementType).filter_by(clef=measurement_key).first()
                    if not measurement_type:
                        measurement_type = MeasurementType(name=measurement_key, clef=measurement_key)
                        db.session.add(measurement_type)
                        db.session.commit()
                    
                    new_measurement = Measurement(
                        sensor_id=sensor.id,
                        measurement_type_id=measurement_type.id,
                        value_min=values['Min'],
                        value_max=values['Max'],
                        value_avg=values['Moy'],
                        timestamp_start=TS_start,
                        timestamp_end=TS_end
                    )
                    db.session.add(new_measurement)
                    db.session.commit()

                print("writeToDB: WRITE TO DATABASE DONE")
        except Exception as e:
            with app.app_context():
                db.session.rollback()
            print(f"writeToDB: Erreur lors de l'écriture dans la base de données : {e}")
        finally:
            with app.app_context():
                db.session.close()
            print(f"writeToDB: {self.name} : Session fermée")

    def run(self):
        """Méthode exécutée lorsque le thread démarre."""
        print(f"run: Démarrage du thread pour le capteur {self.name} avec IP {self.ip}")
        while not self.stop_event.is_set():
            url = f'http://{self.ip}/getMesurements'
            if self.update_data(url):
                self.writeToDB()
            else:
                print(f"run: Échec de la récupération des mesures pour le capteur {self.name}")
            time.sleep(30)
        print(f"run: Capteur {self.name} arrêté proprement")

    def stop(self):
        """Méthode pour arrêter le thread proprement."""
        print(f"stop: Arrêt du thread pour le capteur {self.name}")
        self.stop_event.set()

# Liste des threads capteurs
sensor_threads = []
"""
def getSensorDataFromDB(sensor_name, start_date, end_date, data_types, sampling_factor):
    # Récupérer le capteur par son nom
    with app.app_context():
        sensor = db.session.query(Sensor).filter_by(name=sensor_name).first()
        if not sensor:
            raise ValueError(f"Aucun capteur trouvé avec le nom '{sensor_name}'.")

        # Construire la requête pour récupérer les mesures demandées
        measurements_query = (
            db.session.query(Measurement)
            .join(MeasurementType)
            .filter(
                Measurement.sensor_id == sensor.id,
                Measurement.timestamp_start >= start_date,
                Measurement.timestamp_start <= end_date,
                MeasurementType.clef.in_(data_types)
            )
            .order_by(Measurement.timestamp_start)
            .all()
        )

        # Préparer les données de sortie
        data = {"timestamps": []}
        for dt in data_types:
            data[dt] = []

        # Organiser les données par timestamp et par type de mesure
        for measure in measurements_query:
            timestamp = measure.timestamp_start.strftime('%Y-%m-%d %H:%M:%S')
            if timestamp not in data["timestamps"]:
                data["timestamps"].append(timestamp)

            if measure.measurement_type.clef in data_types:
                data[measure.measurement_type.clef].append(measure.value_avg)

        # Appliquer le facteur d'échantillonnage
        data["timestamps"] = data["timestamps"][::sampling_factor]
        for dt in data_types:
            data[dt] = data[dt][::sampling_factor]

        db.session.close()

    #print(data)
    return data
"""

def getSensorDataFromDB(sensor_name, start_date, end_date, data_types, sampling_factor):
    # Récupérer le capteur par son nom
    with app.app_context():
        sensor = db.session.query(Sensor).filter_by(name=sensor_name).first()
        if not sensor:
            raise ValueError(f"Aucun capteur trouvé avec le nom '{sensor_name}'.")

        # Construire la requête pour récupérer les mesures demandées avec échantillonnage
        measurements_query = (
            db.session.query(
                Measurement.timestamp_start,
                Measurement.value_avg,
                MeasurementType.clef,
                db.func.row_number().over(
                    partition_by=MeasurementType.clef,
                    order_by=Measurement.timestamp_start
                ).label("row_num")
            )
            .join(MeasurementType)
            .filter(
                Measurement.sensor_id == sensor.id,
                Measurement.timestamp_start >= start_date,
                Measurement.timestamp_start <= end_date,
                MeasurementType.clef.in_(data_types)
            )
            .subquery()
        )

        # Filtrer les lignes en fonction du sampling_factor
        sampled_measurements_query = (
            db.session.query(
                measurements_query.c.timestamp_start,
                measurements_query.c.value_avg,
                measurements_query.c.clef
            )
            .filter(measurements_query.c.row_num % sampling_factor == 0)
            .order_by(measurements_query.c.timestamp_start)
            .all()
        )

        # Préparer les données de sortie
        data = {"timestamps": []}
        for dt in data_types:
            data[dt] = []

        # Organiser les données par timestamp et par type de mesure
        for measure in sampled_measurements_query:
            timestamp = measure.timestamp_start.strftime('%Y-%m-%d %H:%M:%S')
            if timestamp not in data["timestamps"]:
                data["timestamps"].append(timestamp)

            if measure.clef in data_types:
                data[measure.clef].append(measure.value_avg)

        db.session.close()

    return data

@app.route('/')
def index():
    """Route principale pour afficher la page web."""
    with open('./config/config.json') as config_file:
        sensors = json.load(config_file)['sensors']
    return render_template('dashboardMain.html', sensors=sensors)

@app.route('/Graphs', methods=['POST', 'GET'])
def get_graph():
    return render_template('graphsMain.html')

@app.route('/getConfig', methods=['POST', 'GET'])
def getConfig():
    try:
        with open('./config/config.json', 'r', encoding='utf-8') as file:
            config_data = json.load(file)
        return jsonify(config_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Route pour récupérer les données de toutes les grandeurs avec filtrage par date
@app.route('/getDatagraphs', methods=['POST'])
def getDatagraphs():
    # Récupérer les paramètres de la requête
    
    params = request.get_json()
    print(params)
    
    start_date = datetime.strptime(params.get('start_date'), '%Y-%m-%d %H:%M:%S')
    end_date = datetime.strptime(params.get('end_date'), '%Y-%m-%d %H:%M:%S')

     # Calculer la durée totale en secondes
    duration_seconds = (end_date - start_date).total_seconds()

    max_points = 1000  # Nombre maximum de points à afficher
    point_interval_seconds = 30  # Intervalle entre deux points dans la base (30s)

    # Calculer le nombre total de points dans la plage de temps
    total_points = duration_seconds // point_interval_seconds

    # Calculer dynamiquement le facteur d'échantillonnage
    if total_points > max_points:
        sampling_factor = max(1, total_points // max_points)
    else:
        sampling_factor = 1

    sensors = params.get('sensors', [])
    data = {}

    for sensor in sensors.keys():
        print(sensor)
        data_types = sensors[sensor]

        #print(data_types)
        results = getSensorDataFromDB(sensor, start_date, end_date, data_types, sampling_factor )

        # Structurer les données dans un format JSON
        data[sensor] = results
        
        #print(data)
    # Retourner les données sous forme JSON
    return jsonify(data=data)

@app.route('/getSensorTypes', methods=['POST', 'GET'])
def get_sensor_types():
    """Route pour envoyer le fichier JSON contenant tous les types de capteurs connus."""
    with open('./config/Sensors_type.json', 'r', encoding='utf-8') as sensor_types_file:
        sensor_types = json.load(sensor_types_file)
    return jsonify(sensor_types)

@app.route('/addSensorType', methods=['POST', 'GET'])
def add_sensor_type():
    try:
        data = request.get_json()
        if not data or not all(k in data for k in ('type', 'config', 'measurements')):
            return jsonify({"error": "Données invalides"}), 400

        # Charger le fichier des types de capteurs
        with open('./config/Sensors_type.json', 'r+', encoding='utf-8') as sensor_types_file:
            sensor_types = json.load(sensor_types_file)

            # Vérifier si le type de capteur existe déjà
            if any(t['type'] == data['type'] for t in sensor_types['types']):
                return jsonify({"error": "Type de capteur déjà existant"}), 409

            # Ajouter le nouveau type de capteur
            sensor_types['types'].append(data)
            sensor_types_file.seek(0)
            json.dump(sensor_types, sensor_types_file, indent=4)
            sensor_types_file.truncate()

        return jsonify({"message": "Type de capteur ajouté avec succès"}), 201
    except Exception as e:
        print(f"Erreur lors de l'ajout du type de capteur : {e}")
        return jsonify({"error": "Erreur serveur"}), 500

@app.route('/newSensor', methods=['POST', 'GET'])
def new_sensor():
    reactive = False
    try:
        data = request.get_json()
        #print(data)
        if not data:
            return jsonify({"error": "Données invalides"}), 400

        # Charger le fichier des types de capteurs
        with open('./config/Sensors_type.json', encoding='utf-8') as sensor_types_file:
            sensor_types = json.load(sensor_types_file)

        # Vérifier que le type de capteur est connu
        sensor_type = next((t for t in sensor_types['types'] if t['type'] == data.get('type')), None)
        if not sensor_type:
            return jsonify({"error": "Type de capteur non trouvé"}), 404

        # Vérifier que les champs de configuration spécifiques sont présents
        required_fields = sensor_type['config']
        #print(required_fields)
        if not all(k in data for k in required_fields):
            return jsonify({"error": "Données invalides"}), 400

        # Construire la configuration du capteur en se basant sur le type de capteur sélectionné
        sensor_config = {}

        # Ajouter les champs de configuration spécifiques au type de capteur en premier
        for config_field in sensor_type['config']:
            if config_field in data:
                sensor_config[config_field] = data[config_field]
            else:
                return jsonify({"error": f"Champ de configuration manquant: {config_field}"}), 400

        # Ajouter les autres champs
        sensor_config.update({
            "type": data['type'],
            "measurements": sensor_type['measurements']
        })

        # Vérifier si le capteur existe déjà dans la base de données avec le même nom et la même IP
        with app.app_context():
            existing_sensor = Sensor.query.filter_by(name=sensor_config['name'], ip=sensor_config['ip']).first()
            if existing_sensor:
                if existing_sensor.active:
                    return jsonify({"error": "Capteur déjà existant et actif"}), 409
                else:
                    # Si le capteur existe mais n'est pas actif, le réactiver
                    existing_sensor.active = True
                    db.session.commit()
                    reactive = True

                    #return jsonify({"message": "Capteur réactivé avec succès"}), 200

            # Ajouter le capteur à la base de données
            if(not reactive):
                sensor = Sensor(name=sensor_config['name'], ip=sensor_config['ip'], active=True)
                db.session.add(sensor)
                db.session.commit()

                for measurement_key, measurement_info in sensor_config['measurements'].items():
                    measurement_type = db.session.query(MeasurementType).filter_by(clef=measurement_key).first()
                    if not measurement_type:
                        measurement_type = MeasurementType(name=measurement_info['name'], unité=measurement_info['unit'], clef=measurement_key)
                        db.session.add(measurement_type)
                        db.session.commit()
            
            db.session.close()


        # Ajouter le capteur au fichier de configuration
        with open("./config/config.json", 'r+', encoding='utf-8') as f:
            config = json.load(f)
            config["sensors"].append(sensor_config)
            f.seek(0)
            json.dump(config, f, indent=4)
            f.truncate()

        startThread(sensor_config)

        if(reactive):
            return jsonify({"message": "Capteur réactivé avec succès"}), 200
        else:
            return jsonify({"message": "Capteur ajouté avec succès"}), 201
    except Exception as e:
        print(f"Erreur lors de l'ajout du capteur : {e}")
        return jsonify({"error": "Erreur serveur"}), 500

@app.route('/deleteSensor', methods=['DELETE'])
def delete_sensor():
    try:
        data = request.get_json()
        #print(data)
        # Vérifier que les données nécessaires sont présentes
        if not data or 'name' not in data:
            return jsonify({"error": "Données invalides"}), 400

        # Charger la configuration actuelle des capteurs
        with open("./config/config.json", 'r', encoding='utf-8') as f:
            config = json.load(f)

        # Chercher le capteur dans la liste des capteurs
        sensor_to_delete = None
        for sensor in config["sensors"]:
            if sensor.get('name') == data.get('name') or sensor.get('ip') == data.get('ip'):
                sensor_to_delete = sensor
                break

        # Si le capteur n'existe pas, renvoyer une erreur
        if not sensor_to_delete:
            return jsonify({"error": "Capteur non trouvé"}), 404

        # Supprimer le capteur de la liste
        config["sensors"].remove(sensor_to_delete)

        # Réécrire le fichier config.json
        with open("./config/config.json", 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=4)

        with app.app_context():
            sensor = Sensor.query.filter_by(ip=sensor.get('ip')).first()
            if sensor:
                sensor.active = False  # Marquer le capteur comme inactif
                db.session.commit()
                db.session.close()

                return jsonify({"message": "Capteur marqué comme inactif avec succès"}), 200
            else:
                return jsonify({"error": "Capteur non trouvé"}), 404
        
        # Trouver et arrêter le thread associé au capteur
        global sensor_threads

        #print(sensor_threads)
        
        for thread in sensor_threads:
            if (thread.name == data.get('name')) or (thread.ip == data.get('ip')):
                thread.stop()  # Arrêter le thread
                sensor_threads.remove(thread)  # Retirer le thread de la liste
                print(f"Capteur {data.get('name')} arrêté avec succès")
                break

        # Si tout se passe bien, retourner un message de succès
        return jsonify({"message": "Capteur supprimé avec succès"}), 200

    except Exception as e:
        print(f"Erreur lors de la suppression du capteur : {e}")
        return jsonify({"error": "Erreur serveur"}), 500
    

@app.route('/getData', methods=['POST'])
def get_data():
    try:
        sensor_data = []
        print("getData request received")
        
        # Parcourir les threads des capteurs actifs pour récupérer les dernières données
        for sensor_thread in sensor_threads:  # sensor_threads est supposé être une liste globale des threads actifs
            if sensor_thread.is_alive():
                # Récupérer les données du dictionnaire `last_values` du thread
                sensor_info = {
                    'name': sensor_thread.name,
                    'measurements': sensor_thread.data['measurements'],  # Dernières valeurs de mesure
                    'timestamp': sensor_thread.data['timestamp']  # Timestamp de la dernière mise à jour
                }
                sensor_data.append(sensor_info)
            else:
                print(f"Thread pour le capteur {sensor_thread.name} n'est pas actif.")
        
        return jsonify(sensor_data)
    
    except Exception as e:
        print(f"Erreur lors de la récupération des données des capteurs : {e}")
        return jsonify({"error": "Erreur serveur"}), 500
"""
def get_data1():
    try:
        sensor_data = []
        print("getData request received")
        
        # Récupération des capteurs actifs
        with app.app_context():
            sensors = Sensor.query.filter_by(active=True).all()

            for sensor in sensors:
                sensor_info = {
                    'name': sensor.name,
                    'measurements': {},
                    'timestamp': None
                }
                
                # Sous-requête pour récupérer la dernière mesure pour chaque type de mesure
                subquery = db.session.query(
                    Measurement.sensor_id,
                    Measurement.measurement_type_id,
                    Measurement.value_avg,
                    Measurement.timestamp_end,
                    func.row_number().over(
                        partition_by=Measurement.measurement_type_id, 
                        order_by=Measurement.timestamp_end.desc()
                    ).label('row_num')
                ).filter(
                    Measurement.sensor_id == sensor.id
                ).subquery()

                # Récupérer seulement les dernières valeurs pour chaque type de mesure
                query = db.session.query(
                    subquery.c.measurement_type_id,
                    subquery.c.value_avg,
                    subquery.c.timestamp_end
                ).filter(subquery.c.row_num == 1).all()

                # Traiter les résultats
                for measurement in query:
                    # Récupérer le type de mesure à partir de la table MeasurementType
                    measurement_type = MeasurementType.query.filter_by(id=measurement.measurement_type_id).first()
                    
                    if measurement_type and measurement_type.clef not in sensor_info['measurements']:
                        sensor_info['measurements'][measurement_type.clef] = {
                            'LastVal': measurement.value_avg
                        }
                        sensor_info['timestamp'] = measurement.timestamp_end.isoformat()
                
                sensor_data.append(sensor_info)
        
        return jsonify(sensor_data)
    
    except Exception as e:
        print(f"Erreur lors de la récupération des données des capteurs : {e}")
        return jsonify({"error": "Erreur serveur"}), 500


"""
"""
@app.route('/getData', methods=['POST'])
def get_data():
    try:
        sensor_data = []
        print("getData request received")
        with app.app_context():
            sensors = Sensor.query.filter_by(active=True).all()  # Filtrer les capteurs actifs
            for sensor in sensors:
                sensor_info = {
                    'name': sensor.name,
                    'measurements': {},
                    'timestamp': None
                }
                measurements = Measurement.query.filter_by(sensor_id=sensor.id).order_by(Measurement.timestamp_end.desc()).all()
                for measurement in measurements:
                    measurement_type = MeasurementType.query.filter_by(id=measurement.measurement_type_id).first()
                    if measurement_type.clef not in sensor_info['measurements']:
                        sensor_info['measurements'][measurement_type.clef] = {
                            'LastVal': measurement.value_avg
                        }
                        sensor_info['timestamp'] = measurement.timestamp_end.isoformat()
                sensor_data.append(sensor_info)
        return jsonify(sensor_data)
    except Exception as e:
        print(f"Erreur lors de la récupération des données des capteurs : {e}")
        return jsonify({"error": "Erreur serveur"}), 500
"""
def signal_handler(sig, frame):
    """Gestionnaire de signal pour intercepter Ctrl + C et arrêter les threads."""
    print("\nSignal d'arrêt reçu, arrêt des threads...")
    for thread in sensor_threads:
        thread.stop()  # Arrêter chaque thread proprement
    
    sys.exit(0)  # Quitter le programme après l'arrêt des threads

def start_sensor_threads():
    """Démarrer les threads pour chaque capteur défini dans le fichier config.json."""
    with open('./config/config.json', 'r', encoding='utf-8') as f:
        config = json.load(f)
        #print(config)

    for sensor_config in config["sensors"]:
        startThread(sensor_config)

def startThread(sensor_config):
    thread = SensorThread(sensor_config)
    thread.start()
    sensor_threads.append(thread)

if __name__ == '__main__':
    
    start_sensor_threads()
    signal.signal(signal.SIGINT, signal_handler)
    app.run(host='0.0.0.0', port=5000) 