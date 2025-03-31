const LoadedNetworks = "";

function majSensors() {
    (async () => {
        const toSend = { do: "getMesurements" }; // Replace with data to send
        const data = await sendRequest('getMesurements', toSend); // Replace 'endpoint' with request name
        console.log('Response processed:', data); // Use received JSON data
    
        // Fill each span with corresponding value
        document.getElementById("temp").textContent = parseFloat(data.temp).toFixed(2);
        document.getElementById("hum").textContent = parseFloat(data.hum).toFixed(2);
        document.getElementById("press").textContent = parseFloat(data.press).toFixed(2);
        document.getElementById("lum").textContent = parseFloat(data.lum).toFixed(2);
        document.getElementById("CO2").textContent = parseFloat(data.CO2).toFixed(2);
    })();
}

function deleteNetwork() {
    // Get list of <li> elements
    const list = document.getElementById('savednet');

    const items = list.querySelectorAll(".li");
   
    var SSIDToDelete = {};

    // Loop through each list element

    items.forEach(function(item) {
        const checkBox = item.querySelector(".check");
        const txt = item.querySelector(".netName");
        if (checkBox.checked) {
            const ssid = txt.textContent; // Get the ID of the element
            SSIDToDelete[ssid] = "true";
        }
    });

    // If any items were checked, send request to server
    if (Object.keys(SSIDToDelete).length > 0) {
        console.log("Sending request");
        (async () => {
            const resp = await sendRequest('deleteNetwork', SSIDToDelete, true); 
            console.log('Response processed:', resp); // Use received JSON data
            
            if(resp.status == "success"){
                items.forEach(function(item) {
                    const checkBox = item.querySelector(".check");
                    if (checkBox.checked) {
                        checkBox.checked = false;
                        item.remove();
                    }
                });
                const success = createMsg("Networks deleted", "success_del", "green");
                document.getElementById("delForm").insertBefore(success, document.getElementById("Suppr"));
                deleteMessage("success_del", 2,3000);
            }
            else{
                const failure = createMsg("An error occurred during registration", "pbs", "red");
                document.getElementById("delForm").insertBefore(failure, document.getElementById("Suppr"));
                deleteMessage("pbs", 2,3000);
            }

        })();
       
    }
}

async function sendRequest(requestName, data) {
    try {
        // Send a POST request to the server
        const response = await fetch('/' + requestName, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data), // Convert data to JSON
        });

        // Check if the response is OK
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const text = await response.text(); // Get response as text
        console.log('Raw response:', text); // Display response for inspection
        
        let jsonData;

        try {
            jsonData = JSON.parse(text); // Try to parse as JSON
        } catch (error) {
            console.error('JSON parsing error:', error);
            return null; // Return null if parsing fails
        }

        console.log('JSON data:', jsonData); // Display JSON data if parsing succeeds
        return jsonData; // Return JSON data
    } 
    catch (error) {
        console.error('Request error:', error);
        return null; // Return null in case of error
    }
}

function createMsg(label, id, color){
    const msg = document.createElement("div");

    msg.id = id;
                
    msg.style.backgroundColor = color;
    msg.style.width = "auto";
    msg.style.margin = "5px";
    msg.style.marginTop = "1px";
    msg.style.marginBottom = "1px";
    msg.style.padding = "2px";
    msg.style.opacity = "0.5";
    msg.style.fontSize = "17px";
    msg.style.color = "white";
    msg.style.textAlign = "center";
    msg.style.alignItems = "center";
    msg.style.position = "relative";

    msg.textContent = label;

    return msg;
}

function fadeOut(element, duration) {
    var opacity = 0.5; // Initial full opacity
    const interval = 0.05; // Time interval in ms between each decrease
    const step = opacity/(duration/interval);

    const fadeEffect = setInterval(function() {
        if (opacity > 0) {
            opacity -= step; // Progressively reduce opacity
            element.style.opacity = String(opacity);
        } else {
            clearInterval(fadeEffect); // Stop effect once at 0
            element.remove();
        }
    }, interval);
}

function deleteMessage(id, fadeTime = 0, timeout = 0){
    const msg = document.getElementById(id);
    
    if((fadeTime == 0) && (timeout == 0)){
        if(msg != null){
            msg.remove();
        }
        
    }

    else if(msg != null){
        setTimeout(function() {
            fadeOut(msg, fadeTime)
        }, timeout);     
        return true;
    }

    return false;
}

function exist(id){
    return (document.getElementById(id) != null);
}

function checkLenght(value, min){
    return (value.length >= min );
}

