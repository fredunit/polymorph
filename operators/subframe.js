polymorph_core.registerOperator("subframe", {}, function (container) {
    let me = this;
    me.container = container;
    this.settings = {};

    this.outerDiv = document.createElement("div");
    //Add div HTML here
    this.outerDiv.innerHTML = ``;
    this.outerDiv.style.cssText = `width:100%; height: 100%; position:relative`;
    container.div.appendChild(this.outerDiv);

    //////////////////Handle polymorph_core item updates//////////////////

    this.refresh = function () {
        polymorph_core.rects[this.rectID].refresh();
    }

    //////////////////Handling local changes to push to polymorph_core//////////////////

    this.tieRect = function (rectID) {
        this.rectID=rectID;
        this.outerDiv.appendChild(polymorph_core.rects[rectID].outerDiv);
        polymorph_core.rects[rectID].refresh();
    }

    //Check if i have any rects waiting for pickup
    if (polymorph_core.rectLoadCallbacks[container.id]) {
        this.tieRect(polymorph_core.rectLoadCallbacks[container.id][0]);
    } else {
        let rectID = polymorph_core.newRect(container.id);
        this.tieRect(rectID);
    }



    //Saving and loading
    this.toSaveData = function () {
        return this.settings;
    }

    this.fromSaveData = function (d) {
        //do nothing
    }


    //Handle the settings dialog click!
    this.dialogDiv = document.createElement("div");
    this.dialogDiv.innerHTML = `Nothing to show yet :3`;
    this.showDialog = function () {
        // update your dialog elements with your settings
    }
    this.dialogUpdateSettings = function () {
        // pull settings and update when your dialog is closed.
    }

});