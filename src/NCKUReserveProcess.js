import cheerio from 'cheerio';
import FormData from 'form-data';
import fetch from 'node-fetch';

//Reference:https://mealiy62307.medium.com/node-js-node-js-%E7%88%AC%E8%9F%B2%E8%88%87-line-bot-b94356fcd59d


const NCKURegisterInfo = new Map();

export async function init() {
    await setGroupMap();
}

async function setGroupMap() {
    const url = 'https://nbk.acad.ncku.edu.tw/netcheckin/views/js/code1.js?1669878074'
    const res = await fetch(url, {
        method: 'GET'
    })
    const resultJS = await res.text();
    const resultArr = resultJS.split('\n');
    let examType;
    for (let i = 2; i < resultArr.length; i++) {
        if (resultArr[i].includes("A1['1']")) {
            examNo = 1;
        } else if (resultArr[i].includes("A1['2']")) {
            examNo = 2;
        } else {
            break;
        }

        //ex: str =>[電資學院]智慧資訊安全碩士學位學程[140]
        const str = (resultArr[i].split("new Option(")[1]).replace("'", "").split("','")[0];

        //groupInfo => 電資學院]智慧資訊安全碩士學位學程 , 140
        const groupInfo = str.split("[");
        //groupNo => 1_140 (examNo_groupNo)
        const groupNo = examNo + "_" + groupInfo[2].replace("]", "");
        const groupName = "[" + groupInfo[1];
        NCKURegisterInfo.set(groupNo, {
            groupName: groupName,
            table: [],
            currentReserve: "",
            registered: 0,
            want: 0
        });
    }
}

export async function updateGroupsInfo() {
    for (let [groupNo, groupInfo] of NCKURegisterInfo) {
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

            //td:eq(0)是抓取第二欄的文字 => 報到狀況
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


            if (rank.includes("正取")) {
                if (status.includes("待報到")) {
                   return "等待正取報到/放棄中";
                }
                return "目前未有備取名額，再耐心等一下(❁´◡`❁)";
            } else {
                if (status.includes("備取")) {
                    if (i > 0) {
                        currentReserve = rankTable[i - 1].rank;
                    }
                }
            }

            const info = {
                id: id,
                rank: rank,
                status: status
            }
            rankTable.set(id, info);
        })
    }
    return rankTable;
}

// export async function updateReserveProcess(groupNo) {
//     const groupInfo = NCKUDepartmentInfo.get(groupNo);
//     const rankTable = await getTable(groupNo);
//     groupInfo.table = rankTable;
let currentReserve = "--";

//從最後一項開始
for (let i = 1; i < rankTable.length; i++) {
    if (rankTable[i].rank.includes("正取")) {
        if (rankTable[i].status.includes("待報到")) {
            currentReserve = "等待正取報到/放棄中";
            break;
        }
        currentReserve = "目前未有備取名額，再耐心等一下(❁´◡`❁)";
    } else {
        if (rankTable[i].status.includes("備取")) {
            if (i > 0) {
                currentReserve = rankTable[i - 1].rank;
            }
        }
    }
}
const departmentName = NCKURegisterInfo.get(groupNo).groupName;

console.log(departmentName + "-備取進度:" + currentReserve);



export async function getReserveProcess(groupNo) {
    const groupInfo = NCKURegisterInfo.get(groupNo);
    return groupInfo.currentReserve;
}


export async function getRank(groupNo, id) {
    const groupInfo = NCKURegisterInfo.get(groupNo);
    const rankTable = groupInfo.table;
    const user = rankTable.find(user => user.id == id);
    return user.rank;
}