function AddNetwork(){
    const list = document.getElementById('savednet');
    const SSID = document.getElementById('SSID_input').value;
    const pass = document.getElementById('Pass_input').value;

    console.log("Data retrieved: ");
    console.log(SSID);
    console.log(pass);

    if((SSID.length >= 2) && (pass.length >= 8)){//all conditions satisfied

        (async () => {

            const toSend = {
                SSID : SSID,
                pass : pass
            };

            const resp = await sendRequest('NewNetwork', toSend); 
            console.log('Response processed:', resp); 
        
            if(resp.status == "success"){
                document.getElementById('SSID_input').value = "";
                document.getElementById('Pass_input').value = "";
                storedNetworks();
            }
            else{
                const success = createMsg("An error occurred during registration", "pbe", "red");
                document.getElementById("passForm").insertBefore(success, document.getElementById("Connect"));
                deleteMessage("pbe", 2,3000);
            }
        })();
       

    }
    else{//wrong inputs length
        deleteMessage("success", 0);

        if((SSID.length < 2)){
            document.getElementById('SSID_input').style.borderColor= "red"; 

            if(!exist("error_ssid")){
                const msg = createMsg("The network name must contain at least 2 characters", "error_ssid", "red");
                document.getElementById("passForm").insertBefore(msg, document.getElementById("Connect"));
            }
        }
        else{
            deleteMessage("error_ssid",1,0);
            document.getElementById('SSID_input').style.borderColor= "black"; 

        }

        if(pass.length < 8){
            document.getElementById('Pass_input').style.borderColor= "red"; 
            document.getElementById('Pass_input').value = "";

            if(!exist("error_pass")){

                const msg = createMsg("The password must contain at least 8 characters", "error_pass", "red");
                document.getElementById("passForm").insertBefore(msg, document.getElementById("Connect"));
            }
        }
        else{
            deleteMessage("error_pass",1,0);
            document.getElementById('Pass_input').style.borderColor= "black"; 
        }
    }
}

function ChangeInfos(){
    const Name = document.getElementById('Name').value;
    const AP_SSID = document.getElementById('AP_SSID').value;
    const AP_Pass = document.getElementById('AP_Pass').value;

    console.log("changing settings");
    console.log(Name.length);
    console.log(AP_SSID.length);
    console.log(AP_Pass.length);

    if(checkLenght(Name,2) && checkLenght(AP_SSID, 2) && checkLenght(AP_Pass, 8)){//everything ok
        console.log("correct Length");
        (async () => {

            const toSend = {
                AP_SSID : AP_SSID,
                AP_Pass : AP_Pass,
                Name : Name
            };
            console.log(JSON.stringify(toSend));
            const resp = await sendRequest('NewInfos', toSend); 
            console.log('Response processed:', resp); 
        
            if(resp.status == "success"){
                deleteMessage("fail_name",0,0);
                deleteMessage("fail_ssid",0,0);
                deleteMessage("fail_pass",0,0);

                const msg = createMsg("Changes saved", "success_param", "green");
                document.getElementById("paramForm").insertBefore(msg, document.getElementById("enregistrer"));

                deleteMessage("success_param",2, 3000);

            }
            else{
                const msg = createMsg("Registration problem, try again", "fail_param", "red");
                document.getElementById("paramForm").insertBefore(msg, document.getElementById("enregistrer"));

                deleteMessage("fail_param",2, 3000);
            }
        })();
       
    }
    else{

        deleteMessage("success_param", 0, 0);

        if(!checkLenght(Name,2)){
            if(!exist("fail_name")){
                const msg1 = createMsg("The name must contain at least 2 characters", "fail_name", "red");
                document.getElementById("paramForm").insertBefore(msg1, document.getElementById("enregistrer"));
            }
        }
        else{
            deleteMessage("fail_name",0.5,0);
        }

        if(!checkLenght(AP_SSID,2)){
            if(!exist("fail_ssid")){
                const msg2 = createMsg("The hotspot name must contain at least 2 characters", "fail_ssid", "red");
                document.getElementById("paramForm").insertBefore(msg2, document.getElementById("enregistrer"));
            }
        }
        else{
            deleteMessage("fail_ssid",0.5,0);
        }

        if(!checkLenght(AP_Pass,8)){
            if(!exist("fail_pass")){
                const msg3 = createMsg("The password must contain at least 8 characters", "fail_pass", "red");
                document.getElementById("paramForm").insertBefore(msg3, document.getElementById("enregistrer"));
            }
        }
        else{
            deleteMessage("fail_pass",0.5,0);
        }
    }


}

function scanNetworks(){

    const loading = document.getElementById("scanning");

    if(loading == null){
        const netList = document.getElementById("Netlist");

        while (netList.firstChild) {//deleting all scan networks
            netList.removeChild(netList.firstChild);
        }
        console.log("Deleting old list");

        const msg = createMsg("Scan in progress", "scanning", "green");
        document.getElementById("scanBox").insertBefore(msg, document.getElementById("Scanner"));

        (async () => {
            const toSend = {
                do : "scan"
            };
            console.log("Sending request to server");
            const networks = await sendRequest('NetScan', toSend);
            LoadedNetworks = networks;
            console.log('Response processed:', networks); 

            deleteMessage("scanning",0,0);

            if(networks.s == "success"){

                const keys = Object.keys(networks);
                keys.forEach(function(SSID) {
                    console.log("Running");
                    if(SSID != "s"){//skip first keys which is success message
                        const RSSI = networks[SSID]["RSSI"].replace('*', '\uD83D\uDD12').replace('+', '\uD83D\uDD13');
                        const li = document.createElement("li");

                        li.innerHTML = `
                        <div class="network-info">
                            <span>${SSID}</span>
                            <span>${RSSI} </span>
                        </div>
                        <button class="connect-btn" onclick="showConnectPopup(${SSID})">Connect</button>
                    `   ;
                        
                        netList.append(li);
                    }
                });
            }
            else{//error during the scan
                const msg = createMsg("Scan failed", "fail_scan", "red");
                document.getElementById("scanBox").insertBefore(msg, document.getElementById("Scanner"));

                deleteMessage("fail_scan",3, 3000);
            }
        })();
    }
}

