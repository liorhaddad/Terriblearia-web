'use strict';
window.str = function str(x){return String(x)}
String.prototype.lower  = function lower (...args){return String.prototype.toLowerCase.apply(this, args)}
String.prototype.upper  = function upper (...args){return String.prototype.toUpperCase.apply(this, args)}
String.prototype.equals = function equals(...args){for (const arg of args) {if (String(arg) === String(this)) return true;} return false}
let pyodide;
const config = {
    "data": {},
}
if (typeof(Storage) !== "undefined")
{
    config["save"] = () => {window.localStorage.setItem("config", JSON.stringify(config.data))};
    config["load"] = () => {const data = window.localStorage.getItem("config"); config.data = (data === null ? {"settings": {"skipIntro": false}} : JSON.parse(data))};
    config["clear"] = () => {window.localStorage.removeItem("config")};
}
else
{
    config["save"] = () => {document.cookie = encodeURIComponent(window.btoa(encodeURIComponent(JSON.stringify(config.data))))};
    config["load"] = () => {config.data = (document.cookie === "" ? {"settings": {"skipIntro": false}} : JSON.parse(decodeURIComponent(window.atob(decodeURIComponent(document.cookie)))))};
    config["clear"] = () => {document.cookie = "|;expires=" + new Date().toUTCString();};
}
const sleep = async (ms) => new Promise(r => setTimeout(r, ms));
const rgb2hex = (rgb) => `#${rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/).slice(1).map(n => parseInt(n, 10).toString(16).padStart(2, '0')).join('')}`;
const invertHex = (hex) => '#'.concat((Number(`0x1${hex.slice(1).toUpperCase()}`) ^ 0xFFFFFF).toString(16).substr(1).toUpperCase());
const flattenTextForPrinting = (last, text, cursor = -1) => {
    let lines = text.split("\n");
    if (cursor < 0) cursor = lines[lines.length-1].length;
    lines = lines.map((line, index) => {
        let upd = last;
        last = "";
        for (let i = 0; i < line.length; i++)
        {
            switch (line[i])
            {
                case "\b":
                {
                    cursor--;
                    break;
                }
                case "\r":
                {
                    cursor = 0;
                    break;
                }
                default:
                {
                    upd = upd.substr(0, cursor) + line[i] + upd.substr(cursor + 1);
                    cursor++;
                    break;
                }
            }
        }
        if (index + 1 !== lines.length)
            cursor = 0;
        return upd;
    });
    return [lines.join("\n"), cursor];
};
const debugLog = (...args) => args.forEach(v=>{console.log(v); web_stdio.write(v + "\n");});

