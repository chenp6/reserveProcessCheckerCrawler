import cheerio from 'cheerio';
import FormData from 'form-data';
import fetch from 'node-fetch';

//Reference:https://mealiy62307.medium.com/node-js-node-js-%E7%88%AC%E8%9F%B2%E8%88%87-line-bot-b94356fcd59d


const NCKURegisterInfo = {
    exam: new Map([
        ["1", { type: "碩士班甄試" }],
        ["O", { type: "博士班甄試" }]
    ]),
    group: new Map()
};


export async function init() {
    console.log("=== NCKU loading ===")
    await setGroupMap();
    await updateGroupsInfo()
    const process = getReserveProcess("O_370");
    console.log(process);
    const rank = getUserRank("1_382", "3820018")
    console.log(rank)
    console.log("=== NKCU done ===")
}
init();
async function setGroupMap() {
    const url = 'https://nbk.acad.ncku.edu.tw/netcheckin/views/js/code1.js?1669878074'
    const res = await fetch(url, {
        method: 'GET'
    })
    const resultJS = await res.text();
    const resultArr = resultJS.split('\n');
    let examNo;
    for (let i = 2; i < resultArr.length; i++) {
        if (!resultArr[i].includes("new Option(")) {
            continue;
        }

        if (resultArr[i].includes("A1['1']")) {
            examNo = '1';
        } else if (resultArr[i].includes("A1['O']")) {
            examNo = 'O';
        } else {
            continue
        }

        //ex: str =>[電資學院]智慧資訊安全碩士學位學程[140]
        const str = (resultArr[i].split("new Option(")[1]).replace("'", "").split("','")[0];

        //groupInfo => 電資學院]智慧資訊安全碩士學位學程 , 140
        const groupInfo = str.split("[");
        //groupNo => 1_140 (examNo_groupNo)
        const groupNo = examNo + "_" + groupInfo[2].replace("]", "");
        const groupName = "[" + groupInfo[1];
        NCKURegisterInfo.group.set(groupNo, {
            groupName: groupName,
            table: [],
            currentReserve: "",
            registered: 0,
            want: 0
        });
    }
}

export async function updateGroupsInfo() {
    for (let [groupNo, groupInfo] of NCKURegisterInfo.group) {
        groupNo = groupNo.split('_');
        const examNo = groupNo[0];
        groupNo = groupNo[1];
        const formData = new FormData();
        formData.append('exam_id', examNo);
        formData.append('group_no', groupNo);
        const url = 'https://nbk.acad.ncku.edu.tw/netcheckin/index.php?c=quall_rwd&m=qu'
        const res = await fetch(url, {
            body: formData,
            method: 'POST'
        })
        const resultHTML = await res.text();
        const $ = cheerio.load(resultHTML);


        const rankTable = new Map();
        let registered = 0;
        let want = 0;

        $("table > tbody > tr").each((index, element) => {

            //td:eq(0)是抓取第一欄的文字 => 報到狀況
            const status = $(element).find("td:eq(0)").text().trim();

            //td:eq(1)是抓取第二欄的文字 => 准考證號
            const id = $(element).find("td:eq(1)").text().trim();

            //td:eq(3)是抓取第四欄的文字 => 正備取
            const rank = $(element).find("td:eq(3)").text().trim();

            if (status == "完成報到") {
                registered++;
            }

            if (rank.includes("正取")) {
                want++;
            }

            const reserveProcess = updateReserveProcess(rank, status);
            if (reserveProcess != null) {
                groupInfo.reserveProcess = reserveProcess;
            }

            const info = {
                index: index,
                rank: rank,
                status: status
            }
            rankTable.set(id, info);
        })

        groupInfo.table = rankTable;
        groupInfo.registered = registered;
        groupInfo.want = want;
    }


    function updateReserveProcess(rank, status) {
        if (rank.includes("正取")) { //正取
            return "(っ °Д °;)っ目前尚未有備取名額";
        } else if (status.includes("備取")) { //備取且還未備取到
            return null;
        } else { //備取且空白(待報到)，已報到，放棄...等
            return rank;
        }
    }

}





export function getUserRank(groupNo, userExamId) {
    const table = NCKURegisterInfo.group.get(groupNo) ? .table;
    if (table == undefined) {
        return null;
    } else {
        return table.get(userExamId);
    }
}

export function getReserveProcess(groupNo) {
    const info = NCKURegisterInfo.group.get(groupNo);
    if (info == undefined) {
        return null;
    }

    return {
        registered: info.registered,
        want: info.want,
        reserveProcess: info.reserveProcess
    }
}