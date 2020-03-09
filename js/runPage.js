const chromeLauncher = require('chrome-launcher');
const CDP = require('chrome-remote-interface');
const path = require('path');
const file = require('fs');

const {
    publicFolder
} = require("./globals.js");

const defaultScript = "window.getValuesCollected();";
const waitTimeout = 10000;

async function launchChrome() {
    return await chromeLauncher.launch({
        chromeFlags: [
            '--disable-gpu',
            '--headless'
        ]
    });
}

let chrome, protocol, launching, busy, currentScript, currentCallback;

function close() {
    if (protocol){
        protocol.close();
        protocol = null;
        chrome.kill();
        chrome = null;
    }
}

async function consoleCommandHandle(param) {
    let {Runtime} = protocol,
        callback = currentCallback;

    console.log('browser console:', param.args[0] ? param.args[0].value : 'console error');

    if (param.args[0] && param.args[0].value === 'app started')
    {
        if (currentScript === 'get css')
        {
            let buffer = {styleSheets: new Set(), IDs: new Map()};
            const doc = await DOM.getDocument({depth: -1});

            traverseDOM(doc.root, '', buffer).then(res => {
                setTimeout(() => {

                    buffer.styleSheets = Array.from(buffer.styleSheets);
                    buffer.IDs = Array.from(buffer.IDs);

                    file.writeFileSync(path.join(publicFolder, 'css.json'), JSON.stringify(buffer));

                    /*console.log('Requesting Style sheet', buffer.styleSheets);
                    CSS.getStyleSheetText({styleSheetId: buffer.styleSheets[Object.keys(buffer.styleSheets)[0]] }).then( res => {
                      console.log('Style sheet', res);
                    })*/
                    callback(buffer);

                }, 1000);
            });
        }
        else
        {
            console.log('evaluation', currentScript || defaultScript);
            // Evaluate script1
            const result = await Runtime.evaluate({
                expression: currentScript || defaultScript
            });

            callback(result.result);
        }
    }
    // else
    //     callback('error');
}

async function open(script = '', callback = () => {}) {

    currentScript = script;
    currentCallback = callback;

    if (chrome) return {protocol, chrome};
    if (launching) return {};

    launching = true;
    chrome = await launchChrome();
    protocol = await CDP({
        port: chrome.port
    });

    const {
        DOM,
        CSS,
        Page,
        Runtime
    } = protocol;

    await Promise.all([Page.enable(), Runtime.enable(), DOM.enable(), CSS.enable()]);
    launching = false;

    Runtime.consoleAPICalled(consoleCommandHandle);

    return {protocol, chrome};
}

async function testPage(url, script) {
    return new Promise(async resolve => {
        wait = setTimeout(() => {
            wait = null;
            currentScript = null;
            currentCallback = null;
            resolve('timeout error');
        }, waitTimeout);

        await open(script, res => {
            currentScript = null;
            currentCallback = null;
            if (wait)
            {
                clearTimeout(wait);
                wait = null;
                resolve(res);
            }
        });

        const {Page} = protocol;
        Page.navigate({
            url: 'http://localhost:3000/' + url
        });
    });
}

function traverseDOM(root, path, buffer) {
    return new Promise(async (resolve, reject) => {
        let delayed = [];

        if (root.childNodeCount)
            for (let i = 0; i < root.children.length; i++)
                if (root.children[i].nodeType === 1)
                    delayed.push[traverseDOM(root.children[i], path + '-' + root.nodeName, buffer)];

        try {
            await Promise.all(delayed);

            if (root.nodeName === '#document')
            {
                console.log('#document skip');
                setTimeout(resolve);
            }
            else
            {
                let id = root.attributes.indexOf('id');

                if (id > -1 && root.attributes[id + 1])
                    id = root.attributes[id + 1];
                else
                    id = null;

                if (id)
                {
                    let obj = buffer.IDs.get(id);

                    if (obj)
                        buffer.IDs.set(id, obj + 1);
                    else
                        buffer.IDs.set(id, 1);
                }

                let rules = await CSS.getMatchedStylesForNode({nodeId: root.nodeId});
                let res = await CSS.getComputedStyleForNode({nodeId: root.nodeId});

                if (rules.inlineStyle.cssProperties.length ||
                    rules.matchedCSSRules.some(r => {

                        return r.rule.origin !== 'user-agent';
                    }))
                {
                    rules.matchedCSSRules.forEach(r => {
                        if (r.rule.styleSheetId)
                            buffer.styleSheets.add(r.rule.styleSheetId);
                    });

                    buffer[root.nodeId] = {
                        matched: rules,
                        nodeName: root.nodeName,
                        path: path,
                        computed: res.computedStyle
                    };
                }

                resolve();
            }
        } catch (err)
        {
            console.log('error at', root.nodeName, root.nodeId, err);
            reject(root.nodeName);
        }
    });

}

module.exports = {
    testPage,
    open,
    close
};
