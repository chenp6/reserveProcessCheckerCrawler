import cheerio from 'cheerio';
import { newPage, NYCUPageManager, navigateToPage } from './PageManager.js';
import { updateTable } from './Utils.js';
//Example 
/*
【group table】
idField => {
    year: <year>
    school:"UST",
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
    groupId:<examNo>_<groupNo>,
    userId:<userId>
}
 *content =>
 * {
 *      index:<index>,
 *      rank:<rank>,
 *      status:<status>
 * }
 */




const USTRegisterInfo = {
    exam: new Map([
        ["ab6e8d7a-9f7b-4e6c-91eb-31ebfd5c6e52", { type: "113學年度碩士班考試" }]
    ]),
    group: new Map()
};
const page = await newPage(false);
const pageManager = new NYCUPageManager(page);


export async function init() {

    console.log("=== UST loading ===")
    await navigateToPage(page, 'https://enroll-ust.nycu.edu.tw/');
    await setGroupMap();
    await updateGroupsInfo();
    console.log("=== UST done ===")
}


async function setGroupMap() {
    for (let examNo of USTRegisterInfo.exam.keys()) {
        await pageManager.selectExamType(examNo);
        const content = await page.content(); // 取得新頁面的內容
        const $$ = cheerio.load(content);

        const exampleGroup = $$("select#ddlExamList option:selected").text().trim();
        const groupNameStartAt = getIndexofItemStart(exampleGroup);
        $$("select#ddlExamList option").each(async(index, element) => {
                const groupCode = $$(element).val();
                const groupInfo = $$(element).text();

                const groupNo = examNo + "_" + groupInfo.substring(0, groupNameStartAt);
                const groupName = groupInfo.substring(groupNameStartAt);
                USTRegisterInfo.group.set(groupNo, {
                    name: groupName,
                    code: groupCode
                });
            }

        )
    }
}

async function updateGroupsInfo() {
    for (const [groupNo, groupInfo] of USTRegisterInfo.group) {
        const examNo = groupNo.split('_')[0];

        const groupCode = groupInfo.code;

        await pageManager.selectExamType(examNo);
        await pageManager.selectExamList(groupCode);
        const content = await page.content(); // 取得新頁面的內容
        const $ = cheerio.load(content);

        let reserveCounter = 1;
        const rowCount = $("#dgUserList tr").length;
        const cellCount = $("#dgUserList tr td").length;
        const colCount = parseInt(cellCount / rowCount);

        // colCount = 4
        // |考生編號|正備取|報考類別|報到狀況|  =>tr = 0
        // |   0   |  1   |    2  |   3   |


        // colCount = 5
        // |考生編號|學號|正備取|報考類別|報到狀況|  =>tr = 0
        // |   0   |  1 |  2  |    3   |   4   |

        //抓取考生編號欄號
        const idColNo = 0;

        //抓取正備取欄號
        const rankColNo = colCount == 4 ? 1 : 2;

        //抓取報到狀況欄號
        const statusColNo = colCount == 4 ? 3 : 4;

        let registered = 0;
        let want = 0;
        let currentReserve = "";
        $("table > tbody > tr").each(async(index, element) => {
            if (index == 0) {
                return;
            }
            //td:eq(0)是抓取第一欄的文字 => 考生編號
            const userId = $(element).find(`td:eq(${idColNo})`).text().trim();

            //td:eq(1)是抓取第二欄的文字 => 正備取
            let rank = $(element).find(`td:eq(${rankColNo})`).text().trim();

            if (rank == "備取") {
                rank = "備取" + reserveCounter; //備取+順位
                reserveCounter++;
            } else {
                want++;
            }



            //td:eq(3)是抓取第四欄的文字 => 報到狀況
            const status = $(element).find(`td:eq(${statusColNo})`).text().trim();
            if (status == "已報到!") {
                registered++;
            }

            const process = updateReserveProcess(rank, status);
            if (process != null) {
                currentReserve = process;
            }

            /*
            idField => 
            {
                groupId:<examNo>_<groupNo>,
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
            //     year: "113",
            //     groupId: "UST_" + groupNo,
            //     userId: userId,
            //     index: index,
            //     rank: rank,
            //     status: status
            // });

            await updateTable("process", {
                year: "113",
                groupId: "UST_" +queries[0]+'_' +queries[1],
                userId: userId
            }, {
                index: index,
                rank: rank,
                status: status
            });

        });
        /*
            idField => {
                school:"UST",
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
        const queries = groupNo.split('_');
        // console.log({
        //     year: "113",
        //     school: "UST",
        //     examNo: queries[0],
        //     groupNo: queries[1],
        //     name: groupInfo.name,
        //     currentReserve: currentReserve,
        //     registered: registered,
        //     want: want
        // });


        await updateTable("group", {
            year: "113",
            school: "UST",
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
        if (rank == "正取" || rank == "直接") {
            return "尚未有遞補名額";
        } else if (status == "已報到!") { //備取且已報到
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