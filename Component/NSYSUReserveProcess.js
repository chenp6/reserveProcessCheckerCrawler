import cheerio from 'cheerio';

import { Headers } from 'node-fetch';
import { parseCookiesStr, updateTable, stringEncodeToBig5 } from './Utils.js';
import iconv from 'iconv-lite';
//Reference:https://mealiy62307.medium.com/node-js-node-js-%E7%88%AC%E8%9F%B2%E8%88%87-line-bot-b94356fcd59d


const NSYSURegisterInfo = {
    exam: new Map([
        //["113,41", { type: "113學年度考試入學" }],
         ["114,11", { type: "114學年度碩士班甄試入學" }]
    ]),
    group: new Map()
};
let cookiesHeader = "";


export async function init() {
    console.log("=== NSYSU loading ===")
    await setHomepageCookiesHeader();
    await setGroupMap();
    await updateGroupsInfo();
    console.log("=== NSYSU done ===")

}
async function setHomepageCookiesHeader() {
    const url = `https://exam2-acad.nsysu.edu.tw/stunew_query/stunew_qry_step1.asp`;
    const res = await fetch(url, {
        method: 'GET',
    });
    cookiesHeader = parseCookiesStr(await res.headers.get('set-cookie'));
    console.log(cookiesHeader)

}
async function setGroupMap() {
    for (const examNo of NSYSURegisterInfo.exam.keys()) {
        const info = examNo.split(",");


        const url_qry = `https://exam2-acad.nsysu.edu.tw/stunew_query/stunew_qry.asp`;
        const urlencoded = new URLSearchParams();
        urlencoded.append("exam_list", "11");
        urlencoded.append("YR", "114");
        const res_qry = await fetch(url_qry,
            {
                "headers": {
                    "Cookie": cookiesHeader
                },
                "body": urlencoded,
                "method": "POST",
        });
        // console.log(await res_qry.text())
        // console.log(res_qry);
        //cookiesHeader = parseCookiesStr(await res_qry.headers.get('set-cookie'));

        const headers = new Headers();
        headers.append("Cookie", cookiesHeader);

        const url = `https://exam2-acad.nsysu.edu.tw/stunew_query/stunew_top.asp`;

        const res = await fetch(url, {
            method: 'GET',
            headers: headers
        });

        const resultHTML = await res.text();
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
        const groupIdField = groupId.split("_");
        const examField = groupIdField[0].split(",");
        const year = examField[0];
        const examNo = examField[1];
        const groupNo = groupIdField[1];
        const res = await fetch("https://exam2-acad.nsysu.edu.tw/stunew_query/stunew_result.asp", {
            "headers": {
                "Content-Type": "application/x-www-form-urlencoded",
                "Cookie": cookiesHeader
            },
            "body": `sect_no=${groupNo}&examno=${examNo}&YR=${year}`,
            "method": "POST",
        });

        const resultHTML = await res.text();
        const $ = cheerio.load(resultHTML);


        let registered = 0;
        let want = 0;
        let currentReserve = "";
        $("body > form > center > table > tbody > tr:nth-child(3) > td > table > tbody > tr").each(async(index, element) => {
            if (index == 0) return;
            //td:eq(6)是抓取第七欄的文字 => 報到狀況
            const status = $(element).find("td:eq(5)").text().trim();

            //td:eq(1)是抓取第二欄的文字 => 准考證號
            const userId = $(element).find("td:eq(1)").text().trim();

            let rank = "";

            //td:eq(2)是抓取第三欄的文字 => 身分別
            const identity = $(element).find("td:eq(2)").text().trim();
            if (identity == "甄試生") {
                rank = identity;
            } else {
                //td:eq(3)是抓取第四欄的文字 => 正備取
                rank = $(element).find("td:eq(3)").text().trim() + $(element).find("td:eq(4)").text().trim();
            }

            if (status == "已報到" && identity !== "甄試生") {
                registered++;
            }

            if (rank == "正取") { // || identity == "甄試生"
                want++;
            }

            const process = updateReserveProcess(rank, status);
            if (process != null) {
                currentReserve = process;
            }

            /*
             idField => 
            {
                groupId:NSYSU_<examNo>_<groupNo>,
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
            //     year: "114",
            //     groupId: "NSYSU_" + groupIdField[0]+'_'+groupNo,
            //     userId: userId,
            //     index: index,
            //     rank: rank,
            //     status: status
            // });


            await updateTable("process", {
                year: "114",
                groupId: "NSYSU_" + groupIdField[0]+'_'+groupNo,
                userId: userId
            }, {
                index: index,
                rank: rank,
                status: status
            });
        })


        /*
            idField => {
                school:"NSYSU_",
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
        //     year: "114",
        //     school: "NSYSU",
        //     examNo: idField[0],
        //     groupNo: groupNo,
        //     name: groupInfo.name,
        //     currentReserve: currentReserve,
        //     registered: registered,
        //     want: want
        // });

        await updateTable("group", {
            year: "114",
            school: "NSYSU",
            examNo: groupIdField[0],
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