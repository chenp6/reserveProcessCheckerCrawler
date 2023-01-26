import { MongoClient } from "mongodb";
import { connectionMap, setConnections, updateTable, getAllObjects } from "./Component/Utils.js";
import * as CCU from './Component/CCUReserveProcess.js';
import * as NYCU from './Component/NYCUReserveProcess.js';
import * as NCKU from './Component/NCKUReserveProcess.js';
import * as NCU from './Component/NCUReserveProcess.js';
import * as dotenv from 'dotenv';
dotenv.config();

// Connection URI
const uri = process.env.MONGODB_URL;

// Create a new MongoClient
const client = new MongoClient(uri);

async function run() {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();

    // Establish and verify connection
    const db = client.db("reserveProcess");
    await db.command({ ping: 1 });
    console.log("Connected successfully to server");
    console.log(new Date() + "開始初始化各校科系資料")

    await setConnections(db);


    await updateExams(db);

    //get all exams
    await getAllObjects("exam")


    await CCU.init();
    await NYCU.init();
    await NCKU.init();
    await NCU.init();

    // //get user rank
    // console.log(await getGroupProcess(db, "CCU", "3", "1_4000"));
    // console.log(await getUserRank(db, "CCU_3_1_4000", "340000168"));
    // const filteredDocs = await connectionMap.get("process").find({ groupId: "CCU_1_4220" }).toArray();
    console.log(new Date() + "完成初始化!")

}
run().catch(console.dir);

async function updateExams() {
    await updateCCUExams();
    await updateNYCUExams();
    await updateNCKUExams();
    await updateNCUExams();

    async function updateCCUExams() {
        // await updateTable("exam", { school: "CCU", examNo: '1' }, { name: "111學年度碩士班招生考試" });
        // await updateTable("exam", { school: "CCU", examNo: '2' }, { name: "111學年度博士班招生考試" });
        await updateTable("exam", { school: "CCU", examNo: '3' }, { name: "112學年度碩士班甄試" });
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

    async function updateNCUExams() {
        await updateTable("exam", { school: "NCU", examNo: '142' }, { name: "112學年度碩士班、博士班甄試入學招生" });
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