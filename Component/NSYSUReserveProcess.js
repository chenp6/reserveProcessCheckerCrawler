import cheerio from 'cheerio';
import fetch from 'node-fetch';
import { Headers } from 'node-fetch';
import { parseCookiesStr, updateTable, stringEncodeToBig5 } from './Utils.js';
import iconv from 'iconv-lite';
//Reference:https://mealiy62307.medium.com/node-js-node-js-%E7%88%AC%E8%9F%B2%E8%88%87-line-bot-b94356fcd59d


const NSYSURegisterInfo = {
    exam: new Map([
        ["112,41", { type: "112學年度考試入學" }]
    ]),
    group: new Map()
};
let cookiesHeader = "";


export async function init() {
    console.log("=== NSYSU loading ===")
    await setCookiesHeader();
    await setGroupMap();
    await updateGroupsInfo();
    console.log("=== NSYSU done ===")

}


async function setCookiesHeader() {
    const url = `https://exam2-acad.nsysu.edu.tw/stunew_query/stunew_qry.asp`;

    const res = await fetch(url, {
        method: 'GET',
    });
    cookiesHeader = parseCookiesStr(await res.headers.get('set-cookie'));
}
async function setGroupMap() {
    for (const examNo of NSYSURegisterInfo.exam.keys()) {
        const info = examNo.split(",");
        const url = `https://exam2-acad.nsysu.edu.tw/stunew_query/stunew_top.asp?examno=${info[1]}&YR=${info[0]}`;
        const headers = new Headers();
        headers.append("Cookie", cookiesHeader);
        const res = await fetch(url, {
            method: 'GET',
            headers: headers
        });

        const buffer = await res.arrayBuffer()
        const resultHTML = iconv.decode(Buffer.from(buffer), 'big5');

        const $ = cheerio.load(resultHTML);
        $("select option").each(async(index, element) => {
            if (index == 0) return;
            const groupField = $(element).val();
            const groupName = $(element).text();
            NSYSURegisterInfo.group.set(examNo + "_" + groupField, {
                name: groupName
            });
        });
    }
}

async function updateGroupsInfo() {
    for (const [groupId, groupInfo] of NSYSURegisterInfo.group) {
        const idField = groupId.split("_");
        const examField = idField[0].split(",");
        const year = examField[0];
        const examNo = examField[1];
        const groupNo = idField[1];
        const res = await fetch("https://exam2-acad.nsysu.edu.tw/stunew_query/stunew_result.asp", {
            "headers": {
                "Content-Type": "application/x-www-form-urlencoded",
                "Cookie": cookiesHeader
            },
            "body": `sect_no=${stringEncodeToBig5(groupNo)}&examno=${examNo}&YR=${year}`,
            "method": "POST",
        });

        const buffer = await res.arrayBuffer()
        const resultHTML = iconv.decode(Buffer.from(buffer), 'big5');
        const $ = cheerio.load(resultHTML);


        let registered = 0;
        let want = 0;
        let currentReserve = "";
        $("body > form > center > table > tbody > tr:nth-child(3) > td > table > tbody > tr").each(async(index, element) => {
            if (index == 0) return;
            //td:eq(6)是抓取第七欄的文字 => 報到狀況
            const status = $(element).find("td:eq(6)").text().trim();

            //td:eq(1)是抓取第二欄的文字 => 准考證號
            const userId = $(element).find("td:eq(1)").text().trim();

            let rank = "";

            //td:eq(3)是抓取第四欄的文字 => 身分別
            const identity = $(element).find("td:eq(3)").text().trim();
            if (identity == "甄試生") {
                rank = identity;
            } else {
                //td:eq(4+5)是抓取第五六欄的文字 => 正備取
                rank = $(element).find("td:eq(4)").text().trim() + $(element).find("td:eq(5)").text().trim();
            }

            if (status == "已報到") {
                registered++;
            }

            if (rank == "正取" || identity == "甄試生") {
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
                groupId: "NSYSU_" + groupId,
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
            school: "NSYSU",
            examNo: idField[0],
            groupNo: groupNo
        }, {
            name: groupInfo.name,
            currentReserve: currentReserve,
            registered: registered,
            want: want
        });
    }

    function updateReserveProcess(rank, status) {
        if (rank == "正取") { //正取
            return "尚未有遞補名額";
        } else if (status.includes("已報到")) { //備取且已報到
            return rank;
        } else {
            return null;
        }
    }
}