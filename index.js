import express from 'express'; //載入express框架模組
import { MongoClient } from "mongodb";
import cors from 'cors';
import * as dotenv from 'dotenv';
dotenv.config();

let connectStatus = "closed";

let examTable;
let groupTable;
let processTable;
const uri =
    `mongodb+srv://${process.env.GUEST_USER}:${process.env.GUEST_PWD}@cluster0.lkdsifs.mongodb.net/?retryWrites=true&w=majority`;

// Create a new MongoClient
const client = new MongoClient(uri);

async function run() {
    connectStatus = "running";

    // Connect the client to the server (optional starting in v4.7)
    await client.connect();

    // Establish and verify connection
    const db = client.db("reserveProcess");
    await db.command({ ping: 1 });


    examTable = await db.collection("exam", { tls: true });
    groupTable = await db.collection("group", { tls: true });
    processTable = await db.collection("process", { tls: true });
    connectStatus = "ok";
    console.log(new Date() + "資料庫資料完成連接")
}
run().catch(console.dir);

let app = express();


app.use(cors({
    origin: '*',
}));


app.listen(3000 || process.env.PORT, () => {
    console.log(new Date() + "開始監聽port 3000!");
});

app.get("/getExamSelect", async(req, res) => {
    const examList = await examTable.find({ school: req.query.school }).toArray();
    return res.status(200).json(examList);
});

app.get("/getGroupSelect", async(req, res) => {
    //group list
    return res.status(200).json(await groupTable.find({ school: req.query.school, examNo: '' + req.query.examNo }).toArray());
});

app.get("/getUserRank", async(req, res) => {
    //user rank
    return res.status(200).json(await processTable.findOne({ groupId: req.query.groupId, userId: req.query.userId }));
});

app.get("/getStatus", async(req, res) => {
    //user rank
    return res.status(200).json({ status: connectStatus })
});