function showConnectPopup(SSID) {
    const network = LoadedNetworks[SSID];
    popupTitle.textContent = `Connection to ${SSID}`;
    credentialsForm.innerHTML = "";

    // Dynamic fields for credentials
    if (network["SECU_TYPE"] == "WIFI_AUTH_WPA2_ENTERPRISE") {
        const passwordField = document.createElement("input");
        passwordField.type = "password";
        passwordField.placeholder = "Password";
        credentialsForm.appendChild(passwordField);
    }
    else {
        const usernameField = document.createElement("input");
        usernameField.type = "text";
        usernameField.placeholder = "Username";
        const passwordField = document.createElement("input");
        passwordField.type = "password";
        passwordField.placeholder = "Password";
        credentialsForm.appendChild(usernameField);
        credentialsForm.appendChild(passwordField);
    }

    connectPopup.classList.remove("hidden");
}

function storedNetworks(){
    const netList = document.getElementById("savednet");

    while (netList.firstChild) {//deleting all scan networks
        netList.removeChild(netList.firstChild);
    }
    console.log("Deleting old list");

    const msg = createMsg("Retrieving saved networks", "reading", "green");
    document.getElementById("delForm").insertBefore(msg, document.getElementById("Suppr"));
    
    (async () => {
        const toSend = {
            do : "loadNetworks"
        };
        console.log("Sending request to server");
        const networks = await sendRequest('NetLoad', toSend); 
        console.log('Response processed:', networks); 

        deleteMessage("reading",0,0);

        if(networks.s == "success"){

            const keys = Object.keys(networks);

            keys.forEach(function(SSID) {
                console.log("Running");
                if(SSID != "s"){//skip first keys which is success message
                    const line = document.createElement("li");
                    line.className = "li scroll";
                    line.id = "Ni";

                    const name = document.createElement("a");
                    name.className = "netName";
                    name.textContent = SSID;

                    const check = document.createElement("input");
                    check.type = "checkbox";
                    check.className = "check";
                    
                    line.appendChild(name);
                    line.appendChild(check);

                    netList.appendChild(line);
                }
            });
        }
        else{//error during the scan
            const msg = createMsg("Loading failed", "fail_load", "red");
            document.getElementById("delForm").insertBefore(msg, document.getElementById("Suppr"));

            deleteMessage("fail_load",3, 3000);
        }
    })();
}

function loadConfig(){

    console.log("loading config ");

    const msg = createMsg("Retrieving module information", "Rconfig", "green");
    document.getElementById("paramForm").insertBefore(msg, document.getElementById("enregistrer"));
    
    (async () => {
        const toSend = {
            do : "loadInfos"
        };
        console.log("Sending request to server");
        const infos = await sendRequest('LoadConfig', toSend); 
        console.log('Response processed:', infos); 

        deleteMessage("Rconfig",0,0);

        if(infos.s == "success"){

            document.getElementById("Name").value = infos["nom"];
            document.getElementById("AP_SSID").value = infos["AP_SSID"];
            document.getElementById("AP_Pass").value = infos["AP_pass"];

        }
        else{//error during the scan
            const msg = createMsg("Loading failed", "fail_load", "red");
            document.getElementById("paramForm").insertBefore(msg, document.getElementById("enregistrer"));

            deleteMessage("fail_load",3, 3000);
        }
    })();
}

document.addEventListener('DOMContentLoaded', function() {//delete button
    document.getElementById('Suppr').addEventListener('click', deleteNetwork);
});

document.addEventListener('DOMContentLoaded', function() {//connect button
    document.getElementById('Connect').addEventListener('click', AddNetwork);
});

document.addEventListener('DOMContentLoaded', function() {//save button
    document.getElementById('enregistrer').addEventListener('click', ChangeInfos);
});

document.addEventListener('DOMContentLoaded', function() {//scan button
    document.getElementById('Scanner').addEventListener('click', scanNetworks);
});

document.addEventListener("DOMContentLoaded", majSensors);
setInterval(majSensors, 2000);
document.addEventListener("DOMContentLoaded", loadConfig);
document.addEventListener("DOMContentLoaded", storedNetworks);
document.addEventListener("DOMContentLoaded", scanNetworks);
