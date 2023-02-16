import cheerio from 'cheerio';
import fetch from 'node-fetch';
import { Headers } from 'node-fetch';
import { updateTable, updateUpdateTime } from './Utils.js';
//Reference:https://mealiy62307.medium.com/node-js-node-js-%E7%88%AC%E8%9F%B2%E8%88%87-line-bot-b94356fcd59d


const NCCURegisterInfo = {
    exam: new Map([
        ["112,1", { type: "112碩班甄試" }],
        ["112,8", { type: "112博班甄試" }],
        ["112,9", { type: "112僑生單招(個人自薦)" }],
        ["112,C", { type: "112僑生單招(學校推薦)" }]
    ]),
    group: new Map()
};


export async function init() {
    console.log("=== NCCU loading ===")
    await setGroupMap();
    await updateGroupsInfo()
    await updateUpdateTime("NCCU");
    console.log("=== NCCU done ===")
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

export async function updateGroupsInfo() {
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

            //td:eq(6)是抓取第七欄的文字 => 放棄結果
            const waiver = $(element).find("td:eq(6)").text().trim();
            //td:eq(5)是抓取第六欄的文字 => 遞補結果
            const reserve = $(element).find("td:eq(5)").text().trim();
            //td:eq(4)是抓取第五欄的文字 => 報到結果
            const register = $(element).find("td:eq(4)").text().trim();;

            if (waiver.includes("已放棄") || register.includes("放棄")) {
                //td:eq(6)是抓取第七欄的文字 => 放棄結果
                status = "已放棄";
            } else if (reserve.includes("已遞補") || reserve.includes("尚未遞補")) {
                //td:eq(4)是抓取第五欄的文字 => 報到結果
                status = reserve;
            } else if (register.includes("報到")) {
                //td:eq(4)是抓取第五欄的文字 => 報到結果
                status = "已報到";
            }




            //td:eq(1)是抓取第一欄的文字 => 准考證號
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
                groupId:CCU_<groupId>,
                userId:<userId>
            }
             *content =>
             * {
             *      index:<index>,
             *      rank:<rank>,
             *      status:<status>
             * }
             */
            await updateTable("process", {
                groupId: "NCCU_" + groupId,
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
        await updateTable("group", {
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