import cheerio from 'cheerio';
import fetch from 'node-fetch';
import { updateTable, stringEncodeToBig5 } from './Utils.js';
import iconv from 'iconv-lite';

//Example 
/*
【group table】
idField => {
    school:"NYCU",
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
/*
【process table】

idField => 
{
    groupId:<groupId>,
    userId:<userId>
}
 *content =>
 * {
 *      index:<index>,
 *      rank:<rank>,
 *      status:<status>
 * }
 */



/*
const NTURegisterInfo = {
    exam: [142] => {
            type: '112學年度碩士班、博士班甄試入學招生'
        }

    group: [142I101I1I6204I0] => {
        name: "地球科學學系地球物理碩士班	不分組(一般生)"
        groupNo:"142I101I1I6204I0",
        examNo:"142"
    }

};
*/
const NTURegisterInfo = {
    exam: new Map([
        // ["regchk/stu_query", { type: "112學年度碩士班甄試", isBig5: false,reservedColor:"#FFFF00" }],
        ["regbchk/stu_query", { type: "112學年度碩士班(考試入學)", isBig5: true, reservedColor: "#00F7FA" }]
    ]),
    group: new Map()
};


export async function init() {

    console.log("=== NTU loading ===")
    await setGroupMap();
    await updateGroupsInfo();
    console.log("=== NTU done ===")

}


async function setGroupMap() {
    for (const [examNo, examInfo] of NTURegisterInfo.exam) {
        const url = `https://gra108.aca.ntu.edu.tw/${examNo}.asp`;
        const res = await fetch(url, {
            method: 'GET',
        })

        let resultHTML = "";
        if (examInfo.isBig5) {
            const buffer = await res.arrayBuffer();
            resultHTML = iconv.decode(Buffer.from(buffer), 'big5');
        } else {
            resultHTML = await res.text();
        }


        const $ = cheerio.load(resultHTML);

        $("select option").each(async(index, element) => {
            const groupName = $(element).val().trim();
            if (groupName == "") return;
            const idEndAt = getIndexofItemStart(groupName);
            const groupNo = groupName.substring(0, idEndAt);
            NTURegisterInfo.group.set(examNo + "_" + groupNo, { examNo: examNo, groupNo: groupNo, name: groupName, isBig5: examInfo.isBig5, reservedColor: examInfo.reservedColor })
        })
    }
}

async function updateGroupsInfo() {
    for (const [groupId, groupInfo] of NTURegisterInfo.group) {
        let rankResultHTML = "";
        if (groupInfo.isBig5) {
            const rankUrl = `https://gra108.aca.ntu.edu.tw/${groupInfo.examNo}.asp?DEP=${stringEncodeToBig5(groupInfo.name)}&qry=查詢`
            const rankRes = await fetch(rankUrl, {
                method: 'POST'
            })
            const buffer = await rankRes.arrayBuffer();
            rankResultHTML = iconv.decode(Buffer.from(buffer), 'big5');
        } else {
            const rankUrl = `https://gra108.aca.ntu.edu.tw/${groupInfo.examNo}.asp?DEP=${groupInfo.name}&qry=查詢`
            const rankRes = await fetch(rankUrl, {
                method: 'POST'
            })
            rankResultHTML = await rankRes.text();
        }


        const $ = cheerio.load(rankResultHTML);

        let registered = 0;
        let want = 0;
        let currentReserve = "";
        $("table > tbody > tr").each(async(index, element) => {

            if (index == 0) { //標題列
                return;
            }

            //| 序號 |	准考證 | 姓名 | 正備取 | 報到狀態 | 遞補狀態 | 備註
            //|  0  |     1   |   2  |   3   |     4   |    5     |  6


            //td:eq(1)是抓取第二欄的文字 => 准考證號碼
            const userId = $(element).find(`td:eq(1)`).text().trim();

            //td:eq(3)是抓取第四欄的文字 => 正備取
            const rank = $(element).find(`td:eq(3)`).text().trim();

            if (rank.includes("正取")) {
                want++;
            }



            const ps = $(element).find(`td:eq(6)`).text().trim();
            const reserve = $(element).find("td:eq(5)").text().trim();
            let status = $(element).find(`td:eq(4)`).text().trim(); //全部放棄/未報到/已放棄/志願順位
            //td:eq(4)是抓取第五欄的文字 => 報到狀態 
            if ($(element).attr("bgcolor") == groupInfo.reservedColor) { //已報到
                status = "已報到";
            } else if (ps.includes("放棄")) { //已遞補且放棄
                status = ps;
            } else if (reserve != "") { //已遞補至其他志願
                status = reserve;
            }




            if (status == "已報到") {
                registered++;
            }

            const process = updateReserveProcess(rank, status);
            if (process != null) {
                currentReserve = process;
            }


            /*
            idField => 
            {
                groupId:<groupId>,
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
                groupId: "NTU_" + groupId,
                userId: userId,
            }, {
                index: index,
                rank: rank,
                status: status,
            });


        });
        /*
            idField => {
                school:"NTU",
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
            school: "NTU",
            examNo: groupInfo.examNo,
            groupNo: groupInfo.groupNo
        }, {
            name: groupInfo.name,
            currentReserve: currentReserve,
            registered: registered,
            want: want
        });


    }

    /**
     * 根據該生之rank及status更新目前的備取進度
     * @param {*} rank 名次   
     * @param {*} status 目前狀況  
     * @returns 更新後的進度
     */
    function updateReserveProcess(rank, status) {
        if (rank.includes("正取")) {
            return "尚未有遞補名額";
        } else if (status == "已報到") { //備取且已報到
            return rank;
        } else {
            return null;
        }
    }
}

/**
 * 取得 {id+item}格式之字串中的item首字元之index
 * id須由大寫與數字組成   
 * item的首字元需不為大寫或數字
 * @param {*} str {id+item}格式之字串
 */
function getIndexofItemStart(str) {
    let itemStartAt = 0;
    for (let i = 0; i < str.length; i++) {
        if ((str.charCodeAt(i) >= 48 && str.charCodeAt(i) <= 57) ||
            ((str.charCodeAt(i) >= 65 && str.charCodeAt(i) <= 90))) {
            itemStartAt += 1;
        } else {
            break;
        }
    }
    return itemStartAt;
}