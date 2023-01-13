// import * as NCKU from './NCKURegisterProcess.js';
import * as NYCU from './NYCURegisterProcess.js';
import 'fetch-mock-jest';

jest.mock(
    'node-fetch',
    () => require('fetch-mock-jest').sandbox(),
);


//Reference:https://mealiy62307.medium.com/node-js-node-js-%E7%88%AC%E8%9F%B2%E8%88%87-line-bot-b94356fcd59d
beforeAll(async() => {
    return await init();
}, 1800000); //10 min = 30*60*1000

async function init() {
    await NYCU.init()
        // await NCKU.init();
}

describe('NYCU test', function() {
    test('getReserveProcess NYCU - 102A_0300 生化暨分子生物研究所', async function() {
        expect(await NYCU.getReserveProcess("102A_0300")).toBe({
            reserveProcess: '備取11',
            want: 16,
            registered: 11
        });
    })
})