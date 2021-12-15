require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express()
const auth = require("./middleware/auth");
const { db, mysql } = require('./config/dbConfig');

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json({ limit: '50mb' })); // Allow more parameters and file size to be parsed
app.use(express.urlencoded({ extended: true, limit: '50mb', parameterLimit: 1000000 }));


app.get('/', (req, res) => {
    res.send('Welcome!!');
});

require('./model/authentication')({app, auth, db, mysql});
app.use(auth);  // forcing every service to auth after this line
require('./model/profile')({app, auth, db, mysql});

const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log("Server run at port " + PORT);
});