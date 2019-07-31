const _ = require('lodash');
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
                try {
                    context.observable = global.get(msg.payload.observable);
                } catch (err) {
                    node.error("Cannot read piped observable", err);
                    return;
                }
            } else if (msg.topic === "subscribe") {
                if (!_.isObject(context.observable)) {
                    node.error("No observable has been piped yet", new Error("No observable has been piped yet"));
                    return;
                }
                unsubscribe(context.subscription);
                context.subscription = context.observable.subscribe({
                    next : (msg) => { 
                        node.send([msg, null]) 
                    },
                    complete : () => {
                        node.send([null, { topic: "completed" }]) 
                    },
                    error : (err) => {
                        node.error(err.message, err);
                    }

                });
            } else if (msg.topic === "unsubscribe") {
                unsubscribe(context.subscription);
            }
        });

		node.on('close', function () {
			context.subscription.unsubscribe();
		});
	}
	RED.nodes.registerType("rx subscribe", RxIntervalNode);
};
