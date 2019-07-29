const { range } = require('rxjs');
const { unsubscribe } = require('./utils.js');

module.exports = function (RED) {
	function RxIntervalNode (config) {
		RED.nodes.createNode(this, config);

		var node = this;
        var context = this.context();

        context.source = range(config.from, config.to);

        node.on('input', function (msg) {
			if (msg.topic === 'subscribe') {
                unsubscribe(context.subsciption);
                context.subsciption = context.source.subscribe( (val) => { 
                    node.send({ topic: "next", payload: val }) 
                });
            } else if (msg.topic === "unsubscribe") {
                unsubscribe(context.subsciption);
            }
        });

		node.on('close', function () {
			context.subscription.unsubscribe();
		});
	}
	RED.nodes.registerType("rx range", RxIntervalNode);
};
