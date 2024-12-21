import cheerio from 'cheerio';
import { updateTable } from './Utils.js';
//Example 
/*
【group table】
idField => {
    year:<year>
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
/*
【process table】

idField => 
{
    year:<year>,
    year:<year>
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
        // ["142", { type: "112學年度碩士班、博士班甄試入學招生" }],
        // ["143", { type: "112學年度碩士在職專班招生" }],
        // ["146", { type: "112學年度碩士班考試入學招生" }]
        // ["158", { type: "113學年度碩士班、博士班甄試入學招生" }],
        // ["159", { type: "113學年度碩士班考試入學招生" }],
        ["173", { type: "114學年度碩士班、博士班甄試入學招生" }],

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

        let deptName = "";
        $("table > tbody > tr").each(async(index, element) => {
            // 系所名稱及班別之第一列組別
            // |系所名稱及班別|組別名稱|報到階段|報到日期| 備註	|檔案下載|報到情形查詢|
            // |      0      |   1   |   2   |   3    |  4  |   5   |      6    |

            // 【預設】系所名稱及班別之第一列外組別
            // |組別名稱|報到階段|報到日期|備註|檔案下載|報到情形查詢|
            // |   0   |   1   |   2    | 3 |   4   |      5    |
            let groupIdColNo = 5;
            let groupTypeColNo = 0;

            if ($(element).children().length == 7) { //是系所名稱及班別之第一列組別
                //td:eq(0)是抓取第一欄的文字 => 系所名稱及班別
                deptName = $(element).find(`td:eq(0)`).text().trim();
                groupIdColNo = 6;
                groupTypeColNo = 1;
            }

            //td:eq(6)是抓取第七欄的文字 => 報到情形查詢
            //checkin_detail?d=142I999I1I5202I0 >>> 142I999I1I5202I0
            let groupId = $(element).find(`td:eq(${groupIdColNo})`).children().first().attr("href");
            if (groupId == undefined) {
                return;
            } else {
                groupId = groupId.split("?")[1];
            }

            //td:eq(1)是抓取第二欄的文字 => 組別名稱
            const groupType = $(element).find(`td:eq(${groupTypeColNo})`).text().trim();

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
        let examQuery = queries[0].split('=')[1];
        let groupQuery = queries[1].split('&')[0];

        //https://cis.ncu.edu.tw/ExamRegister/checkin_detail?code=173I999I1I3202I6&d=01385756
        //&d=後面這邊隨著更新會一直變動 不需要設到id中 groupid只要173I999I1I3202I6即可
        //也就是 code={examQuery}{groupQuery}
        const rankUrl = `https://cis.ncu.edu.tw/ExamRegister/checkin_detail?code=${examQuery}I${groupQuery}`
        const rankRes = await fetch(rankUrl, {
            method: 'GET'
        })
        const rankResultHTML = await rankRes.text();
        const $ = cheerio.load(rankResultHTML);

        let registered = 0;
        let want = 0;
        let currentReserve = "";
        $("table > tbody > tr").each(async(index, element) => {

            if (index == 0 || index == 1) { //標題列
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
            //     year: "114",
            //     groupId: "NCU_" + examQuery + "_" + groupQuery,
            //     userId: userId,
            //     index: index,
            //     rank: rank,
            //     status: status
            // });

            await updateTable("process", {
                year: "114",
                groupId: "NCU_"+ examQuery + "_" + groupQuery,
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
        // console.log({
        //     year: "114",
        //     school: "NCU",
        //     examNo: examQuery ,
        //     groupNo:  groupQuery,
        //     name: groupInfo.name,
        //     currentReserve: currentReserve,
        //     registered: registered,
        //     want: want
        // });


        await updateTable("group", {
            year: "114",
            school: "NCU",
            examNo: examQuery ,
            groupNo:  groupQuery
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
            return "尚未有遞補名額";
        } else if (status == "已報到") { //備取且已報到
            return rank;
        } else {
            return null;
        }
    }
}