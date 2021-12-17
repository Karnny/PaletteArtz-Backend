const uploadConfig = require('../config/uploadConfig');

function store({ app, auth, db, mysql, upload }) {

    app.get('/api/store', auth, async (req, res) => {

        try {
            const sqlGetUserBalance = `
            SELECT us.username, wl.* FROM palette_artz_db.user us
            JOIN palette_artz_db.wallet wl ON us.wallet_id = wl.id
            WHERE us.id = ?;

            SELECT * FROM palette_artz_db.gift gf
            JOIN palette_artz_db.user_has_gift uhg
            ON gf.id = uhg.gift_id
            WHERE uhg.user_id = ?
            `;
        } catch (error) {
            console.log(error);
            return res.status(500).send("Server Error");
        }
    });


    app.post('/api/buy_gift', auth, async (req, res) => {
        let { id, gift_id, amount } = req.body;

        if (gift_id) {
            id = gift_id;
        }

        amount = parseInt(amount);

        if (id == null || amount == null) {
            return res.status(400).send("Gift id and amount are required");
        }

        try {
            const sqlGetGift = `
            SELECT * FROM palette_artz_db.gift gf
            WHERE gf.id = ?
            `;
            const [getGiftResult] = await db.query(sqlGetGift, [id]);

            const sqlGetUserBalance = `
            SELECT wl.* FROM palette_artz_db.wallet wl
            JOIN palette_artz_db.user us ON us.wallet_id = wl.id
            WHERE us.user_id = ?
            `;
            const [getUserBalanceResult] = await db.query(sqlGetUserBalance, [id]);
            const userBalance = parseFloat(getUserBalanceResult[0].balance);
            const eachGiftPrice = parseFloat(getGiftResult[0].gift_price);
            const totalGiftPrice = eachGiftPrice * amount;

            // check if user has sufficient balance
            if (userBalance < totalGiftPrice) {
                return res.status(400).send("User has insufficient balance");
            }

            // deduct user's wallet balance
            const sqlDeductUserBalance = `
            UPDATE palette_artz_db.wallet wl
            JOIN palette_artz_db.user us ON us.wallet_id = wl.id
            SET wl.balance = wl.balance - ?
            WHERE us.id = ?
            `;
            const [deductUserBalanceResult] = await db.query(sqlDeductUserBalance, totalGiftPrice, req.user.id);
            if (deductUserBalanceResult.affectedRows != 1) {
                throw Error("Cannot deduct user balance");
            }

            // add gift to user accout
            const sqlAddGiftToUser = `
            INSERT INTO palette_artz_db.user_has_gift 
            (user_id, gift_id, amount) 
            VALUES (?,?,?)
            `;
            const [addGiftToUserResult] = await db.query(sqlAddGiftToUser, req.user.id, amount);


        } catch (error) {

            console.log(error);
            return res.status(500).send("Server Error");
        }
    });

}

module.exports = store;
