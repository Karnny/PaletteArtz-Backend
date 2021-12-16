const { query } = require('express');
const uploadConfig = require('../config/uploadConfig');

function uploadArtwork({ app, auth, db, mysql, upload }) {

    async function getArtType({ id, name }) {
        try {

            if (id) {
                const sqlGetId = `
                    SELECT * FROM palette_artz_db.art_type at
                    WHERE at.id = ?
                    `;

                const [result] = await db.query(sqlGetId, [id]);
                return result;
            } else if (name) {
                const sqlGetName = `
                    SELECT * FROM palette_artz_db.art_type at
                    WHERE at.type_name = ?
                    `;

                const [result] = await db.query(sqlGetName, [name]);
                return result;
            }

        } catch (error) {
            console.log(error);
            throw Error("Error while getting Art Type");
        }

    }

    async function getArtType() {
        try {
            const sqlGet = `
                    SELECT * FROM palette_artz_db.art_type
                    `;
            const [result] = await db.query(sqlGet);
            return result;

        } catch (error) {
            console.log(error);
            throw Error("Error while getting Art Type");
        }
    }

    async function createArtType(name) {
        try {
            let sqlInsert;
            let insertArr = [];
            if (Array.isArray(name)) {
                name.forEach((each) => {
                    insertArr.push([each]);
                });

                sqlInsert = `
                INSERT INTO palette_artz_db.art_type (type_name) VALUES ?
                `;
            } else {
                sqlInsert = `
                INSERT INTO palette_artz_db.art_type (type_name) VALUES (?)
                `;
                insertArr = name;
            }

            const [insertResult] = await db.query(sqlInsert, [insertArr]);
            return insertResult;
        } catch (error) {
            console.log(error);
            throw Error("Error while creating Art Type");
        }
    }

    async function getTag(opt) {
        const { id, name } = opt;
        try {
            if (Array.isArray(name)) {
                const sqlGetTagsByName = `
                SELECT * FROM palette_artz_db.tag WHERE tag_name IN ?
                `;
                const [results] = await db.query(sqlGetTagsByName, [name]);
                return results;
            } else {

                if (id) {
                    const sqlGet = `
                    SELECT * FROM palette_artz_db.tag tag
                    WHERE tag.id = ?
                    `;
                    const [result] = await db.query(sqlGet, [id]);
                    return result;
                } else if (name) {
                    const sqlGet = `
                    SELECT * FROM palette_artz_db.tag tag
                    WHERE tag.tag_name = ?
                    `;
                    const [result] = await db.query(sqlGet, [name]);
                    return result;
                }
            }
        } catch (error) {
            console.log(error);
            throw Error("Error while getting Tag");
        }
    }

    async function getTag() {
        try {

            const sqlGet = `
                SELECT * FROM palette_artz_db.tag
                `;
            const [result] = await db.query(sqlGet);
            return result;
        } catch (error) {
            console.log(error);
            throw Error("Error while getting Tag");
        }
    }

    async function createTag(name) {
        try {
            if (Array.isArray(name)) {
                const sqlInsertTags = `
                INSERT INTO palette_artz_db.tag tag (tag.tag_name) VALUES ?
                `;
                const [tagsInsertResult] = await db.query(sqlInsertTags, [name]);
                return tagsInsertResult;
            } else {
                const sqlInsert = `
                INSERT INTO palette_artz_db.tag tag (tag.tag_name) VALUES (?)
                `;

                const [insertResult] = await db.query(sqlInsert, [name]);
                return insertResult;
            }
        } catch (error) {
            console.log(error);
            throw Error('Error while creating new Tag');
        }

    }

    app.post('/api/uploadArtwork', upload.single(uploadConfig.multerUploadImageName),
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
                        // check if each tag is not exist id DB
                        const databaseTags = await getTag();
                        console.log('databastTags: ', databaseTags);
                        for (const tag of tags) {
                            for (const dbTag of databaseTags) {
                                console.log(tag, ' != ', dbTag.tag_name, tag!=dbTag.tag_name);
                                let isFound;
                                if (tag != dbTag.tag_name) {
                                    // put all tags that not exist in DB in array
                                    isFound = tag
                                    tagsToCreate.push(isFound);
                                } else {
                                    toInsertTagIds.push(dbTag.id);
                                    break;
                                }
                                
                            }
                        }

                        console.log('Tags to create: ', tagsToCreate);
                        console.log('Tag IDs ready to insert: ', toInsertTagIds);

                        const createdTagsResult = createTag(tagsToCreate);
                        console.log('Created tag rows: ', createdTagsResult.affectedRows);
                        if (createdTagsResult.affectedRows != tagsToCreate.length) {
                            throw Error("Error creating tags");
                        } else {

                            let newlyCreatedTags = await getTag({ name: tagsToCreate });
                            for (const tagId of newlyCreatedTags) {
                                toInsertTagIds.push(tagId.id);
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


                const dbArtTypeId = await getArtType({ name: art_type });
                console.log(dbArtTypeId);
                if (dbArtTypeId.length == 0) {
                    const createdArtType = await createArtType(art_type);
                    if (createdArtType.affectedRows == 0) {
                        throw Error("Cannot create Art Type");
                    }
                    toInsertArtTypeId = createdArtType.InsertId;
                } else {
                    toInsertArtTypeId = dbArtTypeId[0].id;
                }


                /////////////// INSERT POST //////////////
                const sqlInsertPost = `
                INSERT INTO palette_artz_db.post 
                (title, image_name, description, art_type_id, user_id) 
                VALUES (?,?,?,?,?)
                `;
                const [insertPostResult] = await db.query(sqlInsertPost, [title, file.filename, description, toInsertArtTypeId, req.user.id]);
                if (insertPostResult.affectedRows != 1) {
                    throw Error("Cannot create a post");
                }
                const post_id = insertPostResult.insertId;
                ///////////////////////////////////////

                ///////////////// INSERT POST_HAS_TAG //////////////

                console.log(toInsertTagIds);
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