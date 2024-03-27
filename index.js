import { MongoClient } from "mongodb";
import { connectionMap, setConnections, updateTable, updateUpdateTime, getAllObjects } from "./Component/Utils.js";
import * as CCU from './Component/CCUReserveProcess.js';
import * as NYCU from './Component/NYCUReserveProcess.js';
import * as NCKU from './Component/NCKUReserveProcess.js';
import * as NCU from './Component/NCUReserveProcess.js';
import * as NCCU from './Component/NCCUReserveProcess.js';
import * as NTU from './Component/NTUReserveProcess.js';
import * as NSYSU from './Component/NSYSUReserveProcess.js';
import * as UST from './Component/USTReserveProcess.js';
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
    console.log(await db.command({ ping: 1 }));
    console.log("Connected successfully to server");
    console.log(new Date() + "開始更新各校系組資料")

    await setConnections(db);

    // await CCU.init();
    // await NYCU.init();
    await NCKU.init();
    await NCU.init();
    // await NCCU.init();
    await NTU.init();
    await NSYSU.init();




    // // await UST.init();
    await updateExams(db);

    //get all exams
    // await getAllObjects("exam");

    // await updateUpdateTime("all");
    console.log(new Date() + "完成更新!")

}
run().catch(console.dir);

async function updateExams() {
    const year = "113";
    // await updateCCUExams();
    // await updateNYCUExams();
    await updateNCKUExams();
    await updateNCUExams();
    // await updateNCCUExams();
    // await updateNKUSTExams();
    await updateNTUExams();
    await updateNSYSUExams();
    // await updateUSTExams();

    async function updateCCUExams() {
        // await updateTable("exam", { school: "CCU", examNo: '1' }, { name: """112""學年度碩士班招生考試" });
        await updateUpdateTime("CCU", '1');

        // await updateTable("exam", { school: "CCU", examNo: '2' }, { name: "111學年度博士班招生考試" });

        // await updateTable("exam", { school: "CCU", examNo: '3' }, { name: ""112"學年度碩士班甄試" });
        // await updateUpdateTime("CCU", '3');

        // await updateTable("exam", { school: "CCU", examNo: '4' }, { name: "111學年度數位學習碩士專班招生考試" });
        // await updateTable("exam", { school: "CCU", examNo: '5' }, { name: "111學年度碩士專班招生考試" });
    }

    async function updateNYCUExams() {
        // await updateTable("exam", { school: "NYCU", examNo: '5df45783-fb4c-4a13-88a3-88505c144674' }, { name: ""112" 交大校區碩士班(考試入學)及在職專班考試" });
        await updateUpdateTime("NYCU", '5df45783-fb4c-4a13-88a3-88505c144674');

        // await updateTable("exam", { school: "NYCU", examNo: '61084878-2993-45d1-9df3-2de07839e2ff' }, { name: ""112" 交大校區碩博班甄試" });
        await updateUpdateTime("NYCU", '61084878-2993-45d1-9df3-2de07839e2ff');

        // await updateTable("exam", { school: "NYCU", examNo: '3eb0b43c-64bf-4652-8b04-7ffca7ac4a80' }, { name: ""112"A陽明校區碩士班甄試" });
        // await updateUpdateTime("NYCU", '3eb0b43c-64bf-4652-8b04-7ffca7ac4a80');

        // await updateTable("exam", { school: "NYCU", examNo: '3ea8d555-a4de-451d-828f-1023878e560a' }, { name: ""112"E陽明校區博士甄試" });
        // await updateUpdateTime("NYCU", '3ea8d555-a4de-451d-828f-1023878e560a');

        // await updateTable("exam", { school: "NYCU", examNo: 'a0a0df5c-72fd-4467-9ce4-0e4a3d42ca06' }, { name: ""112" 交大校區EMBA" });
        await updateUpdateTime("NYCU", 'a0a0df5c-72fd-4467-9ce4-0e4a3d42ca06');

    }


    async function updateUSTExams() {
        await updateTable("exam", { school: "UST", examNo: '8a0b5539-0bb9-4fdb-8a17-a2d75dd10299', year: "112" }, { name: "112學年度碩士班考試" });
        await updateUpdateTime("UST", '8a0b5539-0bb9-4fdb-8a17-a2d75dd10299', "112");
    }




    async function updateNCKUExams() {

        // await updateTable("exam", { school: "NCKU", examNo: '1', year: year }, { name: "113碩士班甄試" });
        // await updateUpdateTime("NCKU", "1", year);

        // await updateTable("exam", { school: "NCKU", examNo: 'O', year: year }, { name: "113博士班甄試" });
        // await updateUpdateTime("NCKU", "O", year);

        // await updateTable("exam", { school: "NCKU", examNo: 'H' }, { name: "寒假轉學甄試" });
        // await updateUpdateTime("NCKU", "H", year);

        // await updateTable("exam", { school: "NCKU", examNo: '2', year: year }, { name: "113碩士班(考試入學)" });
        await updateUpdateTime("NCKU", "2", year);
    }

    async function updateNCUExams() {
        // await updateTable("exam", { school: "NCU", examNo: '142' }, { name: ""112"學年度碩士班、博士班甄試入學招生" });
        // await updateUpdateTime("NCU", "142", year);

        // await updateTable("exam", { school: "NCU", examNo: '143' }, { name: ""112"學年度碩士在職專班招生" });
        // await updateUpdateTime("NCU", "143", year);

        // await updateTable("exam", { school: "NCU", examNo: '146' }, { name: ""112"學年度碩士班考試入學招生" });
        // await updateUpdateTime("NCU", "146", year);

        // await updateTable("exam", { school: "NCU", examNo: '158', year: year }, { name: "113學年度碩士班、博士班甄試入學招生" });
        // await updateUpdateTime("NCU", "158", year);

        // await updateTable("exam", { school: "NCU", examNo: '159', year: year }, { name: "113學年度碩士班考試入學招生" });
        await updateUpdateTime("NCU", "159", year);

    }

    async function updateNCCUExams() {
        // await updateTable("exam", { school: "NCCU", examNo: '113,1', year: year }, { name: "113碩班甄試" });
        await updateUpdateTime("NCCU", "113,1", year);

        // await updateTable("exam", { school: "NCCU", examNo: '113,8', year: year }, { name: "113博班甄試" });
        await updateUpdateTime("NCCU", "113,8", year);

        // await updateTable("exam", { school: "NCCU", examNo: '112,2' }, { name: "113碩士班(考試入學)" });
        // await updateUpdateTime("NCCU", "112", "2", year);

        // await updateTable("exam", { school: "NCCU", examNo: '"112",9' }, { name: ""112"僑生單招(個人自薦)" });
        // await updateUpdateTime("NCCU", ""112",9",year);

        // await updateTable("exam", { school: "NCCU", examNo: '"112",C' }, { name: ""112"僑生單招(學校推薦)" });
        // await updateUpdateTime("NCCU", ""112",C",year);
    }

    async function updateNKUSTExams() {
        // await updateTable("exam", { school: "NKUST", examNo: '111,2,29' }, { name: "111學年度日間部四技轉學考（二年級）" });
        await updateUpdateTime("NKUST", "111,2,29", year);

        // await updateTable("exam", { school: "NKUST", examNo: '111,2,30' }, { name: "111學年度日間部四技轉學考（三年級）" });
        await updateUpdateTime("NKUST", "111,2,30", year);

        // await updateTable("exam", { school: "NKUST", examNo: '111,2,31' }, { name: "111學年度進修部四技轉學考（二年級）" });
        await updateUpdateTime("NKUST", "111,2,31", year);

        // await updateTable("exam", { school: "NKUST", examNo: '111,2,32' }, { name: "111學年度進修部四技轉學考（三年級）" });
        await updateUpdateTime("NKUST", "111,2,32", year);
    }

    async function updateNTUExams() {
        // await updateTable("exam", { school: "NTU", examNo: 'regchk/stu_query', year: year }, { name: "113學年度碩士班甄試" });
        // await updateUpdateTime("NTU", "regchk/stu_query", year);

        // await updateTable("exam", { school: "NTU", examNo: 'regbchk/stu_query', year: year }, { name: "113學年度碩士班一般考試" });
        await updateUpdateTime("NTU", "regbchk/stu_query", year);
    }

    async function updateNSYSUExams() {
        // await updateTable("exam", { school: "NSYSU", examNo: '113,41', year: year }, { name: "113學年度考試入學" });
        await updateUpdateTime("NSYSU", '113,41', year);

        // await updateTable("exam", { school: "NSYSU", examNo: '113,11', year: year }, { name: "113學年度碩士班甄試入學" });
        // await updateUpdateTime("NSYSU", '113,11', year);

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