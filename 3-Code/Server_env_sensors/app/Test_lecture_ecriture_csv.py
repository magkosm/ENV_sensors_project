import csv

def csv_to_dico(csv_file):#chaque ligne du dico est une ligne du csv, les clefs sont les entêtes de chaque colonne
    data_dico = []
    with open(csv_file, 'r', newline='') as file:
        reader = csv.DictReader(file)
        for row in reader:
            data_dico.append(row)
    return data_dico

if __name__ == '__main__':
    data = csv_to_dico("./csv/RAM.csv")
    print(data[0])