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

const folderPath = path.join(__dirname, ".wwebjs_auth");
if (fs.existsSync(folderPath)) fs.rmSync(folderPath, { recursive: true });

/**** SESION DE CLIENT WHATSAPP */
const sessions = [];
/** FIN DE SESION DE WHATSAPP */

/** INICIALIZANDO SOCKET IO */
const init = function(socket) {
    const savedSessions = getSessionsFile();
    console.log(savedSessions);
    if (savedSessions.length > 0) {
        if (socket) {
            socket.emit("init", savedSessions);
        } else {
            savedSessions.forEach((sess) => {
                createSession(sess.userId);
            });
        }
    }
};
//init();

clientSocket.on("connection", function(clientSocket) {
    console.log("CONNECT");
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
        return;
    }
    const client = new Client({
        authStrategy: new LocalAuth({ clientId: userId }),
        dataPath: path.join(__dirname, "..", ".wwebjs_auth"),
        puppeteer: {
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
        clientSocket.emit("authenticated", { id: userId, authenticated: true });
    });

    client.on("auth_failure", () => {
        clientSocket.emit("authenticated", false);
        process.exit();
    });

    client.on("ready", () => {
        console.log("Client is ready!");
        clientSocket.emit("ready", { id: userId });
    });

    client.on("disconnected", () => {
        console.log("disconnected");
        clientSocket.emit("message", {
            id: userId,
            text: "Whatsapp is disconnected!",
        });
        //client.destroy();
        //client.initialize().catch;

    });

    client.on('message', message => {
        console.log(message.body);
        clientSocket.emit("mensajes", { from: message.from, texto: message.body });
    });

    sessions.push({
        userId: userId,
        client: client
    });
};

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