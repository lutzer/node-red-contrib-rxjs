const { range } = require('rxjs');
const { tap } = require('rxjs/operators');
//const { unsubscribe } = require('./utils.js');

module.exports = function (RED) {
	function RxIntervalNode (config) {
		RED.nodes.createNode(this, config);

		var node = this;
        var context = this.context();
        var global = context.global

        var observableName = "observable." + node.id;

        var observable = range(config.from, config.to).pipe( tap( (val) => {
            console.log("tap: "+val)
            node.send([ null, { topic: "next", payload: val } ] ) 
        }))

        global.set(observableName, observable);

        //console.log(observable);

        setTimeout( () => {
            node.send([{
                topic: "pipe",
                payload: {
                    observable: observableName
                }
            }, null]);
        },1);

		node.on('close', function () {
			global.set(node.id, undefined);
		});
	}
	RED.nodes.registerType("rx range", RxIntervalNode);
};
