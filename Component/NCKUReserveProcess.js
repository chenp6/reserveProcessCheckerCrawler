import cheerio from 'cheerio';
import FormData from 'form-data';
import { updateTable } from './Utils.js';
//Reference:https://mealiy62307.medium.com/node-js-node-js-%E7%88%AC%E8%9F%B2%E8%88%87-line-bot-b94356fcd59d


const NCKURegisterInfo = {
    exam: new Map([
        ["1", { type: "碩士班甄試" }],
        // ["2", { type: "碩士班" }],
        ["O", { type: "博士班甄試" }],
        // ["H", { type: "寒假轉學甄試" }]
    ]),
    group: new Map()
};


export async function init() {
    console.log("=== NCKU loading ===")
    await setGroupMap();
    await updateGroupsInfo()
    console.log("=== NKCU done ===")

}
async function setGroupMap() {
    const url = 'https://nbk.acad.ncku.edu.tw/netcheckin/views/js/code1.js?1700816055'; //1700816055每學期不同須更新
    const res = await fetch(url, {
        method: 'GET'
    })
    const resultJS = await res.text();
    const resultArr = resultJS.split('\n');
    let examNo;
    for (let i = 2; i < resultArr.length; i++) {
        if (resultArr[i].includes("new Array();")) {
            continue;
        } else if (resultArr[i].includes("A1['1']")) {
            examNo = '1';
            // } else if (resultArr[i].includes("A1['2']")) {
            //     examNo = '2';
        } else if (resultArr[i].includes("A1['O']")) {
            examNo = 'O';
            // } else if (resultArr[i].includes("A1['H']")) { //寒假轉學甄試
            // examNo = 'H';
        } else {
            continue;
        }

        //ex: str =>[電資學院]智慧資訊安全碩士學位學程[140]
        const str = (resultArr[i].split("new Option(")[1]).replace("'", "").split("','")[0];

        //groupInfo => 電資學院]智慧資訊安全碩士學位學程 , 140
        const groupInfo = str.split("[");
        //groupNo => 1_140 (examNo_groupNo)
        const groupId = examNo + "_" + groupInfo[2].replace("]", "");
        const groupName = "[" + groupInfo[1];
        NCKURegisterInfo.group.set(groupId, {
            name: groupName
        });
    }
}

export async function updateGroupsInfo() {
    for (const [groupId, groupInfo] of NCKURegisterInfo.group) {
        const groupList = groupId.split('_');
        const examNo = groupList[0];
        const groupNo = groupList[1];


        // const headers = new Headers();
        // headers.append("Content-Type", " application/x-www-form-urlencoded");
        // headers.append("X-Requested-With", " XMLHttpRequest");

        const formData = new FormData();
        // const headers = new Headers();
        // headers.append('Access-Control-Allow-Origin', '*');

        formData.append('exam_id', examNo);
        formData.append('group_no', groupNo);


        const url = 'https://nbk.acad.ncku.edu.tw/netcheckin/index.php?c=quall_rwd&m=qu'


        let myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

        let urlencoded = new URLSearchParams();
        urlencoded.append("exam_id", examNo);
        urlencoded.append("group_no", groupNo);
        const res = await fetch(url, {
            method: 'POST',
            headers: myHeaders,
            body: urlencoded,
            redirect: 'follow'
        });

        const resultHTML = await res.text();

        const $ = cheerio.load(resultHTML);
        let registered = 0;
        let want = 0;
        let currentReserve = "";
        $("table > tbody > tr").each(async(index, element) => {

            //td:eq(0)是抓取第一欄的文字 => 報到狀況
            const status = $(element).find("td:eq(0)").text().trim();

            //td:eq(1)是抓取第二欄的文字 => 准考證號
            const userId = $(element).find("td:eq(1)").text().trim();

            //td:eq(3)是抓取第四欄的文字 => 正備取
            const rank = $(element).find("td:eq(3)").text().trim();


            // console.log(status);
            // console.log(userId);
            // console.log(rank);

            if (status == "完成報到") {
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

            //測試用
            // console.log({
            //     year: "113",
            //     groupId: "NCKU_" + groupId,
            //     userId: userId,
            //     index: index,
            //     rank: rank,
            //     status: status
            // })

            await updateTable("process", {
                year: "113",
                groupId: "NCKU_" + groupId,
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
            year: "113",
            school: "NCKU",
            examNo: examNo,
            groupNo: groupNo
        }, {
            name: groupInfo.name,
            currentReserve: currentReserve,
            registered: registered,
            want: want
        });

        //測試用
        // console.log({
        //     year: "113",
        //     school: "NCKU",
        //     examNo: examNo,
        //     groupNo: groupNo,
        //     name: groupInfo.name,
        //     currentReserve: currentReserve,
        //     registered: registered,
        //     want: want
        // })
    }


    function updateReserveProcess(rank, status) {
        if (rank.includes("正取")) { //正取
            return "尚未有遞補名額";
        } else if (status.includes("完成報到")) { //備取且已報到
            return rank;
        } else {
            return null;
        }
    }

}