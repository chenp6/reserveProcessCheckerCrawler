import { MongoClient } from "mongodb";
import { connectionMap, setConnections, updateTable, updateUpdateTime, getAllObjects,getAcademicYear } from "./Component/Utils.js";
import * as CCU from './Component/CCUReserveProcess.js';
//import * as NYCU from './Component/NYCUReserveProcess.js';
import * as NCKU from './Component/NCKUReserveProcess.js';
import * as NCU from './Component/NCUReserveProcess.js';
import * as NCCU from './Component/NCCUReserveProcess.js';
import * as NTU from './Component/NTUReserveProcess.js';
import * as NSYSU from './Component/NSYSUReserveProcess.js';
//import * as UST from './Component/USTReserveProcess.js';
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
    await NCKU.init();
    await NTU.init();
    await NSYSU.init();
    await NCU.init();





    // await CCU.init();
    // await NYCU.init();
    // await NCCU.init();
    //await UST.init();




    await updateExams(db);

    //get all exams
    // await getAllObjects("exam");

    // await updateUpdateTime("all");
    console.log(new Date() + "完成更新!")

}
run().catch(console.dir);

async function updateExams() {

    let year = getAcademicYear();
    await updateNCKUExams();
    await updateNTUExams();
    await updateNSYSUExams();
    await updateNCUExams();



    // await updateCCUExams();
    // await updateNYCUExams();





    
    // await updateNCCUExams();
    // await updateNKUSTExams();

    //await updateUSTExams();

    async function updateCCUExams() {
        // await updateTable("exam", { school: "CCU", examNo: '1' , year: year}, { name: """112""學年度碩士班招生考試" });
       // await updateUpdateTime("CCU", '1',year);

        // await updateTable("exam", { school: "CCU", examNo: '2' , year: year}, { name: "111學年度博士班招生考試" });

        //await updateTable("exam", { school: "CCU", examNo: '3' , year: year}, { name: year+"學年度碩士班甄試" });
        await updateUpdateTime("CCU", '3',year);

        // await updateTable("exam", { school: "CCU", examNo: '4', year: year }, { name: "111學年度數位學習碩士專班招生考試" });
        // await updateTable("exam", { school: "CCU", examNo: '5' , year: year}, { name: "111學年度碩士專班招生考試" });
    }

    async function updateNYCUExams() {
        // await updateTable("exam", { school: "NYCU", examNo: '5df45783-fb4c-4a13-88a3-88505c144674', year: year }, { name: ""112" 交大校區碩士班(考試入學)及在職專班考試" });
        await updateUpdateTime("NYCU", '5df45783-fb4c-4a13-88a3-88505c144674',year);

        // await updateTable("exam", { school: "NYCU", examNo: '61084878-2993-45d1-9df3-2de07839e2ff', year: year }, { name: ""112" 交大校區碩博班甄試" });
        await updateUpdateTime("NYCU", '61084878-2993-45d1-9df3-2de07839e2ff',year);

        // await updateTable("exam", { school: "NYCU", examNo: '3eb0b43c-64bf-4652-8b04-7ffca7ac4a80', year: year }, { name: ""112"A陽明校區碩士班甄試" });
        // await updateUpdateTime("NYCU", '3eb0b43c-64bf-4652-8b04-7ffca7ac4a80',year);

        // await updateTable("exam", { school: "NYCU", examNo: '3ea8d555-a4de-451d-828f-1023878e560a' , year: year}, { name: ""112"E陽明校區博士甄試" });
        // await updateUpdateTime("NYCU", '3ea8d555-a4de-451d-828f-1023878e560a',year);

        // await updateTable("exam", { school: "NYCU", examNo: 'a0a0df5c-72fd-4467-9ce4-0e4a3d42ca06', year: year }, { name: ""112" 交大校區EMBA" });
        await updateUpdateTime("NYCU", 'a0a0df5c-72fd-4467-9ce4-0e4a3d42ca06',year);

    }


    async function updateUSTExams() {
        // await updateTable("exam", { school: "UST", examNo: '8a0b5539-0bb9-4fdb-8a17-a2d75dd10299',year: year }, { name: "112學年度碩士班考試" });
        // await updateUpdateTime("UST", '8a0b5539-0bb9-4fdb-8a17-a2d75dd10299', "112");

        // await updateTable("exam", { school: "UST", examNo: 'ab6e8d7a-9f7b-4e6c-91eb-31ebfd5c6e52', year: year}, { name: "113學年度碩士班考試" });
        await updateUpdateTime("UST", 'ab6e8d7a-9f7b-4e6c-91eb-31ebfd5c6e52', year);
    }




    async function updateNCKUExams() {
        const currentDate = new Date();
        const expireDate1 = new Date("2026-01-21 23:59:59");
        if(currentDate <= expireDate1){
            // await updateTable("exam", { school: "NCKU", examNo: '1', year: year }, { name: year+"碩士班甄試" });
            await updateUpdateTime("NCKU", "1", year);
        }
        // await updateTable("exam", { school: "NCKU", examNo: 'O', year: year }, { name: year+"博士班甄試" });
        // await updateUpdateTime("NCKU", "O", year);

        // await updateTable("exam", { school: "NCKU", examNo: 'H' }, { name: "寒假轉學甄試" });
        // await updateUpdateTime("NCKU", "H", year);

        // await updateTable("exam", { school: "NCKU", examNo: '2', year: year }, { name: year+"碩士班(考試入學)" });
        // await updateUpdateTime("NCKU", "2", year);
    }

    async function updateNCUExams() {
        // await updateTable("exam", { school: "NCU", examNo: '142' , year: year}, { name: "112學年度碩士班、博士班甄試入學招生" });
        // await updateUpdateTime("NCU", "142", year);

        // await updateTable("exam", { school: "NCU", examNo: '143' , year: year}, { name: "112學年度碩士在職專班招生" });
        // await updateUpdateTime("NCU", "143", year);

        // await updateTable("exam", { school: "NCU", examNo: '146' , year: year}, { name: "112學年度碩士班考試入學招生" });
        // await updateUpdateTime("NCU", "146", year);

        // await updateTable("exam", { school: "NCU", examNo: '158', year: year }, { name: "113學年度碩士班、博士班甄試入學招生" });
        // await updateUpdateTime("NCU", "158", year);

        // await updateTable("exam", { school: "NCU", examNo: '159', year: year }, { name: "113學年度碩士班考試入學招生" });
        //await updateUpdateTime("NCU", "159", year);

        // await updateTable("exam", { school: "NCU", examNo: '173', year: year }, { name: "114學年度碩士班、博士班甄試入學招生" });
        // await updateUpdateTime("NCU", "173", year);

        // await updateTable("exam", { school: "NCU", examNo: '174', year: year }, { name: "114學年度碩士班考試入學招生" });
        // await updateUpdateTime("NCU", "174", year);

        // await updateTable("exam", { school: "NCU", examNo: '188', year: year }, { name: "115學年度碩士班、博士班甄試入學招生" });
        await updateUpdateTime("NCU", "188", year);

    }

    async function updateNCCUExams() {
        // await updateTable("exam", { school: "NCCU", examNo: year+',1', year: year }, { name: year+"碩班甄試" });
        // await updateUpdateTime("NCCU", year+",1", year);

        // await updateTable("exam", { school: "NCCU", examNo: year+',8', year: year }, { name: year+"博班甄試" });
        // await updateUpdateTime("NCCU", year+",8", year);

        await updateTable("exam", { school: "NCCU", examNo: year+',2' , year: year}, { name: year+"碩士班(考試入學)" });
        await updateUpdateTime("NCCU", year, year+",2", year);

    }

    async function updateNKUSTExams() {
        // await updateTable("exam", { school: "NKUST", examNo: '111,2,29' , year: year}, { name: "111學年度日間部四技轉學考（二年級）" });
        await updateUpdateTime("NKUST", "111,2,29", year);

        // await updateTable("exam", { school: "NKUST", examNo: '111,2,30' , year: year}, { name: "111學年度日間部四技轉學考（三年級）" });
        await updateUpdateTime("NKUST", "111,2,30", year);

        // await updateTable("exam", { school: "NKUST", examNo: '111,2,31' , year: year}, { name: "111學年度進修部四技轉學考（二年級）" });
        await updateUpdateTime("NKUST", "111,2,31", year);

        // await updateTable("exam", { school: "NKUST", examNo: '111,2,32' , year: year}, { name: "111學年度進修部四技轉學考（三年級）" });
        await updateUpdateTime("NKUST", "111,2,32", year);
    }

    async function updateNTUExams() {

        const currentDate = new Date();
        const expireDate1 = new Date("2026-01-22 23:59:59");
        if(currentDate <= expireDate1){
            // await updateTable("exam", { school: "NTU", examNo: 'regchk/stu_query', year: year }, { name: year+"學年度碩士班甄試" });
            await updateUpdateTime("NTU", "regchk/stu_query", year);
        }

        // await updateTable("exam", { school: "NTU", examNo: 'regbchk/stu_query', year: year }, { name: year+"學年度碩士班一般考試" });
        // await updateUpdateTime("NTU", "regbchk/stu_query", year);
    }

    async function updateNSYSUExams() {
        // await updateTable("exam", { school: "NSYSU", examNo: year+',41', year: year }, { name: year+"學年度考試入學" });
        // await updateUpdateTime("NSYSU", year+',41', year);

    //    await updateTable("exam", { school: "NSYSU", examNo: year+',11', year: year }, { name: year+"學年度碩士班甄試入學" });
        await updateUpdateTime("NSYSU", year+',11', year);

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