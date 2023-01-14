import express, { json } from 'express'; //載入express框架模組
import * as NCKU from './public/NCKUReserveProcess.js';
// import * as NYCU from './public/NYCUReserveProcess.js';
import cors from 'cors';
import schedule from 'node-schedule';
let app = express();
let initFinished = 0;

app.use(cors({
    origin: '*',
}));


//Reference:https://mealiy62307.medium.com/node-js-node-js-%E7%88%AC%E8%9F%B2%E8%88%87-line-bot-b94356fcd59d
async function init() {
    console.log(new Date() + "開始初始化各校科系資料")
    await NCKU.init();
    // await NYCU.init();
    console.log(new Date() + "完成初始化!")
    initFinished = 1;
}

app.listen(3000 || process.env.PORT);

app.post("/startToInit", async(req, res) => {
    await init();

    return res.status(200).json({
        "init finished": initFinished
    });
});

app.get("/initStatus", async(req, res) => {
    return res.status(200).json({
        "init finished": initFinished
    });
});


app.get("/userRank", async(req, res) => {
    const schoolId = req.query.schoolId;
    const userId = req.query.userId;
    const groupNo = req.query.groupNo;

    switch (schoolId) {
        // case 'NYCU':
        //     // res.send(NYCU.getUserRank(groupNo, userId));
        //     break;
        case 'NCKU':
            res.send(NCKU.getUserRank(groupNo, userId));
            break;
        default:
            res.send({
                index: null,
                rank: null,
                status: null
            });
            break;
    }
    return;
});

app.get("/reserveProcess", async(req, res) => {
    const groupNo = req.query.groupNo;
    const schoolId = req.query.schoolId;
    let process;
    switch (schoolId) {
        // case 'NYCU':
        //     res.json(NYCU.getReserveProcess(groupNo));
        //     break;
        case 'NCKU':
            res.json(NCKU.getReserveProcess(groupNo));
            break;
        default:
            res.json({
                registered: null,
                want: null,
                reserveProcess: null
            })
            break;
    }
    return
});