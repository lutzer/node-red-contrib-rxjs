const { interval } = require('rxjs');
const { unsubscribe } = require('./common.js');

module.exports = function (RED) {
	function RxIntervalNode (config) {
		RED.nodes.createNode(this, config);

		var node = this;
        var context = this.context();
        var global = context.global;

        node.on('input', function (msg) {
			if (msg.topic === 'pipe') {
                unsubscribe(context.subsciption);
                var observable = global.get(msg.payload.observable);
                context.subsciption = observable.subscribe({
                    next(msg) { 
                        node.send([msg, null]) 
                    },
                    completed() {
                        node.send([null, { topic: "completed" }]) 
                    },
                    error(err) {
                        node.error(err.message, err);
                    }

                });
            } else if (msg.topic === "unsubscribe") {
                unsubscribe(context.subsciption);
            }
        });

		node.on('close', function () {
			context.subscription.unsubscribe();
		});
	}
	RED.nodes.registerType("rx subscribe", RxIntervalNode);
};
