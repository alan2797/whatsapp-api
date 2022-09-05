const express = require("express");
require("express-async-errors");
const bodyParser = require("body-parser");
const fs = require("fs");
const axios = require("axios");
const shelljs = require("shelljs");
const cors = require("cors");
const path = require("path");
const { Client, LocalAuth } = require("whatsapp-web.js");
const config = require("./config.json");
const { generateClientWhatsapp } = require("./components/utils");
const app = express();
const server = require("http").createServer(app);
const clientSocket = require("socket.io")(server, {
    cors: {
        origin: "*",
    },
    //allowEIO3: true, // false by default
});

const SESSION_FILE_PATH = './session.json';

const folderPath = path.join(__dirname, ".wwebjs_auth");
//if (fs.existsSync(folderPath)) fs.rmSync(folderPath, { recursive: true });

/**** SESION DE CLIENT WHATSAPP */
const sessions = [];
const sessionsUserId = [];

/** FIN DE SESION DE WHATSAPP */

/** INICIALIZANDO SOCKET IO */
clientSocket.on("connection", function(clientSocket) {
    //console.log("CONNECT");
    //init(clientSocket);
    clientSocket.on("create-session", function(data) {
        createSession(data.userId);
    });
});
/** FIN SOCKET IO */

/** GENERANDO CLIENTES */
const createSession = function(userId) {
    console.log("create session userID: ", userId);
    console.log(sessions);
    if (sessions.find((ses) => ses.userId == userId)) {
        //clientSocket.emit("auth", "AUTENTICADO");
        return;
    }
    console.log(__dirname);
    console.log(__dirname + "\\.wwebjs_auth\\" + "session-" + userId);
    const client = new Client({
        authStrategy: new LocalAuth({ clientId: userId }),
        dataPath: path.join(__dirname, "..", ".wwebjs_auth"),
        puppeteer: {
            handleSIGINT: false,
            headless: true,
            args: [
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--disable-setuid-sandbox',
                '--no-first-run',
                '--no-sandbox',
                '--no-zygote',
                '--deterministic-fetch',
                '--disable-features=IsolateOrigins',
                '--disable-site-isolation-trials',
                // '--single-process',
            ],
        },

    });

    client.initialize();
    /**LISTEN QR */
    client.on("qr", (qr) => {
        console.log("codigo qr: ", userId);
        clientSocket.emit('qr', { id: userId, qr: qr });
    });

    /**SI ESTA AUTENTICADO */
    client.on("authenticated", (session) => {
        console.log("authenticated");
        console.log(JSON.stringify(session));
        clientSocket.emit("authenticated", { id: userId, authenticated: true });
    });

    client.on("auth_failure", () => {
        clientSocket.emit("authenticated", false);
        process.exit();
    });

    client.on("ready", () => {
        console.log("Client is ready!");
        clientSocket.emit("ready", { id: userId });

        sessions.push({
            userId: userId,
            client: client
        });

        sessionsUserId.push({
            userId: userId
        })

        fs.writeFileSync(SESSION_FILE_PATH, JSON.stringify(sessionsUserId), (err) => {
            if (err) {
                console.log("error de escritura de archivo");
                console.error(err);
            }
        });
    });

    client.on("disconnected", () => {
        console.log("disconnected");
        clientSocket.emit("message", {
            id: userId,
            text: "Whatsapp is disconnected!",
        });
        client.destroy();
        //client.initialize().catch;

    });



    client.on('message', async message => {
        console.log(message.body);
        let media = null;
        if (message.hasMedia) {
            //media = await message.downloadMedia();
        }
        clientSocket.emit("mensajes", {
            from: message.from,
            texto: message.body,
            timestamp: message.timestamp,
            fromMe: message.fromMe,
            hasMedia: message.hasMedia,
            type: message.type,
            media: media
        });
    });

    client.on('message_create', async message => {
        let media = null;
        if (message.fromMe) {
            console.log(message);
            if (message.hasMedia) {
                //media = await message.downloadMedia();
            }
            clientSocket.emit("mensajes-propios", {
                to: message.to,
                texto: message.body,
                timestamp: message.timestamp,
                fromMe: message.fromMe,
                hasMedia: message.hasMedia,
                type: message.type,
                media: media
            });
        }
    });

};


if (fs.existsSync(SESSION_FILE_PATH)) {
    let sess = fs.readFileSync(SESSION_FILE_PATH, 'utf-8');
    //console.log(sess);
    if (sess) {
        let dataSession = JSON.parse(sess);
        console.log(dataSession);
        for (let i = 0; i < dataSession.length; i++) {
            console.log(dataSession[i].userId);
            createSession(dataSession[i].userId);
        }
    }
}

/**FIN GENERANDO CLIENTEs */

/*process.title = "whatsapp-node-api";
global.client = generateClientWhatsapp();
global.authed = false;*/
global.sessions = sessions;
const port = process.env.PORT || config.port;

app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
//Set Request Size Limit 50 MB
app.use(bodyParser.json({ limit: "50mb" }));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// const chatRoute = require("./components/chatting");
// const groupRoute = require("./components/group");
const contactRoute = require("./components/contact");
const otpRoute = require("./components/otp");

const authRoute = require("./components/auth");
const messageRoute = require("./components/message");
const { handleError } = require("./middlewares/handle-error.middlewares");
const cli = require("nodemon/lib/cli");
const { use } = require("express/lib/router");

app.use(function(req, res, next) {
    console.log(req.method + " : " + req.path);
    next();
});
// app.use("/chat", chatRoute);
// app.use("/group", groupRoute);
app.use("/auth", authRoute);
app.use("/contact", contactRoute);

app.use("/otp", otpRoute);
app.use("/message", messageRoute);

app.get("/*", function(req, res) {
    //res.sendFile(path.join(__dirname, "public", "index.html"));
});

//Manejar Error
app.use(handleError);

server.listen(port, () => {
    console.log("Server Running Live on Port : " + port);
});