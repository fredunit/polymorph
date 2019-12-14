polymorph_core.registerOperator("workflow", {
    displayName: "Workflowish",
    description: "Recursive item listing."
}, function (container) {
    let me = this;
    me.container = container;//not strictly compulsory bc this is expected and automatically enforced - just dont touch it pls.
    this.settings = {
        baseItem: guid(6)
    };

    this.rootdiv = document.createElement("div");
    //Add content-independent HTML here.
    this.rootdiv.innerHTML = ``;
    this.itemRelevant = (id) => { polymorph_core.itemRelevant(this, id); }

    container.div.appendChild(this.rootdiv);

    //////////////////Handle polymorph_core item updates//////////////////

    //this is called when an item is updated (e.g. by another container)
    container.on("updateItem", function (d) {
        let id = d.id;
        //do stuff with the item.
        if (this.itemRelevant(d.id)) {
            // check if we care about it right now
            // if so, update its title
            // show it as a dot point
        }

        //return true or false based on whether we can or cannot edit the item from this container.
        //otherwise your items will be deleted by the polymorph_core garbage collector when the user saves.
        return false;
    });

    this.refresh = function () {
        // This is called when my parent rect is resized.
    }

    //Saving and loading
    this.toSaveData = function () {
        return this.settings;
    }

    this.fromSaveData = function (d) {
        //this is called when your container is started OR your container loads for the first time
        Object.assign(this.settings, d);
    }

    //Handle the settings dialog click!
    this.dialogDiv = document.createElement("div");
    this.dialogDiv.innerHTML = ``;
    this.showDialog = function () {
        // update your dialog elements with your settings
    }
    this.dialogUpdateSettings = function () {
        // This is called when your dialog is closed. Use it to update your container!
    }

});