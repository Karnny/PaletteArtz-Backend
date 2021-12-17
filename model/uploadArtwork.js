
const uploadConfig = require('../config/uploadConfig');

function uploadArtwork({ app, auth, db, mysql, upload }) {

    const {
        getArtType,
        createArtType,
        getTag,
        createTag,
    } = require('../model/sqlHelper')(db);

    app.post('/api/uploadArtwork', auth, upload.single(uploadConfig.multerUploadImageName),
        async (req, res) => {
            const file = req.file;
            let { title, description = '', tags, art_type } = req.body;



            if (!file) {
                return res.status(400).send("Please upload a picture");
            }

            if (!(title && art_type)) {
                return res.status(400).send("Please input art title and type");
            }

            art_type = art_type.trim();
            description = description.trim();
            title = title.trim();

            // console.log(file);

            try {
                tags = tags.replace(/\s+/g, ''); // eliminate all spaces
                tags = tags.split(',');
                if (tags.length == 1) {
                    tags = tags[0];
                }

                console.log('Tags:', tags);
                // use to create tags with post
                let toInsertTagIds = [];
                let toInsertArtTypeId;
                if (tags) {

                    // check if there are more than 1 tag
                    if (Array.isArray(tags)) {
                        console.log('Tag is Array..');
                        let tagsToCreate = [];
                        // check if each tag is exist in DB
                        const databaseTags = await getTag();
                        // console.log('databastTags: ', databaseTags);
                        for (const tag in tags) {
                            for (const dbTag in databaseTags) {

                                if (tags[tag] == databaseTags[dbTag].tag_name) {

                                    tags.splice(tag, 1);
                                    toInsertTagIds.push(databaseTags[dbTag].id);
                                }

                            }
                        }
                        // tagsToCreate.push(tag);
                        tagsToCreate = [...tags];

                        console.log('Tags to create: ', tagsToCreate);
                        console.log('Tag IDs ready to insert: ', toInsertTagIds);


                        // If there are new tags to create
                        if (tagsToCreate.length != 0) {
                            const createdTagsResult = await createTag(tagsToCreate);
                            console.log('Created tag rows: ', createdTagsResult.affectedRows);
                            if (createdTagsResult.affectedRows != tagsToCreate.length) {
                                throw Error("Error creating tags");
                            } else {

                                let newlyCreatedTags = await getTag({ name: tagsToCreate });
                                console.log(`Newly Created Tags: `, newlyCreatedTags);
                                for (const tagId of newlyCreatedTags) {
                                    toInsertTagIds.push(tagId.id);
                                }
                            }
                        }

                    } else {
                        console.log('Tag is :', tags);
                        // if there are one tag to check..
                        const tagNameInDB = await getTag({ name: tags });
                        if (tagNameInDB.length != 0) {
                            toInsertTagIds.push(await createTag(tags).insertId);
                        } else {
                            toInsertTagIds.push(tagNameInDB[0].id);
                        }
                    }
                }

                let dbArtTypeId;
                if (!Number.isInteger(parseInt(art_type))) {
                    dbArtTypeId = await getArtType({ name: art_type });
                    console.log(`Searching ArtType ${art_type}: `, dbArtTypeId);

                    if (dbArtTypeId.length == 0) {
                        const createdArtType = await createArtType(art_type);
                        console.log(`Creating ArtType: ${art_type} id`, createdArtType.insertId);
                        if (createdArtType.affectedRows == 0) {
                            throw Error("Cannot create Art Type");
                        }

                        toInsertArtTypeId = createdArtType.insertId;
                    } else {
                        toInsertArtTypeId = dbArtTypeId[0].id;
                    }
                } else {
                    toInsertArtTypeId = parseInt(art_type);
                }




                /////////////// INSERT POST //////////////
                const sqlInsertPost = `
                INSERT INTO palette_artz_db.post 
                (title, image_name, description, date_time, art_type_id, user_id) 
                VALUES (?,?,?, CURTIME(),?,?)
                `;
                const [insertPostResult] = await db.query(sqlInsertPost, [title, file.filename, description, toInsertArtTypeId, req.user.id]);
                if (insertPostResult.affectedRows != 1) {
                    throw Error("Cannot create a post");
                }
                const post_id = insertPostResult.insertId;
                ///////////////////////////////////////

                ///////////////// INSERT POST_HAS_TAG //////////////

                // console.log(toInsertTagIds);
                if (tags) {
                    // contruct [[post_id, tag_id], [post_id, tag_id]]
                    let postHasTagInsertArr = [];
                    toInsertTagIds.forEach((tagId) => {
                        postHasTagInsertArr.push([post_id, tagId]);
                    });

                    const sqlInsertPostHasTag = `
                    INSERT INTO palette_artz_db.post_has_tag 
                    (post_id, tag_id)
                    VALUES ?
                    `;
                    const [insertPostHasTagResult] = await db.query(sqlInsertPostHasTag, [postHasTagInsertArr]);
                    if (insertPostHasTagResult.affectedRows != toInsertTagIds.length) {
                        throw Error("Cannot insert Post and Tag");
                    }
                }
                //////////////////////////////////////////////////
                res.json({
                    message: 'Upload success',
                    post_id: post_id
                });
            } catch (error) {
                console.log(error);
                return res.status(500).send("Server Error");
            }

        });
}

module.exports = uploadArtwork;