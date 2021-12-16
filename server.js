require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express()
const multer = require('multer')
const auth = require("./middleware/auth");
const { db, mysql } = require('./config/dbConfig');

app.use('/public', express.static(path.join(__dirname, "/public")));
app.use(express.json({ limit: '50mb' })); // Allow more parameters and file size to be parsed
app.use(express.urlencoded({ extended: true, limit: '50mb', parameterLimit: 1000000 }));

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, "public/uploads"));
    },
    filename: function (req, file, cb) {
        cb(null, new Date().getTime() + '.' + file.originalname.split('.')[1])
    }
});

var upload = multer({ storage: storage })

app.get('/', (req, res) => {
    res.send('Welcome!!');
});

const requiredObject = {
    app, auth, db, mysql, upload
};

require('./model/authentication')(requiredObject);
// app.use(auth);  // forcing every service to auth after this line
require('./model/profile')(requiredObject);
require('./model/uploadArtwork')(requiredObject);
require('./model/homepage')(requiredObject);
require('./model/postDetails')(requiredObject);

const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log("Server run at port " + PORT);
});