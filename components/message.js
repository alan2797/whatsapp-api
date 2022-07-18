const router = require('express').Router();
const { MessageMedia } = require("whatsapp-web.js");
const fs = require('fs');


router.post('/send', async(req, res) => {
    let phone = req.body.phone;
    let message = req.body.message;
    let from = req.body.from;
    console.log(sessions);
    var client;
    var ses = sessions.find((session) => {
        if (from.includes(session.userId)) {
            return session
        }
    })
    if (ses) {
        client = ses.client
    }
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
});

router.post('/send/image', async(req, res) => {
    let phone = req.body.phone;
    let image = req.body.image;
    let caption = req.body.caption;

    if (phone == undefined || image == undefined) {
        res.send({ status: "ERROR", message: "Missing params" });
    } else {

        client.getState().then((data) => {
            console.log(data)
            if (data == "CONNECTED") {
                client.isRegisteredUser(`${phone}@c.us`).then((exists) => {
                    if (exists) {
                        var path = './temp/' + image;
                        //let media = MessageMedia.fromFilePath(path);
                        const media = new MessageMedia('image/png', image);
                        client.sendMessage(`${phone}@c.us`, media, { caption: caption || '' }).then((response) => {
                            if (response.id.fromMe) {
                                res.send({ status: 'SUCCESS', message: `MediaMessage successfully sent to ${phone}` })
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

    var client;
    var ses = sessions.find((session) => {
        if (from.includes(session.userId)) {
            return session
        }
    })
    if (ses) {
        client = ses.client
    }
    if (phone == undefined) {
        res.send({ status: "ERROR", message: "Missing params" });
    } else {
        client.getState().then((data) => {
            console.log(data)
            if (data == "CONNECTED") {
                client.isRegisteredUser(`${phone}@c.us`).then(async(exists) => {
                    if (exists) {
                        let chat = await client.getChatById(`${phone}@c.us`);
                        console.log(chat);
                        if (chat) {
                            let messages = await chat.fetchMessages();
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
                    fs.unlinkSync('../session.json')
                } catch (err) {
                    console.log(err)
                }
            }
        })
    }
});

module.exports = router;