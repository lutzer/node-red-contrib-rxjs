const { range } = require('rxjs');
const { tap, map } = require('rxjs/operators');
const { ON_LOADED_TIMEOUT } = require('./common.js');

module.exports = function (RED) {
	function RxIntervalNode (config) {
		RED.nodes.createNode(this, config);

		var node = this;
        var context = this.context();
        var global = context.global;

        var observableName = "observable." + node.id;

        var observable = range(config.from, config.to).pipe( 
            map( (val) => {
                return { topic: "range", payload: val }
            }), tap( (msg) => {
                node.send([ null, msg ] ) 
            })
        )

        global.set(observableName, observable);

        function onLoaded() {
            node.send([{
                topic: "pipe",
                payload: {
                    observable: observableName
                }
            }, null]);
        }

        setTimeout( () => onLoaded() ,ON_LOADED_TIMEOUT);

		node.on('close', function () {
			global.set(node.id, undefined);
		});
	}
	RED.nodes.registerType("rx range", RxIntervalNode);
};
