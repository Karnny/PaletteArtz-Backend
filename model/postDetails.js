const uploadConfig = require('../config/uploadConfig');

function postDetails({ app, auth, db, mysql, upload }) {

    app.get('/api/post', auth, async (req, res) => {
        let { id, post_id } = req.query;

        if (post_id) {
            id = post_id;
        }

        if (!id) {
            return res.status(404).send("Post ID is required");
        }

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
            WHERE pt.id = ?
            `;
            let [getPostResult] = await db.query(sqlGetPost, [id]);
            if (getPostResult.length != 1) {
                return res.status(404).send("No post found");
            }
            getPostResult = getPostResult.map((e) => {
                let edit = e;
                edit.image_path = uploadConfig.multerImageDestination + edit.image_name;
                edit.tags_name = edit.tags_name.split(',');
                return edit;
            });
            const post_id = id;

            const sqlGetComment = `
            SELECT us.username, cm.* FROM palette_artz_db.comment cm
            JOIN palette_artz_db.user us ON cm.user_id = us.id
            WHERE cm.post_id = ?
            `;
            const [getCommentResults] = await db.query(sqlGetComment, [post_id]);

            res.json({
                postDetails: getPostResult[0],
                comments: getCommentResults
            });

        } catch (error) {
            console.log(error);
            return res.status(500).send("Server Error");
        }

    });

    app.post('/api/comment', auth, async (req, res) => {
        let { id, post_id, comment_text = '' } = req.body;

        if (post_id) {
            id = post_id;
        }

        if (post_id == null || comment_text == '') {
            return res.status(400).send("Post ID and comment text are required");
        }

        try {
            const sqlInsertComment = `
            INSERT INTO palette_artz_db.comment 
            (comment_text, date_time, user_id, post_id) 
            VALUES (?, CURTIME(),?,?)
            `;
            const [insertCommentResult] = await db.query(sqlInsertComment, [comment_text, req.user.id, post_id]);
            if (insertCommentResult.affectedRows != 1) {
                throw Error("Cannot insert comment");
            }

            res.send("Comment saved.");

        } catch (error) {
            console.log(error);
            return res.status(500).send("Server Error");
        }

    });
}

module.exports = postDetails;