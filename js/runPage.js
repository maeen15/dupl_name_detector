const chromeLauncher = require('chrome-launcher');
const CDP = require('chrome-remote-interface');
const file = require('fs');

(async function() {

  let script, reportValue, currentURL, navigate;

  module.exports = {

    testPage: (url, scr, cb)=>{
      reportValue = cb;
      script = scr;
      if (navigate) navigate(url)
      else currentURL = url;
    },

    close: ()=>{
      protocol.close();
      chrome.kill(); 
    }
  }

  async function launchChrome() {
    return await chromeLauncher.launch({
      chromeFlags: [
        '--disable-gpu',
        '--headless'
      ]
    });
  }

  const chrome = await launchChrome();
  const protocol = await CDP({
    port: chrome.port
  });

  const {
        DOM,
        CSS,
        Page,
        Emulation,
        Runtime
        } = protocol;

  await Promise.all([Page.enable(), Runtime.enable(), DOM.enable(),  CSS.enable()]);

  //console.log('DOM', CSS);

  CSS.styleSheetAdded(res => {

    console.log('css added', res.header.styleSheetId, res.header.sourceURL);

  });

  Page.loadEventFired(async() => {
    //const script1 = script || "window.getValuesCollected();";
    //const script2 = "window.document.title;";
    // Evaluate script1
    //const result = await Runtime.evaluate({
      //expression: script2
    //});

    const doc = await DOM.getDocument({depth: -1});

    console.log('page loaded:', doc.root.documentURL); //, doc.root);

    try {
      const {data} = await Page.captureScreenshot();
      file.writeFileSync('public/page.png', Buffer.from(data, 'base64'));  
    }
    catch(e){console.log('capture error', e); }

    //reportValue(result.result); //.result.value);

    //protocol.close();
    //chrome.kill(); 
  });

  Runtime.consoleAPICalled(async( param ) => {

    console.log('param', param.args[0] ? param.args[0].value : 'console error');

    if (param.args[0] && param.args[0].value === 'app started'){
    
          const script1 = "window.getValuesCollected();";

          if (script === 'get css') {

            let buffer = { styleSheets: new Set(), IDs: new Map() };
            const doc = await DOM.getDocument({depth: -1});

            traverseDOM(doc.root, '', buffer).then( res => {

              setTimeout(() => {

                buffer.styleSheets = Array.from(buffer.styleSheets);
                buffer.IDs = Array.from(buffer.IDs);

                file.writeFileSync('public/css.json', JSON.stringify(buffer));

                /*console.log('Requesting Style sheet', buffer.styleSheets);

                CSS.getStyleSheetText({styleSheetId: buffer.styleSheets[Object.keys(buffer.styleSheets)[0]] }).then( res => {
                  console.log('Style sheet', res);
                })*/
                reportValue(buffer); 

              }, 1000)
              
            });

          }

          else {
          
            // Evaluate script1
            const result = await Runtime.evaluate({
              expression: script || script1
            });

      
            reportValue(result.result); 
          }
        }
     else {
        reportValue('error');
     }     
  });


  navigate = url => {
    if (!url && !currentURL) return;
    currentURL = url || currentURL;

    if (Page) Page.navigate({
      url: 'http://localhost:3000/' + currentURL
    });
  }

  navigate();

  function traverseDOM(root, path, buffer){
    //console.log(root.nodeId, path, root);

    return new Promise((resolve,reject) => {

      let delayed = [];

      if (root.childNodeCount)
        for(let i=0; i<root.children.length; i++){

          if (root.children[i].nodeType === 1)
            delayed.push[traverseDOM(root.children[i], path + '-' + root.nodeName, buffer)];
        }

      Promise
        .all(delayed)
        .then(res => {
          if (root.nodeName === '#document') {
            console.log('#document skip')
            setTimeout(resolve)
            //resolve();
          }
          else
          {
            
            let id = root.attributes.indexOf('id');

            if (id > -1 && root.attributes[id +1]) id = root.attributes[id +1];
            else id = null;

            //console.log('id', id);

            if (id) {
              let obj = buffer.IDs.get(id);

              if (!obj) buffer.IDs.set(id, 1);
              else buffer.IDs.set(id, obj + 1);
            }

            CSS.getMatchedStylesForNode({nodeId: root.nodeId})
             .then( rules => {
                console.log('res of', root.nodeId, path, root.nodeName)
                
                CSS.getComputedStyleForNode({nodeId: root.nodeId})
                  .then( res => {
                    //console.log('res of', root.nodeId, path, root.nodeName, res.length)

                    if (rules.inlineStyle.cssProperties.length || 
                        rules.matchedCSSRules.some( r => {

                          return r.rule.origin !== 'user-agent'
                        }))
                    {

                      rules.matchedCSSRules.forEach( r => {

                          if (r.rule.styleSheetId) 
                            buffer.styleSheets.add(r.rule.styleSheetId)
                        })

                      buffer[root.nodeId] = {
                        matched: rules,
                        nodeName: root.nodeName,
                        path: path,
                        computed: res.computedStyle
                      };
                    }

                    resolve()
                  })
                  .catch( err => {
                    console.log('error at', root.nodeName, root.nodeId, err );
                    reject(root.nodeName)
                  })
              })
             .catch( err => {
                console.log('error at', root.nodeName, root.nodeId, err );
                reject(root.nodeName)
              })
           }
        })
        .catch( err => {
          //console.log('error at', root.nodeName, err );
          //reject(root.nodeName)
        });
    });  
      
  }

})();