import { MongoClient } from "mongodb";
import { connectionMap, setConnections, updateTable, getAllObjects } from "./Component/Utils.js";
import * as CCU from './Component/CCUReserveProcess.js'
import * as NYCU from './Component/NYCUReserveProcess.js'
// Connection URI
const uri =
    `mongodb+srv://${process.env.OWNER_USER}:${process.env.OWNER_PWD}@cluster0.lkdsifs.mongodb.net/?retryWrites=true&w=majority`;

// Create a new MongoClient
const client = new MongoClient(uri);

async function run() {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();

    // Establish and verify connection
    const db = client.db("reserveProcess");
    await db.command({ ping: 1 });
    console.log("Connected successfully to server");
    console.log(new Date() + "開始修改")

    await setConnections(db);


    //insert
    // await table.insertOne({ school: "CCU", examNo: '1' , name: "111學年度碩士班招生考試" });
    //update
    // await updateTable("exam", { school: "CCU", examNo: '1' }, { name: "111學年度碩士班招生考試" });

    //delete
    // connectionMap.get('process').deleteMany({ group: 'NYCU' });

    //delete contain
    connectionMap.get('process').deleteMany({ groupId: { $regex: "NYCCU" } });


    console.log(new Date() + "完成修改!")

}
run().catch(console.dir);

async function updateExams(db) {
    await updateCCUExams();
    await updateNYCUExams();


    async function updateCCUExams() {
        // await updateTable("exam", { school: "CCU", examNo: '2' }, { name: "111學年度博士班招生考試" });
        // await updateTable("exam", { school: "CCU", examNo: '3' }, { name: "112學年度碩士班甄試" });
        // await updateTable("exam", { school: "CCU", examNo: '4' }, { name: "111學年度數位學習碩士專班招生考試" });
        // await updateTable("exam", { school: "CCU", examNo: '5' }, { name: "111學年度碩士專班招生考試" });
    }

    async function updateNYCUExams() {
        await updateTable("exam", { school: "NYCU", examNo: '112E' }, { name: "陽明校區博士班甄試" });
        await updateTable("exam", { school: "NYCU", examNo: '112A' }, { name: "陽明校區碩士班甄試" });
        await updateTable("exam", { school: "NYCU", examNo: '112' }, { name: "交大校區碩博班甄試" });
    }

    async function updateNCKUExams() {
        await updateTable("exam", { school: "NCKU", examNo: '1' }, { name: "碩士班甄試" });
        await updateTable("exam", { school: "NCKU", examNo: 'O' }, { name: "博士班甄試" });
    }
}

async function getUserRank(db, groupId, userId) {
    const table = await connectionMap.get('process');
    return await table.findOne({ groupId: groupId, userId: userId });
}

async function getGroupProcess(db, school, examNo, groupNo) {
    const table = await connectionMap.get('group');
    return await table.findOne({ school: school, examNo: examNo, groupNo: groupNo });
}