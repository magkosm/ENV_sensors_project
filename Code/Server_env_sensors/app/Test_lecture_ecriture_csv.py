import csv

def csv_to_dico(csv_file):#each line of the dictionary is a line of the csv, the keys are the headers of each column
    data_dico = []
    with open(csv_file, 'r', newline='') as file:
        reader = csv.DictReader(file)
        for row in reader:
            data_dico.append(row)
    return data_dico

if __name__ == '__main__':
    data = csv_to_dico("./csv/RAM.csv")
    print(data[0])