import express, { json } from 'express'; //載入express框架模組
import * as NCKU from './NCKUReserveProcess.js';
import * as NYCU from './NYCUReserveProcess.js';
import schedule from 'node-schedule';
import cors from 'cors';
let app = express();

app.use(cors({
    origin: '*',
}));

//Reference:https://mealiy62307.medium.com/node-js-node-js-%E7%88%AC%E8%9F%B2%E8%88%87-line-bot-b94356fcd59d
async function init() {
    console.log(new Date() + "開始初始化各校科系資料")
    await NCKU.init();
    await NYCU.init();
    console.log(new Date() + "完成初始化!")

    // await NYCU.init();


    // NCKU.checkRank("713", "7130037")
    // NCKU.checkUpdate("713");
    // NYCU.getRank("A41", "A40016")
    // console.log(await NYCU.getReserveProcess("A41"));
    // console.log(await NYCU.getReserveProcess("A42"));
    // console.log(await NYCU.getReserveProcess("A43"));

}

// const rule = new schedule.RecurrenceRule();
// rule.hour = 16; //台灣(+8)
// rule.minute = 0;
// rule.second = 50;
// const updateEveryDay = schedule.scheduleJob(rule, function() {
//     console.log("進行每日更新");
//     NYCU.updateAllReserveProcess();
//     console.log("完成每日更新");
// });


app.listen(3000, () => {
    console.log(new Date() + "開始監聽port 3000!");
    init();
});

app.get("/getUserRank", async(req, res) => {
    console.log(req.query.userId)
    const userId = req.query.userId;
    const groupNo = req.query.groupNo;
    const rank = NYCU.getUserRank(groupNo, userId);
    console.log(rank)
    res.send(rank);
    return
});

app.get("/getReserveProcess", async(req, res) => {
    console.log(req.query.groupNo)
    const groupNo = req.query.groupNo;
    const process = NYCU.getReserveProcess(groupNo);
    console.log(process)
    if (process == null) {
        res.json({
            registered: null,
            want: null,
            reserveProcess: null
        })
    } else {
        res.json({
            registered: process.registered,
            want: process.want,
            reserveProcess: process.reserveProcess
        })
    }

    return
});