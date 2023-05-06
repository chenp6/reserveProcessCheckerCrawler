import puppeteer, { TimeoutError } from 'puppeteer';

export async function newPage(headless) {
    const browser = await puppeteer.launch({ headless: headless }); // 啟動瀏覽器，headless 設定為 false 可以看到瀏覽器運作的情況，true 為無頭瀏覽器
    const page = await browser.newPage();
    return page;
}

export class NYCUPageManager {

    constructor(page) {
        this.page = page;
    }

    async selectExamType(examCode) {
        const typeSelector = 'select#ddlExamType';

        //已被選擇，則不用再select
        const selectedValue = await this.page.$eval(typeSelector + " option[selected='selected']", element => element.getAttribute("value"))
        if (selectedValue == examCode) return;

        await this.page.select(typeSelector, examCode); // 按下按鈕
        try {
            await this.page.waitForNavigation();
        } catch (e) {
            if (e instanceof TimeoutError) {
                await this.page.reload();
            }
        }
    }

    async selectExamList(deptNo) {
        const typeSelector = 'select#ddlExamList';

        //已被選擇，則不用再select
        const selectedValue = await this.page.$eval(typeSelector + " option[selected='selected']", element => element.getAttribute("value"))
        if (selectedValue == deptNo) return;

        await this.page.select(typeSelector, deptNo); // 按下按鈕
        try {
            await this.page.waitForNavigation();
        } catch (e) {
            if (e instanceof TimeoutError) {
                await this.page.reload();
            }
        }
    }


}


export class NKNUPageManager {

    constructor(page) {
        this.page = page;
    }

    async selectExamSystem(systemValue) {
        const typeSelector = 'select#ctl00_phMain_uSystem';

        //已被選擇，則不用再select
        const selectedValue = await this.page.$eval(typeSelector + " option[selected='selected']", element => element.getAttribute("value"))
        if (selectedValue == systemValue) return;

        await this.page.select(typeSelector, systemValue); // 按下按鈕
        try {
            await this.page.waitForNavigation();
        } catch (e) {
            if (e instanceof TimeoutError) {
                await this.page.reload();
            }
        }
    }

    async selectExamType(typeValue) {
        const typeSelector = 'select#ctl00_phMain_uType';

        //已被選擇，則不用再select
        const selectedValue = await this.page.$eval(typeSelector + " option[selected='selected']", element => element.getAttribute("value"))
        if (selectedValue == typeValue) return;

        await this.page.select(typeSelector, typeValue); // 按下按鈕
        try {
            await this.page.waitForNavigation();
        } catch (e) {
            if (e instanceof TimeoutError) {
                await this.page.reload();
            }
        }
    }

    async selectExamList(groupVal) {
        const typeSelector = 'select#ctl00_phMain_uProgram';

        //已被選擇，則不用再select
        const selectedValue = await this.page.$eval(typeSelector + " option[selected='selected']", element => element.getAttribute("value"))
        if (selectedValue == groupVal) return;

        await this.page.select(typeSelector, groupVal); // 按下按鈕
        try {
            await this.page.waitForNavigation();
        } catch (e) {
            if (e instanceof TimeoutError) {
                await this.page.reload();
            }
        }
    }


}



export async function navigateToPage(page, url) {
    await page.goto(url);
}