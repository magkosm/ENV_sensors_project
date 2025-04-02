# MDRS-ENV-sensor-server
MDRS Environnemental sensors collecting server code. 

This code collect, store and display measurments form the MDRS environnemental sensors. Data is stored in an sqlite database and can be displayed on the dashboard or vizualized with graphs. 

## Prérequis
Avant de commencer, assurez-vous d'avoir les outils suivants installés sur votre machine :
- [Python 3.x](https://www.python.org/downloads/)
- [Node.js](https://nodejs.org/en/) (qui inclut `npm` pour gérer les paquets JavaScript)
- [Git](https://git-scm.com/)

## 1. Installation de l'environnement virtuel Python

### Créer un environnement virtuel

1. Clonez le dépôt sur votre machine :
    ```bash
    git clone https://github.com/Robs2924/MDRS-ENV-sensor-server.git
    cd MDRS-ENV-sensor-server
    ```

2. Créez un environnement virtuel Python :
    ```bash
    python -m venv .venv
    ```

3. Activez l'environnement virtuel :
    - Sur **Windows** : 
    Ouvrir un powerShell en mode administrateur en dehors de Vscode et taper la commande : 

     ```bash
      Set-Executionpolicy Unrestricted
      ```
      Dans le terminal initial dans VsCode :

      ```bash
      .venv\Scripts\activate
      ```
    - Sur **macOS/Linux** :
      ```bash
      source .venv/bin/activate
      ```

### Installer les dépendances Python

4. Installez `pip` si ce n'est pas déjà fait :
    ```bash
    python -m ensurepip --upgrade
    ```

5. Installez les dépendances Python requises pour le projet :
    ```bash
    pip install -r requirements.txt
    ```

## 2. Installation de Webpack si vous souhaiter modifier la partie affichant les graphiques
### Installer les dépendances JavaScript

1. Naviguez dans le répertoire du projet contenant le fichier `package.json` (normalement dans `app/static/js` ou un autre répertoire lié au frontend).
   
2. Si `npm` n'est pas installé, vous pouvez l'installer via [Node.js](https://nodejs.org/en/) (npm est inclus avec Node.js).

3. Installez les dépendances JavaScript requises par le projet avec npm :
    ```bash
    npm install
    ```

### Configurer Webpack

4. Si ce n'est pas déjà fait, installez Webpack et ses dépendances dans le projet :
    ```bash
    npm install --save-dev webpack webpack-cli webpack-dev-server
    ```

5. Vérifiez que votre configuration Webpack (`webpack.config.js`) est prête pour le projet. Vous pouvez ensuite compiler vos fichiers JavaScript avec la commande suivante :
    ```bash
    npm run build
    ```

## 3. Lancer le projet

### Lancer le serveur Flask

1. Assurez-vous que l'environnement virtuel est activé et que les dépendances Python sont installées.

2. Lancez le serveur Flask avec la commande suivante :
    ```bash
    py server.py
    ```

Le serveur devrait maintenant être accessible à l'adresse `http://127.0.0.1:5000`.

### Lancer Webpack en mode développement

1. Si vous souhaitez lancer Webpack en mode développement avec le serveur de développement (pour surveiller les changements en temps réel), vous pouvez utiliser la commande suivante :
    ```bash
    npm run dev
    ```

Cela lancera Webpack Dev Server pour servir votre application front-end.

## 4. Dépannage

### Problèmes d'installation

Si vous rencontrez des erreurs lors de l'installation des dépendances, assurez-vous que vous avez bien activé l'environnement virtuel Python et installé toutes les dépendances requises avec `pip install -r requirements.txt`.

Si `npm` échoue, assurez-vous que vous avez installé Node.js et que vous êtes dans le bon répertoire pour exécuter les commandes npm.

### Erreurs de permission

Si vous obtenez des erreurs de permission lors de l'installation, essayez d'exécuter les commandes avec des droits d'administrateur (en utilisant `sudo` sur macOS/Linux).

## Conclusion

Une fois ces étapes terminées, votre projet devrait être configuré et prêt à l'emploi, avec un environnement virtuel Python pour exécuter le backend et Webpack pour gérer le frontend.