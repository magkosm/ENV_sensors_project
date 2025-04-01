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

# Define database models
class Sensor(db.Model):
    __tablename__ = 'Sensors'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    ip = db.Column(db.String(255), nullable=False)
    active = db.Column(db.Boolean, default=True)  # New field to indicate if the sensor is active

class MeasurementType(db.Model):
    __tablename__ = 'MeasurementTypes'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    unit = db.Column(db.String(255), nullable=True)  # New unit field
    key = db.Column(db.String(255), nullable=False)  # New key field

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

    # Relationship with MeasurementType
    measurement_type = db.relationship('MeasurementType', backref='measurements')

# Create a SQLAlchemy session inside the application context
with app.app_context():
    db.create_all()  # Creates the database and tables if they do not exist

    # Creation of the access management engine
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
        self.latest_data = {}  # New dictionary to store the latest values
        self.lock = threading.Lock()  # Lock to secure access to the dictionary
        self.init = False

        # Event to signal thread termination
        self.stop_event = threading.Event()

        # Add the sensor to the database during initialization
        with app.app_context():
            sensor = db.session.query(Sensor).filter_by(name=self.name).first()
            if not sensor:
                print(f"Initialization: Sensor {self.name} not found. Adding sensor with IP {self.ip}.")
                sensor = Sensor(name=self.name, ip=self.ip)
                db.session.add(sensor)
                db.session.commit()
                print(f"Initialization: Sensor {self.name} added successfully.")
            else:
                print(f"Initialization: Sensor {self.name} already present in the database.")

            for measurement_key, measurement_info in self.measurements.items():
                measurement_type = db.session.query(MeasurementType).filter_by(key=measurement_key).first()
                if not measurement_type:
                    print(f"Initialization: Type of measurement {measurement_info['name']} not found. Added measurement type.")
                    measurement_type = MeasurementType(name=measurement_info['name'], unit=measurement_info['unit'], key=measurement_key)
                    db.session.add(measurement_type)
                    db.session.commit()
                    print(f"Initialization: Type of measurement {measurement_info['name']} added successfully.")
            
            db.session.close()

    def update_data(self, url):
        """Method to make an HTTP request and retrieve the data."""
        try:
            print(f"update_data: Sending the request to {url}")
            response = requests.post(url, json={})
            if response.status_code == 200:
                data = response.json()
                data['ip'] = self.ip

                # Update sensor data
                for key in self.measurements:
                    if self.measurements[key]:
                        self.data['measurements'][key] = data.get(key, None)

                self.data['timestamp'] = datetime.now(timezone.utc).isoformat()

                # Dictionary update of latest values
                with self.lock:
                    self.latest_data = {
                        'ip': self.ip,
                        'measurements': self.data['measurements'],
                        'timestamp': self.data['timestamp']
                    }

                print(f"update_data: Data received for the sensor {self.name}")
                return True
            else:
                print(f"update_data: Error - status code {response.status_code} for the sensor {self.name}")
                return False
        except requests.exceptions.RequestException as e:
            print(f"update_data: Error retrieving data for {self.name} : {e}")
            return False

    def get_latest_data(self):
        """Recover the latest stored data."""
        with self.lock:
            return self.latest_data.copy()  # Returns a copy to avoid conflicts

    def writeToDB(self):
        try:
            with app.app_context():
                print(f"writeToDB: Start for the sensor {self.name} with IP {self.ip}")
                TS_end = datetime.now()
                TS_start = TS_end - timedelta(seconds=30)

                sensor = db.session.query(Sensor).filter_by(name=self.name).first()
                if not sensor:
                    raise ValueError(f"Sensor {self.name} not found in database.")

                for measurement_key, values in self.data['measurements'].items():
                    measurement_type = db.session.query(MeasurementType).filter_by(key=measurement_key).first()
                    if not measurement_type:
                        measurement_type = MeasurementType(name=measurement_key, key=measurement_key)
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
            print(f"writeToDB: Error writing to database : {e}")
        finally:
            with app.app_context():
                db.session.close()
            print(f"writeToDB: {self.name} : Session closed")

    def run(self):
        """Method executed when the thread starts."""
        print(f"run: Starting the thread for the sensor {self.name} with IP {self.ip}")
        while not self.stop_event.is_set():
            url = f'http://{self.ip}/getMesurements'
            if self.update_data(url):
                self.writeToDB()
            else:
                print(f"run: Failed to retrieve measurements for sensor {self.name}")
            time.sleep(30)
        print(f"run: Sensor {self.name} stopped properly")

    def stop(self):
        """Method to stop the thread cleanly."""
        print(f"stop: Stopping the thread for the sensor {self.name}")
        self.stop_event.set()