let settings = {
    "save": function saveSettings() {
        if ((typeof config.data.settings) !== "object") config.data.settings = {};
        config.data.settings.skipIntro = settings.skipIntro;
        config.data.settings.backgroundColor = settings.backgroundColor;
        config.data.settings.textColor = settings.textColor;
        config.save();

        setCSSVar("background", settings.backgroundColor);
        setCSSVar("text-color", settings.textColor);
        setCSSVar("text-color-inverted", invertHex(rgb2hex(window.getComputedStyle(document.documentElement).color)));
        setCSSVar("background-inverted", invertHex(rgb2hex(window.getComputedStyle(document.documentElement).backgroundColor)));
    },
    "load": function loadSettings() {
        settings.skipIntro = (config?.data?.settings?.skipIntro !== undefined ? config.data.settings.skipIntro : false);
        settings.backgroundColor = (config?.data?.settings?.backgroundColor !== undefined ? config.data.settings.backgroundColor : "#000000");
        settings.textColor = (config?.data?.settings?.textColor !== undefined ? config.data.settings.textColor : "#FFFFFF");

        setCSSVar("background", settings.backgroundColor);
        setCSSVar("text-color", settings.textColor);
        setCSSVar("text-color-inverted", invertHex(rgb2hex(window.getComputedStyle(document.documentElement).color)));
        setCSSVar("background-inverted", invertHex(rgb2hex(window.getComputedStyle(document.documentElement).backgroundColor)));
    }
}
let pyio = {
    "surpressNextOutputs": 0,
    "sendInput": _=>{},
    "needsInput": false,
    "inputHistory": [],
    "historyIndex": -1,
    "userInput": "",
    "getActiveText": function() {
        if (pyio.historyIndex === -2)
            return "";
        else if (pyio.historyIndex === -1)
            return pyio.userInput;
        return pyio.inputHistory[pyio.historyIndex];
    },
    "updateCursor": function(offset = 0) {
        const length = pyio.getActiveText().length;
        const cursor = pyio.cursor + offset;
        if (cursor > length)
            pyio.cursor = length;
        else if (cursor < 0)
            pyio.cursor = 0;
        else
            pyio.cursor = cursor;
    },
    "cursor": 0,
    "insertMode": false
}
let fields = {
    "input": {},
    "output": {},
    "pointers": {
        "swap": document.getElementById("swap"),
        "tempLoading": document.getElementById("tempLoading"),
        "tempOutputs": document.getElementById("tempOutputs"),
        "tempBody": document.getElementById("tempBody"),
        "inputBox": document.getElementById("tempBody").content.getElementById("inputBox"),
        "optionsPrompt": document.getElementById("tempBody").content.getElementById("optionsPrompt"),
        "output": document.getElementById("tempOutputs").content.getElementById("output"),
        "debugOutput": document.getElementById("tempOutputs").content.getElementById("debugOutput")
    }
}
let web_stdio = {
    write: (()=>{let textCursor = 0; return function write(s, color) {
        if (pyio.surpressNextOutputs > 0)
            pyio.surpressNextOutputs--;
        else
        {
            let scrollToBottom = (Math.abs(document.documentElement.scrollHeight - document.documentElement.scrollTop - document.documentElement.clientHeight) < 1);
            let leftover = "";
            if (fields.output.lastChild && fields.output.lastChild.nodeType === Node.ELEMENT_NODE && fields.output.lastChild.tagName.lower() === "span")
            {
                leftover = fields.output.lastChild.textContent;
                fields.output.lastChild.remove();
            }
            let text;
            [text, textCursor] = flattenTextForPrinting(leftover, s, textCursor);
            text = text.split('\n');
            if (gameExtender.mode === "game")
            {
                if (gameExtender.gameMode !== "paused" && s === "[Q] Return to menu")
                {
                    gameExtender.gameMode = "paused";
                    fields.output.appendChild(document.createTextNode("[O] Options"));
                    fields.output.appendChild(document.createElement('br'));
                }
                else if (gameExtender.gameMode === "paused" && s.startsWith("[!] Returned to"))
                {
                    gameExtender.gameMode = "active";
                }
                if (s === "Oops, looks like you've found a bug.")
                {
                    gameExtender.gameMode = "crash";
                }
            }
            for (let i = 0; i < text.length; i++)
            {
                if (text[i] !== "")
                {
                    let textNode = document.createElement("span");
                    textNode.innerText = text[i];
                    if (color !== (void 0))
                    {
                        textNode.style.color = color;
                    }
                    fields.output.appendChild(textNode);
                }
                if (i + 1 !== text.length)
                    fields.output.appendChild(document.createElement('br'));
            }
            if (scrollToBottom)
                scrollTo(scrollX, document.documentElement.scrollHeight);
        }
    }})(),
    read: async function read() {
        return new Promise(resolve => pyio.sendInput = resolve);
    },
    readline: async function readline() {
        return new Promise(resolve => pyio.sendInput = (s => resolve(s.concat("\n"))));
    }
}
let gameExtender = {
    "mode": "game",
    "gameMode": "active",
    "toggleOptions": async function toggleOptions(simple = false) {
        fields.pointers.optionsPrompt.hidden = !fields.pointers.optionsPrompt.hidden;
        if (gameExtender.mode.startsWith("options:"))
        {
            if (!simple)
            {
                const rootNode = fields.pointers.optionsPrompt.getRootNode();
                settings.skipIntro = rootNode.getElementById("settingSkipIntro").checked;
                settings.backgroundColor = rootNode.getElementById("settingBackgroundColor").value;
                settings.textColor = rootNode.getElementById("settingTextColor").value;

                settings.save();
            }
            gameExtender.mode = gameExtender.mode.substr("options:".length);
            if (!pyio.needsInput)
            {
                pyio.surpressNextOutputs += 3;
                pyio.sendInput("web::onReturnFromOptions");
            }
        }
        else
        {
            if (!simple)
            {
                const rootNode = fields.pointers.optionsPrompt.getRootNode();
                settings.load();

                rootNode.getElementById("settingSkipIntro").checked = settings.skipIntro;
                rootNode.getElementById("settingBackgroundColor").value = settings.backgroundColor;
                rootNode.getElementById("settingTextColor").value = settings.textColor;
            }
            gameExtender.mode = "options:".concat(gameExtender.mode);
        }
    }
}
function setCSSVar(what, value)
{
    // this function sucks
    document.documentElement.style.setProperty("--".concat(what), value);
}
function updateInputBox()
{
    pyio.updateCursor();
    const fullText = pyio.getActiveText();
    const lowText = fullText.slice(0, pyio.cursor);
    const highText = fullText.slice(pyio.cursor);
    fields.input.innerHTML = "";
    fields.input.appendChild(document.createTextNode(lowText));
    const cursor = document.createElement("span");
    cursor.innerText = '_';
    cursor.id = "cursor";
    setCSSVar("cursor-height", (pyio.insertMode ? "0.7" : "0.4").concat("em"));
    fields.input.appendChild(cursor);
    fields.input.appendChild(document.createTextNode(highText));
}
function trySubmitInput()
{
    if (pyio.needsInput)
    {
        const input = pyio.getActiveText();
        pyio.userInput = "";
        pyio.cursor = 0;
        pyio.needsInput = false;
        if (pyio.inputHistory[0] !== input)
            pyio.inputHistory.unshift(input);
        pyio.historyIndex = -1;
        updateInputBox();
        web_stdio.write(input.concat('\n'));
        if (gameExtender.gameMode === "paused" && input.toLowerCase() === "o")
        {
            gameExtender.toggleOptions();
        }
        else if ((gameExtender.gameMode === "paused" || gameExtender.mode === "debug") && input.toLowerCase() === "!debug")
        {
            const swapFrom = fields.pointers[gameExtender.mode === "debug" ? "debugOutput" : "output"];
            const swapTo = fields.pointers[gameExtender.mode === "debug" ? "output" : "debugOutput"];
            fields.pointers.tempOutputs.appendChild(swapFrom);
            fields.input.parentElement.insertBefore(swapTo, fields.input);
            scrollTo(scrollX, document.documentElement.scrollHeight);
            fields.output = swapTo;
            pyodide.runPython("resumer, __resumer = __resumer, resumer\nrun, __run = __run, run\n");
            gameExtender.mode = (gameExtender.mode === "game" ? "debug" : "game");
            if (!pyio.needsInput)
            {
                pyio.surpressNextOutputs += 3;
                pyio.sendInput("web::toggleDebugMode");
            }
            pyio.needsInput = true;
        }
        else
        {
            pyio.surpressNextOutputs++;
            pyio.sendInput(input);
        }
    }
}
function handleUserKey(e)
{
    const mren = (function mren(o, key, badval){if (Object.prototype.hasOwnProperty.call(o, key + "")) return o[key + ""]; else return badval;});
    let key = e.key;
    if (key.toLowerCase() === "d" && e.shiftKey && e.altKey && gameExtender.mode.equals("game", "debug"))
    {
        e.preventDefault();
        const swapFrom = fields.pointers[gameExtender.mode === "debug" ? "debugOutput" : "output"];
        const swapTo = fields.pointers[gameExtender.mode === "debug" ? "output" : "debugOutput"];
        fields.pointers.tempOutputs.appendChild(swapFrom);
        fields.input.parentElement.insertBefore(swapTo, fields.input);
        scrollTo(scrollX, document.documentElement.scrollHeight);
        fields.output = swapTo;
        pyodide.runPython("resumer, __resumer = __resumer, resumer\nrun, __run = __run, run\n");
        gameExtender.mode = (gameExtender.mode === "game" ? "debug" : "game");
        pyio.needsInput = true;
        return;
    }
    if (key.toLowerCase() === "o" && e.ctrlKey)
    {
        e.preventDefault();
        gameExtender.toggleOptions();
        return;
    }
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (key.startsWith("Arrow") || key === " ") e.preventDefault();
    if (gameExtender.mode.startsWith("options:")) return;

    if (gameExtender.mode === "debug" && e.shiftKey && key === "Enter")
        key = "\n"
    else
        key = mren({"\r": "", "\n": "Enter", "Tab": "\t"}, key, key);
    switch (key)
    {
        case "Enter":
        {
            trySubmitInput();
            break;
        }
        case "ArrowUp":
        {
            if (pyio.historyIndex < pyio.inputHistory.length - 1)
            {
                pyio.historyIndex++;
                pyio.cursor = pyio.getActiveText().length;
            }
            else
                pyio.historyIndex = pyio.inputHistory.length - 1;
            break;
        }
        case "ArrowDown":
        {
            if (pyio.historyIndex > -2)
            {
                pyio.historyIndex--;
                pyio.cursor = pyio.getActiveText().length;
            }
            else
                pyio.historyIndex = -2;
            break;
        }
        case "ArrowLeft":
        {
            pyio.updateCursor(-1);
            break;
        }
        case "ArrowRight":
        {
            pyio.updateCursor(1);
            break;
        }
        case "Home":
        {
            pyio.cursor = 0;
            break;
        }
        case "End":
        {
            pyio.cursor = pyio.getActiveText().length;
            break;
        }
        case "Insert":
        {
            pyio.insertMode = !pyio.insertMode;
            break;
        }
        case "Delete":
        {
            pyio.userInput = pyio.getActiveText();
            pyio.historyIndex = -1;
            pyio.userInput = pyio.userInput.substring(0, pyio.cursor) + pyio.userInput.substring(pyio.cursor + 1);
            pyio.updateCursor(0);
            break;
        }
        case "Backspace":
        {
            pyio.userInput = pyio.getActiveText();
            pyio.historyIndex = -1;
            pyio.userInput = pyio.userInput.substring(0, pyio.cursor - 1) + pyio.userInput.substring(pyio.cursor);
            pyio.updateCursor(-1);
            break;
        }
        default:
        {
            if (key.length === 1)
            {
                e.preventDefault();
                pyio.userInput = pyio.getActiveText();
                pyio.historyIndex = -1;
                pyio.userInput = pyio.userInput.substring(0, pyio.cursor) + key + pyio.userInput.substring(pyio.cursor + (pyio.insertMode ? 1 : 0));
                pyio.updateCursor(1);
            }
            break;
        }
    }
    updateInputBox();
}
async function handlePaste(e)
{
    if (gameExtender.mode.startsWith("options:")) return;
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData).getData('text');
    if (paste.length > 0)
    {
        if (gameExtender.mode === "debug")
        {
            pyio.userInput = pyio.getActiveText();
            pyio.historyIndex = -1;
            pyio.userInput = pyio.userInput.substring(0, pyio.cursor) + paste + pyio.userInput.substring(pyio.cursor + (pyio.insertMode ? paste.length : 0));
            pyio.updateCursor(paste.length);
        }
        else
        {
            for (const c of paste.replaceAll("\r", ""))
            {
                while(!pyio.needsInput) await sleep(0);
                const key = (c === "\n" ? "Enter" : c);
                const keyEvent = new KeyboardEvent("", {"key": key});
                handleUserKey(keyEvent);
            }
        }
    }
    updateInputBox();
}
async function handleMobile(e)
{
    let mobileInput = document.getElementById("mobileInput");
    if (mobileInput === null)
    {
        document.documentElement.removeEventListener('paste',      handlePaste);
        document.documentElement.removeEventListener('keydown',    handleUserKey);
        mobileInput = document.createElement("input");
        mobileInput.type = "text";
        mobileInput.id = "mobileInput";
        mobileInput.addEventListener("keyup", function keyup(e) {
            if (e.key === "Enter")
            {
                e.preventDefault();
                pyio.userInput = mobileInput.value;
                mobileInput.value = "";
                trySubmitInput();
                mobileInput = document.createElement("input");
                mobileInput.type = "text";
                mobileInput.id = "mobileInput";
                mobileInput.addEventListener("keyup", keyup);
                document.getElementById("cursor")?.replaceWith(mobileInput);
                scrollBy(0, window.innerHeight * 2);
            }
        });
        document.getElementById("cursor")?.replaceWith(mobileInput);
    }
    mobileInput.focus();
    for (let i = 0; i < 5; i++)
    {
        await sleep(100);
        mobileInput.focus();
    }
}
async function main()
{
    // Load data
    config.load();
    settings.load();

    {
        const log = console.log;
        console.log = (...args)=>{
            const e = document.getElementById("loadingProgress");
            const v = e.getAttribute.bind(e);
            const int = Number;
            e.setAttribute("value", int(v("value")) + 1);
            e.style.setProperty("background", `linear-gradient(to right, ${v("color").toString()} ${(int(v("value")) / int(v("max"))) * 7.5}em, white 0%)`);
            log.apply(this, [("[" + v("value") + "/" + v("max") + "]"), ...args]);
        };
        // Load pyodide
        pyodide = await loadPyodide({
          indexURL : "./pyodide/",
          fullStdLib : true
        });
    
        // Load terrible-aria
        pyodide.FS.mkdirTree("/Users/web_user/Documents/Terrible-aria/");
        pyodide.FS.mount(pyodide.FS.filesystems.IDBFS, {}, "/Users/web_user/Documents/Terrible-aria/");
        pyodide.FS.syncfs(true, function(err){if (err !== null) window.alert("Error loading files: " + (err + '') + "\nPlease exit the page.")});
        pyodide.FS.chdir("/Users/web_user/Documents/Terrible-aria/");
        const terriblearia = (await (await fetch("https://raw.githubusercontent.com/MacroPixel/terrible-aria/main/terriblearia.py")).text()).split('\n').slice(0, -2).join('\n');
        const override_io = await (await fetch("./override_io.py")).text();
        const debugger_py = await (await fetch("./debugger.py")).text();
        pyodide.runPython(terriblearia, pyodide.globals);
        // Set up custom stuff for python interactions
        await pyodide.loadPackage("unthrow")
        await pyodide.registerJsModule("web_stdio", web_stdio);
        await pyodide.runPythonAsync(override_io, pyodide.globals);
        await pyodide.runPythonAsync(debugger_py, pyodide.globals);

        console.log = log;
    }

    // Do some HTML stuff
    fields.pointers.tempLoading.content.replaceChildren(...document.body.children);
    document.body.replaceChildren(...fields.pointers.tempBody.content.children);
    document.body.insertBefore(fields.pointers.output, fields.pointers.inputBox);
    fields.input = fields.pointers.inputBox;
    fields.output = fields.pointers.output;
    updateInputBox();

    // Set CSS variables
    setCSSVar("font", "monospace");
    setCSSVar("cursor-height", "0.4em");

    // Run!
    if (!settings.skipIntro)
    {
        for (const i of [
        [[""], 1000],
        ["python", 50], [[""], 50],
        [" ", 150],
        ["terriblearia.py", 50], [[""], 250],
        ["\n", 0]])
        for (const ch of i[0]) {web_stdio.write(ch); await sleep(i[1]);}
    }
    else
    {
        web_stdio.write("python terriblearia.py\n");
    }
    document.documentElement.addEventListener('keydown', handleUserKey);
    document.documentElement.addEventListener('paste', handlePaste);
    document.documentElement.addEventListener('touchend', handleMobile);
    pyodide.run = function resumeMain()
    {
        if (!pyodide.runPython(`resumer.finished`) || gameExtender.mode === "debug")
        {
            pyodide.pyodide_py.eval_code(`resumer.run_once(run, [])`, pyodide.globals);
            if (pyodide.runPython(`resumer.finished`))
            {
                setTimeout(resumeMain, 0);
            }
            else
            {
                let request = pyodide.runPython("resumer.resume_params");
                if (typeof request === "undefined") request = {};
                if (request.toJs) request = Object.fromEntries(request.toJs());
                if (request.cmd === "readline")
                {
                    pyodide.FS.syncfs(false, function(err){if (err !== null) window.alert("Error saving files: " + (err + ''))});
                    pyio.needsInput = true;
                    pyio.sendInput = function(inp){pyodide.globals.set("g_user_input", inp); setTimeout(resumeMain, 0);}
                }
                else if (request.cmd === "sleep")
                {
                    setTimeout(resumeMain, request.time);
                }
                else if (request.cmd === "flush")
                {
                    setTimeout(resumeMain, 0);
                }
            }
        }
        else
        {
            pyio.surpressNextOutputs = 0;
            web_stdio.write("C:".concat(pyodide.FS.cwd().replaceAll("/", "\\")).concat(">"));
            gameExtender.gameMode = "exit";
        }
    }
    window.setTimeout(pyodide.run, 0);
}
