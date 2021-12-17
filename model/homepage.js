const uploadConfig = require('../config/uploadConfig');

function homepage({ app, auth, db, mysql, upload }) {
    const {
        getArtType,
        createArtType,
        getTag,
        createTag,
    } = require('../model/sqlHelper')(db);

    app.get('/api/homepage/channel', auth, async (req, res) => {
        // Channels mean "art_type" in Backend term
        let { id, name, type_name } = req.query;

        if (type_name) {
            name = type_name;
        }

        try {
            if (id == null && name == null) {
                // GET ALL Channels
                console.log('Getting all channels');
                const allArtType = await getArtType();
                let artType = allArtType.map((e) => {
                    let edit = e;
                    edit.type_image_path = uploadConfig.localChannelImagePath + edit.type_image_name;
                    return edit;
                });
                res.json(artType);
            } else if (id) {
                // GET Posts from channel id
                console.log('Getting all posts from art_type id ', id);
                const sqlGetPostsFromArtTypeId = `
                SELECT * FROM palette_artz_db.post WHERE art_type_id = ?
                `;
                let [getPostsResults] = await db.query(sqlGetPostsFromArtTypeId, [id]);
                getPostsResults = getPostsResults.map((e) => {
                    let edit = e;
                    edit.image_path = uploadConfig.multerImageDestination + edit.image_name;
                    return edit;
                });
                res.json(getPostsResults);

            } else if (name) {
                // GET Posts from channel name
                console.log('Getting all posts from art_type name ', name);
                const sqlGetPostsFromArtTypeName = `
                SELECT * FROM palette_artz_db.post pt
                JOIN palette_artz_db.art_type at ON pt.art_type_id = at.id
                WHERE at.type_name = ?
                `;
                const [getPostsResults] = await db.query(sqlGetPostsFromArtTypeName, [name]);
                getPostsResults = getPostsResults.map((e) => {
                    let edit = e;
                    edit.image_path = uploadConfig.multerImageDestination + edit.image_name;
                    return edit;
                });
                res.json(getPostsResults);
            }


        } catch (error) {
            console.log(error);
            return res.status(500).send("Server Error");
        }

    });

    app.get('/api/homepage/artwork', auth, async (req, res) => {

        try {
            const sqlGetPost = `
            SELECT pt.*, us.username, at.type_name, 
	        (SELECT GROUP_CONCAT(CONCAT(tg.tag_name) SEPARATOR ',') 
            FROM palette_artz_db.post_has_tag pht 
            JOIN palette_artz_db.tag tg ON pht.tag_id = tg.id
            WHERE pht.post_id = pt.id) AS tags_name 
            FROM palette_artz_db.post pt
            JOIN palette_artz_db.user us ON pt.user_id = us.id
            JOIN palette_artz_db.art_type at ON pt.art_type_id = at.id
            `;
            const [getPostResult] = await db.query(sqlGetPost);
            let post = getPostResult.map((e) => {
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

}

module.exports = homepage;