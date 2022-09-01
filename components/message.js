const router = require('express').Router();
const { MessageMedia } = require("whatsapp-web.js");
const fs = require('fs');
var fileupload = require('express-fileupload');

router.use(fileupload({
    useTempFiles: true,
    tempFileDir: '/tmp/'
}));

router.post('/send', async(req, res) => {
    let phone = req.body.phone;
    let message = req.body.message;
    let from = req.body.from;
    var client = getClientUser(from);
    if (client) {
        if (phone == undefined || message == undefined) {
            res.send({ status: "ERROR", message: "Missing params" });
        } else {
            client.getState().then((data) => {
                console.log(data)
                if (data == "CONNECTED") {
                    client.isRegisteredUser(`${phone}@c.us`).then((exists) => {
                        if (exists) {
                            client.sendMessage(phone + '@c.us', message).then((response) => {
                                if (response.id.fromMe) {
                                    res.send({ status: 'SUCCESS', message: `Message successfully sent to ${phone}` })
                                }
                            });
                        } else {
                            res.send({ status: 'NOT_EXISTS', message: `${phone} is not a whatsapp user` });
                        }
                    });
                } else {
                    res.send({ status: data, message: `${phone} Don't send message` });
                }

            }).catch((err) => {
                if (err) {
                    res.send({ status: "DISCONNECTED", message: err });
                    try {
                        fs.unlinkSync('../session.json')
                    } catch (err) {
                        console.log(err)
                    }
                }
            })
        }
    } else {
        res.send({ status: "SESSION FINALIZADA", message: "sesion finalizada para el numero " + from });
    }

});

router.post('/sendFile', async(req, res) => {
    let phone = req.body.phone;
    let caption = req.body.caption;
    let from = req.body.from;
    let file = req.files.filew;
    var client = getClientUser(from);
    if (phone == undefined || file == undefined) {
        res.send({ status: "ERROR", message: "Missing params" });
    } else {
        client.getState().then((data) => {
            if (data == "CONNECTED") {
                client.isRegisteredUser(`${phone}@c.us`).then((exists) => {
                    if (exists) {
                        console.log(file);
                        let base64File = fs.readFileSync(file.tempFilePath, 'base64');
                        //const media = MessageMedia.fromFilePath(file.tempFilePath);
                        const media = new MessageMedia(file.mimetype, base64File, file.name);
                        client.sendMessage(`${phone}@c.us`, media, { caption: caption || '' }).then((response) => {
                            if (response.id.fromMe) {
                                res.send({ status: 'SUCCESS', message: `MediaMessage successfully sent to ${phone}` });
                            }
                        });
                    } else {
                        res.send({ status: 'NOT_EXISTS', message: `${phone} is not a whatsapp user` });
                    }
                });
            } else {
                res.send({ status: data, message: `${phone} Don't send image` });
            }
        }).catch((err) => {
            if (err) {
                res.send({ status: "DISCONNECTED", message: err });
                try {
                    fs.unlinkSync('../session.json')
                } catch (err) {
                    console.log(err)
                }
            }
        })
    }
});

router.post('/getMessages', async(req, res) => {
    console.log(sessions);
    let phone = req.body.phone;
    let from = req.body.from;
    var client = getClientUser(from);

    if (client) {
        if (phone == undefined) {
            res.send({ status: "ERROR", message: "Missing params" });
        } else {
            client.getState().then((data) => {
                console.log(data)
                if (data == "CONNECTED") {
                    client.isRegisteredUser(`${phone}@c.us`).then(async(exists) => {
                        if (exists) {
                            //await new Promise(resolve => setTimeout(resolve, 20000));
                            let chat = await client.getChatById(`${phone}@c.us`);
                            console.log(chat);
                            if (chat) {
                                let messages = await chat.fetchMessages({ limit: 1000 });
                                console.log(messages.length);
                                res.send({ statu: 'SUCCESS', message: `get messages successfully of ${phone}`, data: messages })
                            }
                        } else {
                            res.send({ status: 'NOT_EXISTS', message: `${phone} is not a whatsapp user` });
                        }
                    });
                } else {
                    res.send({ status: data, message: `${phone} Don't send message` });
                }

            }).catch((err) => {
                if (err) {
                    res.send({ status: "DISCONNECTED", message: err });
                    try {
                        //fs.unlinkSync('../session.json')
                    } catch (err) {
                        console.log(err)
                    }
                }
            })
        }
    } else {
        res.send({ status: "SESION FINALIZADA", message: "sesion finalizada para el numero " + phone });
    }

});

router.post('/connectUser', async(req, res) => {
    let from = req.body.from;
    var client = getClientUser(from);

    if (client) {
        console.log(client.options.authStrategy.userDataDir);
        if (fs.existsSync(client.options.authStrategy.userDataDir)) {
            console.log("existe");
            res.send({ status: "CONECTADO", message: "usuario conectado" });
        } else {
            console.log("no existe");
            res.send({ status: "DESCONECTADO", message: "usuario desconectado" });
        }
    } else {
        console.log("desconectadooooo ");
        res.send({ status: "DESCONECTADO", message: "usuario desconectado" });
    }

});

router.post('/downloadMedia', async(req, res) => {
    let from = req.body.from;
    let msgMedia = req.body.msgMedia;
    var client = getClientUser(from);

    if (client) {
        if (msgMedia) {
            const message = "";
            media = await message.downloadMedia();
            res.send({ statu: 'SUCCESS', message: `archivo descargado`, data: media });
        } else {
            res.send({ status: "ERROR", message: "no se descargo el archivo correctamente" });

        }
    } else {
        console.log("desconectadooooo ");
        res.send({ status: "DESCONECTADO", message: "usuario desconectado" });
    }

});

/*router.post('/twilio', async(req, res) => {
    console.log("llego a webhook");
    console.log(req.body)
    const accountSid = 'AC5e746a682b65eefd713f9d17da47b754';
    const authToken = 'c2bc072e16c8db7e55751221d34856ac';
    const client = require('twilio')(accountSid, authToken);

    client.messages
        .create({
            to: '+59160003467'
        })
        .then(message => console.log(message.sid))
        .done();
});*/

const getClientUser = (from) => {
    console.log(sessions);
    var ses = sessions.find((session) => {
        if (from.includes(session.userId)) {
            return session
        }
    })

    if (ses) {
        return ses.client;
    }

    return null;
}



module.exports = router;