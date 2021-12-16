let db;

function initDB(_db) {
    db = _db;

    return {
        getArtType,
        createArtType,
        getTag,
        createTag,
    };
}

async function getArtType(opt) {
    let id, name;
    if (opt) {
        id = opt.id;
        name = opt.name;
    }

    try {

        if (id == null && name == null) {
            const sqlGet = `
            SELECT * FROM palette_artz_db.art_type
            `;
            const [result] = await db.query(sqlGet);
            return result;

        } else if (id) {
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
    let id, name;
    if (opt) {
        id = opt.id;
        name = opt.name
    }

    try {
        if (Array.isArray(name)) {
            name = [name];
            const sqlGetTagsByName = `
            SELECT * FROM palette_artz_db.tag WHERE tag_name IN ?
            `;
            const [results] = await db.query(sqlGetTagsByName, [name]);
            return results;
        } else {
            if (id == null && name == null) {
                const sqlGet = `
                SELECT * FROM palette_artz_db.tag
                `;
                const [result] = await db.query(sqlGet);
                return result;
            } else if (id) {
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


async function createTag(name) {
    try {
        if (Array.isArray(name)) {
            // for bulk insertion, this array need to be like [[item1], [item2]]
            name = name.map(e => [e]);
            console.log(name);
            const sqlInsertTags = `
            INSERT INTO palette_artz_db.tag (tag_name) VALUES ?
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

module.exports = initDB;