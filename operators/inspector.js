//todo: putter mode for inspector
polymorph_core.registerOperator("inspector", {
    displayName: "Inspector",
    description: "Inspect all properties of a given element."
}, function (container) {
    let me = this;
    me.container = container;
    me.settings = {
        operationMode: "focus",
        currentItem: "",
        globalEnabled: false,// whether or not it's enabled globally
    };
    me.rootdiv = document.createElement("div");
    me.rootdiv.style.overflow = "auto";
    me.rootdiv.style.height = "100%";
    me.rootdiv.style.color = "white";
    let ttypes = `<select data-role="nttype">
    <option>Auto</option>
    <option>Text</option>
    <option>Date</option>
    </select>`;
    me.rootdiv.appendChild(htmlwrap(`
    <h3>Item: <span class="itemID"></span></h3>
    <div></div>
        <h4>Add a property:</h4>
        <input type="text" placeholder="Name">
        <label>Type:${ttypes}</label>
        <button class="ap">Add property</button>
    `));
    me.internal = me.rootdiv.children[0].children[1];


    let insertbtn = htmlwrap(`
    <button>Add new item</button>`);
    me.rootdiv.appendChild(insertbtn);
    insertbtn.style.display = "none";
    insertbtn.addEventListener("click", () => {
        //create a new element with the stated specs
        let item = {};
        for (let i = 0; i < me.internal.children.length; i++) {
            item[me.internal.children[i].dataset.role] = me.internal.children[i].querySelector("input").value;
        }
        let id = polymorph_core.insertItem(item)
        container.fire("updateItem", { id: id });
        me.settings.currentItem = undefined;
        //clear modified class on item
        for (let i = 0; i < me.internal.children.length; i++) {
            me.internal.children[i].classList.remove("modified");
        }
    })


    let commitbtn = htmlwrap(`
    <button>Commit changes</button>`);
    me.rootdiv.appendChild(commitbtn);
    commitbtn.style.display = "none";
    commitbtn.addEventListener("click", () => {
        //commit changes
        if (me.settings.currentItem) {
            let item = polymorph_core.items[me.settings.currentItem];
            for (let i = 0; i < me.internal.children.length; i++) {
                item[me.internal.children[i].dataset.role] = me.internal.children[i].querySelector("input").value;
            }
            container.fire("updateItem", { id: me.settings.currentItem });
            //clear modified class on item
            for (let i = 0; i < me.internal.children.length; i++) {
                me.internal.children[i].classList.remove("modified");
            }
        }
    })
    /*let clearBtn=htmlwrap(`
    <button>Clear fields</button>`);
    me.rootdiv.appendChild(clearBtn);
    insertbtn.addEventListener("click",()=>{
        //create a new element with the stated specs
    })*/
    let newProp = (prop) => {
        if (me.settings.currentItem) polymorph_core.items[me.settings.currentItem][prop] = " ";
        if (me.settings.propsOn) me.settings.propsOn[prop] = me.rootdiv.querySelector("[data-role='nttype']").value;
        me.renderItem(me.settings.currentItem);
        container.fire("updateItem", {
            sender: me,
            id: me.settings.currentItem
        });
    }
    me.rootdiv.querySelector("input[placeholder='Name']").addEventListener("keyup", (e) => {
        if (e.key == "Enter") {
            newProp(e.target.value);
            e.target.value = "";
        }
    })
    me.rootdiv.querySelector(".ap").addEventListener("click", (e) => {
        newProp(me.rootdiv.querySelector("input[placeholder='Name']").value);
        me.rootdiv.querySelector("input[placeholder='Name']").value = "";
    })

    container.div.appendChild(htmlwrap(
        `
        <style>
        h4{
            margin:0;
        }
        .modified input{
            background: lightblue;
        }
        </style>
    `
    ));
    container.div.appendChild(me.rootdiv);

    ///////////////////////////////////////////////////////////////////////////////////////
    //Actual editing the item
    let upc = new capacitor(300, 40, (id) => {
        container.fire("updateItem", {
            id: id,
            sender: me
        });
    })

    me.internal.addEventListener("input", (e) => {
        //change this to invalidate instead of directly edit?
        if (me.settings.commitChanges) {
            e.target.parentElement.classList.add("modified");
        } else if (me.settings.currentItem) {
            let it = polymorph_core.items[me.settings.currentItem];
            let i = e.target.parentElement.dataset.role;
            switch (e.target.parentElement.dataset.type) {
                case 'Text':
                    it[i] = e.target.value;
                    upc.submit(me.settings.currentItem);
                    break;
                case 'Date':
                    if (!it[i]) it[i] = {};
                    if (typeof it[i] == "string") it[i] = {
                        datestring: it[i]
                    };
                    it[i].datestring = e.target.value;
                    if (me.datereparse) me.datereparse(it, i);
                    break;
                case 'Auto':
                    it[i] = e.target.value;
                    upc.submit(me.settings.currentItem);
                    break;
            }
        }
    })

    scriptassert([
        ['dateparser', 'genui/dateparser.js']
    ], () => {
        me.datereparse = function (it, i) {
            it[i].date = dateParser.richExtractTime(it[i].datestring);
            if (!it[i].date.length) it[i].date = undefined;
            container.fire("dateUpdate");
        }
    });

    scriptassert([
        ["contextmenu", "genui/contextMenu.js"]
    ], () => {
        let ctm = new _contextMenuManager(container.div);
        let contextedItem;
        let menu;

        function filter(e) {
            contextedItem = e.target;
            return true;
        }
        menu = ctm.registerContextMenu(`<li class="fixed">Convert to fixed date</li>`, me.rootdiv, "[data-type='Date'] input", filter)
        menu.querySelector(".fixed").addEventListener("click", function (e) {
            if (!polymorph_core.items[me.settings.currentItem][contextedItem.parentElement.dataset.role].date) me.datereparse(polymorph_core.items[me.settings.currentItem], contextedItem.parentElement.dataset.role);
            contextedItem.value = new Date(polymorph_core.items[me.settings.currentItem][contextedItem.parentElement.dataset.role].date[0].date).toLocaleString();
            polymorph_core.items[me.settings.currentItem][contextedItem.parentElement.dataset.role].datestring = contextedItem.value;
            me.datereparse(polymorph_core.items[me.settings.currentItem], contextedItem.parentElement.dataset.role);
            menu.style.display = "none";
        })
    })

    //render an item on focus or on settings update.
    //must be able to handle null and "" in id
    //also should be able to update instead of just rendering
    function recursiveRender(obj, div) {
        if (typeof obj == "object" && obj) {
            for (let j = 0; j < div.children.length; j++) div.children[j].dataset.used = "false";
            for (let i in obj) {
                let d;
                for (let j = 0; j < div.children.length; j++) {
                    if (div.children[j].matches(`[data-prop="${i}"]`)) {
                        d = div.children[j];
                    }
                }
                if (!d) d = htmlwrap(`<div style="border-top: 1px solid black"><span>${i}</span><div></div></div>`);
                d.dataset.prop = i;
                d.dataset.used = "true";
                d.style.marginLeft = "5px";
                recursiveRender(obj[i], d.children[1]);
                div.appendChild(d);
            }
            for (let j = 0; j < div.children.length; j++) {
                if (div.children[j].dataset.used == "false" && (div.children[j].tagName == "DIV" || div.children[j].tagName == "BUTTON")) {
                    div.children[j].remove();
                }
            }
            div.appendChild(htmlwrap(`<button>Add property...</button>`));
        } else {
            let i;
            if (div.children[0] && div.children[0].tagName == "INPUT") {
                i = div.children[0];
            } else {
                while (div.children.length) div.children[0].remove();
            }
            if (!i) i = document.createElement("input");
            i.value = obj;
            div.appendChild(i);
        }
    }

    me.renderItem = function (id, soft = false) {
        me.rootdiv.querySelector(".itemID").innerText = id;
        if (!soft) me.internal.innerHTML = "";
        //create a bunch of textareas for each different field.
        //invalidate old ones
        for (let i = 0; i < me.internal.children.length; i++) {
            me.internal.children[i].dataset.invalid = 1;
        }
        let clean_obj = {};
        if (polymorph_core.items[id]) {
            //clean the object
            clean_obj = JSON.parse(JSON.stringify(polymorph_core.items[id]));
        }
        for (let i in me.settings.propsOn) {
            if (me.settings.propsOn[i] && (clean_obj[i] || me.settings.showNonexistent)) {
                let pdiv = me.internal.querySelector("[data-role='" + i + "']");
                //create or change type if necessary
                if (!pdiv || pdiv.dataset.type != me.settings.propsOn[i]) {
                    //regenerate it 
                    if (pdiv) pdiv.remove();
                    pdiv = document.createElement("div");
                    pdiv.dataset.role = i;
                    pdiv.dataset.type = me.settings.propsOn[i];
                    let ihtml = `<h4>` + i + `</h4>`;
                    switch (me.settings.propsOn[i]) {
                        case 'Text':
                        case 'Date':
                            ihtml += `<p>${i}:</p><input>`;
                    }
                    pdiv.innerHTML = ihtml;
                    me.internal.appendChild(pdiv);
                }
                pdiv.dataset.invalid = 0;
                //display value
                switch (me.settings.propsOn[i]) {
                    case 'Auto':
                        if (typeof (clean_obj[i]) == "object") {
                            recursiveRender(clean_obj[i], pdiv);
                            break;
                        } else {
                            pdiv.innerHTML = `<p>${i}:</p><input>`;
                            //fall through
                        }
                    case 'Text':
                        pdiv.querySelector("input").value = clean_obj[i] || "";
                        break;
                    case 'Date':
                        pdiv.querySelector("input").value = clean_obj[i].datestring || "";
                        break;
                }
            }
        }
        //remove invalidated items
        its = me.internal.querySelectorAll("[data-invalid='1']");
        for (let i = 0; i < its.length; i++) {
            its[i].remove();
        }
        //(each has a dropdown for datatype)
        //rendering should not destroy ofject data
        //little 'new property' item
        //delete properties
    }
    ///////////////////////////////////////////////////////////////////////////////////////
    //First time load
    me.renderItem(me.settings.currentItem);

    container.on("updateItem", function (d) {
        let id = d.id;
        let sender = d.sender;
        if (sender == me) return;
        //Check if item is shown
        //Update item if relevant
        if (id == me.settings.currentItem) {
            me.renderItem(id, true); //update for any new properties.
            return true;
        } else return false;
    });


    //loading and saving
    me.updateSettings = function () {
        if (me.settings.operationMode == 'static') {
            //create if it does not exist
            if (!polymorph_core.items[staticItem]) {
                let it = {};
                polymorph_core.items[staticItem] = it;
                container.fire("updateItem", {
                    sender: this,
                    id: staticItem
                });
            }
        }
        if (me.settings.dataEntry) {
            insertbtn.style.display = "block";
        } else {
            insertbtn.style.display = "none";
        }
        if (me.settings.commitChanges) {
            commitbtn.style.display = "block";
        } else {
            commitbtn.style.display = "none";
        }
        //render the item
        me.renderItem(me.settings.currentItem);
    }

    //Saving and loading
    me.toSaveData = function () {
        return me.settings;
    }

    me.fromSaveData = function (d) {
        Object.assign(me.settings, d);
        if (!me.settings.propsOn) {
            me.settings.propsOn={};
            for (let i in polymorph_core.items) {
                for (let j in polymorph_core.items[i]) {
                    me.settings.propsOn[j] = "Auto";
                }
            }
        }
        me.updateSettings();
    }

    //Handle the settings dialog click!
    this.dialogDiv = document.createElement("div");
    this.optionsDiv = document.createElement("div");
    this.dialogDiv.appendChild(this.optionsDiv);
    this.optionsDiv.style.width = "30vw";
    let options = {
        operationMode: new _option({
            div: this.optionsDiv,
            type: "select",
            object: me.settings,
            property: "operationMode",
            source: {
                static: "Display static item",
                focus: "Display focused element"
            },
            label: "Select operation mode:"
        }),
        currentItem: new _option({
            div: this.optionsDiv,
            type: "text",
            object: me.settings,
            property: "currentItem",
            label: "Set item to display:"
        }),
        focusOperatorID: new _option({
            div: this.optionsDiv,
            type: "text",
            object: me.settings,
            property: "focusOperatorID",
            label: "Set container UID to focus from:"
        }),
        orientation: new _option({
            div: this.optionsDiv,
            type: "bool",
            object: me.settings,
            property: "orientation",
            label: "Horizontal orientation"
        }),
        showNonexistent: new _option({
            div: this.optionsDiv,
            type: "bool",
            object: me.settings,
            property: "showNonexistent",
            label: "Show enabled but not currently filled fields"
        }),
        commitChanges: new _option({
            div: this.optionsDiv,
            type: "bool",
            object: me.settings,
            property: "commitChanges",
            label: "Manually commit changes",
        }),
        dataEntry: new _option({
            div: this.optionsDiv,
            type: "bool",
            object: me.settings,
            property: "dataEntry",
            label: "Enable data entry",
            afterInput: (e) => {
                let i = e.currentTarget;
                if (i.checked) {
                    me.settings.showNonexistent = true;
                    options.showNonexistent.load();
                    me.settings.commitChanges = true;
                    options.commitChanges.load();
                }
            }
        }),
        dataEntry: new _option({
            div: this.optionsDiv,
            type: "bool",
            object: me.settings,
            property: "globalEnabled",
            label: "Focus: listen for every container (regardless of origin)",
        })
    }
    let more = document.createElement('div');
    more.innerHTML = `
    <p> Or, click to target 'focus' events from an container...
    <input data-role="focusOperatorID" placeholder="container UID (use the button)">
    <button class="targeter">Select container</button>
    </br>
    `;
    this.dialogDiv.appendChild(more);
    let fields = document.createElement('div');
    fields.innerHTML = `
    <h4> Select visible fields: </h4>
    <div class="apropos"></div>
    `;
    this.dialogDiv.appendChild(fields);
    let targeter = this.dialogDiv.querySelector("button.targeter");
    targeter.addEventListener("click", function () {
        polymorph_core.target().then((id) => {
            me.dialogDiv.querySelector("[data-role='focusOperatorID']").value = id;
            me.settings['focusOperatorID'] = id
            me.focusOperatorID = me.settings['focusOperatorID'];
        })
    })
    this.showDialog = function () {
        // update your dialog elements with your settings
        //get all available properties.
        let app = fields.querySelector(".apropos");
        app.innerHTML = "";
        let props = {};
        for (let i in polymorph_core.items) {
            for (let j in polymorph_core.items[i]) props[j] = true;
        }
        if (!this.settings.propsOn) this.settings.propsOn = props;
        for (let j in props) {
            app.appendChild(htmlwrap(`<p data-pname="${j}">${j}<span style="display: block; float: right;"><input type="checkbox" ${(this.settings.propsOn[j]) ? "checked" : ""}> ${ttypes}</span></p>`));
        }
        //fill out some details
        for (i in options) {
            options[i].load();
        }
    }
    this.dialogUpdateSettings = function () {
        // pull settings and update when your dialog is closed.
        let its = me.dialogDiv.querySelectorAll("[data-role]");
        for (let i = 0; i < its.length; i++) {
            me.settings[its[i].dataset.role] = its[i].value;
        }
        //also update all properties
        let ipns = me.dialogDiv.querySelectorAll("[data-pname]");
        me.settings.propsOn = {};
        for (let i = 0; i < ipns.length; i++) {
            if (ipns[i].querySelector("input").checked) {
                me.settings.propsOn[ipns[i].dataset.pname] = ipns[i].querySelector("select").value;
            }
        }
        me.updateSettings();
        me.renderItem(me.settings.currentItem);
    }
    me.dialogDiv.addEventListener("input", function (e) {
        if (e.target.dataset.role) {
            me.settings[e.target.dataset.role] = e.target.value;
        }
    })

    //polymorph_core will call me when an object is focused on from somewhere
    container.on("focus", function (d) {
        let id = d.id;
        let sender = d.sender;
        if (me.settings.operationMode == "focus") {
            if (me.settings['focusOperatorID']) {
                if (me.settings['focusOperatorID'] == sender.container.uuid) {
                    me.settings.currentItem = id;
                    me.renderItem(id);
                }
            } else {
                //calculate the base rect of the sender
                let baserectSender = sender.container.rect;
                while (baserectSender.parent) baserectSender = baserectSender.parent;
                //calculate my base rect
                let myBaseRect = me.container.rect;
                while (myBaseRect.parent) myBaseRect = myBaseRect.parent;
                //if they're the same, then update.
                if (myBaseRect == baserectSender || me.settings.globalEnabled) {
                    if (me.settings.operationMode == 'focus') {
                        me.settings.currentItem = id;
                        me.renderItem(id);
                    }
                }
            }
        }
    });
    container.on("deleteItem", function (d) {
        let id = d.id;
        let s = d.sender;
        if (me.settings.currentItem == id) {
            me.settings.currentItem = undefined;
        };
        me.updateItem(undefined);
    });
});