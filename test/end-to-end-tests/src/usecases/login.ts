/*
Copyright 2022 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { strict as assert } from 'assert';

import { ElementSession } from "../session";

export async function login(
    session: ElementSession,
    username: string, password: string,
    homeserver: string,
): Promise<void> {
    session.log.startGroup("logs in");
    session.log.step("Navigates to login page");

    const navPromise = session.page.waitForNavigation();
    await session.goto(session.url('/#/login'));
    await navPromise;
    session.log.done();

    await session.page.screenshot({ path: (global as any).mxLogDir + "/login-01navigated.png" });

    // wait until no spinners visible
    await session.waitNoSpinner();

    await session.page.screenshot({ path: (global as any).mxLogDir + "/login-02waitfornospinner.png" });

    // ...and it's stil flakey, so add a sleep :(
    await session.page.waitForTimeout(200);

    await session.page.screenshot({ path: (global as any).mxLogDir + "/login-03waitfortimeout.png" });

    // change the homeserver by clicking the advanced section
    if (homeserver) {
        session.log.step("Clicks button to change homeserver");
        const changeButton = await session.query('.mx_ServerPicker_change');
        await changeButton.click();
        session.log.done();

        await session.page.screenshot({ path: (global as any).mxLogDir + "/login-04clickchangehs.png" });

        session.log.step("Enters homeserver");
        const hsInputField = await session.query('.mx_ServerPickerDialog_otherHomeserver');
        await session.replaceInputText(hsInputField, homeserver);
        session.log.done();

        await session.page.screenshot({ path: (global as any).mxLogDir + "/login-05enterhs.png" });

        session.log.step("Clicks next");
        const nextButton = await session.query('.mx_ServerPickerDialog_continue');
        // accept homeserver
        await nextButton.click();
        session.log.done();
    }
    // Delay required because of local race condition on macOs
    // Where the form is not query-able despite being present in the DOM
    await session.delay(100);

    session.log.step("Fills in login form");
    //fill out form
    const usernameField = await session.query("#mx_LoginForm_username");
    const passwordField = await session.query("#mx_LoginForm_password");
    await session.replaceInputText(usernameField, username);
    await session.replaceInputText(passwordField, password);
    session.log.done();
    //wait 300ms because Registration/ServerConfig have a 250ms
    //delay to internally set the homeserver url
    //see Registration::render and ServerConfig::props::delayTimeMs
    //await session.delay(300);
    /// focus on the button to make sure error validation
    /// has happened before checking the form is good to go
    session.log.step("Clicks login");
    const loginButton = await session.query('.mx_Login_submit');
    await loginButton.focus();
    //check no errors
    const errorText = await session.tryGetInnertext('.mx_Login_error');
    assert.strictEqual(errorText, null);
    //submit form
    //await page.screenshot({path: "beforesubmit.png", fullPage: true});
    await loginButton.click();
    session.log.done();

    const foundHomeUrl = await session.poll(async () => {
        const url = session.page.url();
        return url === session.url('/#/home');
    });
    assert(foundHomeUrl);
    session.log.endGroup();
}