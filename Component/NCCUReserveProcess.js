import cheerio from 'cheerio';
import { Headers } from 'node-fetch';
import { getAcademicYear, updateTable } from './Utils.js';
//Reference:https://mealiy62307.medium.com/node-js-node-js-%E7%88%AC%E8%9F%B2%E8%88%87-line-bot-b94356fcd59d
const currentYear = getAcademicYear() 
//凌晨02:00-06:30為系統備份時間
const NCCURegisterInfo = {
    exam: new Map([
        [currentYear + ",1", { type: "115碩班甄試" }],
        // ["113,8", { type: "113博班甄試" }],
        // ["113,2", { type: "113碩士班(考試入學)" }]
    ]),
    group: new Map()
};




export async function init() {
    const now = new Date().getHours();
    if (now >= 2 && now <= 6) return;
    console.log("=== NCCU loading ===");
    await setGroupMap();
    await updateGroupsInfo()
    console.log("=== NCCU done ===");
}

async function setGroupMap() {
    for (const examNo of NCCURegisterInfo.exam.keys()) {
        const url = `http://examreg.nccu.edu.tw/Home/DepDropDonwList?regtpe_value=${examNo}`;
        const headers = new Headers();
        headers.append("Content-Type", " application/x-www-form-urlencoded");
        headers.append("X-Requested-With", " XMLHttpRequest");

        const res = await fetch(url, {
            method: 'GET',
            headers: headers,
        })
        const groupOpts = await res.json();
        for (let i = 1; i < groupOpts.length; i++) {
            const groupId = examNo + "_" + groupOpts[i].Value.trim();
            const name = groupOpts[i].Text;
            NCCURegisterInfo.group.set(groupId, { name: name });
        }

    }
}

async function updateGroupsInfo() {
    for (const [groupId, groupInfo] of NCCURegisterInfo.group) {
        const groupList = groupId.split('_');
        const examNo = groupList[0];
        const groupNo = groupList[1];

        const url = `http://examreg.nccu.edu.tw/Home/Search2?button=&regtpe_value=${examNo}&dep_num=${groupNo}+&X-Requested-With=XMLHttpRequest`;
        const res = await fetch(url, {
            method: 'POST'
        })
        const resultHTML = await res.text();
        const $ = cheerio.load(resultHTML);


        let registered = 0;
        let want = 0;
        let currentReserve = "";

        const header0 = $("table tbody tr:eq(0) td:eq(0)").text().trim();
        const header6 = $("table tbody tr:eq(0) td:eq(6)").text().trim();
        const header5 = $("table tbody tr:eq(0) td:eq(5)").text().trim();
        const header4 = $("table tbody tr:eq(0) td:eq(4)").text().trim();

        if (header0 !== "准考證號碼" || header6 !== "放棄狀態" || header5 !== "遞補結果" || header4 !== "報到結果") {
            console.log("表格欄位名稱錯誤，請確認後再執行！");
            console.log(groupList)
            continue;
        }



        $("table > tbody > tr").each(async(index, element) => {
            if (index == 0) { //標題列
                return;
            }

            //td:eq(3)是抓取第四欄的文字 => 正備取
            const rank = $(element).find("td:eq(3)").text().trim();


            let status = "--";
            //status
            //正取且報到 => 已報到
            //正取且放棄 => 已放棄
            //備取且已遞補 => 已遞補
            //備取且尚未遞補 => 尚未遞補
            //備取且放棄 => 已放棄

            //td:eq(6)是抓取第七欄的文字 => 放棄狀態
            const waiver = $(element).find("td:eq(6)").text().trim();
            //td:eq(5)是抓取第六欄的文字 => 遞補結果
            const reserve = $(element).find("td:eq(5)").text().trim();
            //td:eq(4)是抓取第五欄的文字 => 報到結果
            const register = $(element).find("td:eq(4)").text().trim();

            if (waiver.includes("已放棄") || register.includes("放棄")) {
                //td:eq(6)是抓取第七欄的文字 => 放棄狀態
                status = "已放棄";
            } else if (reserve.includes("已遞補") || reserve.includes("尚未遞補")) {
                //td:eq(4)是抓取第五欄的文字 => 報到結果
                status = reserve;
            } else if (register.includes("報到")) {
                //td:eq(4)是抓取第五欄的文字 => 報到結果
                status = "已報到";
            }




            //td:eq(1)是抓取第一欄的文字 => 准考證號碼
            const userId = $(element).find("td:eq(0)").text().trim();


            if (status.includes("已遞補") || status.includes("已報到")) {
                registered++;
            }

            if (rank.includes("正取")) {
                want++;
            }


            const process = updateReserveProcess(rank, status);
            if (process != null) {
                currentReserve = process;
            }

            /*
             idField => 
            {
                groupId:CCU_<examNo>_<groupNo>,
                userId:<userId>
            }
             *content =>
             * {
             *      index:<index>,
             *      rank:<rank>,
             *      status:<status>
             * }
             */
            // console.log({
            //     year: currentYear,
            //     groupId: "NCCU_" + groupId,
            //     userId: userId,
            //     index: index,
            //     rank: rank,
            //     status: status
            // });            
            await updateTable("process", {
                year: currentYear,
                groupId: "NCCU_" + examNo+'_'+groupNo,
                userId: userId
            }, {
                index: index,
                rank: rank,
                status: status
            });
        })


        /*
            idField => {
                school:"CCU",
                examNo:<examNo>
                groupNo:<groupNo>
            }
            content =>
            {
                name: groupName,
                currentReserve: "",
                registered: 0,
                want: 0
            }
        */
        // console.log({
        //     year: currentYear,
        //     school: "NCCU",
        //     examNo: examNo,
        //     groupNo: groupNo,
        //     name: groupInfo.name,
        //     currentReserve: currentReserve,
        //     registered: registered,
        //     want: want
        // });
        await updateTable("group", {
            year: currentYear,
            school: "NCCU",
            examNo: examNo,
            groupNo: groupNo
        }, {
            name: groupInfo.name,
            currentReserve: currentReserve,
            registered: registered,
            want: want
        });
    }

    function updateReserveProcess(rank, status) {
        if (rank.includes("正取")) { //正取
            return "尚未有遞補名額";
        } else if (status.includes("已遞補")) { //備取且已報到
            return rank;
        } else {
            return null;
        }
    }

}
