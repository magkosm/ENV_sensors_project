# MDRS-ENV-sensor-server
MDRS Environmental sensors collecting server code. 

This code collects, stores and displays measurements from the MDRS environmental sensors. Data is stored in an SQLite database and can be displayed on the dashboard or visualized with graphs. 

## Prerequisites
Before starting, make sure you have the following tools installed on your machine:
- [Python 3.x](https://www.python.org/downloads/)
- [Node.js](https://nodejs.org/en/) (which includes `npm` for managing JavaScript packages)
- [Git](https://git-scm.com/)

## 1. Installing the Python Virtual Environment

### Create a Virtual Environment

1. Clone the repository on your machine:
    ```bash
    git clone https://github.com/Robs2924/MDRS-ENV-sensor-server.git
    cd MDRS-ENV-sensor-server
    ```

2. Create a Python virtual environment:
    ```bash
    python -m venv .venv
    ```

3. Activate the virtual environment:
    - On **Windows**: 
    Open PowerShell in administrator mode outside of VSCode and type the command: 

     ```bash
      Set-Executionpolicy Unrestricted
      ```
      In the initial terminal in VSCode:

      ```bash
      .venv\Scripts\activate
      ```
    - On **macOS/Linux**:
      ```bash
      source .venv/bin/activate
      ```

### Install Python Dependencies

4. Install `pip` if not already done:
    ```bash
    python -m ensurepip --upgrade
    ```

5. Install the required Python dependencies for the project:
    ```bash
    pip install -r requirements.txt
    ```

## 2. Installing Webpack if you want to modify the graphs display part
### Install JavaScript Dependencies

1. Navigate to the project directory containing the `package.json` file (normally in `app/static/js` or another frontend-related directory).
   
2. If `npm` is not installed, you can install it via [Node.js](https://nodejs.org/en/) (npm is included with Node.js).

3. Install the JavaScript dependencies required by the project with npm:
    ```bash
    npm install
    ```

### Configure Webpack

4. If not already done, install Webpack and its dependencies in the project:
    ```bash
    npm install --save-dev webpack webpack-cli webpack-dev-server
    ```

5. Check that your Webpack configuration (`webpack.config.js`) is ready for the project. You can then compile your JavaScript files with the following command:
    ```bash
    npm run build
    ```

## 3. Launch the Project

### Launch the Flask Server

1. Make sure the virtual environment is activated and Python dependencies are installed.

2. Launch the Flask server with the following command:
    ```bash
    py server.py
    ```

The server should now be accessible at `http://127.0.0.1:5000`.

### Launch Webpack in Development Mode

1. If you want to launch Webpack in development mode with the development server (to watch changes in real-time), you can use the following command:
    ```bash
    npm run dev
    ```

This will launch Webpack Dev Server to serve your front-end application.

## 4. Troubleshooting

### Installation Problems

If you encounter errors while installing dependencies, make sure you have activated the Python virtual environment and installed all required dependencies with `pip install -r requirements.txt`.

If `npm` fails, make sure you have installed Node.js and are in the correct directory to execute npm commands.

### Permission Errors

If you get permission errors during installation, try running the commands with administrator rights (using `sudo` on macOS/Linux).

## Conclusion

Once these steps are completed, your project should be configured and ready to use, with a Python virtual environment to run the backend and Webpack to manage the frontend.