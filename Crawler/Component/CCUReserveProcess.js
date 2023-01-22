import cheerio from 'cheerio';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { Headers } from 'node-fetch';
import { parseCookiesStr, updateTable } from './Utils.js';
//Example 
/*
【group table】

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
/*
【process table】

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


/**
const CCURegisterInfo = {   
    group: [3_13300] => {    //推甄_<一般生><3300系組> 
        name: groupName,     
        link: queryLink,     
    },
    exam: <examNo> =>{
        cookies:<每個examNo會有不同的cookies設定>
    }
}   
*/
const CCURegisterInfo = {
    group: new Map(),
    exam: new Map()
};



export async function init() {
    console.log("=== CCU loading ===")
    await setGroupMap();
    await updateGroupsInfo();
    console.log("=== CCU done ===")
}


const examLen = 1;
async function setGroupMap() {
    for (let examNo = 1; examNo <= examLen; examNo++) {
        const url = `https://www026198.ccu.edu.tw/academic/query_reg/query_reg_${examNo}.php`;
        const res = await fetch(url, {
            method: 'GET'
        })

        CCURegisterInfo.exam.set("" + examNo, {
            cookies: parseCookiesStr(await res.headers.get('set-cookie'))
        })

        const resultHTML = await res.text();
        const $ = cheerio.load(resultHTML);
        $("table > tbody > tr > td > a").each((index, element) => {
            const groupName = $(element).text();
            const queryLink = $(element).attr("href");
            CCURegisterInfo.group.set(examNo + "_" + getGroupNo(queryLink), {
                name: groupName,
                link: queryLink,
            })
        })
    }


    function getGroupNo(queryLink) {
        const quries = queryLink.split('?')[1].split('&');
        const examKind = quries[2].split("=")[1]; //examkind=1(一般) 2(在職)
        const deptNo = quries[1].split("=")[1];
        return examKind + "_" + deptNo;
    }
}

async function updateGroupsInfo() {
    for (const [groupId, groupInfo] of CCURegisterInfo.group) {
        const [examNo, examKind, deptNo] = groupId.split('_');
        //榜單網頁
        let rankUrl = `https://www.exam.ccu.edu.tw/ccuee_gp/Final-1/Name_${deptNo}.html` //第一階錄取科系
        let rankRes = await fetch(rankUrl, {
            method: 'GET'
        })
        if (rankRes.status != 200) { //第二階錄取科系
            rankUrl = `https://www.exam.ccu.edu.tw/ccuee_gp/Final/Name_${deptNo}.html`
            rankRes = await fetch(rankUrl, {
                method: 'GET',
            })
        }
        const rankResultHTML = await rankRes.text();
        const $ = cheerio.load(rankResultHTML);

        const idList = [];
        $("table > tbody > tr > td").each((index, element) => {
            const id = $(element).text().trim();
            if (index % 2 == 0 && id != '') {
                idList.push(id);
            }
        })


        /**
         * 報到狀況網頁
         */
        const processUrl = `https://www026198.ccu.edu.tw/academic/query_reg/${groupInfo.link}`
        const headers = new Headers();
        headers.append("Cookie", CCURegisterInfo.exam.get(examNo).cookies);
        const processRes = await fetch(processUrl, {
            method: 'GET',
            headers: headers
        })
        const processResultHTML = await processRes.text();
        const $$ = cheerio.load(processResultHTML);


        let registered = 0;
        let want = 0;
        let currentReserve = "";
        $$("body > table > tbody > tr").each(async(index, element) => {
            if (index == 0) {
                return;
            }

            //正備取
            const rankType = $(element).find(`td:eq(1)`).text().trim();

            //(正備取)名次
            const rankNo = $(element).find(`td:eq(2)`).text().trim();

            //排名:正備取+名次
            const rank = rankType + rankNo;

            if (rankType == "正取") {
                want++;
            }

            const status = $(element).find(`td:eq(3)`).text().trim();
            if (status == "完成報到") {
                registered++;
            }


            const process = updateReserveProcess(rankType, rankNo, status);
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
                groupId: "CCU_" + groupId,
                userId: idList[index - 1]
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
            school: "CCU",
            examNo: examNo,
            groupNo: examKind + "_" + deptNo
        }, {
            name: groupInfo.name,
            currentReserve: currentReserve,
            registered: registered,
            want: want
        });

    }

    function updateReserveProcess(rankType, rankNo, status) {
        if (rankType == "正取") { //正取
            return "(っ °Д °;)っ目前尚未有備取名額";
        } else if (status.includes("尚未遞補")) { //備取且還未備取到
            return null;
        } else { //備取且空白(待報到)，已報到，放棄...等
            return rankType + rankNo;
        }
    }

}