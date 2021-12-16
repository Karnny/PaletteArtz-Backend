
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwtConfig');


function authentication({ app, auth, db, mysql }) {

    async function isOldUser(email) {
        const sql = `SELECT * FROM palette_artz_db.user WHERE email = ?`;
        const [user] = await db.query(sql, [email]);
        console.log('User:', user);
        if (user.length != 0) {
            return user;
        } else {
            return false;
        }
    }

    async function createWallet () {
        const sql = `INSERT INTO palette_artz_db.wallet (balance) VALUES (0)`
        const [wallet, fields] = await db.query(sql);
        console.log('Wallet: ', wallet.insertId);
        if (!wallet.insertId) {
            throw "Wallet cannot created";
        }
        return wallet.insertId;
    }

    app.post('/register', async (req, res) => {

        try {
            const {
                email,
                username,
                password,
            } = req.body

            if (!(username && email && password)) {
                return res.status(400).send("All inputs are required");
            }

            if (await isOldUser(email)) {
                return res.status(409).send("User already exist. Please login instead")
            }

            const encryptedPassword = await bcrypt.hash(password, 10);
            const walletId = await createWallet();

            const sqlInsertUser = `
            INSERT INTO palette_artz_db.user (username, email, password, wallet_id, tags) 
            VALUES (?,?,?,?,?)
            `;
            const [insertUserResult] =  await db.query(sqlInsertUser, [username, email, encryptedPassword, walletId, '']);
            if (!insertUserResult.insertId) {
                return res.status(500).send("Cannot create user");
            }

            let user_details = {
                user_id: insertUserResult.insertId,
                email: email,
                username: username
            }
            const token = jwt.sign(user_details, process.env.TOKEN_SECRET, jwtConfig);
            user_details.token = token;
            req.user = user_details;

            res.status(201).json({
                user_details: user_details,
                token: token
            });


        } catch (error) {
            console.log(error);
            res.status(500).send("Server Error");
        }
        // res.send('reg ok');
    });

    app.post('/login', async (req, res) => {
        const { email, password } = req.body;
        if (!(email && password)) {
            return res.status(400).send("All inputs are required");
        }

        const [user] = await db.query('SELECT * FROM palette_artz_db.user WHERE email = ?', [email]);
        if (user.length != 1) {
            return res.status(404).send("No user found");
        }
        const encryptedPassword = user[0].password;
        if (await bcrypt.compare(password, encryptedPassword)) {
            let user_details = user[0];
            delete user_details['password'];
            console.log(user_details);
            
            const token = jwt.sign(user_details, process.env.TOKEN_SECRET, jwtConfig);
            res.status(200).json({
                user_details: user_details,
                token: token
            });
        } else {
            res.status(404).send('Error, email or password invalid');
        }
    });

    app.post('/api/change_password', auth, async (req, res) => {
        let { old_password, new_password } = req.body;

        if (!(old_password && new_password)) {
            return res.status(400).send("Old and new password are required");
        }

        try {
            const sqlGetDBPassword = `
            SELECT * FROM palette_artz_db.user us WHERE us.id = ?
            `;
            const [getDBPasswordResult] = await db.query(sqlGetDBPassword, [req.user.id]);
            const encryptedPassword = getDBPasswordResult[0].password; 
            if (await bcrypt.compare(old_password, encryptedPassword)) {
                const newEncryptedPassword = await bcrypt.hash(new_password, 10);

                const sqlUpdatePassword = `
                UPDATE palette_artz_db.user us SET us.password = ?
                WHERE us.id = ?
                `;

                const [updateResult] = await db.query(sqlUpdatePassword, [newEncryptedPassword, req.user.id]);
                if (updateResult.affectedRows != 1) {
                    throw Error("Cannot update password");
                }

                res.send("Password changed.");
            } else {
                return res.status(400).send("Old password isn't match");
            }
        } catch (error) {
            console.log(error);
            res.status(500).send("Server Error");
        }
    });
}

module.exports = authentication;