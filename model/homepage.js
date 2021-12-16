const uploadConfig = require('../config/uploadConfig');

function homepage({ app, auth, db, mysql, upload }) {
    const {
        getArtType,
        createArtType,
        getTag,
        createTag,
    } = require('../model/sqlHelper')(db);

    app.get('/api/homepage/channels', auth, async (req, res) => {

        try {

            const allArtType = await getArtType();
            let artType = allArtType.map((e) => {
                let edit = e;
                edit.type_image_path = uploadConfig.localChannelImagePath + edit.type_image_name;
                return edit;
            });
            res.json(artType);

        } catch (error) {
            console.log(error);
            return res.status(500).send("Server Error");
        }

    });

    app.get('/api/homepage/artwork', auth, async (req, res) => {

        try {
            const sqlGetPost = `
            SELECT * FROM palette_artz_db.post
            `;
            const [getPostResult] = await db.query(sqlGetPost);
            let post = getPostResult.map((e) => {
                let edit = e;
                edit.image_path = uploadConfig.multerImageDestination + edit.image_name;
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