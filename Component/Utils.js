export const connectionMap = new Map();

export async function setConnections(db) {
    connectionMap.set("exam", await db.collection("exam", { tls: true }))
    connectionMap.set("group", await db.collection("group", { tls: true }))
    connectionMap.set("process", await db.collection("process", { tls: true }))
}

export function parseCookiesArray(cookies) {
    cookies = cookies.split(',');
    for (let i = 0; i < cookies.length; i++) {
        cookies[i] = cookies[i].split(';')[0] + ";";
    }
    return cookies;
}

export function parseCookiesStr(cookies) {
    return parseCookiesArray(cookies).join(' ');;
}


export async function updateTable(tableName, idField, content) {
    const table = connectionMap.get(tableName);
    const updateResult = await table.updateOne(idField, { $set: content });
    if (updateResult.matchedCount == 0) {
        Object.assign(content, idField);
        await table.insertOne(content);
    }
}

export async function getAllObjects(tableName) {
    const filteredDocs = await connectionMap.get(tableName).find({}).toArray();
    console.log('Found all ' + tableName + '=>', filteredDocs);
}