# List of sensor threads
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
                MeasurementType.key.in_(data_types)
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

            if measure.measurement_type.key in data_types:
                data[measure.measurement_type.key].append(measure.value_avg)

        # Appliquer le facteur d'échantillonnage
        data["timestamps"] = data["timestamps"][::sampling_factor]
        for dt in data_types:
            data[dt] = data[dt][::sampling_factor]

        db.session.close()

    #print(data)
    return data
"""

def getSensorDataFromDB(sensor_name, start_date, end_date, data_types, sampling_factor):
    # Retrieve the sensor by name
    with app.app_context():
        sensor = db.session.query(Sensor).filter_by(name=sensor_name).first()
        if not sensor:
            raise ValueError(f"No sensor found with name '{sensor_name}'.")

        # Build the query to retrieve the requested measurements with sampling
        measurements_query = (
            db.session.query(
                Measurement.timestamp_start,
                Measurement.value_avg,
                MeasurementType.key,
                db.func.row_number().over(
                    partition_by=MeasurementType.key,
                    order_by=Measurement.timestamp_start
                ).label("row_num")
            )
            .join(MeasurementType)
            .filter(
                Measurement.sensor_id == sensor.id,
                Measurement.timestamp_start >= start_date,
                Measurement.timestamp_start <= end_date,
                MeasurementType.key.in_(data_types)
            )
            .subquery()
        )

        # Filter rows based on sampling_factor
        sampled_measurements_query = (
            db.session.query(
                measurements_query.c.timestamp_start,
                measurements_query.c.value_avg,
                measurements_query.c.key
            )
            .filter(measurements_query.c.row_num % sampling_factor == 0)
            .order_by(measurements_query.c.timestamp_start)
            .all()
        )

        # Prepare output data
        data = {"timestamps": []}
        for dt in data_types:
            data[dt] = []

        # Organize data by timestamp and measurement type
        for measure in sampled_measurements_query:
            timestamp = measure.timestamp_start.strftime('%Y-%m-%d %H:%M:%S')
            if timestamp not in data["timestamps"]:
                data["timestamps"].append(timestamp)

            if measure.key in data_types:
                data[measure.key].append(measure.value_avg)

        db.session.close()

    return data

@app.route('/')
def index():
    """Main route to view the web page."""
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

# Route to retrieve data of all sizes with filtering by date
@app.route('/getDatagraphs', methods=['POST'])
def getDatagraphs():
    # Retrieve query parameters
    
    params = request.get_json()
    print(params)
    
    start_date = datetime.strptime(params.get('start_date'), '%Y-%m-%d %H:%M:%S')
    end_date = datetime.strptime(params.get('end_date'), '%Y-%m-%d %H:%M:%S')

     # Calculate the total duration in seconds
    duration_seconds = (end_date - start_date).total_seconds()

    max_points = 1000  # Maximum number of points to display
    point_interval_seconds = 30  # Interval between two points in the base (30s)

    # Calculate the total number of points in the time range
    total_points = duration_seconds // point_interval_seconds

    # Dynamically calculate the sampling factor
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

        # Structure data in a JSON format
        data[sensor] = results
        
        #print(data)
    # Return data in JSON form
    return jsonify(data=data)

@app.route('/getSensorTypes', methods=['POST', 'GET'])
def get_sensor_types():
    """Route to send the JSON file containing all known sensor types."""
    with open('./config/Sensors_type.json', 'r', encoding='utf-8') as sensor_types_file:
        sensor_types = json.load(sensor_types_file)
    return jsonify(sensor_types)

@app.route('/addSensorType', methods=['POST', 'GET'])
def add_sensor_type():
    try:
        data = request.get_json()
        if not data or not all(k in data for k in ('type', 'config', 'measurements')):
            return jsonify({"error": "Invalid data"}), 400

        # Load the sensor types file
        with open('./config/Sensors_type.json', 'r+', encoding='utf-8') as sensor_types_file:
            sensor_types = json.load(sensor_types_file)

            # Check if the sensor type already exists
            if any(t['type'] == data['type'] for t in sensor_types['types']):
                return jsonify({"error": "Existing sensor type"}), 409

            # Add the new sensor type
            sensor_types['types'].append(data)
            sensor_types_file.seek(0)
            json.dump(sensor_types, sensor_types_file, indent=4)
            sensor_types_file.truncate()

        return jsonify({"message": "Sensor type added successfully"}), 201
    except Exception as e:
        print(f"Error adding sensor type: {e}")
        return jsonify({"error": "Server error"}), 500

@app.route('/newSensor', methods=['POST', 'GET'])
def new_sensor():
    reactive = False
    try:
        data = request.get_json()
        #print(data)
        if not data:
            return jsonify({"error": "Invalid data"}), 400

        # Load the sensor types file
        with open('./config/Sensors_type.json', encoding='utf-8') as sensor_types_file:
            sensor_types = json.load(sensor_types_file)

        # Check that the sensor type is known
        sensor_type = next((t for t in sensor_types['types'] if t['type'] == data.get('type')), None)
        if not sensor_type:
            return jsonify({"error": "Sensor type not found"}), 404

        # Check that the specific configuration fields are present
        required_fields = sensor_type['config']
        #print(required_fields)
        if not all(k in data for k in required_fields):
            return jsonify({"error": "Invalid data"}), 400

        # Build the sensor configuration based on the selected sensor type
        sensor_config = {}

        # Add the sensor type specific configuration fields first
        for config_field in sensor_type['config']:
            if config_field in data:
                sensor_config[config_field] = data[config_field]
            else:
                return jsonify({"error": f"Missing configuration field: {config_field}"}), 400

        # Add the other fields
        sensor_config.update({
            "type": data['type'],
            "measurements": sensor_type['measurements']
        })

        # Check if the sensor already exists in the database with the same name and IP
        with app.app_context():
            existing_sensor = Sensor.query.filter_by(name=sensor_config['name'], ip=sensor_config['ip']).first()
            if existing_sensor:
                if existing_sensor.active:
                    return jsonify({"error": "Sensor already existing and active"}), 409
                else:
                    # If the sensor exists but is not active, reactivate it
                    existing_sensor.active = True
                    db.session.commit()
                    reactive = True

                    #return jsonify({"message": "Sensor successfully reactivated"}), 200

            # Add the sensor to the database
            if(not reactive):
                sensor = Sensor(name=sensor_config['name'], ip=sensor_config['ip'], active=True)
                db.session.add(sensor)
                db.session.commit()

                for measurement_key, measurement_info in sensor_config['measurements'].items():
                    measurement_type = db.session.query(MeasurementType).filter_by(key=measurement_key).first()
                    if not measurement_type:
                        measurement_type = MeasurementType(name=measurement_info['name'], unit=measurement_info['unit'], key=measurement_key)
                        db.session.add(measurement_type)
                        db.session.commit()
            
            db.session.close()


        # Add the sensor to the configuration file
        with open("./config/config.json", 'r+', encoding='utf-8') as f:
            config = json.load(f)
            config["sensors"].append(sensor_config)
            f.seek(0)
            json.dump(config, f, indent=4)
            f.truncate()

        startThread(sensor_config)

        if(reactive):
            return jsonify({"message": "Sensor successfully reactivated"}), 200
        else:
            return jsonify({"message": "Sensor added successfully"}), 201
    except Exception as e:
        print(f"Error adding sensor: {e}")
        return jsonify({"error": "Server error"}), 500

@app.route('/deleteSensor', methods=['DELETE'])
def delete_sensor():
    try:
        data = request.get_json()
        #print(data)
        # Check that the necessary data is present
        if not data or 'name' not in data:
            return jsonify({"error": "Invalid data"}), 400

        # Load current sensor configuration
        with open("./config/config.json", 'r', encoding='utf-8') as f:
            config = json.load(f)

        # Search for the sensor in the sensor list
        sensor_to_delete = None
        for sensor in config["sensors"]:
            if sensor.get('name') == data.get('name') or sensor.get('ip') == data.get('ip'):
                sensor_to_delete = sensor
                break

        # If the sensor does not exist, return an error
        if not sensor_to_delete:
            return jsonify({"error": "Sensor not found"}), 404

        # Remove sensor from list
        config["sensors"].remove(sensor_to_delete)

        # Rewrite the config.json file
        with open("./config/config.json", 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=4)

        with app.app_context():
            sensor = Sensor.query.filter_by(ip=sensor.get('ip')).first()
            if sensor:
                sensor.active = False  # Mark the sensor as inactive
                db.session.commit()
                db.session.close()

                return jsonify({"message": "Sensor successfully marked as inactive"}), 200
            else:
                return jsonify({"error": "Sensor not found"}), 404
        
        # Find and stop the thread associated with the sensor
        global sensor_threads

        #print(sensor_threads)
        
        for thread in sensor_threads:
            if (thread.name == data.get('name')) or (thread.ip == data.get('ip')):
                thread.stop()  # Stop the thread
                sensor_threads.remove(thread)  # Remove thread from list
                print(f"Sensor {data.get('name')} successfully arrested")
                break

        # If all goes well, return a success messages
        return jsonify({"message": "Sensor successfully removed"}), 200

    except Exception as e:
        print(f"Error deleting sensor: {e}")
        return jsonify({"error": "Server error"}), 500
    

@app.route('/getData', methods=['POST'])
def get_data():
    try:
        sensor_data = []
        print("getData request received")
        
        # Browse active sensor threads to retrieve the latest data
        for sensor_thread in sensor_threads:  # sensor_threads is assumed to be a global list of active threads
            if sensor_thread.is_alive():
                # Retrieve data from the thread's `last_values` dictionary
                sensor_info = {
                    'name': sensor_thread.name,
                    'measurements': sensor_thread.data['measurements'],  # Latest measurement values
                    'timestamp': sensor_thread.data['timestamp']  # Timestamp of the last update
                }
                sensor_data.append(sensor_info)
            else:
                print(f"Thread for the sensor {sensor_thread.name} is not active.")
        
        return jsonify(sensor_data)
    
    except Exception as e:
        print(f"Error retrieving sensor data : {e}")
        return jsonify({"error": "Server error"}), 500
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
                    
                    if measurement_type and measurement_type.key not in sensor_info['measurements']:
                        sensor_info['measurements'][measurement_type.key] = {
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
                    if measurement_type.key not in sensor_info['measurements']:
                        sensor_info['measurements'][measurement_type.key] = {
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
    """Signal handler to intercept Ctrl+C and stop threads."""
    print("\nStop signal received, threads stopped...")
    for thread in sensor_threads:
        thread.stop()  # Stop each thread cleanly
    
    sys.exit(0)  # Exit the program after stopping the threads

def start_sensor_threads():
    """Start threads for each sensor defined in the config.json file."""
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