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
            getUserGiftsResult = getUserGiftsResult.map((e) => {
                let edit = e;
                edit.gift_image_path = uploadConfig.localGiftImagePath + edit.gift_image_name;
 
                return edit;
            });

            getUserBalanceResult.total_gift_value = (() => {
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

    app.get('/api/user_gift', auth, async (req, res) => {

        try {
            const sqlGetUserGifts = `
            SELECT gf.gift_name, gf.gift_price, gf.gift_image_name, uhg.gift_id, uhg.amount FROM palette_artz_db.gift gf
            JOIN palette_artz_db.user_has_gift uhg
            ON gf.id = uhg.gift_id
            WHERE uhg.user_id = ?
            `;
            let [getUserGiftsResult] = await db.query(sqlGetUserGifts, [req.user.id]);
            getUserGiftsResult = getUserGiftsResult.map((e) => {
                let edit = e;
                edit.gift_image_path = uploadConfig.localGiftImagePath + edit.gift_image_name;
 
                return edit;
            });
            res.json(getUserGiftsResult);
        } catch (error) {
            console.log(error);
            return res.status(500).send("Server Error");
        }


    });

    app.get('/api/gift', auth, async (req, res) => {
        try {
            const sqlGetAllGifts = `
            SELECT * FROM palette_artz_db.gift
            `;
            let [getAllGiftResult] = await db.query(sqlGetAllGifts);
            getAllGiftResult = getAllGiftResult.map((e) => {
                let edit = e;
                edit.gift_image_path = uploadConfig.localGiftImagePath + edit.gift_image_name;
 
                return edit;
            });
            res.json(getAllGiftResult);

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

    app.post('/api/send_gift', auth, async (req, res) => {
        let { gift_id, amount, user_id } = req.body;

        if (!(gift_id && amount && user_id)) {
            return res.status(400).send("gift_id, amount, user_id are required!");
        }

        if (user_id == req.user.id) {
            return res.status(400).send("You cannot send gift(s) to your self dude, take care of yourself.");
        }

        try {
            // check if gifts are enough to send
            const sqlCheckGift = `
            SELECT uhg.*, gf.gift_price FROM palette_artz_db.user_has_gift uhg
            JOIN palette_artz_db.gift gf ON uhg.gift_id = gf.id
            WHERE uhg.gift_id = ? AND uhg.user_id = ?
            `;
            const [checkGiftResult] = await db.query(sqlCheckGift, [gift_id, req.user.id]);
            const senderGiftAmount = checkGiftResult[0].amount;
            if (senderGiftAmount < amount) {
                return res.status(400).send("You don't have enough gift to send");
            }

            // deduct gift from sender
            const sqlDeductGift = `
            UPDATE palette_artz_db.user_has_gift uhg
            SET uhg.amount = uhg.amount - ?
            WHERE uhg.gift_id = ? AND user_id = ?
            `;
            const [deductGiftResult] = await db.query(sqlDeductGift, [amount, gift_id, req.user.id]);
            if (deductGiftResult.affectedRows != 1) {
                throw Error("Cannot deduct gift");
            }

            // give gift to reciever but it convert to account balance
            // increase reciever's total income
            const sqlTransferGift = `
            UPDATE palette_artz_db.wallet wl
            JOIN palette_artz_db.user us ON us.wallet_id = wl.id
            SET wl.balance = wl.balance + ?, wl.total_income = wl.total_income + ?
            WHERE us.id = ?
            `;
            const totalGiftValue = checkGiftResult[0].gift_price * amount;
            const [transferGiftResult] = await db.query(sqlTransferGift, [totalGiftValue, totalGiftValue, user_id]);
            if (transferGiftResult.affectedRows != 1) {
                return res.status(400).send("Cannot send gift to that person");
            }

            res.send("Transaction complete");


        } catch (error) {
            console.log(error);
            return res.status(500).send("Server Error");
        }


    });

}

module.exports = gift;
