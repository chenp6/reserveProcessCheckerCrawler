import cheerio from 'cheerio';
import fetch from 'node-fetch';
import { updateTable } from './Utils.js';
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
const NCURegisterInfo = {
    exam: [142] => {
            type: '112學年度碩士班、博士班甄試入學招生'
        }

    group: [142I101I1I6204I0] => {
        name: "地球科學學系地球物理碩士班	不分組(一般生)"
    }

};
*/
const NCURegisterInfo = {
    exam: new Map([
        ["142", { type: "112學年度碩士班、博士班甄試入學招生" }],
    ]),
    group: new Map()
};


export async function init() {

    console.log("=== NCU loading ===")
    await setGroupMap();
    await updateGroupsInfo();
    console.log("=== NCU done ===")

}


async function setGroupMap() {
    for (const examNo of NCURegisterInfo.exam.keys()) {
        const url = 'https://cis.ncu.edu.tw/ExamRegister/checkin?activityNo=' + examNo
        const res = await fetch(url, {
            method: 'GET',
        })
        const resultHTML = await res.text();
        const $ = cheerio.load(resultHTML);


        // |系所名稱及班別|組別名稱|報到階段|報到日期| 備註	|檔案下載|報到情形查詢|
        // |      0      |   1   |   2   |   3    |  4  |   5   |      6    |
        $("table > tbody > tr").each(async(index, element) => {

            //td:eq(6)是抓取第七欄的文字 => 報到情形查詢
            //checkin_detail?d=142I999I1I5202I0 >>> 142I999I1I5202I0
            let groupId = $(element).find(`td:eq(6)`).children().first().attr("href");
            if (groupId == undefined) {
                return;
            } else {
                groupId = groupId.split("=")[1];
            }

            // //td:eq(0)是抓取第一欄的文字 => 系所名稱及班別
            const deptName = $(element).find(`td:eq(0)`).text().trim();

            // //td:eq(1)是抓取第二欄的文字 => 組別名稱
            const groupType = $(element).find(`td:eq(1)`).text().trim();

            //name:系所名稱及班別 組別名稱
            //>>> ex:地球科學學系地球物理碩士班	不分組(一般生)
            NCURegisterInfo.group.set(groupId, {
                name: deptName + " " + groupType
            });

        })

    }
}

async function updateGroupsInfo() {
    for (const [groupId, groupInfo] of NCURegisterInfo.group) {

        //142I101I1I6204I0 >>> ['142','101I1I6204I0','']
        // 'good_luck_buddy'.split(/_(.*)/s)
        // ['good', 'luck_buddy', ''] // ignore the third element

        const queries = groupId.split(/I(.*)/s);

        const rankUrl = `https://cis.ncu.edu.tw/ExamRegister/checkin_detail?d=${groupId}`
        const rankRes = await fetch(rankUrl, {
            method: 'GET'
        })
        const rankResultHTML = await rankRes.text();
        const $ = cheerio.load(rankResultHTML);

        let registered = 0;
        let want = 0;
        let currentReserve = "";
        $("table > tbody > tr").each(async(index, element) => {

            if (index == 0) { //標題列
                return;
            }

            // |准考證號碼|正備取|報到狀態| 
            // |    0    |   1  |   2   |  
            //td:eq(0)是抓取第一欄的文字 => 准考證號碼
            const userId = $(element).find(`td:eq(0)`).text().trim();

            //td:eq(1)是抓取第二欄的文字 => 正備取
            const rank = $(element).find(`td:eq(1)`).text().trim();

            if (rank == "正取") {
                want++;
            }


            //td:eq(2)是抓取第三欄的文字 => 報到狀態
            const status = $(element).find(`td:eq(2)`).text().trim();
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
                groupId: "NCU_" + queries[0] + "_" + queries[1],
                userId: userId
            }, {
                index: index,
                rank: rank,
                status: status
            });



        });
        /*
            idField => {
                school:"NCU",
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
            school: "NCU",
            examNo: queries[0],
            groupNo: queries[1]
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
        if (rank == "正取") {
            return "(っ °Д °;)っ目前尚未有備取名額";
        } else if (status == "備取") { //備取且還未備取到
            return null;
        } else { //空白(待報到)，已報到，放棄...等
            return rank;
        }
    }
}