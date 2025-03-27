"""
Date : 10/03/2025
Author : Robin GORIUS

This code was made to translate the environnemental sensor dataBase in csv files that are easier to read for some researcher's.
"""


from flask import Flask
from flask_sqlalchemy import SQLAlchemy
import csv
from datetime import datetime

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

with app.app_context():
    db.create_all()  # Crée la base de données et les tables si elles n'existent pas

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

def csv_to_dico(csv_file):
    data_dico = []
    with open(csv_file, 'r', newline='') as file:
        reader = csv.DictReader(file)
        for row in reader:
            data_dico.append(row)
    return data_dico

def calc_dt(ts1, ts2):
    dt1 = datetime.strptime(ts1, '%Y-%m-%d %H:%M:%S')
    dt2 = datetime.strptime(ts2, '%Y-%m-%d %H:%M:%S')
    return abs((dt2 - dt1).total_seconds())

def merge_csv_files(sensor_files, output_file, max_time_diff=20):
    sensor_data = {sensor: csv_to_dico(f"./csv/{sensor}.csv") for sensor in sensor_files}
    merged_data = []

    # Initialize indices for each sensor
    indices = {sensor: 0 for sensor in sensor_files}
    timestamps = []

    # Collect all unique timestamps
    for sensor in sensor_files:
        for row in sensor_data[sensor]:
            if row['Timestamp'] not in timestamps:
                timestamps.append(row['Timestamp'])

    # Sort timestamps
    timestamps.sort()

    # Merge data
    for timestamp in timestamps:
        row = {'Timestamp': timestamp}
        valid = True
        for sensor in sensor_files:
            while indices[sensor] < len(sensor_data[sensor]) and sensor_data[sensor][indices[sensor]]['Timestamp'] < timestamp:
                indices[sensor] += 1
            if indices[sensor] < len(sensor_data[sensor]) and calc_dt(sensor_data[sensor][indices[sensor]]['Timestamp'], timestamp) <= max_time_diff:
                for key, value in sensor_data[sensor][indices[sensor]].items():
                    if key != 'Timestamp':
                        row[f"{sensor}_{key}"] = value
            else:
                valid = False
                break
        if valid:
            merged_data.append(row)

    # Write merged data to output file
    with open(output_file, 'w', newline='') as file:
        fieldnames = ['Timestamp'] + [f"{sensor}_{key}" for sensor in sensor_files for key in sensor_data[sensor][0].keys() if key != 'Timestamp']
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        for row in merged_data:
            writer.writerow(row)

def main():
    sensor_list = ["RAM", "SCID", "Greenhab", "UpperDeck", "LowerDeck"]
    data_types = ["Temp", "Hum", "CO2", "Pres", "Lum", "FullLum", "Visible", "IR", "VOC"]
    data_types_name = ["Temperature (°C)", "Humidity (%)", "CO2 concentration (ppm)", "Pressure(Pa)", "Luminosity (lx)", "Full spectrum luminosity (s.s.u)", "Visible luminosity (s.s.u)", "Infrared Luminosity (s.s.u)", "VOC index"]
    date_debut = "2025-02-15 16:48:06.728912"
    date_fin = "2025-03-14 16:48:06.728912"
    sampling_factor = 1

    #Faire un fichier par Lieu, une colonne par grandeur, une ligne par timestamp
    for sensor in sensor_list:
        data = getSensorDataFromDB(sensor, date_debut, date_fin, data_types, sampling_factor)

        file = open("./csv/"+f"{sensor}.csv", "w")
        file.write("Timestamp," + ",".join(data_types_name) + "\n")

        for i in range(len(data["timestamps"])):
            
            if(data["Lum"][i] == None):#correction d'un petit bug de calcul des lux quand la luminosité est quasi nulle. 
                data["Lum"][i] = 0
            try:
                file.write(data["timestamps"][i] + "," + ",".join([str(data[dt][i]) for dt in data_types]) + "\n")
            except:
                print("exception !")

        file.close()

if __name__ == '__main__':
    main()