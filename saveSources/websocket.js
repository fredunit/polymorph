polymorph_core.registerSaveSource("websocket", function () { // a sample save source, implementing a number of functions.

    //initialise here
    this.prettyName="Websocket";
    //Set custom objects by using polymorph_core.userData.documents[polymorph_core.currentDocID].saveSources['your_savesource_name'].

    this.pushAll = async function (id, data) {
        if (this.connection){
            this.connection.send(JSON.stringify(data));
        }
        //push to the source (force save)
    }
    this.pullAll = async function (id) {
        //not implemented yet
        return object_with_data; //or nothing, if undefined
    }

    this.hook = async function (id) { 
        if (!polymorph_core.userData.documents[polymorph_core.currentDocID].saveSources['websocket'] || typeof polymorph_core.userData.documents[polymorph_core.currentDocID].saveSources['websocket'] == "string"){
            polymorph_core.userData.documents[polymorph_core.currentDocID].saveSources['websocket']={
                url:"ws://localhost:14403"//a default
            }
        }
        this.connection= new WebSocket(polymorph_core.userData.documents[polymorph_core.currentDocID].saveSources['websocket'].url);
        this.connection.addEventListener("open",()=>{
            this.connection.send("!"+id);
        })
        this.connection.addEventListener("message",(m)=>{
            polymorph_core.fromSaveData(JSON.parse(m.utf8Data));
        })
        //hook to pull changes and push changes. 
        //To subscribe to live updates, you need to manually use polymorph_core.on("updateItem",handler) to listen to item updates.
        //Otherwise, you can subscribe to the user save event, as per below, and set a flag to remind yourself to save
        this.toSave=true;
    }

    polymorph_core.on("userSave",(d)=>{
        if (this.toSave){
            this.pushAll(polymorph_core.userData.documents[polymorph_core.currentDocID].saveSources['template'],d);
            return true; //return true if we save
        }else{
            return false;
        }
    })

    // Please remove or comment out this function if you can't subscribe to live updates.
    this.unhook = async function (id) {
        //unhook previous hooks.
        if(this.connection)this.connection.close();
        this.toSave=false;
    }

    window.addEventListener("beforeunload",()=>{
        
    })
})