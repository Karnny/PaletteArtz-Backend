const uploadConfig = require('../config/uploadConfig');

function gift({ app, auth, db, mysql, upload }) {

    app.get('/api/store', auth, async (req, res) => {

        try {
            let storeResult;
            // GET Username and balance
            const sqlGetUserBalance = `
            SELECT us.username, wl.balance, wl.total_income, wl.total_outcome FROM palette_artz_db.user us
            JOIN palette_artz_db.wallet wl ON us.wallet_id = wl.id
            WHERE us.id = ?
            `;

            let [getUserBalanceResult] = await db.query(sqlGetUserBalance, [req.user.id]);
            getUserBalanceResult = getUserBalanceResult[0]
            
            // get all user gifts
            const sqlGetUserGifts = `
            SELECT gf.gift_name, gf.gift_price, gf.gift_image_name, uhg.gift_id, uhg.amount FROM palette_artz_db.gift gf
            JOIN palette_artz_db.user_has_gift uhg
            ON gf.id = uhg.gift_id
            WHERE uhg.user_id = ?
            `;
            let [getUserGiftsResult] = await db.query(sqlGetUserGifts, [req.user.id]);
            
            getUserBalanceResult.total_gift_value = (()=> {
                let totalValue = 0;
                getUserGiftsResult.forEach((gift) => {
                    totalValue += gift.gift_price * gift.amount;
                });
                return totalValue;
            })();
            res.json({
                userDetails: getUserBalanceResult,
                userGifts: getUserGiftsResult
            });

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
            WHERE us.id = ?
            `;
            const [getUserBalanceResult] = await db.query(sqlGetUserBalance, [req.user.id]);
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
            SET wl.balance = wl.balance - ?, 
            wl.total_outcome = wl.total_outcome + ? 
            WHERE us.id = ?
            `;
            const [deductUserBalanceResult] = await db.query(sqlDeductUserBalance, [totalGiftPrice, totalGiftPrice, req.user.id]);
            if (deductUserBalanceResult.affectedRows != 1) {
                throw Error("Cannot deduct user balance");
            }

            // check if user already have certain gift
            const sqlGetUserHasGift = `
            SELECT * FROM palette_artz_db.user_has_gift uhg
            WHERE uhg.gift_id = ?
            `;
            const [getUserHasGiftResult] = await db.query(sqlGetUserHasGift, [id]);
            if (getUserHasGiftResult.length != 0) {
                const sqlIncreaseGift = `
                UPDATE palette_artz_db.user_has_gift uhg
                SET uhg.amount = uhg.amount + ?
                WHERE uhg.user_id = ? AND uhg.gift_id = ?
                `;
                const [increaseGiftResult] = await db.query(sqlIncreaseGift, [amount, req.user.id, id]);
                if (increaseGiftResult.affectedRows != 1) {
                    throw Error("Cannot increase number of gift");
                }
            } else {
                // add gift to user accout
                const sqlAddGiftToUser = `
                INSERT INTO palette_artz_db.user_has_gift 
                (user_id, gift_id, amount) 
                VALUES (?,?,?)
                `;
                const [addGiftToUserResult] = await db.query(sqlAddGiftToUser, [req.user.id, id, amount]);
                if (addGiftToUserResult.affectedRows != 1) {
                    throw Error("Cannot add gift for user");
                }
            }


            res.send("Transaction complete.");

        } catch (error) {

            console.log(error);
            return res.status(500).send("Server Error");
        }
    });

}

module.exports = gift;