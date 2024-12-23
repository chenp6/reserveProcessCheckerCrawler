import cheerio from 'cheerio';
import { Headers } from 'node-fetch';
import { parseCookiesStr, updateTable } from './Utils.js';
//Example 
/*
【group table】

idField => {
    year: <year>
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
    year:<year>,
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
    exam: new Map([
        //["3", { link: ["ccuee_gp/Final-1","ccuee_gp/Final"], type: "112學年度碩士班甄試" }],
        ["3", { link: ["var/file/32/1032/img/1926","var/file/32/1032/img/1927"], type: "114學年度碩士班甄試" }],
        
        // ["1", { link: ["ccuee_gs/Final1"], type: "113學年度碩士班招生考試" }]
    ]),
};



export async function init() {
    console.log("=== CCU loading ===")
    await setGroupMap();
    await updateGroupsInfo();
    console.log("=== CCU done ===")
}

async function setGroupMap() {
    for (const [examNo, examInfo] of CCURegisterInfo.exam) {
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
                examLink: examInfo.link
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

        let hasUnderLine = "";
        if (examNo == "3") {
            hasUnderLine = "_";
        }
        

        //榜單網頁
        //112 let rankUrl = `https://www.exam.ccu.edu.tw/${groupInfo.examLink[0]}/Name${hasUnderLine}${deptNo}.html` //第一階錄取科系
        let rankUrl = `https://exams.ccu.edu.tw/${groupInfo.examLink[0]}/Name${hasUnderLine}${deptNo}.html` //第一階錄取科系
        
        let rankRes = await fetch(rankUrl, {
            method: 'GET'
        })

        if (rankRes.status != 200) { //第二階錄取科系
            if (groupInfo.examLink.length > 1) {
              // 112 rankUrl = `https://www.exam.ccu.edu.tw/${groupInfo.examLink[1]}/Name${hasUnderLine}${deptNo}.html`
              rankUrl = `https://exams.ccu.edu.tw/${groupInfo.examLink[1]}/Name${hasUnderLine}${deptNo}.html`
                
              rankRes = await fetch(rankUrl, {
                    method: 'GET',
                })
            } else {
                continue;
            }
        }
        const rankResultHTML = await rankRes.text();
        const $ = cheerio.load(rankResultHTML);

        const idList = [];
        let want = 0;



        //第一個table:正取table
        $("table:eq(0) > tbody > tr > td").each((index, element) => {
            const id = $(element).text().trim();
            if(examNo=='3'){
                if (index % 2 == 0 && id != '') {
                    idList.push(id);
                }
            }else if(examNo=='1'){
                idList.push(id.split(' ')[0]);
            }
        })
        want = idList.length;

        //第二個table:備取table
        $("table:eq(1) > tbody > tr > td").each((index, element) => {
            const id = $(element).text().trim();
            if(examNo=='3'){
                if (index % 2 == 0 && id != '') {
                    idList.push(id);
                }
            }else if(examNo=='1'){
                idList.push(id.split(' ')[0]);
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
        let currentReserve = "";
        $$("body > table > tbody > tr").each(async(index, element) => {
            if (index == 0) {
                return;
            }
            let idIndex = 0;

            //正備取
            const rankType = $$(element).find(`td:eq(1)`).text().trim();

            //(正備取)名次
            const rankNo = $$(element).find(`td:eq(2)`).text().trim();


            //排名:正備取+名次
            const rank = rankType + rankNo;

            

            if (rankType == "正取") {
                //if(idIndex == parseInt(rankNo)){
                idIndex=parseInt(rankNo);
                //}
            }else if(rankType == "備取"){
                idIndex = parseInt(rankNo)+want; 
            }


            const status = $$(element).find(`td:eq(3)`).text().trim();
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
            await updateTable("process", {
                year: "114",
                groupId: "CCU_" + examNo+'_'+examKind + "_" + deptNo,
                userId: idList[idIndex - 1]
            }, {
                index: index,
                rank: rank,
                status: status
            });

            // console.log(
            //     {
            //         year: "114",
            //         groupId: "CCU_" + groupId,
            //         userId: idList[idIndex - 1],
            //         index: index,
            //         rank: rank,
            //         status: status
            //     }
            // )


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
        //     year: "114",
        //     school: "CCU",
        //     examNo: examNo,
        //     groupNo: examKind + "_" + deptNo,
        //     name: groupInfo.name,
        //     currentReserve: currentReserve,
        //     registered: registered,
        //     want: want
        // });

        await updateTable("group", {
            year: "114",
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
            return "尚未有遞補名額";
        } else if (status.includes("完成報到")) { //備取且已報到
            return rankType + rankNo;
        } else {
            return null;
        }
    }

}