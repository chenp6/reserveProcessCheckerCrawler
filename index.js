import express, { json } from 'express'; //載入express框架模組
import cors from 'cors';
let app = express();

app.use(cors({
    origin: '*',
}));


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
});
app.get("/getUserRank", async(req, res) => {
    const schoolId = req.query.schoolId;
    const userId = req.query.userId;
    const groupNo = req.query.groupNo;

    res.send({
        index: schoolId,
        rank: userId,
        status: groupNo
    });
    return;
});