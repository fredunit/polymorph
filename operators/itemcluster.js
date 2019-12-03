core.registerOperator("itemcluster2", {
    displayName: "Itemcluster 2",
    description: "A brainstorming board. Add items, arrange them, and connect them with lines."
}, function (container) {
    let me = this;
    addEventAPI(this);
    me.container = container; //not strictly compulsory bc this is expected and automatically enforced - just dont touch it pls.
    this.settings = {
        itemcluster: {
            cx: 0,
            cy: 0,
            scale: 1
        },
        filter: guid(6),
        tray: true
    };
    this.rootdiv = document.createElement("div");
    //Add content-independent HTML here. fromSaveData will be called if there are any items to load.
    this.rootdiv.innerHTML = `
    <style>
    .viewNameDrop{
        position: absolute;
        background-color: #f9f9f9;
        z-index: 1;
        list-style: none;
    }

    .viewNameDrop>a{
        display:block;
    }

    .viewNameDrop>a:hover{
        display:block;
        background:lavender;
    }
    .itemcluster-container{
        height:100%;
    }

    .anchored>div>textarea{
        border: 3px dashed blue;
    }

    .floatingItem>div>textarea{
        resize:none;
        width: 100%;
        height: calc(100% - 15px);
    }

    .floatingItem>div{
        resize:both;
        overflow: auto;
        border: 1px solid black;
        box-sizing: border-box;
    }
    .itemcluster{
        position:relative;
    }
    .tray{
        position:absolute;
        transform: translateY(80px);
        height: 120px;
        width: 100%;
        bottom: 0;
        background: lightgrey;
        transition: all 0.5s ease;
        flex-direction:row;
        overflow-x:auto;
    }
    .tray:hover{
        transform: translateY(0);
    }
    .tray textarea{
        height:100%;
        resize: none;
    }
    </style>
<div>
    <div class="itemcluster-container">
        <div class="itemcluster-banner">
            <span class="topbar">
                <a>View:</a>
                <span>
                    <a class="viewNameContainer" style="background:rgb(132, 185, 218);"><span><span contenteditable class="viewName" data-listname='main' style="cursor:text"></span><span
                                class="listDrop">&#x25BC</span>
                        </span><!--<img class="gears" src="assets/gear.png" style="height:1em">--></a>
                    <div class="viewNameDrop" style="display:none">
                    </div>
                </span>
            </span>
        </div>
        <div class="itemcluster"  style="flex: 1 1 100%;position: relative; background:transparent;">
        <div class="tray">
        </div>
        </div>
    </div>
</div>`;
    this.viewName = this.rootdiv.querySelector(".viewName");
    this.viewDropdown = this.rootdiv.querySelector(".viewNameDrop");
    this.viewDropdownButton = this.rootdiv.querySelector(".listDrop");
    this.viewDropdownContainer = this.rootdiv.querySelector(
        ".viewNameContainer"
    );
    this.itemSpace = this.rootdiv.querySelector(".itemcluster");
    container.div.appendChild(this.rootdiv);
    this.tray = this.rootdiv.querySelector(".tray");

    this.tray.addEventListener("wheel", (e) => {
        me.tray.scrollLeft += e.deltaY;
    })

    me.tray.addEventListener("input", (e) => {
        core.items[e.target.parentElement.dataset.id].title = e.target.value;
        container.fire('updateItem', { sender: me, id: e.target.parentElement.dataset.id });
    })

    ///////////////////////////////////////////////////////////////////////////////////////
    //Tutorial

    if (!core.userData.introductions.itemcluster) {
        /*let tu = new _tutorial({
            root: me.rootdiv
        });
        tu.addStep({
            id: "hello",
            target: me.rootdiv,
            type: "shader",
            contents: `<p>Double click to add a new box.</p>
      <p>Click and drag to add new boxes!</p>`,
            to: [
                ["OK!"]
            ]
        });
        tu.start("hello").end(() => {
            core.userData.introductions.itemcluster = true;
            core.saveUserData();
        });*/
    }
    //////////////////////////// Focusing an item////////////////////
    container.on("focus", (d) => {
        if (d.sender == me) return;
        if (this.itemPointerCache[d.id] && core.items[d.id].itemcluster.viewData[me.settings.currentViewName]) {
            core.items[me.settings.currentViewName].itemcluster.cx = this.itemPointerCache[d.id].cx();
            core.items[me.settings.currentViewName].itemcluster.cy = this.itemPointerCache[d.id].cy();
            me.viewAdjust();
            if (me.preselected) {
                me.preselected.classList.remove("selected");
                me.preselected.classList.remove("anchored");
            }
            me.preselected = this.itemPointerCache[d.id].node;
            me.preselected.classList.add("anchored");
        }
    })


    ////////////////////////////////////////Handle core item updates//////////////////
    //lazily double up updates so that we can fix the lines
    // but only update items that are visible; and only update if we are visible
    let doubleUpdateCapacitor = new capacitor(200, 1000, () => {
        for (let i in core.items) {
            if (core.items[i].itemcluster && core.items[i].itemcluster.viewData && core.items[i].itemcluster.viewData[me.settings.currentViewName]) {
                me.arrangeItem(i);
            }
        }
    })
    this.itemIsOurs = (id) => {
        // I will be shown at some point by this container
        let isFiltered = (core.items[id][this.settings.filter] != undefined);
        let hasView = core.items[id].itemcluster != undefined && core.items[id].itemcluster.viewName != undefined;
        if (core.items[id].itemcluster && core.items[id].itemcluster.viewData) {
            for (let i in core.items[id].itemcluster.viewData) {
                if (core.items[i] && ((!this.settings.filter) || (core.items[i][this.settings.filter] != undefined))) {
                    hasView = true;
                }
            }
        }
        return (hasView || this.settings.tray) && (!(this.settings.filter) || isFiltered);

    }
    container.on("updateItem", (d) => {
        let id = d.id;
        let sender = d.sender;
        if (sender == me) return;

        if (me.container.visible()) {
            if (core.items[id].itemcluster) {
                if (core.items[id].itemcluster.viewData) {
                    if (core.items[id].itemcluster.viewData[me.settings.currentViewName]) {
                        if (me.arrangeItem) {
                            me.arrangeItem(id);
                            doubleUpdateCapacitor.submit();//redraw lines
                        }
                    } else {
                        if (!(me.settings.filter) || core.items[id][me.settings.filter]) me.addToTray(id);
                        else {
                            me.removeFromTray(id);
                        }
                    }
                }
            }
        }
        return this.itemIsOurs(id); // fix this soon pls
        //Check if item is shown
        //Update item if relevant
        //This will be called for all items when the items are loaded.
    });



    ///////////////////////////////////////////////////////////////////////////////////////
    //Views

    //Editing the name of a view
    this.viewName.addEventListener("keyup", function (e) {
        core.items[me.settings.currentViewName].itemcluster.viewName =
            e.currentTarget.innerText;
        container.fire("updateItem", {
            id: me.settings.currentViewName,
            sender: me
        });
    });

    this.viewDropdown.addEventListener("click", function (e) {
        if (e.target.tagName.toLowerCase() == "a") {
            if (e.target.dataset.isnew) {
                //make a new view
                let nv = me.makeNewView();
                me.switchView(nv);
            } else {
                let id = e.target.dataset.listname;
                me.switchView(id);
            }
        } else {
            if (e.target.tagName.toLowerCase() == "em") {
                nv = Date.now().toString();
                nv = me.makeNewView();
                me.switchView(nv);
            }
        }
        me.viewDropdown.style.display = "none";
        e.stopPropagation();
    });

    this.viewDropdownButton.addEventListener("click", function () {
        me.viewDropdown.innerHTML = "";
        for (i in core.items) {
            if (core.items[i].itemcluster && core.items[i].itemcluster.viewName) {
                if (me.settings.filter && !(core.items[i][me.settings.filter])) continue;//apply filter to views
                let aa = document.createElement("a");
                aa.dataset.listname = i;
                aa.innerHTML = core.items[i].itemcluster.viewName;
                me.viewDropdown.appendChild(aa);
            }
            //v = itemcluster.views[i].name;
        }
        me.viewDropdown.appendChild(htmlwrap(`<a data-isnew="yes"><em>Add another view</em></a>`));
        me.viewDropdown.appendChild(htmlwrap(`<a data-isnew="yes"><em>Create view from filter</em></a>`));
        me.viewDropdown.style.display = "block";
    });

    //hide the view dropdown button, if necessary.
    this.rootdiv.addEventListener("mousedown", function (e) {
        let p = e.target;
        while (p != me.rootdiv && p) {
            if (p == me.viewDropdown) return;
            p = p.parentElement;
        }
        me.viewDropdown.style.display = "none";
    });
    this.switchView = (id, assert, subview) => {
        let previousView = me.settings.currentViewName;
        me.settings.currentViewName = id;
        if (!me.settings.currentViewName) {
            //if not switching to any particular view, switch to first available view.
            let switched = false;
            for (let i in core.items) {
                if (core.items[i].itemcluster && core.items[i].itemcluster.viewName) {
                    if (me.settings.filter && !(core.items[i][me.settings.filter])) {
                        continue;
                    }
                    this.switchView(i);
                    switched = true;
                    break;
                }
            }
            //If no views, make a new view to switch to.
            if (!switched) {
                this.switchView(guid(4), true);
            }
            //Show blank
        } else {
            if (!core.items[me.settings.currentViewName] ||
                !core.items[me.settings.currentViewName].itemcluster ||
                !core.items[me.settings.currentViewName].itemcluster.viewName) {
                if (assert) {
                    me.switchView(me.makeNewView(me.settings.currentViewName));
                } else {
                    //view doesnt exist, switch to any view
                    me.switchView();
                    return;
                }
            }
            //buttons
            this.viewName.innerText =
                core.items[me.settings.currentViewName].itemcluster.viewName.replace(/\n/ig, "");
            //if this is a subview, add a button on the back; otherwise remove all buttons
            if (previousView != id && previousView) {
                if (subview) {
                    let b = document.createElement("button");
                    b.dataset.ref = previousView;
                    b.innerText = core.items[previousView].itemcluster.viewName;
                    b.addEventListener("click", () => {
                        me.switchView(b.dataset.ref, true, false);
                        while (b.nextElementSibling.tagName == "BUTTON") b.nextElementSibling.remove();
                        b.remove();
                    })
                    this.viewName.parentElement.insertBefore(b, this.viewName);
                } else if (subview != false) {
                    //subview is undefined; hard switch (killall buttons)
                    let bs = this.viewName.parentElement.querySelectorAll("button");
                    for (let i = 0; i < bs.length; i++) {
                        bs[i].remove();
                    }
                }
            }
            //kill all lines
            for (let i in me.activeLines) {
                for (let j in me.activeLines[i]) {
                    me.activeLines[i][j].remove();
                    delete me.activeLines[i][j];
                }
            }
            //reposition all items, also updating viewbox
            for (i in core.items) {
                if (core.items[i].itemcluster && core.items[i].itemcluster.viewData) {
                    if (me.arrangeItem) me.arrangeItem(i);
                    //position the item appropriately.
                }
            }
            for (i in core.items) {
                if (core.items[i].itemcluster && core.items[i].itemcluster.viewData) {
                    if (me.arrangeItem) me.arrangeItem(i);
                    //twice so that all lines show up. How efficient.
                }
            }
            me.viewAdjust();
        }
    };

    this.makeNewView = function (id) {
        //register it with the core
        let itm;
        if (!id) {
            itm = {};
            id = core.insertItem(itm);
        } else {
            itm = core.items[id] || {};
        }
        if (!itm.itemcluster) itm.itemcluster = {};
        itm.itemcluster.viewName = "New View"
        if (me.settings.filter) {
            if (!itm[me.settings.filter]) itm[me.settings.filter] = true;
        }
        core.items[id] = itm;//in case we are creating from scratch
        //register a change
        container.fire("updateItem", {
            sender: this,
            id: id
        });
        return id;
    };

    this.cloneView = function () {
        //register it with the core
        let newName = "Copy of " + core.items[me.settings.currentViewName].itemcluster.viewName;
        let id = me.makeNewView();
        core.items[id].itemcluster.viewName = newName;
        container.fire("updateItem", {
            sender: this,
            id: id
        });
        //clone positions as well
        for (let i in core.items) {
            if (core.items[i].itemcluster && core.items[i].itemcluster.viewData && core.items[i].itemcluster.viewData[me.settings.currentViewName]) {
                core.items[i].itemcluster.viewData[id] = core.items[i].itemcluster.viewData[me.settings.currentViewName];
            }
        }
        this.switchView(id);
    };
    this.destroyView = function (viewName, auto) {
        // Destroy the itemcluster property of the item but otherwise leave it alone
        if (me.settings.filter) {
            delete core.items[viewName][me.settings.filter];
        } else {
            delete core.items[viewName].itemcluster.viewName;
        }
        this.switchView();
    };

    container.on("focus", (e) => {
        if (e.sender == me) return;
        if (me.settings.operationMode == "focus") {
            if (e.sender.container.uuid == me.settings.focusOperatorID) {
                me.switchView(e.id, true);
            }
        }
    })

    ///////////////////////////////////////////////////////////////////////////////////////
    //Items
    this.itemPointerCache = {};
    this.cachedStyle = {};
    scriptassert([
        ["svg", "3pt/svg.min.js"],
        ["foreignobject", "3pt/svg.foreignobject.js"]
    ], () => {
        scriptassert([["itemcluster_svg", "operators/itemcluster.svg.js"]], () => {
            _itemcluster_extend_svg(this);
        });
    });

    //More items shenanigans

    this.itemSpace.addEventListener("click", function (e) {
        //click: anchor and deanchor.
        if (me.preselected) {
            me.preselected.classList.remove("selected");
            me.preselected.classList.remove("anchored");
        }
        if (
            e.target.matches(".floatingItem") ||
            e.target.matches(".floatingItem *")
        ) {
            let it = e.target;
            while (!it.matches(".floatingItem")) it = it.parentElement;
            if (me.preselected == it) {
                //keep it anchored
                it.classList.add("anchored");
            } else {
                me.preselected = it;
                it.classList.add("selected");
            }
        } else {
            me.preselected = undefined;
        }
    });

    this.itemSpace.addEventListener("dblclick", (e) => {
        if (me.preselected) {
            me.preselected.classList.remove("selected");
            me.preselected.classList.remove("anchored");
        }
        if (
            e.target.matches(".floatingItem") ||
            e.target.matches(".floatingItem *")
        ) {
            let it = e.target;
            while (!it.matches(".floatingItem")) it = it.parentElement;

            me.preselected = it;
            it.classList.add("anchored");
        } else {
            me.preselected = undefined;
        }
    });

    this.dragging = false;
    this.movingDivs = [];
    this.alreadyMoving = -1;//for deselecting nodes
    this.clearOutMovingDivs = function () {
        me.movingDivs.forEach((v) => { v.el.node.children[0].style.border = "1px solid black" });
        me.movingDivs = [];//empty them
    }
    this.itemSpace.addEventListener("mousedown", (e) => {
        if (e.target.matches(".floatingItem") || e.target.matches(".floatingItem *")) {
            // If we are clicking on an item:
            if (e.which != 1) return;
            if (e.getModifierState("Shift")) {
                let it = e.target;
                while (!it.matches(".floatingItem")) it = it.parentElement;
                me.linkingDiv = it;
                me.linking = true;
            } else {
                //if not lineing
                //clear the movingDivs if they need to be cleared
                me.shouldHighlightMovingDivs++;
                if (me.movingDivs.length && !e.getModifierState("Control")) {
                    //also reset the borders
                    me.clearOutMovingDivs();
                }
                let it = e.target;
                while (!it.matches(".floatingItem")) it = it.parentElement;
                if (it.classList.contains("anchored")) return;
                if (me.dragging) return;
                //check to see if we are already in movingDivs...
                me.alreadyMoving = -1;
                me.movingDivs.forEach((v, i) => {
                    if (v.el == this.itemPointerCache[it.dataset.id]) {
                        //remove the red border
                        v.el.node.children[0].style.border = "1px solid black"
                        me.alreadyMoving = i;
                    }
                })
                if (me.alreadyMoving == -1) {
                    me.movingDivs.push({
                        el: this.itemPointerCache[it.dataset.id]
                    });
                }
                me.lastMovingDiv = this.itemPointerCache[it.dataset.id];
                //style it so we can see it
                this.itemPointerCache[it.dataset.id].node.children[0].style.border = "1px solid red";
                //adjust x indexes
                this.itemPointerCache[it.dataset.id].front();
                container.fire("focus", {
                    id: it.dataset.id,
                    sender: me
                });
                //it.style.border = "3px solid #ffa2fc";
                me.dragging = true;
                //set relative drag coordinates
                let coords = me.mapPageToSvgCoords(e.pageX, e.pageY);
                for (let i = 0; i < me.movingDivs.length; i++) {
                    me.movingDivs[i].dx = coords.x - me.movingDivs[i].el.x();
                    me.movingDivs[i].dy = coords.y - me.movingDivs[i].el.y();
                }
                //Enforce its lines in blue.
                if (me.prevFocusID) me.redrawLines(me.prevFocusID);
                me.redrawLines(it.dataset.id, "red");
                me.prevFocusID = it.dataset.id;
                //return false;
            }
        } else if (e.target.matches(".tray textarea") && e.buttons % 2) {
            me.fromTray = e.target.parentElement.dataset.id;
        } else if (e.getModifierState("Control")) {
            //start a rectangleDrag!
            let coords = me.mapPageToSvgCoords(e.pageX, e.pageY);
            me.rectangleDragging = {
                rect: me.svg.rect(0, 0).stroke({ width: 1, color: "red" }).fill({ opacity: 0 }),
                sx: coords.x,
                sy: coords.y
            }
        } else {
            //deselect
            if (me.movingDivs.length && !e.getModifierState("Control")) {
                //also reset the borders
                me.clearOutMovingDivs();
            }
            //Pan
            //if (e.getModifierState("Shift") || e.which == 2) {
            me.globalDrag = true;
            let coords = me.mapPageToSvgCoords(e.pageX, e.pageY);
            me.originalViewBox = me.svg.viewbox();
            me.dragDX = coords.x;
            me.dragDY = coords.y;
            me.ocx = core.items[me.settings.currentViewName].itemcluster.cx || 0;
            me.ocy = core.items[me.settings.currentViewName].itemcluster.cy || 0;
            //}
        }
    });

    this.itemSpace.addEventListener("mousemove", (e) => {
        //stop from creating an item if we are resizing another item
        if (Math.abs(e.offsetX - me.mouseStoredX) > 5 || Math.abs(e.offsetY - me.mouseStoredY) > 5) {
            me.possibleResize = true;
        }
        if (me.fromTray) {
            let cid = me.fromTray;
            //make us drag the item
            me.removeFromTray(cid);
            if (!core.items[cid].itemcluster) core.items[cid].itemcluster = {};
            if (!core.items[cid].itemcluster.viewData) core.items[cid].itemcluster.viewData = {};
            core.items[cid].itemcluster.viewData[me.settings.currentViewName] = { x: 0, y: 0 };
            me.arrangeItem(cid);
            //this is probably broken now
            let divrep = {
                el: this.itemPointerCache[cid],
                dx: 30,
                dy: 30
            };
            me.clearOutMovingDivs();
            me.movingDivs = [divrep];//overwrite the thing in the array
            me.lastMovingDiv = this.itemPointerCache[cid];
            // force a mousemove
            let coords = me.mapPageToSvgCoords(e.pageX, e.pageY);
            me.lastMovingDiv.x(coords.x - divrep.dx);
            me.lastMovingDiv.y(coords.y - divrep.dy);

            me.updatePosition(cid);
            me.dragging = true;
            //set a flag so we dont instantly return it to the tray
            me.stillInTray = true;
            me.fromTray = false;
        }
        if (me.rectangleDragging) {
            let coords = me.mapPageToSvgCoords(e.pageX, e.pageY);
            let dx = coords.x - me.rectangleDragging.sx;
            if (dx > 0) {
                me.rectangleDragging.rect.x(me.rectangleDragging.sx).width(dx);
            } else {
                me.rectangleDragging.rect.x(coords.x).width(-dx);
            }
            let dy = coords.y - me.rectangleDragging.sy;
            if (dy > 0) {
                me.rectangleDragging.rect.y(me.rectangleDragging.sy).height(dy);
            } else {
                me.rectangleDragging.rect.y(coords.y).height(-dy);
            }
            me.clearOutMovingDivs();
            for (let i in this.itemPointerCache) {
                if (((this.itemPointerCache[i].cx() > coords.x && this.itemPointerCache[i].cx() < me.rectangleDragging.sx) ||
                    (this.itemPointerCache[i].cx() < coords.x && this.itemPointerCache[i].cx() > me.rectangleDragging.sx)) &&
                    ((this.itemPointerCache[i].cy() > coords.y && this.itemPointerCache[i].cy() < me.rectangleDragging.sy) ||
                        (this.itemPointerCache[i].cy() < coords.y && this.itemPointerCache[i].cy() > me.rectangleDragging.sy))) {
                    me.movingDivs.push({
                        el: this.itemPointerCache[i]
                    });
                    this.itemPointerCache[i].node.children[0].style.border = "1px solid red";
                    //add to movingdivs
                }
            }
        }
        if (me.dragging) {
            me.dragged = true;
            //dragging an item
            //translate position of mouse to position of rectangle
            let coords = me.mapPageToSvgCoords(e.pageX, e.pageY);
            for (let i = 0; i < me.movingDivs.length; i++) {
                me.movingDivs[i].el.x(coords.x - me.movingDivs[i].dx);
                me.movingDivs[i].el.y(coords.y - me.movingDivs[i].dy);
            }
            let elements = me.rootdiv.getRootNode().elementsFromPoint(e.clientX, e.clientY);
            //borders for the drag item in item
            if (me.hoverOver) {
                me.hoverOver.style.border = "";
            }
            let stillInTray = false;

            //if we send the items to tray
            for (let i = 0; i < elements.length; i++) {
                if (elements[i].matches(".tray")) {
                    if (me.stillInTray) {
                        stillInTray = true;
                        break;
                    }
                    //send to tray, and end interaction
                    // delete the item from this view
                    me.movingDivs.forEach((v) => {
                        let cid = v.el.attr("data-id");
                        delete core.items[cid].itemcluster.viewData[me.settings.currentViewName];
                        delete core.items[cid][`__itemcluster_${me.settings.currentViewName}`];
                        me.arrangeItem(cid);
                        me.addToTray(cid);
                        container.fire("updateItem", { sender: me, id: cid });
                    });
                    me.clearOutMovingDivs();
                    me.dragging = false;
                }
                if (elements[i].matches(".floatingItem") && elements[i].dataset.id != me.lastMovingDiv.attr("data-id")) {
                    me.hoverOver = elements[i];
                    elements[i].style.border = "3px dotted red";
                    break;
                }
            }
            if (!stillInTray) me.stillInTray = false;
            //if we are moving something ensure it wont be twice-click selected.
            me.preselected = undefined;
            //redraw all ITS lines
            for (let i = 0; i < me.movingDivs.length; i++) {
                me.redrawLines(me.movingDivs[i].el.node.dataset.id, "red");
            }
        } else if (me.linking) {
            // draw a line from the object to the mouse cursor
            let rect = this.itemPointerCache[me.linkingDiv.dataset.id];
            let p = me.mapPageToSvgCoords(e.pageX, e.pageY)
            me.linkingLine.plot(
                rect.x() + rect.width() / 2,
                rect.y() + rect.height() / 2,
                p.x,
                p.y
            ).stroke({
                width: 3
            }).marker('end', 9, 6, function (add) {
                add.path("M0,0 L0,6 L9,3 z").fill("#000");
            });
        } else if (me.globalDrag) {
            this.actualMotion = true;
            // shift the view by delta
            let coords = me.mapPageToSvgCoords(e.pageX, e.pageY, me.originalViewBox);

            core.items[me.settings.currentViewName].itemcluster.cx =
                me.ocx - (coords.x - me.dragDX);
            core.items[me.settings.currentViewName].itemcluster.cy =
                me.ocy - (coords.y - me.dragDY);
            //arrange all items
            me.viewAdjust();
        }
    });

    this.viewAdjust = function () {
        let ic = core.items[me.settings.currentViewName].itemcluster;
        let ww = me.itemSpace.clientWidth * (ic.scale || 1);
        let hh = me.itemSpace.clientHeight * (ic.scale || 1);
        if (me.svg) {
            me.svg.viewbox((ic.cx || 0) - ww / 2, (ic.cy || 0) - hh / 2, ww, hh);
            me.viewGrid();
        } else {
            setTimeout(me.viewAdjust, 200);
        }
    }



    this.itemSpace.addEventListener("wheel", (e) => {
        if (e.target.matches(".floatingItem") ||
            e.target.matches(".floatingItem *") || me.tray.contains(e.target)) {
            return;
        }
        if (this.gridScroll) {
            this.handleGridScroll(e);
        } else {
            //calculate old width constant
            let ic = core.items[me.settings.currentViewName].itemcluster;
            let br = me.itemSpace.getBoundingClientRect();
            ic.scale = ic.scale || 1;
            let vw = me.itemSpace.clientWidth * ic.scale;
            let vh = me.itemSpace.clientHeight * ic.scale;
            let wc = ic.cx - vw / 2 + (e.clientX - br.x) / br.width * vw;
            let hc = ic.cy - vh / 2 + (e.clientY - br.y) / br.height * vh;
            if (e.deltaY > 0) {
                ic.scale *= 1.1;
            } else {
                ic.scale *= 0.9;
            }
            //correct the new view centre
            vw = me.itemSpace.clientWidth * ic.scale;
            vh = me.itemSpace.clientHeight * ic.scale;
            ic.cx = wc - (e.clientX - br.x) / br.width * vw + vw / 2;
            ic.cy = hc - (e.clientY - br.y) / br.height * vh + vh / 2;
            me.viewAdjust();
            me.viewGrid();
        }
    })

    this.itemSpace.addEventListener("mouseup", e => {
        me.handleMoveEnd(e);
    });
    this.itemSpace.addEventListener("mouseleave", e => {
        me.handleMoveEnd(e);
    });

    me.handleMoveEnd = function (e, touch) {
        me.fromTray = false;
        if (me.globalDrag) {
            //setTimeout(me.viewAdjust, 500);
            me.globalDrag = false;
            if (me.viewGrid && me.actualMotion) me.viewGrid();
            me.actualMotion = false;
        }
        if (me.rectangleDragging) {
            me.rectangleDragging.rect.remove();
            me.rectangleDragging = undefined;
        }
        if (me.dragging) {
            //disengage drag
            me.dragging = false;
            if (!me.dragged) {
                if (me.alreadyMoving != -1) {
                    me.movingDivs[me.alreadyMoving].el.node.children[0].style.border = "1px solid black";
                    me.movingDivs.splice(me.alreadyMoving, 1);
                }
            }
            me.dragged = false;
            //me.movingDiv.classList.remove("moving");
            if (me.hoverOver) me.hoverOver.style.border = "";

            //define some stuff
            let cid = me.lastMovingDiv.attr("data-id");

            let elements = me.rootdiv
                .getRootNode()
                .elementsFromPoint(e.clientX, e.clientY);
            /*
                      case 1: hidden
                      case 2: dragged into another object
                      case 3: dragged to a position
            */
            //adding to another view
            for (let i = 0; i < elements.length; i++) {
                if (
                    elements[i].matches(".floatingItem") &&
                    elements[i].dataset.id != cid && e.ctrlKey
                ) {
                    core.items[elements[i].dataset.id].itemcluster.viewName = core.items[elements[i].dataset.id].itemcluster.viewName || core.items[elements[i].dataset.id].title || elements[i].dataset.id; //yay implicit ors
                    core.items[cid].itemcluster.viewData[elements[i].dataset.id] = {
                        x: 0,
                        y: 0
                    };
                    if (!e.altKey) {//push drag in.
                        delete core.items[cid].itemcluster.viewData[me.settings.currentViewName];
                        me.arrangeItem(cid);
                        me.movingDivs = [];//clear movingdivs so it doesnt come back
                    }
                    me.arrangeItem(elements[i].dataset.id);
                    //me.switchView(elements[i].dataset.id, true, true);
                    break;
                }
            }
            me.movingDivs.forEach((v) => {
                me.updatePosition(v.el.node.dataset.id);
            })
            container.fire("updateItem", {
                sender: me,
                id: cid
            });
        } else if (me.linking) {
            //reset linking line
            me.linkingLine.plot(0, 0, 0, 0).stroke({ width: 0 });
            me.linking = false;
            //change the data
            let linkedTo;
            let elements = container.div.elementsFromPoint(e.clientX, e.clientY);
            for (let i = 0; i < elements.length; i++) {
                if (
                    elements[i].matches("textarea") &&
                    elements[i].parentElement.parentElement.dataset.id != me.linkingDiv.dataset.id
                ) {
                    linkedTo = elements[i].parentElement.parentElement;
                    break;
                }
            }
            if (linkedTo) {
                //add a new line connecting the items
                me.toggleLine(me.linkingDiv.dataset.id, linkedTo.dataset.id);
                //push the change
                container.fire("updateItem", {
                    sender: me,
                    id: me.linkingDiv.dataset.id
                });
                container.fire("updateItem", {
                    sender: me,
                    id: linkedTo.dataset.id
                });
            }
        } else if (me.preselected) {
            if (!core.items[me.preselected.dataset.id].boxsize) core.items[me.preselected.dataset.id].boxsize = {};
            bs = core.items[me.preselected.dataset.id].boxsize;
            bs.w = me.preselected.children[0].style.width;
            bs.h = me.preselected.children[0].style.height;
            me.arrangeItem(me.preselected.dataset.id); // handle resizes
        }
    };
    this.itemSpace.addEventListener("mousedown", function (e) {
        me.possibleResize = false;
        me.mouseStoredX = e.offsetX;
        me.mouseStoredY = e.offsetY;
    });

    this.itemSpace.addEventListener("dblclick", (e) => {
        if (e.target == me.itemSpace || e.target.tagName.toLowerCase() == "svg" || e.target == me.tempTR.node) {
            let coords = me.mapPageToSvgCoords(e.pageX, e.pageY);
            me.createItem(
                coords.x,
                coords.y
            );
            // Make a new item
        }
    })

    //----------item functions----------//
    this.updatePosition = (id) => {
        let it = this.itemPointerCache[id];
        if (!core.items[id].itemcluster.viewData[this.settings.currentViewName]) core.items[id].itemcluster.viewData[this.settings.currentViewName] = {};
        //if there is a grid, then deal with it
        this.alignGrid(it);
        core.items[id].itemcluster.viewData[this.settings.currentViewName].x = it.x();
        core.items[id].itemcluster.viewData[this.settings.currentViewName].y = it.y();
        container.fire("updateItem", {
            id: id
        });
        me.arrangeItem(id);
    };

    this.createItem = function (x, y) {
        let itm = {};
        //register it with the core
        let id = core.insertItem(itm);
        itm.title = "";
        itm.itemcluster = {
            viewData: {},
            description: ""
        };
        itm.itemcluster.viewData[me.settings.currentViewName] = {
            x: x,
            y: y
        };
        if (me.settings.filter) {
            itm[me.settings.filter] = true;
        }
        //register a change
        container.fire("updateItem", {
            sender: this,
            id: id
        });
        this.arrangeItem(id);
    };

    this.removeItem = function (id) {
        delete core.items[id].itemcluster.viewData[me.settings.currentViewName];
        //hide all the lines
        for (let i in me.activeLines) {
            for (let j in me.activeLines[i]) {
                if (i == id || j == id) {// this could STILL be done better
                    me.toggleLine(i, j);
                }
            }
        }
        me.arrangeItem(id);
        container.fire("deleteItem", {
            id: id
        });
    };

    this.rootdiv.addEventListener("focus", (e) => {
        if (e.target.parentElement.parentElement.matches("[data-id]")) {
            let id = e.target.parentElement.parentElement.dataset.id;
            container.fire("focus", {
                id: id,
                sender: me
            });
            if (me.prevFocusID) me.redrawLines(me.prevFocusID);
            me.redrawLines(id, "red");
            me.prevFocusID = id;
        }
    })

    this.rootdiv.addEventListener("input", (e) => {
        if (e.target.parentElement.parentElement.matches("[data-id]")) {
            let id = e.target.parentElement.parentElement.dataset.id;
            core.items[id].title = e.target.value;
            container.fire("updateItem", {
                id: id,
                sender: this
            });
        }
    })

    ////////////////////////////////////////////////////////////
    //The tray
    me.addToTray = function (id) {
        let cti = me.tray.querySelector(`div[data-id='${id}']`);
        if (!cti) {
            cti = htmlwrap(`
                <div data-id=${id}>
                <textarea></textarea>
                </div>
            `);
            me.tray.appendChild(cti);
        }
        cti.querySelector("textarea").value = core.items[id].title;
    }

    me.removeFromTray = function (id) {
        let cti = me.tray.querySelector(`div[data-id='${id}']`);
        if (cti) cti.remove();
    }
    me.emptyTray = function () {
        while (me.tray.children.length) {
            me.tray.children[0].remove();
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////
    //Core interactions

    function updateSettings() {
        if (me.settings.tray) {
            //show the tray
            me.emptyTray();
            me.tray.style.display = "flex";
            if (me.settings.filter && core.items[me.settings.currentViewName] && !core.items[me.settings.currentViewName][me.settings.filter]) {
                core.items[me.settings.currentViewName][me.settings.filter] = true; // quick upgrade - to remove in future once things have settled
            }
            //also populate the tray
            for (let i in core.items) {
                if (core.items[i].itemcluster && core.items[i].itemcluster.viewData) {
                    if (!core.items[i].itemcluster.viewData[me.settings.currentViewName]) {//not in this view
                        if (!(me.settings.filter) || core.items[i][me.settings.filter]) {
                            me.addToTray(i);
                        }
                    }
                }
            }
        } else {
            me.emptyTray();
            me.tray.style.display = "none";
        }
        if (me.svg && me.viewGrid) {
            me.viewGrid();
        }
    }
    this.refresh = function () {
        if (me.svg) me.svg.size(me.rootdiv.clientWidth, me.rootdiv.clientHeight);
        me.switchView(me.settings.currentViewName, true);
    };
    //Saving and loading
    this.toSaveData = function () {
        //compile the current view path
        this.settings.viewpath = [];
        let bs = this.viewName.parentElement.querySelectorAll("button");
        for (let i = 0; i < bs.length; i++) {
            this.settings.viewpath.push(bs[i].dataset.ref);
        }
        this.settings.viewpath.push(this.settings.currentViewName);
        return this.settings;
    }

    this.fromSaveData = function (d) {
        //this is called when your container is started OR your container loads for the first time
        Object.assign(this.settings, d);
        if (this.settings.viewpath) {
            this.settings.currentViewName = undefined;//clear preview buffer to prevent a>b>a
            for (let i = 0; i < this.settings.viewpath.length; i++) {
                me.switchView(this.settings.viewpath[i], true, true);
            }
        } else {//for older versions
            me.switchView(me.settings.currentViewName, true, true);
        }
        updateSettings();
    }

    //Handle the settings dialog click!
    this.dialogDiv = document.createElement("div");
    this.dialogDiv.innerHTML = `<h1>Mode</h1>
      <select data-role="operationMode">
      <option value="standalone">Standalone</option>
      <option value="focus">Display view from focused item</option>
      </select>
      <h2>container to link focus to:<h2>
      <input data-role="focusOperatorID" placeholder="container UID (use the button)">
      <button class="targeter">Select container</button>
      `;
    let options = {
        tray: new _option({
            div: this.dialogDiv,
            type: "bool",
            object: this.settings,
            property: "tray",
            label: "Show item tray"
        }),
        filter: new _option({
            div: this.dialogDiv,
            type: "text",
            object: this.settings,
            property: "filter",
            label: "Filter items by string:"
        })
    }
    let targeter = this.dialogDiv.querySelector("button.targeter");
    targeter.addEventListener("click", function () {
        core.target().then((id) => {
            me.dialogDiv.querySelector("[data-role='focusOperatorID']").value = id;
            me.settings['focusOperatorID'] = id
            me.focusOperatorID = me.settings['focusOperatorID'];
        })
    });
    this.showDialog = function () {
        for (i in me.settings) {
            let it = me.dialogDiv.querySelector("[data-role='" + i + "']");
            if (it) it.value = me.settings[i];
        }
        for (i in options) {
            options[i].load();
        }
        // update your dialog elements with your settings
    }
    this.dialogUpdateSettings = function () {
        let its = me.dialogDiv.querySelectorAll("[data-role]");
        for (let i = 0; i < its.length; i++) {
            me.settings[its[i].dataset.role] = its[i].value;
        }
        updateSettings();
        container.fire("updateView");
        // pull settings and update when your dialog is closed.
    }
    //extension API
    this.callables = {
        placeItem: function (data) {
            let item = data.item;
            let x = data.x;
            let y = data.y;
            if (x == undefined) {
                //they want us to decide where to place the item
                x = Math.random() * 1000;
                y = Math.random() * 1000;
            }
            let id = core.insertItem(item);
            core.items[id].itemcluster = { viewData: {} };
            core.items[id].itemcluster.viewData[me.settings.currentViewName] = {};
            core.items[id].itemcluster.viewData[me.settings.currentViewName].x = x;
            core.items[id].itemcluster.viewData[me.settings.currentViewName].y = y;
            me.arrangeItem(id);
            container.fire("updateItem", { id: id, sender: me });
            return id;
        }
    }
    scriptassert([["itemcluster_contextmenu", "operators/itemcluster.contextmenu.js"]], () => {
        _itemcluster_extend_contextmenu(this);
    })
    scriptassert([["itemcluster_scalegrid", "operators/itemcluster.scalegrid.js"]], () => {
        _itemcluster_extend_scalegrid(this);
    })
});