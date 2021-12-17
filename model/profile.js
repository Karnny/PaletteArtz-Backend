const uploadConfig = require('../config/uploadConfig');

function profile({ app, auth, db, mysql, upload }) {

    app.get('/api/profile', auth, async (req, res) => {
        console.log(req.user);

        try {
            const sqlGetProfile = `SELECT * FROM palette_artz_db.user WHERE id = ?`;
            const [userProfile] = await db.query(sqlGetProfile, [req.user.id]);
            if (userProfile.length != 1) {
                return res.status(404).send("No user found");
            }

            let userDetails = userProfile[0];
            delete userDetails['password'];
            userDetails.profile_image = uploadConfig.multerImageDestination + userDetails.profile_image;
            userDetails.cover_image = uploadConfig.multerImageDestination + userDetails.cover_image;

            res.json(userDetails);

        } catch (error) {
            console.log(error);
            return res.status(500).send("Server Error");
        }

    });

    app.get('/api/profile/artwork', auth, async (req, res) => {

        try {
            const sqlGetUserArtworks = `
            SELECT pt.*, us.username, at.type_name, 
	        (SELECT GROUP_CONCAT(CONCAT(tg.tag_name) SEPARATOR ',') 
            FROM palette_artz_db.post_has_tag pht 
            JOIN palette_artz_db.tag tg ON pht.tag_id = tg.id
            WHERE pht.post_id = pt.id) AS tags_name 
            FROM palette_artz_db.post pt
            JOIN palette_artz_db.user us ON pt.user_id = us.id
            JOIN palette_artz_db.art_type at ON pt.art_type_id = at.id
            WHERE pt.user_id = ?
            `;

            const [getUserArtworksResults] = await db.query(sqlGetUserArtworks, [req.user.id]);
            let post = getUserArtworksResults.map((e) => {
                let edit = e;
                edit.image_path = uploadConfig.multerImageDestination + edit.image_name;
                edit.tags_name = edit.tags_name.split(',');
                return edit;
            });
            res.json(post);

        } catch (error) {
            console.log(error);
            return res.status(500).send("Server Error");
        }
    });


    app.post('/api/profile', auth, async (req, res) => {
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

    app.get('/api/profile/profileImage', auth, async (req, res) => {

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

    app.post('/api/profile/profileImage', auth, upload.single(uploadConfig.multerUploadImageName),
        async (req, res) => {
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

    app.get('/api/profile/coverImage', auth, async (req, res) => {

        try {
            const sql = `SELECT us.cover_image FROM palette_artz_db.user us WHERE us.id = ?`;
            const [userCoverImage] = await db.query(sql, [req.user.id]);
            if (userCoverImage.length != 1) {
                throw Error("Cannot get user profile image");
            }

            res.json({
                userDetails: req.user,
                image: uploadConfig.multerImageDestination + userCoverImage[0].cover_image
            });
        } catch (error) {
            console.log(error);
            return res.status(500).send(error || "Server Error");
        }
    });

    app.post('/api/profile/coverImage', auth, upload.single(uploadConfig.multerUploadImageName),
        async (req, res) => {
            const file = req.file;
            if (!file) {
                return res.status(400).send("Please upload a picture");
            }

            console.log(file);

            try {

                const sqlUpdateUserProfileImage = `
            UPDATE palette_artz_db.user us SET us.cover_image = ? WHERE us.id = ?
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