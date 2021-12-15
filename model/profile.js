const uploadConfig = require('../config/uploadConfig');

function profile({ app, auth, db, mysql, upload }) {

    app.get('/api/profile', async (req, res) => {
        console.log(req.user);

        try {
            const sqlGetProfile = `SELECT * FROM palette_artz_db.user WHERE id = ?`;
            const [userProfile] = await db.query(sqlGetProfile, [req.user.id]);
            if (userProfile.length != 1) {
                return res.status(404).send("No user found");
            }

            let userDetails = userProfile[0];
            delete userDetails['password'];

            res.json(userDetails);

        } catch (error) {
            console.log(error);
            return res.status(500).send("Server Error");
        }

    });


    app.post('/api/profile', async (req, res) => {
        let { username, email, phone_number = "", gender = "", bio = "", tags = "" } = req.body;

        console.log(req.body);
        username = username.trim();
        email = email.toLowerCase().trim();
        try {
            if (!(username && email)) {
                return res.status(400).send("All input is required");
            }

            if (Array.isArray(tags)) {
                tags = tags.join(" ");
            }

            const sqlUpdateUser = `
            UPDATE palette_artz_db.user us
            SET us.username = ?, us.email = ?, us.phone_number = ?, us.gender = ?, us.bio = ?, us.tags = ?
            WHERE us.id = ?`;

            const [updateResult] = await db.query(sqlUpdateUser, [username, email, phone_number, gender, bio, tags, req.user.id]);
            if (updateResult.affectedRows != 1) {
                return res.status(400).send("Cannot update user profile");
            }

            res.json(
                {
                    message: "Update success",
                    updateDetails: updateResult
                }
            );
        } catch (error) {
            console.log(error);
            return res.status(500).send("Server Error");
        }


    });

    app.get('/api/profile/profilePicture', async (req, res) => {
        
        try {
            const sql = `SELECT us.profile_image FROM palette_artz_db.user us WHERE us.id = ?`;
            const [userProfileImage] = await db.query(sql, [req.user.id]);
            if (userProfileImage.length != 1) {
                throw Error("Cannot get user profile image");
            }

            res.json({
                userDetails: req.user,
                image: uploadConfig.multerImageDestination + userProfileImage[0].profile_image  
            });
        } catch (error) {
            console.log(error);
            return res.status(500).send(error || "Server Error");
        }
    });

    app.post('/api/profile/profilePicture', upload.single('image'), async (req, res) => {
        const file = req.file;
        if (!file) {
            return res.status(400).send("Please upload a picture");
        }

        console.log(file);

        try {

            const sqlUpdateUserProfileImage = `
            UPDATE palette_artz_db.user us SET us.profile_image = ? WHERE us.id = ?
            `;
            const [updateResult] = await db.query(sqlUpdateUserProfileImage, [file.filename, req.user.id]);
            if (updateResult.affectedRows != 1) {
                throw Error("Cannot update profile picture");
            }

            res.json({
                message: "Upload success",
                imagePath: uploadConfig.multerImageDestination + file.filename
            });

        } catch (error) {
            console.log(error);
            return res.status(500).send(error || "Server Error");
        }

    });

}

module.exports = profile;