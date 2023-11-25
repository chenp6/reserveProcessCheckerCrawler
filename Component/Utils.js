export const connectionMap = new Map();

export async function setConnections(db) {
    connectionMap.set("exam", await db.collection("exam", { tls: true }))
    connectionMap.set("group", await db.collection("group", { tls: true }))
    connectionMap.set("process", await db.collection("process", { tls: true }))
    connectionMap.set("update time", await db.collection("update time", { tls: true }))
}

/**
 * 將headers['set-cookie']資料轉換成cookies string array    
 * (只擷取cookie資料的key-value字串段)    
 * example:   
 * "c1=v1;Path=/; Secure; HttpOnly; , c2=v2;Path=/; Secure; HttpOnly;"
 *  =>  ["c1=v1;","c2=v2;"]
 * @param {*} cookies result 的 headers['set-cookie']資料
 */
export function parseCookiesArray(cookies) {
    cookies = cookies.split(',');
    for (let i = 0; i < cookies.length; i++) {
        cookies[i] = cookies[i].split(';')[0] + ";";
    }
    return cookies;
}

/**
 * 將headers['set-cookie']資料轉換成cookies string     
 * (可用來設定GET/POST之Header cookie資料)    
 * c1=v1;Path=/; Secure; HttpOnly; , c2=v2;Path=/; Secure; HttpOnly;   
 *  => "c1=v1; c2=v2;"  
 * @param {*} cookies result 的 headers['set-cookie']資料
 * @returns 
 */
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
export async function updateUpdateTime(school, examNo = null, year = null) {
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const date = now.getDate().toString().padStart(2, "0");
    const hour = now.getHours().toString().padStart(2, "0");
    const min = now.getMinutes().toString().padStart(2, "0");
    const sec = now.getSeconds().toString().padStart(2, "0");
    await updateTable("update time", { school: school, examNo: examNo, year: year }, { time: `${now.getFullYear()}-${month}-${date} ${hour}:${min}:${sec}` });
}

export async function getAllObjects(tableName) {
    const filteredDocs = await connectionMap.get(tableName).find({}).toArray();
    console.log('Found all ' + tableName + '=>', filteredDocs);
}


import iconv from 'iconv-lite';
/**
 * utf8 character encode to big5 char
 * @param {*} chr 
 * @returns 
 */
export function charEncodeToBig5(chr) {
    let rtn = "";
    let buf = iconv.encode(chr, 'big5');
    for (let i = 0; i < buf.length; i += 2) {
        rtn += '%' + buf[i].toString(16).toUpperCase();
        rtn += ((buf[i + 1] >= 65 && buf[i + 1] <= 90) ||
                (buf[i + 1] >= 97 && buf[i + 1] <= 122)) ?
            String.fromCharCode(buf[i + 1]) :
            '%' + buf[i + 1].toString(16).toUpperCase();
    }
    return rtn;
}


export function stringEncodeToBig5(str) {
    let newStr = "";
    for (let i = 0; i < str.length; i++) {
        if (str.charCodeAt(i) < 32 || str.charCodeAt(i) > 126) {
            //非ASCII可顯示字元
            newStr += charEncodeToBig5(str[i]);
        } else {
            newStr += str[i];
        }
    }
    return newStr;
}